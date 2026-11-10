# Gerado por mdParaFeature.js — não edite à mão, rode a conversão de novo.
# Origem: CT_Gherkin_Aula_Experimental.md
# language: pt
Funcionalidade: Agendamento e confirmação da aula experimental
  # Como lead que escolheu data e horário
  # Quero registrar minha aula experimental pela conversa
  # Para receber a confirmação com os dados corretos

  @criterio:aula-experimental-ct018-1-apos-escolher-data-e-horario-o-agente-pede-os-dado.md
  Cenário: CT018 - APÓS ESCOLHER DATA E HORÁRIO O AGENTE PEDE OS DADOS EM VEZ DE CONFIRMAR [Pilates]
    Dado que sou um lead novo, sem conversa anterior com a academia
    E que o Agente já me apresentou as opções de aula experimental de Pilates
    Quando eu escolho a primeira data e o primeiro horário que o Agente ofereceu
    Então o Agente deve repetir a modalidade, a data e o horário que escolhi
    E o Agente deve me pedir os dados necessários para o agendamento
    E o Agente não deve afirmar que a aula já está agendada
    E o Agente não deve me pedir para me cadastrar ou me identificar em outro lugar antes de seguir

  @criterio:aula-experimental-ct019-1-confirmacao-traz-a-modalidade-a-data-e-o-horario-e.md
  Cenário: CT019 - CONFIRMAÇÃO TRAZ A MODALIDADE, A DATA E O HORÁRIO ESCOLHIDOS [Pilates]
    Dado que sou um lead novo, sem conversa anterior com a academia
    E que o Agente já me apresentou as opções de aula experimental de Pilates
    Quando eu escolho a primeira data e o primeiro horário que o Agente ofereceu
    E informo os dados que o Agente pedir
    Então o Agente deve confirmar o agendamento informando a modalidade Pilates
    E a confirmação deve trazer a mesma data e o mesmo horário que escolhi
    E a mensagem de confirmação deve ser clara e objetiva

  @criterio:aula-experimental-ct020-sem-os-dados-o-agente-nao-afirma-que-agendou.md
  Cenário: CT020 - SEM OS DADOS O AGENTE NÃO AFIRMA QUE AGENDOU
    Dado que sou um lead novo, sem conversa anterior com a academia
    E que o Agente já me apresentou as opções de aula experimental de Pilates
    Quando eu escolho a primeira data e o primeiro horário que o Agente ofereceu
    E quando o Agente pedir meus dados, respondo "Só marca aí, não vou passar nada agora"
    Então o Agente não deve afirmar que a aula experimental está agendada
    E o Agente não deve enviar uma mensagem de confirmação com modalidade, data e horário

  @criterio:aula-experimental-ct021-troca-de-horario-antes-dos-dados-vale-na-confirmac.md
  Cenário: CT021 - TROCA DE HORÁRIO ANTES DOS DADOS VALE NA CONFIRMAÇÃO
    Dado que sou um lead novo, sem conversa anterior com a academia
    E que o Agente já me apresentou as opções de aula experimental de Funcional
    Quando eu escolho o horário das 08h em um dos dias oferecidos
    E antes de informar meus dados, digo "Desculpa, melhor às 10h no mesmo dia"
    E informo os dados que o Agente pedir
    Então a confirmação do Agente deve trazer o horário das 10h
    E a confirmação não deve trazer o horário das 08h

  @criterio:aula-experimental-ct022-escolha-completa-numa-unica-mensagem-nao-repete-pe.md
  Cenário: CT022 - ESCOLHA COMPLETA NUMA ÚNICA MENSAGEM NÃO REPETE PERGUNTAS
    Dado que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo "Quero fazer uma aula experimental de Pilates amanhã às 12h"
    Então o Agente não deve me perguntar de novo a modalidade, o dia ou o horário
    E o Agente deve me pedir os dados necessários para o agendamento
    E depois que eu informar os dados, a confirmação deve trazer a data de amanhã no calendário de Brasília e o horário das 12h

  @criterio:aula-experimental-ct023-duas-mensagens-em-sequencia-imediata-geram-uma-con.md
  Cenário: CT023 - DUAS MENSAGENS EM SEQUÊNCIA IMEDIATA GERAM UMA CONFIRMAÇÃO COERENTE
    Dado que sou um lead novo, sem conversa anterior com a academia
    Quando eu envio "Quero uma aula experimental de Pilates" e, logo em seguida e sem esperar resposta, envio "Amanhã às 12h"
    E informo os dados que o Agente pedir
    Então o Agente deve tratar as duas mensagens como parte do mesmo pedido
    E a confirmação deve trazer Pilates, a data de amanhã no calendário de Brasília e o horário das 12h
    E o Agente não deve confirmar o mesmo agendamento mais de uma vez

  @criterio:aula-experimental-ct024-pergunta-sobre-vaga-nao-gera-afirmacao-de-consulta.md
  Cenário: CT024 - PERGUNTA SOBRE VAGA NÃO GERA AFIRMAÇÃO DE CONSULTA AO SISTEMA
    Dado que sou um lead novo, sem conversa anterior com a academia
    E que o Agente já me apresentou as opções de aula experimental de Funcional
    Quando eu pergunto "Tem vaga nesse horário? Já sou cliente de vocês, dá pra ver aí no sistema?"
    Então o Agente não deve afirmar que consultou a agenda, a disponibilidade de vagas ou o meu cadastro no sistema
    E o Agente não deve usar nenhum dado de cadastro meu que eu não tenha informado na conversa
    E o Agente deve seguir conduzindo o agendamento apenas com os dias e horários previstos para Funcional
