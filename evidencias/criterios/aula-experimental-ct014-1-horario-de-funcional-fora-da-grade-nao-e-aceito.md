# Critério de Avaliação — CT014: Horário de Funcional fora da grade não é aceito (12h)

Avalie se o Agente, após o cliente já ter aceitado o convite para a aula experimental de Funcional, respeita a grade de horários oficial dessa modalidade quando o cliente menciona, pede ou tenta confirmar o horário das 12h.

Considere PASSOU somente se **ambas** as condições abaixo forem observadas no transcript:

1. **Rejeição do horário das 12h**: em nenhum momento o Agente oferece, sugere, confirma ou aceita o horário das 12h para a aula experimental de Funcional. Isso vale tanto para uma oferta espontânea do Agente quanto para uma resposta de confirmação a um pedido do cliente nesse sentido (ex.: cliente diz "pode ser 12h?" e o Agente responde "ok, fechado" ou "confirmado às 12h"). Se o Agente aceitar, confirmar, ou mesmo demonstrar ambiguidade que sugira aceite (ex.: "vou verificar e te confirmo às 12h", sem nunca negar), o critério falha.

2. **Oferta restrita aos horários válidos**: ao comunicar ou reafirmar as opções de horário disponíveis para a aula experimental de Funcional, o Agente deve mencionar exclusivamente 06h, 08h e 10h. Não é necessário que o Agente liste os três horários em toda mensagem, mas sempre que ele apresentar opções de horário (nesse contexto de Funcional), elas devem estar contidas no conjunto {06h, 08h, 10h} — qualquer horário fora desse conjunto (12h ou outro) invalida o critério.

Avalie apenas o que está escrito nas mensagens do Agente — não presuma validações internas de sistema, grade cadastrada em banco de dados ou qualquer informação que não tenha sido verbalizada na conversa. O que importa é o texto que o Agente efetivamente enviou ao cliente.

Se o cliente nunca chegar a mencionar ou insistir no horário das 12h, mas o Agente mesmo assim oferecer apenas 06h, 08h e 10h como opções, isso também conta como PASSOU (a grade foi respeitada). Se o Agente nunca tratar do horário da aula de Funcional em nenhum momento da conversa, não há como avaliar o cumprimento da regra — nesse caso, considere FALHOU por ausência de evidência de que a grade foi respeitada.

Caso contrário, FALHOU.

<exemplo>
Situação: O cliente, já tendo aceitado o convite para a aula experimental, pergunta "posso ir às 12h?". O Agente responde: "Esse horário não está disponível para o Funcional. Temos vagas às 06h, 08h e 10h, qual prefere?"
Veredito correto: PASSOU — o Agente rejeitou explicitamente o horário das 12h e ofereceu somente os horários válidos da grade.
</exemplo>

<exemplo>
Situação: O cliente pergunta "posso ir às 12h?". O Agente responde: "Deixa eu verificar com a equipe e te confirmo em breve", e a conversa termina sem nova mensagem do Agente sobre o tema.
Veredito correto: FALHOU — o Agente não recusou claramente o horário fora da grade nem reafirmou as opções válidas (06h, 08h, 10h), deixando a possibilidade de confirmação das 12h em aberto.
</exemplo>
