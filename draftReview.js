// Revisão automática (opcional) dos rascunhos de personalidade e critério
// gerados pelo batchDrafts.js, usada pelo batch-runner.js quando a usuária
// opta por "revisão automática por IA" em vez de aprovar cenário por cenário
// na mão.
//
// É um terceiro papel de IA — nem o cliente simulado (agent.js) nem o juiz da
// conversa (judge.js) — que só compara o rascunho contra os passos
// Given/When/Then originais do Gherkin e devolve OK ou PROBLEMA. Nunca edita
// nem decide sozinho: quando aponta PROBLEMA, quem decide continua sendo a
// usuária — o batch-runner cai de volta no fluxo interativo normal só pra
// aquele cenário específico.
const { callAI } = require('./agent');
const { formatMassaContext } = require('./massas');

function stepsText(scenario, keywords) {
  return scenario.steps
    .filter((s) => keywords.includes(s.keyword))
    .map((s) => `${s.keyword}: ${s.text}`)
    .join('\n');
}

// Indeterminado (o revisor não seguiu o formato pedido) é tratado como
// PROBLEMA — na dúvida, cai pro humano em vez de aprovar sozinho.
function parseReviewVerdict(rawText) {
  const verdictMatch = rawText.match(/VEREDITO:\s*(OK|PROBLEMA)/i);
  const reasonMatch = rawText.match(/MOTIVO:\s*(.+)/i);
  return {
    ok: verdictMatch ? verdictMatch[1].toUpperCase() === 'OK' : false,
    reason: reasonMatch ? reasonMatch[1].trim() : rawText.trim(),
  };
}

// As 3 condições de aprovação e o formato de resposta fixos vivem em
// .claude/agents/zapia-revisor-persona.md — esta função só monta o cenário
// original e o rascunho que mudam a cada revisão.
function buildPersonaReviewPrompt(scenario, draft, massaData) {
  const context = stepsText(scenario, ['Given', 'When', 'And']);
  const massaContext = scenario.massaId ? formatMassaContext(scenario.massaId, massaData) : '';
  return [
    `Cenário: ${scenario.name}`,
    'Passos originais (Dado/Quando/E):',
    context || '(nenhum passo Given/When encontrado neste cenário)',
    ...(massaContext ? ['', massaContext] : []),
    '',
    'Rascunho gerado:',
    `NOME: ${draft.name}`,
    `ABERTURA: ${draft.opening}`,
    `PERSONALIDADE: ${draft.personality}`,
  ].join('\n');
}

// Idem, com as regras fixas em .claude/agents/zapia-revisor-criterio.md.
function buildCriteriaReviewPrompt(scenario, criteriaText, massaData) {
  const thenSteps = stepsText(scenario, ['Then', 'And', 'But']);
  const massaContext = scenario.massaId ? formatMassaContext(scenario.massaId, massaData) : '';
  return [
    `Cenário: ${scenario.name}`,
    'Resultados esperados originais (Então/E/Mas):',
    thenSteps || '(nenhum passo Then encontrado neste cenário)',
    ...(massaContext ? ['', massaContext] : []),
    '',
    'Rascunho de critério gerado:',
    criteriaText,
  ].join('\n');
}

async function reviewPersonaDraft(scenario, draft, massaData) {
  return parseReviewVerdict(await callAI(buildPersonaReviewPrompt(scenario, draft, massaData), 'zapia-revisor-persona'));
}

async function reviewCriteriaDraft(scenario, criteriaText, massaData) {
  return parseReviewVerdict(await callAI(buildCriteriaReviewPrompt(scenario, criteriaText, massaData), 'zapia-revisor-criterio'));
}

module.exports = { reviewPersonaDraft, reviewCriteriaDraft };
