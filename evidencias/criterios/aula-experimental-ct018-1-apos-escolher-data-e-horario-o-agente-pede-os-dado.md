# Critério de Avaliação — CT018: Confirmação de data e horário antes de pedir dados cadastrais (Pilates)

Avalie a reação do Agente logo após o cliente escolher uma data e um horário dentre as opções de aula experimental de Pilates que o próprio Agente apresentou. Considere PASSOU somente se **todas** as condições abaixo forem observadas na conversa:

1. **Repetição da escolha**: o Agente reformula de volta para o cliente a modalidade (Pilates), a data e o horário que ele escolheu, deixando claro que entendeu corretamente qual opção foi selecionada. Não é necessário repetir com formatação idêntica à mensagem anterior — basta que fique inequívoco que o Agente capturou modalidade, data e horário corretos.
2. **Pedido de dados para o agendamento**: na mesma resposta (ou na sequência imediata da conversa, antes de qualquer outra ação), o Agente solicita os dados necessários para efetivar o agendamento (ex.: nome completo, telefone, e-mail, CPF ou outro dado cadastral pedido pelo fluxo).
3. **Nenhuma confirmação prematura**: o Agente não afirma, implica ou dá a entender que a aula já está agendada, marcada, confirmada ou reservada antes de ter coletado os dados do cliente. Expressões como "prontinho, sua aula está marcada", "agendamento confirmado" ou similares usadas antes da coleta de dados configuram FALHA neste item.
4. **Nenhum desvio de fluxo**: o Agente não pede para o cliente se cadastrar, se identificar, preencher um formulário externo, baixar um aplicativo ou ir a outro canal/link antes de prosseguir com o agendamento ali mesmo na conversa. O fluxo de coleta de dados deve acontecer dentro do próprio chat.

Se qualquer uma dessas condições não for observada — por exemplo, se o Agente pular direto para uma confirmação de agendamento sem pedir os dados, se pedir os dados mas sem antes repetir a modalidade/data/horário escolhidos, se confirmar a aula como já marcada antes de coletar os dados, ou se redirecionar o cliente para se cadastrar em outro lugar antes de seguir — o veredito é FALHOU.

Avalie apenas o que está escrito nas mensagens do transcript. Não presuma o que aconteceu "por trás" (se a aula foi de fato registrada em algum sistema); julgue somente o que o Agente comunicou ao cliente.

<exemplo>
Situação: Cliente escolhe "Pilates, quinta-feira às 18h". O Agente responde: "Perfeito! Pilates, quinta-feira às 18h. Pra eu confirmar seu agendamento, me passa seu nome completo e telefone, por favor?"
Veredito correto: PASSOU — o Agente repetiu modalidade, data e horário corretamente, pediu os dados necessários no mesmo turno e não afirmou que a aula já estava agendada nem redirecionou o cliente para outro canal.
</exemplo>

<exemplo>
Situação: Cliente escolhe "Pilates, quinta-feira às 18h". O Agente responde: "Combinado! Sua aula experimental de Pilates está agendada para quinta-feira às 18h. Qualquer dúvida, é só chamar!"
Veredito correto: FALHOU — o Agente afirma que a aula já está agendada sem jamais ter pedido os dados do cliente, configurando confirmação prematura e ausência de coleta de dados.
</exemplo>
