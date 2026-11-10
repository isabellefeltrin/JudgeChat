# Critério de Avaliação — CT013: Dia sem aula experimental de Funcional não é aceito (segunda-feira)

Avalie se o Agente, ao lidar com um cliente que já aceitou o convite para aula experimental de Funcional e está tratando de agendamento, recusa corretamente a segunda-feira como opção de dia para essa aula experimental.

Considere PASSOU somente se **todas** as condições abaixo forem observadas no transcript:

1. **Nenhuma oferta ou confirmação de segunda-feira.** Em nenhum momento da conversa o Agente oferece, sugere, confirma ou agenda a aula experimental de Funcional para segunda-feira. Isso vale tanto para uma oferta espontânea do Agente quanto para uma eventual tentativa do cliente de pedir segunda-feira — se o cliente pedir segunda-feira, o Agente deve recusar claramente esse dia (ex.: explicando que não há aula de Funcional nesse dia, ou que o dia não está disponível), e não apenas ignorar o pedido ou responder de forma ambígua que deixe margem para o cliente entender que foi aceito.

2. **Terça-feira e quinta-feira apresentadas como opções.** O Agente deve mencionar explicitamente terça-feira e quinta-feira como os dias disponíveis para a aula experimental de Funcional. Não é suficiente apresentar apenas um dos dois; ambos precisam aparecer como opção ao cliente em algum momento da conversa.

3. **Nenhum outro dia da semana oferecido como opção.** Além de terça e quinta, o Agente não pode apresentar nenhum outro dia (quarta, sexta, sábado, domingo etc.) como alternativa de dia para a aula experimental de Funcional. Se o Agente mencionar um terceiro dia além de terça/quinta como opção válida, o critério falha.

Caso qualquer uma dessas condições não se confirme pela leitura do transcript — por exemplo, o Agente aceitar/confirmar segunda-feira, oferecer apenas um dos dois dias corretos, ficar em silêncio sobre quais dias existem, ou incluir um dia extra indevido — o resultado é FALHO.

Avalie exclusivamente o que está escrito na conversa (falas do Agente e do cliente). Não presuma informações de agenda, grade de horários ou sistema que não estejam explicitadas no texto trocado.

<exemplo>
Situação: O cliente pergunta "pode ser na segunda então?" e o Agente responde "Na segunda não temos Funcional disponível, mas posso te encaixar na terça ou na quinta, qual prefere?"
Veredito correto: PASSOU — o Agente recusou claramente a segunda-feira e ofereceu exatamente terça e quinta como alternativas.
</exemplo>

<exemplo>
Situação: O Agente diz "Show, vamos confirmar sua aula experimental de Funcional pra segunda-feira às 18h!" sem que o cliente tenha corrigido isso depois.
Veredito correto: FALHOU — o Agente ofereceu e confirmou segunda-feira para a aula experimental de Funcional, o que não deveria acontecer.
</exemplo>

<exemplo>
Situação: O Agente responde "Temos aula de Funcional na terça, quinta e sábado, qual fica melhor pra você?"
Veredito correto: FALHOU — apesar de terça e quinta estarem corretas, o Agente incluiu sábado como opção adicional indevida.
</exemplo>
