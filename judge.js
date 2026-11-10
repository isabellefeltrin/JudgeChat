const fs = require("fs");
const path = require("path");
const { callAI } = require("./agent");

const CRITERIA_DIR = path.join(__dirname, "criteria");
const DEFAULT_CRITERIA_FILE = "default.md";

function listCriteriaFiles() {
  try {
    return fs
      .readdirSync(CRITERIA_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort();
  } catch {
    return [];
  }
}

function resolveCriteriaPath(criteriaFile) {
  const file =
    criteriaFile && criteriaFile.trim()
      ? criteriaFile.trim()
      : DEFAULT_CRITERIA_FILE;
  return path.isAbsolute(file) ? file : path.join(CRITERIA_DIR, file);
}

function buildJudgePrompt(persona, history, criteriaText) {
  const transcript =
    history
      .map(
        (turn, i) =>
          `#${String(i + 1).padStart(3, "0")} ${turn.role === "cliente" ? persona.name.toUpperCase() : "AGENTE"}: ${turn.text}`,
      )
      .join("\n") || "(conversa vazia)";

  return [
    "## Contexto",
    `Transcript de uma conversa de WhatsApp entre "${persona.name}" (cliente simulado) e o agente de atendimento em teste. Cada linha tem um número (#001, #002...) pra você citar como evidência:`,
    transcript,
    "",
    "## O que avaliar",
    criteriaText.trim(),
  ].join("\n");
}

function parseVerdict(rawText) {
  const verdictMatch = rawText.match(/VEREDITO:\s*(PASSOU|FALHOU)/i);
  const reasonMatch = rawText.match(/MOTIVO:\s*(.+)/i);
  return {
    verdict: verdictMatch ? verdictMatch[1].toUpperCase() : null,
    reason: reasonMatch ? reasonMatch[1].trim() : rawText.trim(),
    raw: rawText,
  };
}

async function buildCriteriaText(persona) {
  if (!persona.criteriaFile) {
    throw new Error(
      "nenhum critério de avaliação configurado para esta persona (defina criteriaFile)",
    );
  }

  const criteriaPath = resolveCriteriaPath(persona.criteriaFile);
  let fileCriteria;
  try {
    fileCriteria = fs.readFileSync(criteriaPath, "utf-8").trim();
  } catch {
    throw new Error(`arquivo de critério não encontrado: ${criteriaPath}`);
  }
  if (!fileCriteria) {
    throw new Error(`arquivo de critério vazio: ${criteriaPath}`);
  }

  return `### Critérios definidos em ${persona.criteriaFile}\n\n${fileCriteria}`;
}

async function evaluateConversation(persona, history) {
  const criteriaText = await buildCriteriaText(persona);
  const prompt = buildJudgePrompt(persona, history, criteriaText);
  const raw = await callAI(prompt, "judgechat-juiz");
  return parseVerdict(raw);
}

module.exports = {
  evaluateConversation,
  buildCriteriaText,
  listCriteriaFiles,
  parseVerdict,
  resolveCriteriaPath,
  CRITERIA_DIR,
  DEFAULT_CRITERIA_FILE,
};
