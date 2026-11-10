const { ansi, paint } = require("../terminalUi");

function createAbortController() {
  let executionStarted = false;
  let aborted = false;
  let rejectSignal;
  const signal = new Promise((_, reject) => {
    rejectSignal = reject;
  });
  signal.catch(() => {});

  process.on("SIGINT", () => {
    if (!executionStarted) {
      console.log(paint(ansi.yellow, "\n👋 Cancelado."));
      process.exit(0);
    }
    if (aborted) {
      console.log(paint(ansi.red, "\n⏹  Forçando saída imediata."));
      process.exit(1);
    }
    aborted = true;
    console.log(
      paint(
        ansi.yellow,
        "\n⏹  Abortando a bateria (Ctrl+C de novo força saída imediata)...",
      ),
    );
    rejectSignal(new Error("bateria abortada pela usuária (Ctrl+C)"));
  });

  return {
    signal,
    isAborted: () => aborted,
    markExecutionStarted: () => {
      executionStarted = true;
    },
  };
}

module.exports = { createAbortController };
