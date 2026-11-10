const fs = require("fs");
const path = require("path");

const KEYWORDS = {
  dado: "Given",
  given: "Given",
  quando: "When",
  when: "When",
  então: "Then",
  entao: "Then",
  then: "Then",
  e: "And",
  and: "And",
  mas: "But",
  but: "But",
};

const FEATURE_RE = /^(?:Funcionalidade|Feature)\s*:\s*(.*)$/i;
const SCENARIO_RE = /^(?:Cenário|Cenario|Scenario)\s*:\s*(.*)$/i;
const STEP_RE = /^(\S+)\s+(.*)$/;
const UNSUPPORTED_RE =
  /^(?:Esquema do Cenário|Esquema do Cenario|Scenario Outline|Exemplos|Examples|Contexto|Background)\s*:?/i;

function fail(filePath, lineNumber, message) {
  throw new Error(`${filePath}:${lineNumber} — ${message}`);
}

function parseTagLine(line, filePath, lineNumber) {
  return line
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      if (!token.startsWith("@"))
        fail(filePath, lineNumber, `token de tag inválido: "${token}"`);
      return token.slice(1);
    });
}

function extractCriteriaTag(tags) {
  for (const tag of tags) {
    const match = tag.match(/^criterio:(.+)$/i);
    if (match) return match[1].trim();
  }
  return null;
}

function extractMassaTag(tags) {
  for (const tag of tags) {
    const match = tag.match(/^massa:(.+)$/i);
    if (match) return match[1].trim();
  }
  return null;
}

function parseFeatureFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split(/\r?\n/);

  let featureName = null;
  let pendingTags = [];
  let currentScenario = null;
  const scenarios = [];

  lines.forEach((rawLine, i) => {
    const lineNumber = i + 1;
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) return;

    if (UNSUPPORTED_RE.test(line)) {
      fail(
        filePath,
        lineNumber,
        `construção Gherkin não suportada por este parser: "${line}". Só Feature/Scenario/tags/Given/When/Then/And/But são aceitos.`,
      );
    }
    if (line.startsWith("|")) {
      fail(
        filePath,
        lineNumber,
        'tabelas de dados ("|...|") não são suportadas por este parser.',
      );
    }
    if (line.startsWith('"""')) {
      fail(
        filePath,
        lineNumber,
        'doc strings ("""...""") não são suportadas por este parser.',
      );
    }

    if (line.startsWith("@")) {
      pendingTags.push(...parseTagLine(line, filePath, lineNumber));
      return;
    }

    const featureMatch = line.match(FEATURE_RE);
    if (featureMatch) {
      featureName = featureMatch[1].trim();
      pendingTags = [];
      return;
    }

    const scenarioMatch = line.match(SCENARIO_RE);
    if (scenarioMatch) {
      currentScenario = {
        name: scenarioMatch[1].trim(),
        tags: pendingTags,
        steps: [],
        criteriaFile: extractCriteriaTag(pendingTags),
        massaId: extractMassaTag(pendingTags),
        sourceFile: filePath,
        line: lineNumber,
      };
      scenarios.push(currentScenario);
      pendingTags = [];
      return;
    }

    const stepMatch = line.match(STEP_RE);
    const keyword = stepMatch && KEYWORDS[stepMatch[1].toLowerCase()];
    if (stepMatch && keyword) {
      if (!currentScenario) {
        fail(
          filePath,
          lineNumber,
          `step encontrado fora de um Cenário/Scenario: "${line}"`,
        );
      }
      currentScenario.steps.push({ keyword, text: stepMatch[2].trim() });
      return;
    }

    fail(filePath, lineNumber, `linha não reconhecida pelo parser: "${line}"`);
  });

  return { featureName, scenarios };
}

function discoverFeatureFiles(folderPath) {
  return fs
    .readdirSync(folderPath)
    .filter((f) => f.endsWith(".feature"))
    .sort()
    .map((f) => path.join(folderPath, f));
}

function parseBatteryFolder(folderPath) {
  const files = discoverFeatureFiles(folderPath);
  if (!files.length) {
    throw new Error(`nenhum arquivo .feature encontrado em ${folderPath}`);
  }

  const scenarios = files.flatMap((file) => parseFeatureFile(file).scenarios);

  const missingCriteria = scenarios.filter((s) => !s.criteriaFile);
  if (missingCriteria.length) {
    const list = missingCriteria
      .map((s) => `  - "${s.name}" (${s.sourceFile}:${s.line})`)
      .join("\n");
    throw new Error(
      `os cenários abaixo não têm a tag @criterio:<arquivo>.md, obrigatória para o batch-runner saber qual critério usar:\n${list}`,
    );
  }

  return scenarios;
}

const KEYWORD_LABELS_PT = {
  Given: "Dado",
  When: "Quando",
  Then: "Então",
  And: "E",
  But: "Mas",
};

function formatScenarioGherkin(scenario) {
  const tagLines = (scenario.tags || []).map((t) => `@${t}`).join(" ");
  const header = tagLines ? `${tagLines}\n` : "";
  const stepLines = scenario.steps
    .map((s) => `  ${KEYWORD_LABELS_PT[s.keyword] || s.keyword} ${s.text}`)
    .join("\n");
  return `${header}Cenário: ${scenario.name}\n${stepLines}`;
}

module.exports = {
  parseFeatureFile,
  parseBatteryFolder,
  discoverFeatureFiles,
  extractCriteriaTag,
  extractMassaTag,
  formatScenarioGherkin,
};
