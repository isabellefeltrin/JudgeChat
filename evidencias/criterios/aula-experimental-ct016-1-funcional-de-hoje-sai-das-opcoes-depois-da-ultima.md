# Critério de Avaliação — CT016: Funcional de hoje sai das opções depois da última aula do dia

Avalie a conversa entre o lead (cliente simulado, sem histórico anterior com a academia) e o Agente de atendimento, no momento em que o lead aceita o convite para escolher um horário de aula, em um contexto no qual já passou o horário da última aula do dia atual (cenário: terça-feira, 10h30, considerando que a próxima aula disponível cai em quinta-feira desta semana).

Considere PASSOU somente se **todas** as condições abaixo forem observadas no transcript:

1. **Ausência de oferta de aula do dia atual**: em nenhum momento da resposta do Agente, após o lead aceitar escolher um horário, aparece uma aula, horário ou turma referente ao dia de hoje (terça-feira) como opção disponível. Não deve haver nenhuma menção a um horário de hoje como algo que o lead ainda poderia agendar ou participar.

2. **Oferta explícita de quinta-feira**: o Agente apresenta, entre as opções de horário oferecidas ao lead, pelo menos uma aula referente à quinta-feira desta semana (data ou dia da semana citado de forma clara, ou inequivocamente identificável como tal pelo contexto da conversa).

3. **Coerência da resposta**: a mensagem do Agente deve ser compreensível como uma lista de opções de agendamento futuras, sem dar a entender — mesmo implicitamente — que ainda há vaga ou aula ocorrendo "hoje" (por exemplo, não vale apenas omitir o dia de hoje da lista enquanto o texto ainda sugere "ainda dá tempo de vir hoje" ou similar).

Caso qualquer uma dessas condições não seja atendida — isto é, se o Agente oferecer qualquer horário do dia atual, se ele não oferecer nenhuma opção de quinta-feira, ou se o texto sugerir contraditoriamente que ainda há aula disponível hoje — o resultado é FALHOU.

Não é necessário que o Agente explique o motivo de pular o dia de hoje (ex.: "porque as aulas de hoje já terminaram"); a ausência de explicação não é motivo de reprovação, desde que as condições acima sejam cumpridas. Também não é necessário validar nenhuma informação de banco de dados, agenda real ou sistema interno — avalie exclusivamente o que está escrito na conversa.

<exemplo>
Situação: O Agente responde "Temos esses horários disponíveis: quinta-feira 09h, quinta-feira 18h e sexta-feira 10h." Nenhuma menção a horário de terça-feira (hoje).
Veredito correto: PASSOU — não há oferta de hoje e há ao menos uma opção de quinta-feira desta semana.
</exemplo>

<exemplo>
Situação: O Agente responde "Ainda dá tempo de pegar a aula das 11h hoje, ou se preferir, temos quinta-feira às 09h e 18h."
Veredito correto: FALHOU — o Agente ofereceu uma aula do dia atual (hoje às 11h), violando a condição de que nenhuma aula de hoje deve ser oferecida.
</exemplo>

<exemplo>
Situação: O Agente responde apenas "Temos horários na sexta-feira às 08h e no sábado às 10h." sem mencionar nenhuma opção de quinta-feira desta semana.
Veredito correto: FALHOU — embora não ofereça nada de hoje, não apresenta nenhuma opção de quinta-feira, que era esperada.
</exemplo>
