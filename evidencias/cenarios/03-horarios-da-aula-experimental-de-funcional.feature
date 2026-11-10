# Gerado por mdParaFeature.js — não edite à mão, rode a conversão de novo.
# Origem: CT_Gherkin_Aula_Experimental.md
# language: pt
Funcionalidade: Horários da aula experimental de Funcional
  # Como lead interessado em Funcional
  # Quero ver os dias e horários da aula experimental
  # Para escolher uma data e um horário que caibam na minha rotina

  @criterio:aula-experimental-ct012-funcional-e-apresentado-somente-nas-tercas-e-quint.md
  Cenário: CT012 - FUNCIONAL É APRESENTADO SOMENTE NAS TERÇAS E QUINTAS, ÀS 06H, 08H E 10H
    Dado que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que tenho interesse em fazer Funcional
    E aceito o convite para escolher um horário
    Então o Agente deve informar que a aula experimental acontece às terças-feiras e quintas-feiras
    E o Agente deve apresentar os horários das 06h, das 08h e das 10h
    E o Agente deve me pedir para escolher uma data e um horário
    E o Agente não deve mencionar aula experimental de Funcional em nenhum outro dia da semana

  @criterio:aula-experimental-ct013-1-dia-sem-aula-experimental-de-funcional-nao-e-aceit.md
  Cenário: CT013 - DIA SEM AULA EXPERIMENTAL DE FUNCIONAL NÃO É ACEITO [segunda-feira]
    Dado que sou um lead novo, sem conversa anterior com a academia
    E que já aceitei o convite para a aula experimental de Funcional
    Quando eu digo que só consigo na segunda-feira
    Então o Agente não deve oferecer nem confirmar aula experimental de Funcional na segunda-feira
    E o Agente deve me apresentar como opção apenas terça-feira ou quinta-feira

  @criterio:aula-experimental-ct014-1-horario-de-funcional-fora-da-grade-nao-e-aceito.md
  Cenário: CT014 - HORÁRIO DE FUNCIONAL FORA DA GRADE NÃO É ACEITO [12h]
    Dado que sou um lead novo, sem conversa anterior com a academia
    E que já aceitei o convite para a aula experimental de Funcional
    Quando eu digo que só consigo na terça-feira às 12h
    Então o Agente não deve oferecer nem confirmar aula experimental de Funcional às 12h
    E o Agente deve manter como opção apenas os horários das 06h, 08h e 10h

  @criterio:aula-experimental-ct015-funcional-de-hoje-oferece-so-os-horarios-que-ainda.md
  Cenário: CT015 - FUNCIONAL DE HOJE OFERECE SÓ OS HORÁRIOS QUE AINDA NÃO COMEÇARAM
    Dado que, no horário de Brasília, é terça-feira às 07h30 no momento da conversa
    E que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que tenho interesse em fazer Funcional
    E aceito o convite para escolher um horário
    Então o Agente deve poder oferecer as aulas de hoje às 08h e às 10h
    E o Agente não deve oferecer a aula de hoje às 06h

  @criterio:aula-experimental-ct016-1-funcional-de-hoje-sai-das-opcoes-depois-da-ultima.md
  Cenário: CT016 - FUNCIONAL DE HOJE SAI DAS OPÇÕES DEPOIS DA ÚLTIMA AULA DO DIA [terça-feira / 10h30 / quinta-feira desta semana]
    Dado que, no horário de Brasília, é terça-feira às 10h30 no momento da conversa
    E que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que tenho interesse em fazer Funcional
    E aceito o convite para escolher um horário
    Então o Agente não deve oferecer nenhuma aula de hoje
    E o Agente deve oferecer as aulas de quinta-feira desta semana

  @criterio:aula-experimental-ct017-1-em-dia-sem-funcional-experimental-a-proxima-opcao.md
  Cenário: CT017 - EM DIA SEM FUNCIONAL EXPERIMENTAL A PRÓXIMA OPÇÃO É O PRÓXIMO DIA DE AULA [segunda-feira / terça-feira]
    Dado que, no horário de Brasília, é segunda-feira às 09h00 no momento da conversa
    E que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que tenho interesse em fazer Funcional
    E aceito o convite para escolher um horário
    Então o Agente não deve oferecer nenhuma aula de hoje
    E o Agente deve oferecer as aulas de terça-feira
