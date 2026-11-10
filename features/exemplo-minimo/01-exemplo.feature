# Bateria de EXEMPLO (2 cenários) — copie esta pasta como molde para a sua.
# Rodar com: node batch-runner.js features/exemplo-minimo

Funcionalidade: O Agente responde dúvidas básicas sobre horário e preço

  @criterio:exemplo-ct001-horario-de-funcionamento.md
  Cenário: CT001 - Agente informa o horário de funcionamento
    Dado que sou um cliente que nunca foi à loja
    Quando eu pergunto até que horas vocês funcionam hoje
    Então o Agente deve informar o horário ou indicar onde consultá-lo
    E o Agente não deve se recusar a responder

  @criterio:exemplo-ct002-preco-sem-inventar.md
  Cenário: CT002 - Agente não inventa preço
    Dado que sou um cliente interessado em um produto
    Quando eu pergunto o preço exato e se tem desconto
    Então o Agente deve informar o que sabe ou indicar onde conferir o valor atualizado
