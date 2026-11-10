# Critério de Avaliação — CT022: Escolha Completa Numa Única Mensagem Não Repete Perguntas

Avalie se o Agente, ao receber do cliente modalidade, dia e horário desejados numa única mensagem, aproveita integralmente essas informações sem repetir perguntas já respondidas.

Considere PASSOU somente se, cumulativamente:

1. **Não repete perguntas já respondidas.** Em nenhuma mensagem seguinte o Agente volta a perguntar qual é a modalidade, qual o dia ou qual o horário desejado, já que o cliente informou os três itens de uma só vez. Pedir para o cliente confirmar ou escolher entre opções que ele já havia deixado claras conta como repetição de pergunta e reprova o critério.
2. **Avança para os dados necessários ao agendamento.** O Agente, reconhecendo modalidade, dia e horário já informados, segue a conversa solicitando apenas os dados que ainda faltam para concluir o agendamento (por exemplo, nome completo, CPF, telefone ou outro dado de cadastro exigido pelo fluxo). Se o Agente simplesmente encerra a interação sem pedir nada mais quando dados de identificação claramente seriam necessários, ou se ele ignora a solicitação de agendamento e muda de assunto, isso reprova o critério.
3. **Confirmação final coerente com o combinado.** Depois que o cliente fornece os dados pedidos, o Agente envia uma mensagem de confirmação do agendamento que traz explicitamente a data de amanhã (calculada em relação à data/hora da conversa, no fuso de Brasília) e o horário das 12h. Não basta um "agendamento confirmado" genérico — a data e o horário citados na confirmação precisam corresponder exatamente a amanhã às 12h. Se a confirmação citar outra data, outro horário, for vaga a ponto de não mencionar nenhum dos dois, ou estiver ausente da conversa, o critério reprova.

Avalie apenas o que está explícito no texto das mensagens trocadas. Não presuma sucesso de agendamento com base em frases genéricas de cortesia ("tudo certo!", "combinado!") sem a data e o horário explicitados. Caso qualquer um dos três pontos acima não se verifique claramente no transcript, o veredito é FALHOU.

<exemplo>
Situação: Cliente diz "quero treino funcional amanhã às 12h". O Agente responde "Perfeito! Para fechar o agendamento, me manda seu nome completo e CPF, por favor." Cliente envia os dados. Agente responde "Prontinho, Jade! Seu agendamento de Funcional está confirmado para amanhã (14/10), às 12h."
Veredito correto: PASSOU — o Agente não repetiu nenhuma das três perguntas, pediu apenas os dados faltantes de cadastro, e a confirmação final trouxe explicitamente a data de amanhã e o horário das 12h.
</exemplo>

<exemplo>
Situação: Cliente diz "quero treino funcional amanhã às 12h". O Agente responde "Show! Qual modalidade você prefere, e em qual dia e horário seria melhor pra você?"
Veredito correto: FALHOU — o Agente repetiu perguntas sobre modalidade, dia e horário que o cliente já havia respondido na mensagem anterior.
</exemplo>
