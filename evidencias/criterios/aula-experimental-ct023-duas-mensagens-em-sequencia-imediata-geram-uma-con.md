# Critério de Avaliação — CT023: Duas mensagens em sequência imediata geram uma confirmação coerente

Avalie se o Agente, ao receber duas mensagens do cliente enviadas em sequência imediata (antes de o Agente responder à primeira), trata esse par de mensagens como parte de um único pedido, solicita os dados que faltarem e, ao final, emite **uma única confirmação coerente** de agendamento de Pilates para amanhã (considerando o calendário de Brasília) às 12h.

Considere **PASSOU** somente se **todas** as condições abaixo forem observadas no transcript:

1. **Unificação do pedido**: o Agente não ignora nenhuma das duas mensagens enviadas em sequência nem trata a segunda como um pedido novo e desconectado da primeira — ele incorpora as informações de ambas ao montar a confirmação final (por exemplo, se uma mensagem trouxe a modalidade e a outra o dia/horário, ou dados complementares pedidos pelo Agente, os dois conteúdos aparecem refletidos na confirmação).
2. **Dados solicitados e respondidos**: se o Agente pediu alguma informação adicional (nome, horário preferido, confirmação de unidade etc.), o cliente forneceu e o Agente seguiu o fluxo sem travar, sem repetir a mesma pergunta de forma redundante, e sem se perder sobre o que já havia sido informado.
3. **Conteúdo da confirmação**: existe, em algum momento da conversa, uma mensagem do Agente que confirma claramente o agendamento mencionando os três elementos — a modalidade **Pilates**, a **data correspondente a "amanhã"** em relação ao momento da conversa (consistente com o fuso de Brasília, isto é, sem incoerência de dia como citar uma data que não bate com "amanhã" nesse fuso) e o **horário das 12h**. Os três elementos não precisam estar na mesma frase, mas devem aparecer de forma inequívoca e sem contradição entre mensagens do Agente.
4. **Confirmação única**: o Agente confirma esse mesmo agendamento **uma única vez**. Não há, no transcript, uma segunda mensagem de confirmação (idêntica ou reformulada) tratando o mesmo horário/modalidade como se fosse um novo agendamento distinto, nem duplicidade que sugira ter sido criado mais de um registro para o mesmo pedido.

Considere **FALHOU** se qualquer uma das condições abaixo ocorrer:

- O Agente responde às duas mensagens como se fossem pedidos separados, gerando confusão, pedindo de novo informação já dada, ou perdendo o contexto da primeira mensagem ao tratar a segunda.
- A confirmação final omite ou contradiz algum dos três elementos (modalidade Pilates, data de amanhã em Brasília, horário 12h) — por exemplo, confirma outro horário, outra data, ou não menciona a modalidade.
- Há mais de uma mensagem de confirmação para o mesmo pedido (duplicação), mesmo que os dados estejam corretos.
- O Agente trava, não avança o fluxo, ou pede dados de forma repetitiva sem nunca chegar a uma confirmação.

Se nenhuma das condições de falha acima for observada e os quatro pontos do PASSOU estiverem presentes, o veredito é PASSOU. Caso contrário, FALHOU.

<exemplo>
Situação: Cliente manda "quero pilates amanhã" e, um segundo depois, "pode ser 12h". O Agente responde pedindo o nome, o cliente informa, e o Agente envia uma única mensagem: "Confirmado! Pilates amanhã (14/10) às 12h em nome de João." Não há nenhuma outra mensagem de confirmação depois disso.
Veredito correto: PASSOU — as duas mensagens foram tratadas como um único pedido, a confirmação traz os três elementos corretos e aparece uma única vez.
</exemplo>

<exemplo>
Situação: Cliente manda "quero marcar pilates" e, logo em seguida, "amanhã às 12h". O Agente responde à primeira mensagem perguntando "qual modalidade e horário você deseja?", ignorando que a segunda mensagem já respondia a isso, e só depois de o cliente repetir a informação o Agente confirma o agendamento.
Veredito correto: FALHOU — o Agente não tratou as duas mensagens como parte do mesmo pedido, forçando repetição de informação já fornecida.
</exemplo>
