function parseSelection(input, max) {
  const indices = new Set();
  for (const part of input
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Number(range[2]);
      if (start < 1 || end > max || start > end) return null;
      for (let n = start; n <= end; n += 1) indices.add(n - 1);
      continue;
    }
    if (!/^\d+$/.test(part)) return null;
    const n = Number(part);
    if (n < 1 || n > max) return null;
    indices.add(n - 1);
  }
  if (indices.size === 0) return null;
  return [...indices].sort((a, b) => a - b);
}

module.exports = { parseSelection };
