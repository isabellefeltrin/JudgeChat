# Gerado por mdParaFeature.js — não edite à mão, rode a conversão de novo.
# Origem: CT_Gherkin_Aula_Experimental.md
# language: pt
Funcionalidade: Convite para aula experimental
  # Como lead que conversa com a academia pelo WhatsApp
  # Quero conhecer a modalidade antes de contratar um plano
  # Para decidir com base na experiência e não apenas em preço

  @criterio:aula-experimental-ct001-lead-interessado-em-pilates-recebe-convite-para-au.md
  Cenário: CT001 - LEAD INTERESSADO EM PILATES RECEBE CONVITE PARA AULA EXPERIMENTAL
    Dado que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que tenho interesse em fazer Pilates
    Então o Agente deve me convidar para uma aula experimental de Pilates antes de falar em contratar um plano
    E o Agente deve me perguntar se quero escolher um horário
    E o Agente não deve apresentar nenhuma opção de modalidade além de Pilates

  @criterio:aula-experimental-ct002-lead-interessado-em-funcional-recebe-convite-para.md
  Cenário: CT002 - LEAD INTERESSADO EM FUNCIONAL RECEBE CONVITE PARA AULA EXPERIMENTAL
    Dado que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que tenho interesse em fazer Funcional
    Então o Agente deve me convidar para uma aula experimental de Funcional antes de falar em contratar um plano
    E o Agente deve me perguntar se quero escolher um horário
    E o Agente não deve apresentar nenhuma opção de modalidade além de Funcional

  @criterio:aula-experimental-ct003-1-pergunta-direta-de-preco-nao-pula-o-convite-para-a.md
  Cenário: CT003 - PERGUNTA DIRETA DE PREÇO NÃO PULA O CONVITE PARA A AULA EXPERIMENTAL [Quanto custa o plano de Pilates? / Pilates]
    Dado que sou um lead novo, sem conversa anterior com a academia
    Quando eu pergunto "Quanto custa o plano de Pilates?"
    Então o Agente deve mencionar a possibilidade de fazer uma aula experimental de Pilates
    E o Agente não deve tratar a contratação de plano como único caminho para começar

  @criterio:aula-experimental-ct004-modalidade-nao-identificada-e-perguntada-antes-de.md
  Cenário: CT004 - MODALIDADE NÃO IDENTIFICADA É PERGUNTADA ANTES DE SEGUIR
    Dado que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo "Queria fazer uma aula experimental, como funciona?"
    Então o Agente deve me perguntar qual modalidade desejo conhecer
    E o Agente não deve apresentar dias nem horários de aula experimental antes de eu responder

  @criterio:aula-experimental-ct005-modalidade-fora-de-pilates-e-funcional-nao-recebe.md
  Cenário: CT005 - MODALIDADE FORA DE PILATES E FUNCIONAL NÃO RECEBE AULA EXPERIMENTAL
    Dado que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que quero fazer uma aula experimental de Musculação
    Então o Agente não deve oferecer aula experimental de Musculação
    E o Agente não deve apresentar dias nem horários de aula experimental para Musculação

  @criterio:aula-experimental-ct006-troca-de-modalidade-no-meio-da-conversa-muda-os-ho.md
  Cenário: CT006 - TROCA DE MODALIDADE NO MEIO DA CONVERSA MUDA OS HORÁRIOS OFERECIDOS
    Dado que sou um lead novo, sem conversa anterior com a academia
    Quando eu digo que tenho interesse em fazer Pilates
    E depois do convite do Agente, digo "Pensando melhor, prefiro Funcional"
    E aceito o convite para escolher um horário
    Então o Agente deve apresentar apenas os dias e horários da aula experimental de Funcional
    E o Agente não deve apresentar o horário das 12h às 13h de Pilates como opção
