// Helper compartilhado por qualquer provedor que funcione chamando um CLI
// instalado na máquina (hoje: claude, copilot) — spawna o processo, escreve
// o prompt no stdin, aplica timeout e devolve o stdout já sem espaços nas
// pontas. Cada provedor só monta o comando/args; a mecânica de processo é
// sempre a mesma.
const { spawn } = require('child_process');

const DEFAULT_TIMEOUT_MS = 60000;

function spawnCliOnce({ command, args, stdin, label, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: process.platform === 'win32' });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error(`tempo limite ao chamar o ${label}`));
    }, timeoutMs);

    child.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        const detail = stderr.trim() || stdout.trim() || '(sem saída)';
        reject(new Error(`${label} saiu com código ${code}: ${detail}`));
        return;
      }
      resolve(stdout.trim());
    });

    if (stdin != null) child.stdin.write(stdin);
    child.stdin.end();
  });
}

module.exports = { spawnCliOnce };
