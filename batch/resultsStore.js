const fs = require("fs");
const path = require("path");

function loadPreviousResults(resultsPath) {
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
  } catch {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw).map(([slug, value]) => [
      slug,
      Array.isArray(value) ? value : [value],
    ]),
  );
}

function saveResults(resultsPath, store) {
  try {
    fs.writeFileSync(resultsPath, JSON.stringify(store, null, 2));
  } catch (e) {
    console.warn(`Aviso: não foi possível gravar ${resultsPath}: ${e.message}`);
  }
}

function latestEntry(history) {
  return Array.isArray(history) && history.length > 0
    ? history[history.length - 1]
    : null;
}

function isFinalVerdict(entry) {
  return (
    Boolean(entry) && (entry.verdict === "PASSOU" || entry.verdict === "FALHOU")
  );
}

function appendResult(store, slug, entry) {
  if (!Array.isArray(store[slug])) store[slug] = [];
  store[slug].push(entry);
}

function appendErrorPayload(filePath, payload) {
  let existing = [];
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    existing = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    existing = [];
  }
  existing.push(payload);
  try {
    fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));
  } catch (e) {
    console.warn(`Aviso: não foi possível gravar ${filePath}: ${e.message}`);
  }
}

function buildErrorPayload(error, extra) {
  return {
    timestamp: new Date().toISOString(),
    errorMessage: error.message,
    errorStack: error.stack || null,
    historySoFar: error.historySoFar ?? null,
    ...extra,
  };
}

function relativeHref(fromDir, toPath) {
  return path.relative(fromDir, toPath).split(path.sep).join("/");
}

module.exports = {
  loadPreviousResults,
  saveResults,
  latestEntry,
  isFinalVerdict,
  appendResult,
  appendErrorPayload,
  buildErrorPayload,
  relativeHref,
};
