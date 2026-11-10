# Gerado por mdParaFeature.js — não edite à mão, rode a conversão de novo.
# Origem: CT_Gherkin_Aula_Experimental.md
# language: pt
Funcionalidade: Horários da aula experimental de Pilates
  # Como lead interessado em Pilates
  # Quero ver os horários da aula experimental
  # Para escolher uma data que caiba na minha rotina

  @criterio:aula-experimental-ct007-horario-de-pilates-apresentado-e-somente-das-12h-a.md
  Cenário: CT007 - HORÁRIO DE PILATES APRESENTADO É SOMENTE DAS 12H ÀS 13H
    Dado que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que tenho interesse em fazer Pilates
    E aceito o convite para escolher um horário
    Então o Agente deve apresentar o horário das 12h às 13h
    E o Agente deve me pedir para escolher uma data
    E o Agente não deve sugerir nenhum outro horário de aula experimental de Pilates

  @criterio:aula-experimental-ct008-1-pilates-tem-aula-experimental-no-sabado-e-no-domin.md
  Cenário: CT008 - PILATES TEM AULA EXPERIMENTAL NO SÁBADO E NO DOMINGO [sábado]
    Dado que sou um lead novo, sem conversa anterior com a academia
    E que já aceitei o convite para a aula experimental de Pilates
    Quando eu digo que só consigo no sábado
    Então o Agente deve oferecer o sábado às 12h
    E o Agente não deve dizer que não há aula experimental de Pilates no sábado

  @criterio:aula-experimental-ct009-1-horario-de-pilates-fora-da-grade-nao-e-aceito.md
  Cenário: CT009 - HORÁRIO DE PILATES FORA DA GRADE NÃO É ACEITO [08h]
    Dado que sou um lead novo, sem conversa anterior com a academia
    E que já aceitei o convite para a aula experimental de Pilates
    Quando eu digo que só consigo às 08h
    Então o Agente não deve oferecer nem confirmar aula experimental de Pilates às 08h
    E o Agente deve manter como opção apenas o horário das 12h às 13h

  @criterio:aula-experimental-ct010-1-pilates-de-hoje-e-oferecido-enquanto-a-aula-nao-co.md
  Cenário: CT010 - PILATES DE HOJE É OFERECIDO ENQUANTO A AULA NÃO COMEÇOU [08h30]
    Dado que, no horário de Brasília, são 08h30 no momento da conversa
    E que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que tenho interesse em fazer Pilates
    E aceito o convite para escolher um horário
    Então o Agente deve poder oferecer a aula de hoje às 12h entre as opções de data

  @criterio:aula-experimental-ct011-1-pilates-de-hoje-nao-e-oferecido-depois-que-a-aula.md
  Cenário: CT011 - PILATES DE HOJE NÃO É OFERECIDO DEPOIS QUE A AULA COMEÇOU [12h05]
    Dado que, no horário de Brasília, são 12h05 no momento da conversa
    E que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que tenho interesse em fazer Pilates
    E aceito o convite para escolher um horário
    Então o Agente não deve oferecer a aula de hoje como opção
    E o Agente deve oferecer as datas a partir de amanhã, às 12h

