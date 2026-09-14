// Provedor "gemini": chama direto a API HTTP do Gemini (Google AI Studio),
// sem depender de nenhum CLI instalado — só precisa de GEMINI_API_KEY no
// .env. Usa o campo nativo `systemInstruction` da API pra separar o papel
// fixo (.claude/agents/<nome>.md) do prompt da vez.
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

async function generate({ systemPrompt, userPrompt }) {
  if (!API_KEY) throw new Error('variável de ambiente ausente: GEMINI_API_KEY');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
    ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`Gemini API falhou (${res.status}): ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || '').join('') || '';
  if (!text) {
    throw new Error(`Gemini API não retornou texto (finishReason=${candidate?.finishReason || '?'})`);
  }
  return text.trim();
}

module.exports = { generate };
