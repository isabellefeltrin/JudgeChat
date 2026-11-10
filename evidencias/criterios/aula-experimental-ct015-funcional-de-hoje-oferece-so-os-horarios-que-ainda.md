# Critério de Avaliação — CT015: Funcional de hoje oferece só os horários que ainda não começaram

Avalie se o Agente, ao apresentar horários disponíveis da aula Funcional de hoje para um lead novo que aceitou o convite para escolher um horário, ofereceu os dois horários esperados — 08h e 10h — sem incluir o horário das 06h (já iniciado/encerrado no momento da conversa).

Considere PASSOU somente se, na mensagem em que o Agente lista ou sugere os horários disponíveis de hoje, aparecerem os horários 08h e 10h (podendo aparecer isolados ou junto de outros horários do dia que ainda não começaram) e o horário das 06h não for mencionado como opção disponível para escolha. É aceitável que o Agente apresente os horários em formatos distintos (ex.: "08h", "08:00", "8h da manhã"), desde que o horário certo seja reconhecível. Também passa se o Agente, de forma proativa, já informar que o horário das 06h não está mais disponível por já ter começado/passado — desde que não o ofereça como opção de escolha.

Considere FALHOU se:
- o Agente oferecer o horário das 06h como opção disponível para o lead escolher;
- o Agente não oferecer nenhum horário (ex.: pedir mais informações desnecessárias, travar, ou responder de forma genérica sem listar horários) quando o esperado é apresentar diretamente 08h e 10h;
- o Agente omitir o horário das 08h e/ou o horário das 10h ao apresentar as opções do dia, por qualquer motivo — inclusive se o Agente alegar que algum desses horários está lotado, indisponível ou com qualquer outra justificativa. O cenário exige objetivamente que ambos os horários sejam oferecidos; qualquer omissão de um dos dois é falha, independentemente da explicação dada na conversa;
- não for possível, a partir do transcript, confirmar quais horários foram de fato oferecidos (ex.: o Agente apenas diz "temos horários disponíveis hoje" sem especificar quais).

Não é necessário verificar se existe de fato uma aula às 06h no sistema da academia ou se o horário real "já passou" segundo um relógio externo — isso não é observável na conversa. Avalie unicamente o que o Agente escreveu: se ele incluiu ou excluiu o horário das 06h ao apresentar as opções do dia, e se ofereceu os dois horários esperados (08h e 10h) de forma completa.

<exemplo>
Situação: O Agente responde "Hoje ainda temos vaga no Funcional às 08h e às 10h! Quer que eu reserve algum desses horários pra você?"
Veredito correto: PASSOU — ambos os horários esperados (08h e 10h) foram oferecidos e o horário das 06h não aparece como opção.
</exemplo>

<exemplo>
Situação: O Agente responde "Temos Funcional hoje às 10h, a aula das 08h já está com a turma lotada. Quer a das 10h?"
Veredito correto: FALHOU — o horário das 08h não foi oferecido, ainda que o Agente tenha dado uma justificativa (lotação); o cenário exige que os dois horários sejam oferecidos.
</exemplo>

<exemplo>
Situação: O Agente responde "Temos Funcional hoje às 06h, 08h e 10h. Qual prefere?"
Veredito correto: FALHOU — o horário das 06h foi oferecido como opção disponível, quando já deveria estar fora da lista por já ter começado.
</exemplo>
