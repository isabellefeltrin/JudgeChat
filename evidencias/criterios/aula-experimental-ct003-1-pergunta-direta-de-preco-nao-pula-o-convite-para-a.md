# Critério de Avaliação — CT003: Pergunta direta de preço não pula o convite para aula experimental

## Contexto do cenário
A cliente simulada pergunta diretamente quanto custa o plano de Pilates. O atendimento pode (e deve) responder sobre preço, mas a resposta não pode se encerrar aí: ela precisa manter aberta a porta da aula experimental como forma de começar, sem empurrar a contratação do plano como se fosse o único caminho possível.

## O que avaliar

Avalie a conversa completa entre o cliente simulado e o atendimento da academia, com foco na resposta dada à pergunta sobre o preço do plano de Pilates (e em eventuais mensagens seguintes, se o preço foi retomado mais adiante).

**Considere PASSOU somente se, em algum momento da conversa, após a pergunta sobre o preço, o Agente mencionar explicitamente a possibilidade de fazer uma aula experimental de Pilates** — seja oferecendo, sugerindo, perguntando se a cliente gostaria de agendar uma, ou citando a aula experimental como opção antes ou depois de informar o valor. Não é necessário que o Agente recuse responder o preço ou adie a resposta: ele pode informar o valor normalmente, desde que a aula experimental também seja mencionada na conversa.

**E considere PASSOU somente se o Agente não tratar a contratação do plano como o único caminho para a cliente começar** — ou seja, ele não pode dar a entender (explícita ou implicitamente) que é necessário fechar o plano, pagar ou assinar contrato antes de poder experimentar ou conhecer a modalidade. Frases que soem como "para começar você precisa contratar o plano", "só é possível participar das aulas depois de assinar", ou qualquer formulação que apresente a matrícula como pré-requisito único para o primeiro contato com o Pilates, configuram falha nesse critério.

Caso qualquer um dos dois pontos acima não seja observado na conversa, o veredito é **FALHOU**.

Caso a aula experimental não seja mencionada em nenhum momento da conversa, ou caso o Agente deixe claro que a cliente só pode começar contratando o plano, o veredito também é **FALHOU**.

## Importante
- Avalie apenas o que está escrito no transcript. Não presuma que a aula experimental existe ou foi oferecida se isso não aparece no texto da conversa.
- Não é necessário que o Agente ofereça a aula experimental na mesma mensagem em que informa o preço — a menção pode vir em qualquer ponto posterior da conversa, desde que fique clara ao cliente.
- O fato de o Agente informar o preço corretamente não é suficiente, por si só, para PASSAR — a menção à aula experimental e a ausência de "contratação como único caminho" são obrigatórias.

<exemplo>
Situação: A cliente pergunta "quanto custa o plano de Pilates?" e o Agente responde "O plano de Pilates custa R$250/mês, com aulas 2x por semana. Se quiser, também posso agendar uma aula experimental gratuita para você conhecer a modalidade antes de decidir!"
Veredito correto: PASSOU — o Agente informou o preço, mencionou explicitamente a aula experimental e não condicionou o início ao fechamento do plano.
</exemplo>

<exemplo>
Situação: A cliente pergunta o preço do plano de Pilates e o Agente responde apenas "O plano custa R$250/mês. Quer que eu já gere o link de pagamento para você contratar?", sem mencionar aula experimental em nenhum momento da conversa.
Veredito correto: FALHOU — o Agente não mencionou a possibilidade de aula experimental em nenhum ponto da conversa, direcionando a cliente apenas para a contratação do plano.
</exemplo>

<exemplo>
Situação: A cliente pergunta o preço e o Agente responde "O plano custa R$250/mês. Para você poder participar das aulas de Pilates, primeiro precisa assinar o plano — depois disso posso ver com você sobre uma aula experimental."
Veredito correto: FALHOU — ainda que a aula experimental seja mencionada, o Agente apresenta a contratação do plano como pré-requisito obrigatório para começar, tratando-a como único caminho de entrada.
</exemplo>
