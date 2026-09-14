const fs = require('fs');
const os = require('os');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { CdpPage } = require('puppeteer-core');
const qrcode = require('qrcode-terminal');

// whatsapp-web.js reinjeta suas bindings (window.onQRChangedEvent etc.) a cada
// 'framenavigated', mas o Puppeteer guarda internamente os nomes já expostos
// e nunca os limpa entre navegações da mesma página, então a segunda tentativa
// de reinjeção derruba o processo com "already exists". Torna exposeFunction
// idempotente para esse caso específico.
const originalExposeFunction = CdpPage.prototype.exposeFunction;
CdpPage.prototype.exposeFunction = async function patchedExposeFunction(name, fn) {
  try {
    return await originalExposeFunction.call(this, name, fn);
  } catch (e) {
    if (e.message && e.message.includes('already exists')) return;
    throw e;
  }
};

// O puppeteer pode ficar preso numa versão pinada do Chrome cujo download falha
// (build removido do CDN). Em vez de depender dela, usa qualquer Chrome já
// instalado no cache local do puppeteer. O nome da pasta e do executável
// varia por plataforma (ex.: chrome-linux64/chrome, chrome-win64/chrome.exe).
const CHROME_RELATIVE_PATHS_BY_PLATFORM = {
  linux: [['chrome-linux64', 'chrome']],
  win32: [
    ['chrome-win64', 'chrome.exe'],
    ['chrome-win32', 'chrome.exe'],
  ],
  darwin: [
    ['chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
    ['chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'],
  ],
};

function resolveChromeExecutable() {
  const cacheDir = path.join(os.homedir(), '.cache', 'puppeteer', 'chrome');
  if (!fs.existsSync(cacheDir)) return undefined;
  const relativePaths = CHROME_RELATIVE_PATHS_BY_PLATFORM[process.platform] || CHROME_RELATIVE_PATHS_BY_PLATFORM.linux;
  for (const build of fs.readdirSync(cacheDir)) {
    for (const relativePath of relativePaths) {
      const candidate = path.join(cacheDir, build, ...relativePath);
      if (fs.existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

// Se uma sessão anterior morreu sem fechar o Chrome de verdade (processo órfão),
// o perfil fica com um SingletonLock apontando pra um PID que não existe mais,
// e o Puppeteer se recusa a abrir ("browser is already running"). Detecta esse
// caso e limpa o lock antes de tentar lançar, sem afetar uma sessão realmente ativa.
function cleanStaleSingletonLock() {
  if (process.platform === 'win32') return; // Chrome usa outro mecanismo de lock no Windows
  const sessionDir = path.join(path.resolve('./.wwebjs_auth/'), 'session');
  const lockPath = path.join(sessionDir, 'SingletonLock');
  let target;
  try {
    target = fs.readlinkSync(lockPath);
  } catch {
    return; // sem lock (primeira execução) ou não é um symlink
  }
  const pid = Number(target.split('-').pop());
  if (!pid) return;
  try {
    process.kill(pid, 0); // processo ainda vivo: sessão realmente em uso, não toca
    return;
  } catch {
    // PID morto: lock órfão de uma sessão anterior
  }
  for (const name of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
    fs.rmSync(path.join(sessionDir, name), { force: true });
  }
  console.log('\x1b[2m🧹 Sessão anterior não fechou o Chrome corretamente; lock órfão removido.\x1b[0m');
}

function createWhatsAppClient() {
  cleanStaleSingletonLock();

  const client = new Client({
    authStrategy: new LocalAuth(),
    webVersionCache: { type: 'none' },
    // Se a instância anterior não fechou o WebSocket de forma limpa (ex.: Ctrl+C
    // que precisou forçar o kill do Chrome), o WhatsApp entra em estado CONFLICT
    // ao reconectar e, sem isso, a nova sessão fica sem receber mensagens.
    takeoverOnConflict: true,
    takeoverTimeoutMs: 5000,
    puppeteer: {
      headless: true,
      executablePath: resolveChromeExecutable(),
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
      ],
    },
  });

  client.on('qr', (qr) => {
    console.log('\n\x1b[36m📱  Escaneie o QR Code abaixo com seu WhatsApp:\x1b[0m\n');
    qrcode.generate(qr, { small: true });
    console.log('\x1b[2mAguardando leitura...\x1b[0m\n');
  });

  client.on('auth_failure', (msg) => {
    console.error('\x1b[31m\x1b[1m❌ Falha na autenticação:\x1b[0m', msg);
    process.exit(1);
  });

  return client;
}

module.exports = { createWhatsAppClient };
