# Critério de Avaliação — CT021: Troca de horário antes dos dados vale na confirmação

Avalie se o Agente, ao processar um pedido de troca de horário feito pelo cliente antes de fornecer os dados cadastrais, respeita essa troca e reflete o horário correto na confirmação final da aula experimental de Funcional.

Considere **PASSOU** somente se, após o cliente dizer algo como "Desculpa, melhor às 10h no mesmo dia" (em resposta às opções apresentadas, antes de informar os dados pedidos pelo Agente) e em seguida fornecer os dados solicitados, a mensagem de confirmação final do Agente:

- Mencionar explicitamente o horário das **10h** como o horário agendado/confirmado; **e**
- Não mencionar o horário das **08h** (ou qualquer horário diferente de 10h) como o horário confirmado da aula.

Avalie apenas o conteúdo da confirmação final (e mensagens imediatamente relacionadas a ela). Não é necessário que o Agente repita ou reconfirme verbalmente o pedido de troca logo após recebê-lo — o que importa é que o horário informado na confirmação reflita a troca pedida.

Considere **FALHOU** se:

- A confirmação final trouxer o horário das 08h (ou outro horário diferente de 10h) como horário agendado;
- A confirmação final trouxer ambos os horários (08h e 10h) sem deixar claro qual foi efetivamente confirmado, gerando ambiguidade;
- A confirmação final não mencionar nenhum horário específico, impedindo verificar se a troca foi respeitada;
- O Agente ignorar a mensagem de troca de horário e seguir tratando como se o cliente tivesse mantido a opção original, sem nunca corrigir isso antes da confirmação.

Não é motivo de reprovação o Agente ter pedido confirmação adicional do novo horário antes de seguir, desde que a confirmação final apresentada ao cliente mostre corretamente as 10h e não as 08h.

<exemplo>
Situação: O cliente vê as opções (08h e 10h), pede a troca para 10h antes de informar nome e telefone, fornece os dados, e a mensagem final do Agente diz "Prontinho! Sua aula experimental de Funcional está confirmada para às 10h, no mesmo dia."
Veredito correto: PASSOU — a confirmação reflete corretamente o horário trocado (10h) e não menciona o horário anterior (08h).
</exemplo>

<exemplo>
Situação: O cliente pede a troca para 10h, informa os dados, mas a mensagem final do Agente diz "Confirmado! Te esperamos às 08h para sua aula experimental de Funcional."
Veredito correto: FALHOU — a confirmação ignorou a troca pedida pelo cliente e manteve o horário original (08h), não trazendo o horário das 10h.
</exemplo>
