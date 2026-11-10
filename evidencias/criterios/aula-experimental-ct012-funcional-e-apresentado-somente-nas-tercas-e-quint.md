# Critério de Avaliação — CT012: Funcional apresentado somente nas terças e quintas, às 06h, 08h e 10h

Avalie se, após o cliente aceitar o convite para escolher um horário da aula experimental de Funcional, o Agente informa corretamente os dias e horários disponíveis, sem extrapolar essa informação.

Considere PASSOU somente se **todas** as condições abaixo forem observadas na conversa:

1. **Dias corretos**: o Agente informa explicitamente que a aula experimental de Funcional acontece às **terças-feiras e quintas-feiras**. Essa informação deve aparecer de forma clara no texto, não apenas implícita em um link ou numa lista de horários sem menção ao dia.
2. **Horários corretos**: o Agente apresenta os três horários **06h, 08h e 10h** (aceitam-se variações de formatação como "6h", "06:00", "8h00" etc., desde que correspondam aos mesmos três horários).
3. **Pedido de escolha**: o Agente pede ao cliente para escolher uma data e um horário dentre as opções apresentadas (pode ser uma pergunta direta, um menu de opções ou um convite equivalente para selecionar).
4. **Nenhuma informação incorreta ou adicional**: o Agente **não** menciona a aula experimental de Funcional ocorrendo em nenhum outro dia da semana (ex.: segunda, quarta, sexta, sábado) nem em outros horários além dos três citados. Se o Agente mencionar outro dia/horário para Funcional — mesmo de passagem, mesmo como alternativa "caso prefira" — o critério falha.

Considere FALHOU se qualquer uma das condições acima não for cumprida — por exemplo: o Agente omitir os dias da semana, citar incorretamente os dias (ex. "segunda e quarta"), omitir ou errar algum dos três horários, não convidar o cliente a escolher data/horário, ou mencionar qualquer outro dia/horário para a modalidade Funcional.

Observação: avalie exclusivamente o que está escrito na conversa. Não presuma informações que não foram ditas pelo Agente, mesmo que pareçam plausíveis ou "óbvias" para uma academia — o que não foi dito não deve ser considerado como informado.

<exemplo>
Situação: O cliente aceita escolher um horário e o Agente responde: "Show! A aula experimental de Funcional acontece às terças e quintas, nos horários de 06h, 08h e 10h. Qual data e horário você prefere?"
Veredito correto: PASSOU — dias corretos, os três horários corretos, e há convite explícito para escolher data e horário, sem menção a outros dias.
</exemplo>

<exemplo>
Situação: O Agente responde: "A aula de Funcional tem horários às 06h, 08h e 10h nas terças e quintas. Se preferir, também temos uma turma extra aos sábados às 09h. Qual horário fica melhor pra você?"
Veredito correto: FALHOU — embora os dias e horários principais estejam corretos e haja o pedido de escolha, o Agente menciona um dia adicional (sábado) para a aula de Funcional, o que contraria a exigência de não mencionar nenhum outro dia da semana.
</exemplo>

<exemplo>
Situação: O Agente responde apenas: "Temos horários disponíveis às 06h, 08h e 10h. Qual prefere?" sem citar em nenhum momento os dias da semana (terça e quinta).
Veredito correto: FALHOU — os horários estão corretos e há pedido de escolha, mas o Agente não informou os dias em que a aula experimental acontece, item obrigatório do critério.
</exemplo>
