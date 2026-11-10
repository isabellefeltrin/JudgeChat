const { ansi, paint } = require('../terminalUi');

const STATUS_BADGES = {
  RODANDO: paint(ansi.cyan, 'RODANDO...'),
  PASSOU: paint(ansi.green, 'PASSOU'),
  FALHOU: paint(ansi.red, 'FALHOU'),
  ERRO_TECNICO: paint(ansi.yellow, 'ERRO TÉCNICO'),
  ABORTADO: paint(ansi.yellow, 'ABORTADO'),
};

function printProgress(index, total, name, status, note) {
  const badge = STATUS_BADGES[status] || paint(ansi.dim, status || 'INDETERMINADO');
  const suffix = note ? paint(ansi.dim, ` ${note}`) : '';
  console.log(`  [${index + 1}/${total}] ${name} — ${badge}${suffix}`);
}

function printScenarioTurn(scenarioLabel, role, text) {
  if (role === 'sistema') {
    console.log(paint(ansi.dim, `    (${scenarioLabel}) ${text}`));
    return;
  }
  const isCliente = role.startsWith('CLIENTE');
  const color = isCliente ? ansi.green : ansi.cyan;
  const icon = isCliente ? '👤' : '🤖';
  console.log(`    ${icon} ${paint(ansi.dim, `[${scenarioLabel}]`)} ${paint(color + ansi.bold, role)}: ${paint(color, text)}`);
}

module.exports = { printProgress, printScenarioTurn };
