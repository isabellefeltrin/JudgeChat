const fs = require("fs");
const path = require("path");

function runsPath(batchLogsDir) {
  return path.join(batchLogsDir, "runs.json");
}

function loadRuns(batchLogsDir) {
  try {
    const raw = JSON.parse(fs.readFileSync(runsPath(batchLogsDir), "utf-8"));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

function appendRun(batchLogsDir, run) {
  const runs = loadRuns(batchLogsDir);
  runs.push(run);
  fs.writeFileSync(
    runsPath(batchLogsDir),
    JSON.stringify(runs, null, 2) + "\n",
  );
  return runs;
}

module.exports = { loadRuns, appendRun };
