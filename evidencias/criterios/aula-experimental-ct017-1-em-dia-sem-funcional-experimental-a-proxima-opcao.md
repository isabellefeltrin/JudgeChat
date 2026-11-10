# Critério de Avaliação — CT017: Lead novo em dia sem funcional experimental, oferta deve pular para o próximo dia de aula

Avalie a conversa entre o cliente simulado (lead novo, sem histórico prévio com a academia) e o atendimento da academia, especificamente o momento em que o lead aceita o convite para escolher um horário de aula experimental.

Considere PASSOU somente se **ambas** as condições abaixo forem verdadeiras, observando exclusivamente o texto das mensagens trocadas:

1. **Nenhuma aula do dia atual é oferecida.** O Agente, ao apresentar as opções de horário, não deve mencionar nem sugerir nenhuma aula com data/dia correspondente ao dia de hoje (ex.: não deve aparecer "hoje às...", nem o nome do dia da semana de hoje como opção de agendamento, nem qualquer horário que o próprio texto indique ser ainda hoje).
2. **A próxima oferta é explicitamente a aula de terça-feira.** O Agente deve apresentar terça-feira (com horário(s) de aula) como a opção seguinte disponível, de forma clara e identificável no texto — seja escrevendo "terça-feira", "terça" ou uma data que o próprio Agente associe a terça-feira na conversa.

Caso o Agente ofereça qualquer aula de hoje (mesmo que também ofereça terça-feira depois), ou caso pule terça-feira e vá direto para outro dia (quarta, quinta etc.) sem explicar de forma observável por que terça não está disponível, ou caso não mencione dia nenhum concretamente (resposta vaga tipo "temos horários disponíveis, qual prefere?"), o resultado é FALHOU.

Não é necessário verificar se a aula de terça-feira realmente existe no sistema da academia — isso está fora do alcance do juiz. Avalie apenas se o texto da conversa é consistente com as regras acima: ausência de oferta de hoje + presença explícita de terça-feira como próxima opção.

Se a conversa não chegar ao ponto de o Agente oferecer horários (por exemplo, o lead desiste antes, ou a conversa é interrompida), ou se o lead nunca chega a aceitar o convite para escolher horário, o critério não pôde ser testado — considere FALHOU, pois não há evidência observável de que o comportamento esperado ocorreu.

<exemplo>
Situação: O Agente responde "Ótimo! Temos aula hoje às 19h e também terça-feira às 7h e 19h. Qual prefere?"
Veredito correto: FALHOU — o Agente ofereceu uma aula de hoje, o que contraria a regra de que em dia sem funcional experimental nenhuma aula de hoje deve ser oferecida.
</exemplo>

<exemplo>
Situação: O Agente responde "Hoje não temos funcional disponível, mas na terça-feira temos horários às 7h e às 19h. Qual fica melhor pra você?"
Veredito correto: PASSOU — nenhuma aula de hoje foi oferecida e terça-feira foi apresentada de forma explícita e clara como a próxima opção.
</exemplo>

<exemplo>
Situação: O Agente responde "Vamos verificar a agenda e já te retorno com os horários disponíveis", e a conversa termina sem o Agente de fato citar nenhum dia.
Veredito correto: FALHOU — não há, no texto da conversa, nenhuma menção concreta a terça-feira nem confirmação de ausência de oferta de hoje; não há evidência observável de que o comportamento esperado ocorreu.
</exemplo>
