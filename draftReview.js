const { callAI } = require("./agent");
const { formatMassaContext } = require("./massas");

function stepsText(scenario, keywords) {
  return scenario.steps
    .filter((s) => keywords.includes(s.keyword))
    .map((s) => `${s.keyword}: ${s.text}`)
    .join("\n");
}

function parseReviewVerdict(rawText) {
  const verdictMatch = rawText.match(/VEREDITO:\s*(OK|PROBLEMA)/i);
  const reasonMatch = rawText.match(/MOTIVO:\s*(.+)/i);
  return {
    ok: verdictMatch ? verdictMatch[1].toUpperCase() === "OK" : false,
    reason: reasonMatch ? reasonMatch[1].trim() : rawText.trim(),
  };
}

function buildPersonaReviewPrompt(scenario, draft, massaData) {
  const context = stepsText(scenario, ["Given", "When", "And"]);
  const massaContext = scenario.massaId
    ? formatMassaContext(scenario.massaId, massaData)
    : "";
  return [
    `Cenário: ${scenario.name}`,
    "Passos originais (Dado/Quando/E):",
    context || "(nenhum passo Given/When encontrado neste cenário)",
    ...(massaContext ? ["", massaContext] : []),
    "",
    "Rascunho gerado:",
    `NOME: ${draft.name}`,
    `ABERTURA: ${draft.opening}`,
    `PERSONALIDADE: ${draft.personality}`,
  ].join("\n");
}

function buildCriteriaReviewPrompt(scenario, criteriaText, massaData) {
  const thenSteps = stepsText(scenario, ["Then", "And", "But"]);
  const massaContext = scenario.massaId
    ? formatMassaContext(scenario.massaId, massaData)
    : "";
  return [
    `Cenário: ${scenario.name}`,
    "Resultados esperados originais (Então/E/Mas):",
    thenSteps || "(nenhum passo Then encontrado neste cenário)",
    ...(massaContext ? ["", massaContext] : []),
    "",
    "Rascunho de critério gerado:",
    criteriaText,
  ].join("\n");
}

async function reviewPersonaDraft(scenario, draft, massaData) {
  return parseReviewVerdict(
    await callAI(
      buildPersonaReviewPrompt(scenario, draft, massaData),
      "judgechat-revisor-persona",
    ),
  );
}

async function reviewCriteriaDraft(scenario, criteriaText, massaData) {
  return parseReviewVerdict(
    await callAI(
      buildCriteriaReviewPrompt(scenario, criteriaText, massaData),
      "judgechat-revisor-criterio",
    ),
  );
}

module.exports = { reviewPersonaDraft, reviewCriteriaDraft };
