# Critério de Avaliação — CT006: Troca de Modalidade no Meio da Conversa Muda os Horários Oferecidos

## O que avaliar

Avalie se o Agente, ao apresentar os horários da aula experimental após o cliente mudar de ideia sobre a modalidade (trocando para Funcional), atualizou corretamente a oferta de horários para refletir apenas a nova modalidade escolhida.

## Critério de aprovação

Considere **PASSOU** somente se, após o cliente dizer algo como "Pensando melhor, prefiro Funcional" e aceitar o convite para escolher um horário, o Agente apresentar **exclusivamente** dias e horários referentes à aula experimental de **Funcional**.

Considere **FALHOU** se qualquer uma das situações abaixo ocorrer na mensagem (ou mensagens) em que o Agente apresenta os horários após a troca de modalidade:

- O Agente oferecer, listar ou mencionar o horário das 12h às 13h associado a Pilates (ou qualquer outro horário/dia que o transcript tenha deixado claro pertencer à modalidade anterior, não à Funcional) como opção de agendamento.
- O Agente misturar horários de Pilates e de Funcional na mesma lista de opções, sem deixar claro que apenas os de Funcional são válidos para a escolha atual.
- O Agente ignorar a troca de modalidade e continuar oferecendo apenas os horários da modalidade antiga (Pilates), como se a mensagem do cliente não tivesse mudado a intenção.
- O Agente pedir novamente que o cliente confirme a modalidade de forma que sugira não ter registrado a troca (ex.: perguntar "você confirma que quer fazer aula de Pilates?"), indicando que a mudança não foi incorporada à conversa — isso não é, por si só, motivo de reprovação se o Agente em seguida apresentar corretamente apenas os horários de Funcional, mas conta como indício de falha se resultar em horários incorretos sendo oferecidos.

Avalie apenas o que está escrito no transcript: não presuma que o Agente "sabe" a agenda real de horários por trás do sistema — julgue unicamente pelo texto que ele efetivamente enviou ao cliente. Se o transcript não contiver, em nenhum ponto após a troca de modalidade, uma apresentação de horários, considere FALHOU, pois o resultado esperado (apresentar os horários corretos da nova modalidade) não foi observado.

<exemplo>
Situação: Após o cliente dizer "Pensando melhor, prefiro Funcional" e aceitar escolher um horário, o Agente responde: "Temos horários de Funcional: terça e quinta às 7h, ou segunda e quarta às 18h. Qual prefere?"
Veredito correto: PASSOU — o Agente apresentou apenas horários de Funcional, sem mencionar nada de Pilates.
</exemplo>

<exemplo>
Situação: Após a troca para Funcional, o Agente responde: "Claro! Temos essas opções: segunda e quarta às 9h (Funcional), ou terça e quinta das 12h às 13h (Pilates). Qual horário fica melhor?"
Veredito correto: FALHOU — o Agente incluiu o horário das 12h às 13h de Pilates como opção, mesmo o cliente tendo trocado para Funcional.
</exemplo>
