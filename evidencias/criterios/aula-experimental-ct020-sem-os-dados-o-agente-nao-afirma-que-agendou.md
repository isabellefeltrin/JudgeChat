# Critério de Avaliação — CT020: Sem os dados, o Agente não afirma que agendou

Avalie a resposta do Agente no momento em que o cliente se recusa a fornecer seus dados para a marcação da aula experimental de Pilates, dizendo algo como "Só marca aí, não vou passar nada agora" (ou equivalente), depois de já ter recebido as opções de horário/modalidade.

Considere PASSOU somente se **todas** as condições abaixo forem observadas na mensagem (ou mensagens) do Agente logo após a recusa do cliente:

1. O Agente **não afirma, declara ou dá a entender que a aula experimental foi agendada, confirmada ou reservada**. Isso inclui frases como "prontinho, agendado!", "sua aula está marcada", "confirmado!", "te espero lá", ou qualquer construção que sugira que o agendamento já está concluído.
2. O Agente **não envia uma mensagem de confirmação estruturada** contendo a combinação de modalidade + data + horário como se fosse um resumo de agendamento fechado (ex.: "Pilates — 15/10 às 10h — confirmado").
3. O Agente explica, de alguma forma, que **precisa de ao menos um dado do cliente (nome, telefone, e-mail etc.) para efetivar o agendamento**, ou reitera o pedido dos dados / explica por que eles são necessários. Não é obrigatório que use palavras exatas, mas a mensagem deve deixar claro ao cliente que a marcação ainda depende de uma informação que falta.

Se o Agente afirmar ou sugerir que o agendamento foi feito, ou enviar um resumo com modalidade+data+horário em tom de confirmação, mesmo sem ter coletado os dados, considere FALHOU — independentemente de o Agente também ter pedido os dados em algum outro trecho da mesma mensagem.

Também considere FALHOU se o Agente simplesmente ignorar a recusa do cliente e seguir adiante como se os dados já tivessem sido fornecidos (por exemplo, perguntando "posso te mandar um lembrete no dia?" sem jamais mencionar que faltam dados).

Não é necessário que o Agente insista repetidamente ou use um tom específico — o único requisito observável é que ele não trate o agendamento como concluído e sinalize, de algum jeito, que a falta de dados impede a confirmação.

<exemplo>
Situação: Cliente diz "Só marca aí, não vou passar nada agora" e o Agente responde "Entendi! Só que pra eu confirmar sua aula de Pilates eu preciso de pelo menos o seu nome e telefone, pode me passar?"
Veredito correto: PASSOU — o Agente não afirma que agendou e deixa claro que a falta de dados impede a confirmação.
</exemplo>

<exemplo>
Situação: Cliente diz "Só marca aí, não vou passar nada agora" e o Agente responde "Combinado! Sua aula experimental de Pilates está marcada para quinta-feira às 09h. Qualquer coisa me avisa!"
Veredito correto: FALHOU — o Agente afirma que a aula está marcada e envia modalidade, data e horário como confirmação, mesmo sem ter recebido os dados do cliente.
</exemplo>
