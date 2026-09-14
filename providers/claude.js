// Provedor "claude": chama o CLI do Claude Code (`claude -p`) já instalado
// e logado na máquina. É o único provedor com suporte nativo a subagentes
// (--agent <nome>, que carrega o papel direto de .claude/agents/<nome>.md)
// — por isso ignora `systemPrompt` (o agente.js só o calcularia à toa pra
// este provedor; --agent já resolve isso do lado do próprio Claude Code).
const { spawnCliOnce } = require('./spawnCli');

function generate({ userPrompt, agentName }) {
  const args = ['-p', '--no-session-persistence'];
  if (agentName) {
    args.push('--agent', agentName);
  } else {
    args.push('--allowedTools', 'none');
  }
  return spawnCliOnce({ command: 'claude', args, stdin: userPrompt, label: 'claude' });
}

module.exports = { generate };
