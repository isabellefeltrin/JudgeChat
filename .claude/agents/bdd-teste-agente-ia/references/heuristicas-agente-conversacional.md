# Heurísticas para testar um agente conversacional com outro agente

Ler quando o alvo do teste é um agente/bot de atendimento cujos efeitos vão para um sistema externo (CRM, ERP, banco, agenda) e o executor não tem acesso a esse sistema.

## O problema central

O agente de atendimento faz duas coisas: **responde** e **grava**. O executor vê a resposta e não vê a gravação. Se o `Então` afirmar a gravação, o executor não tem instrumento — e um agente sem instrumento não fica em silêncio, ele produz um veredito plausível e errado. Uma asserção não observável é pior que asserção nenhuma: transforma o relatório em ficção.

## Três níveis de verificabilidade

Classifique cada cenário e diga o nível no documento completo:

- **V1 — conclusivo pela conversa.** Todo o resultado esperado se manifesta na resposta. Ex.: o agente não recusa atendimento; o agente pergunta com quem está falando; o agente não repete uma pergunta já respondida. Veredito `PASSOU`/`FALHOU`.
- **V2 — indício pela conversa.** A resposta mostra um sinal correlacionado ao efeito esperado, mas não o comprova. Veredito máximo `PASSOU (PARCIAL)`.
- **V3 — só insumo.** Nada na resposta permite concluir. O cenário existe para produzir a conversa que outra pessoa vai conferir. Veredito `SÓ INSUMO`.

Conte os níveis no fim e mostre a proporção. Se quase tudo for V3, diga isso na cara do usuário: o pacote não valida aquelas regras sem uma superfície de leitura, e essa é uma informação de decisão, não um detalhe de forma.

## Como converter efeito invisível em asserção observável

**1. Procure no documento de origem o sintoma declarado.** Documentos de produto costumam descrever o problema que a mudança resolve em termos de comportamento observável ("o agente repetia a pergunta porque não encontrava cadastro"). Quando existe essa frase, ela autoriza um indício: o comportamento antigo é a evidência de que a gravação não aconteceu. Cite a frase ao usar o indício, e declare o limite dele (por exemplo: só vale se o agente não tiver memória de sessão independente do cadastro — isso vira pendência).

**2. Teste a classificação, não o registro.** Quando o efeito depende de uma decisão semântica do agente (é intenção de compra? é urgência? é reclamação?), a resposta revela a classificação: ele responde no registro comercial ou no registro consultivo. Isso é pré-condição do efeito e detecta o defeito mais provável — o falso positivo/negativo de classificação. Escreva a asserção sobre o registro da resposta e diga que ela não comprova a gravação.

**3. Teste a persistência reabrindo a sessão.** Estado que deveria ter sido salvo se manifesta no retorno: o agente reconhece ou pergunta de novo. É o indício mais forte disponível sem acesso a banco.

**4. Teste ausência de dano visível.** Em cenários de deduplicação ou reaproveitamento, o executor não conta registros, mas percebe sintomas: o agente repetir um fluxo já concluído, perder contexto, oferecer de novo o que já foi feito.

**5. O que sobrar, marque como V3 e produza insumo dirigido.** O `Então` do cenário V3 pede o que só o executor pode registrar: horário exato de cada mensagem, identificador da sessão/telefone, ordem dos eventos. Sem isso a conferência externa não consegue amarrar o registro ao teste.

## Duas proibições que evitam relatório falso

**Auto-relato não é evidência.** O executor não pergunta ao agente sob teste se ele criou o registro, e não aceita a afirmação dele como prova. Agente de IA relata o que pretendia fazer, não o que aconteceu — e a pergunta ainda o empurra para fora do papel de atendimento, contaminando o cenário.

**O executor não prepara massa.** Se o cenário exige estado prévio, ele vem declarado por quem tem acesso ao sistema. Um executor tentando construir o estado conversando com o agente cria um cenário diferente do que estava escrito. Sem massa declarada, o veredito é `BLOQUEADO`.

## Escala de veredito para o executor

| Veredito | Quando |
|---|---|
| `PASSOU` | Cenário V1 com o comportamento observado. |
| `PASSOU (PARCIAL)` | Indício V2 observado, itens externos pendentes. |
| `FALHOU` | Comportamento conversacional contraria o esperado. |
| `SÓ INSUMO` | Cenário V3 executado, validação depende da conferência externa. |
| `BLOQUEADO` | Massa ausente, agente indisponível, pré-condição não atendida. |
| `PENDENTE DEFINIÇÃO` | Comportamento cai em pendência aberta. |

## Bloco de conferência externa

Cada cenário V2 e V3 termina com o que outra pessoa precisa checar, em linguagem literal e verificável — contagem de registros, texto exato de campo, ordem de eventos na timeline, ausência de alteração em registro que não deveria mudar. Junte tudo numa lista única por sessão/identificador no fim do documento: é isso que transforma execução em verificação.

## Cenários que valem a pena em qualquer agente conversacional

Independente do domínio, estes tendem a achar defeito real:

- Mensagem com duas intenções, uma delas a que dispara o comportamento.
- Duas mensagens em sequência imediata, sem esperar a resposta (corrida e perda de contexto).
- Usuário se recusa a fornecer o dado obrigatório — o atendimento continua?
- Dado fornecido de forma indireta, no meio de outra frase, em vez de resposta direta à pergunta.
- Retorno em nova sessão depois do fluxo concluído.
- Usuário já cadastrado passando pelo fluxo de captura.
- Intenção vaga que se parece com a que dispara o comportamento, mas não é.
