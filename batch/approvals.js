const fs = require("fs");
const path = require("path");
const {
  draftPersonaFromScenario,
  draftCriteriaFromScenario,
} = require("../batchDrafts");
const { reviewPersonaDraft, reviewCriteriaDraft } = require("../draftReview");
const { ansi, paint, divider } = require("../terminalUi");

function logOk(scenario, message) {
  console.log(paint(ansi.green, `  ✅ ${scenario.name} — ${message}`));
}
function logWarning(scenario, message) {
  console.log(paint(ansi.yellow, `  ⚠️  ${scenario.name} — ${message}`));
}

function loadSavedPersona(personaPath) {
  try {
    const saved = JSON.parse(fs.readFileSync(personaPath, "utf-8"));
    const { name, opening, personality } = saved?.persona || {};
    return name && opening && personality
      ? { name, opening, personality }
      : null;
  } catch {
    return null;
  }
}

async function passesAutoReview(scenario, label, review) {
  try {
    const verdict = await review();
    if (verdict.ok) {
      logOk(scenario, `${label} aprovado automaticamente (${verdict.reason})`);
      return true;
    }
    logWarning(
      scenario,
      `revisor apontou um problema em ${label}: ${verdict.reason}`,
    );
  } catch (e) {
    logWarning(
      scenario,
      `revisor de ${label} falhou (${e.message}), caindo pra revisão manual`,
    );
  }
  return false;
}

function printPersonaDraft(scenario, draft) {
  console.log(`\n${divider}`);
  console.log(paint(ansi.bold, `Rascunho de personalidade — ${scenario.name}`));
  console.log(divider);
  console.log(`${paint(ansi.cyan, "NOME:")} ${draft.name}`);
  console.log(`${paint(ansi.cyan, "ABERTURA:")} ${draft.opening}`);
  console.log(`${paint(ansi.cyan, "PERSONALIDADE:")}\n${draft.personality}`);
}

async function approvePersonaDraft(
  io,
  scenario,
  { autoReview, personaPath, massaData },
) {
  const saved = loadSavedPersona(personaPath);
  if (saved) {
    logOk(
      scenario,
      `persona já aprovada nesta bateria, reaproveitada de ${path.basename(personaPath)}`,
    );
    return saved;
  }

  let draft = await draftPersonaFromScenario(scenario, massaData);

  if (
    autoReview &&
    (await passesAutoReview(scenario, "personalidade", () =>
      reviewPersonaDraft(scenario, draft, massaData),
    ))
  ) {
    return draft;
  }

  for (;;) {
    printPersonaDraft(scenario, draft);
    const choice = (
      await io.ask(
        "Aprovar (Enter) / editar (e) / gerar novo rascunho (r)?",
        "",
      )
    )
      .trim()
      .toLowerCase();
    if (choice === "r") {
      draft = await draftPersonaFromScenario(scenario, massaData);
    } else if (choice === "e") {
      draft = {
        name: await io.ask("Nome", draft.name),
        opening: await io.ask("Abertura", draft.opening),
        personality: await io.askMultiline("Personalidade", draft.personality),
      };
    } else {
      return draft;
    }
  }
}

async function approveCriteriaDraft(
  io,
  scenario,
  { criteriaPath, autoReview, massaData },
) {
  let alreadyExists = fs.existsSync(criteriaPath);

  if (autoReview && alreadyExists) {
    logOk(
      scenario,
      `critério já existente (${path.basename(criteriaPath)}), reaproveitado automaticamente`,
    );
    return criteriaPath;
  }

  let text = alreadyExists
    ? fs.readFileSync(criteriaPath, "utf-8")
    : await draftCriteriaFromScenario(scenario, massaData);

  if (
    autoReview &&
    (await passesAutoReview(scenario, "critério", () =>
      reviewCriteriaDraft(scenario, text, massaData),
    ))
  ) {
    fs.writeFileSync(criteriaPath, text.trim() + "\n");
    return criteriaPath;
  }

  for (;;) {
    console.log(`\n${divider}`);
    console.log(
      paint(
        ansi.bold,
        `Critério — ${path.basename(criteriaPath)}${alreadyExists ? " (já existe)" : " (rascunho novo)"}`,
      ),
    );
    console.log(divider);
    console.log(text);
    const prompt = `${alreadyExists ? "Usar como está" : "Usar este rascunho"} (Enter) / editar (e) / gerar novo rascunho (r)?`;
    const choice = (await io.ask(prompt, "")).trim().toLowerCase();
    if (choice === "r") {
      text = await draftCriteriaFromScenario(scenario, massaData);
      alreadyExists = false;
    } else if (choice === "e") {
      text = await io.askMultiline("Novo texto do critério", text);
    } else {
      break;
    }
  }

  fs.writeFileSync(criteriaPath, text.trim() + "\n");
  return criteriaPath;
}

module.exports = { approvePersonaDraft, approveCriteriaDraft };
