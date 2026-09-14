// Helpers de terminal (cores ANSI e prompts via readline) extraídos de cli.js
// para serem reusados também pelo batch-runner.js, sem duplicar a UX/estilo
// visual do CLI interativo.
const { spawn } = require('child_process');

const ansi = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
};

const paint = (code, text) => `${code}${text}${ansi.reset}`;
const divider = paint(ansi.dim, '─'.repeat(48));

// ask(question, fallback): imprime a pergunta colorida e devolve a resposta
// (ou o fallback, se a resposta vier vazia).
function createAsk(rl) {
  return async (question, fallback) => {
    const hint = fallback ? ` ${paint(ansi.dim, `(${fallback})`)}` : '';
    const answer = (await rl.question(`${paint(ansi.cyan, question)}${hint}${paint(ansi.dim, ' › ')}`)).trim();
    return answer || fallback || '';
  };
}

// askMultiline(question, fallback): pra textos longos/colados com várias
// linhas — rl.question() só captura a primeira linha (cada Enter do paste
// avança pra próxima pergunta), então aqui lê linha a linha até aparecer
// "FIM" sozinho numa linha.
function createAskMultiline(rl) {
  return async (question, fallback) => {
    console.log(`${paint(ansi.cyan, question)}`);
    console.log(paint(ansi.dim, '  Pode colar texto com várias linhas. Quando terminar, digite FIM sozinho numa linha e pressione Enter.'));
    if (fallback) console.log(paint(ansi.dim, `  (Enter em branco na primeira linha mantém o valor atual: ${fallback})`));
    const lines = [];
    for (;;) {
      const line = await rl.question(paint(ansi.dim, '  › '));
      if (line.trim() === 'FIM') break;
      if (lines.length === 0 && line === '') return fallback || '';
      lines.push(line);
    }
    return lines.join('\n').trim() || fallback || '';
  };
}

// Abre um arquivo (relatório HTML) no navegador padrão do sistema — mesmo
// mecanismo usado pelo cli.js na opção "Ver conversas anteriores", agora
// também usado pelo batch-runner.js pro relatório consolidado da bateria.
function openInBrowser(filePath) {
  const byPlatform = {
    win32: ['cmd', ['/c', 'start', '', filePath]],
    darwin: ['open', [filePath]],
  };
  const [cmd, args] = byPlatform[process.platform] || ['xdg-open', [filePath]];
  spawn(cmd, args, { detached: true, stdio: 'ignore' }).unref();
}

module.exports = { ansi, paint, divider, createAsk, createAskMultiline, openInBrowser };
