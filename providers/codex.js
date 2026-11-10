// Provedor "codex": chama direto a API HTTP da OpenAI (Chat Completions),
// sem depender do CLI `codex` — só precisa de OPENAI_API_KEY no .env.
const API_KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1';

async function generate({ systemPrompt, userPrompt }) {
  if (!API_KEY) throw new Error('variável de ambiente ausente: OPENAI_API_KEY');

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages }),
  });
  if (!res.ok) {
    throw new Error(`OpenAI API falhou (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI API não retornou texto');
  return text.trim();
}

module.exports = { generate };
