const fs = require('fs');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry(fn, attempts, delayMs) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === attempts) throw e;
      await sleep(delayMs);
    }
  }
}

function slugify(text) {
  const withoutAccents = text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return withoutAccents.replace(/[^a-z0-9]+/g, '-').replace(/(^-+|-+$)/g, '') || 'cenario';
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

module.exports = { sleep, retry, slugify, ensureDir };
