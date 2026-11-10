const { callAI } = require("./agent");
const { formatMassaContext } = require("./massas");

function stepsText(scenario, keywords) {
  return scenario.steps
    .filter((s) => keywords.includes(s.keyword))
    .map((s) => `${s.keyword}: ${s.text}`)
    .join("\n");
}

function buildPersonaDraftPrompt(scenario, massaData) {
  const context = stepsText(scenario, ["Given", "When", "And"]);
  const massaContext = scenario.massaId
    ? formatMassaContext(scenario.massaId, massaData)
    : "";
  return [
    `Cenário: ${scenario.name}`,
    "Passos (Dado/Quando/E):",
    context || "(nenhum passo Given/When encontrado neste cenário)",
    ...(massaContext ? ["", massaContext] : []),
  ].join("\n");
}

function parsePersonaDraft(rawText) {
  const nameMatch = rawText.match(/NOME:\s*(.+)/i);
  const openingMatch = rawText.match(/ABERTURA:\s*(.+)/i);
  const personalityMatch = rawText.match(/PERSONALIDADE:\s*([\s\S]+)/i);
  return {
    name: nameMatch ? nameMatch[1].trim() : "cliente",
    opening: openingMatch ? openingMatch[1].trim() : "",
    personality: personalityMatch ? personalityMatch[1].trim() : rawText.trim(),
  };
}

async function draftPersonaFromScenario(scenario, massaData) {
  return parsePersonaDraft(
    await callAI(
      buildPersonaDraftPrompt(scenario, massaData),
      "judgechat-rascunhador-persona",
    ),
  );
}

function buildCriteriaDraftPrompt(scenario, massaData) {
  const thenSteps = stepsText(scenario, ["Then", "And", "But"]);
  const massaContext = scenario.massaId
    ? formatMassaContext(scenario.massaId, massaData)
    : "";
  return [
    `Cenário de origem: ${scenario.name}`,
    "Resultados esperados (Então/E/Mas) do cenário original:",
    thenSteps || "(nenhum passo Then encontrado neste cenário)",
    ...(massaContext ? ["", massaContext] : []),
  ].join("\n");
}

async function draftCriteriaFromScenario(scenario, massaData) {
  return callAI(
    buildCriteriaDraftPrompt(scenario, massaData),
    "judgechat-rascunhador-criterio",
  );
}

module.exports = {
  draftPersonaFromScenario,
  draftCriteriaFromScenario,
  buildPersonaDraftPrompt,
  buildCriteriaDraftPrompt,
};
