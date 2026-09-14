// Provedor "copilot": chama o CLI agentic do GitHub Copilot (`copilot`),
// instalado e autenticado na máquina (`npm i -g @github/copilot`, `copilot`
// pra logar). Diferente do Claude Code, essa CLI não tem um conceito nativo
// de "subagente" — por isso o agent.js já monta `systemPrompt` (o conteúdo
// de .claude/agents/<nome>.md, sem o front-matter) e aqui só colamos as duas
// partes numa única mensagem, mandada pelo stdin.
//
// ATENÇÃO: as flags abaixo são um melhor esforço com base na CLI disponível
// quando isto foi escrito (fev/2026) — CLIs agentic mudam de interface com
// frequência. Rode `copilot --help` na sua instalação; se as flags não
// baterem, ajuste DEFAULT_ARGS abaixo ou defina COPILOT_CLI_ARGS no .env
// (string com as flags separadas por espaço) sem tocar em código.
const { spawnCliOnce } = require('./spawnCli');

const COMMAND = process.env.COPILOT_CLI_COMMAND || 'copilot';
const DEFAULT_ARGS = ['-p', '--allow-all-tools', '--no-color'];

function buildArgs() {
  if (process.env.COPILOT_CLI_ARGS) {
    return process.env.COPILOT_CLI_ARGS.split(' ').filter(Boolean);
  }
  return DEFAULT_ARGS;
}

function generate({ systemPrompt, userPrompt }) {
  const combined = systemPrompt ? `${systemPrompt}\n\n---\n\n${userPrompt}` : userPrompt;
  return spawnCliOnce({ command: COMMAND, args: buildArgs(), stdin: combined, label: 'copilot' });
}

module.exports = { generate };
