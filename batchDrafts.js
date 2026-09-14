// Geração de rascunhos via IA usados na fase de preparação do batch-runner:
// (1) uma personalidade de cliente simulado a partir do Given/When/And de um
//     Scenario, e (2) um critério de julgamento (.md) a partir do
//     Then/And/But do mesmo Scenario. Os dois são sempre revisados/aprovados
//     manualmente pelo usuário antes de virarem persona/arquivo de verdade —
//     ver batch-runner.js.
const { callAI } = require('./agent');
const { formatMassaContext } = require('./massas');

function stepsText(scenario, keywords) {
  return scenario.steps
    .filter((s) => keywords.includes(s.keyword))
    .map((s) => `${s.keyword}: ${s.text}`)
    .join('\n');
}

// O papel e o formato de resposta fixos vivem em
// .claude/agents/zapia-rascunhador-persona.md — esta função só monta o
// cenário de origem que muda a cada rascunho.
function buildPersonaDraftPrompt(scenario, massaData) {
  const context = stepsText(scenario, ['Given', 'When', 'And']);
  const massaContext = scenario.massaId ? formatMassaContext(scenario.massaId, massaData) : '';
  return [
    `Cenário: ${scenario.name}`,
    'Passos (Dado/Quando/E):',
    context || '(nenhum passo Given/When encontrado neste cenário)',
    ...(massaContext ? ['', massaContext] : []),
  ].join('\n');
}

function parsePersonaDraft(rawText) {
  const nameMatch = rawText.match(/NOME:\s*(.+)/i);
  const openingMatch = rawText.match(/ABERTURA:\s*(.+)/i);
  const personalityMatch = rawText.match(/PERSONALIDADE:\s*([\s\S]+)/i);
  return {
    name: nameMatch ? nameMatch[1].trim() : 'cliente',
    opening: openingMatch ? openingMatch[1].trim() : '',
    personality: personalityMatch ? personalityMatch[1].trim() : rawText.trim(),
  };
}

async function draftPersonaFromScenario(scenario, massaData) {
  return parsePersonaDraft(await callAI(buildPersonaDraftPrompt(scenario, massaData), 'zapia-rascunhador-persona'));
}

// O papel, a regra de "só o observável" e o formato de resposta fixos vivem
// em .claude/agents/zapia-rascunhador-criterio.md — esta função só monta o
// cenário de origem que muda a cada rascunho.
function buildCriteriaDraftPrompt(scenario, massaData) {
  const thenSteps = stepsText(scenario, ['Then', 'And', 'But']);
  const massaContext = scenario.massaId ? formatMassaContext(scenario.massaId, massaData) : '';
  return [
    `Cenário de origem: ${scenario.name}`,
    'Resultados esperados (Então/E/Mas) do cenário original:',
    thenSteps || '(nenhum passo Then encontrado neste cenário)',
    ...(massaContext ? ['', massaContext] : []),
  ].join('\n');
}

async function draftCriteriaFromScenario(scenario, massaData) {
  // markdown cru, sem parsing — vai direto pra revisão (manual ou automática)
  return callAI(buildCriteriaDraftPrompt(scenario, massaData), 'zapia-rascunhador-criterio');
}

module.exports = { draftPersonaFromScenario, draftCriteriaFromScenario, buildPersonaDraftPrompt, buildCriteriaDraftPrompt };
