const fs = require("fs");
const path = require("path");

const MASSAS_PATH = path.join(__dirname, "massas.json");

function loadMassas() {
  try {
    const raw = JSON.parse(fs.readFileSync(MASSAS_PATH, "utf-8"));
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

function saveMassas(massas) {
  fs.writeFileSync(MASSAS_PATH, JSON.stringify(massas, null, 2) + "\n");
}

function resolveMassas(massaIds) {
  const massas = loadMassas();
  const missing = massaIds.filter((massaId) => !massas[massaId]?.phone);

  if (missing.length) {
    const example = Object.fromEntries(
      missing.map((massaId) => [
        massaId,
        { phone: "DDI+DDD+número, ex.: 5548999990001", description: "" },
      ]),
    );
    throw new Error(
      `massa(s) sem telefone cadastrado em ${MASSAS_PATH}: ${missing.join(", ")}.\n` +
        `Adicione ao arquivo (crie-o se não existir) uma entrada por massa, por exemplo:\n${JSON.stringify(example, null, 2)}`,
    );
  }

  return massas;
}

const RESERVED_MASSA_FIELDS = new Set(["phone", "description"]);

function formatMassaContext(massaId, massaData) {
  if (!massaData) return "";
  const lines = [`Massa de teste usada neste cenário: ${massaId}`];
  if (massaData.description)
    lines.push(`Descrição da massa: ${massaData.description}`);
  const extras = Object.entries(massaData).filter(
    ([key, value]) =>
      !RESERVED_MASSA_FIELDS.has(key) && value !== "" && value != null,
  );
  if (extras.length) {
    lines.push(
      "Dados específicos preparados manualmente para esta massa de teste (use-os literalmente, não invente outros valores):",
    );
    for (const [key, value] of extras) {
      lines.push(`- ${key}: ${value}`);
    }
  }
  return lines.join("\n");
}

module.exports = {
  MASSAS_PATH,
  loadMassas,
  saveMassas,
  resolveMassas,
  formatMassaContext,
};
