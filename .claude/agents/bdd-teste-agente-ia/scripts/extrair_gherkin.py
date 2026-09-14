#!/usr/bin/env python3
"""Extrai títulos CT00X e blocos ```gherkin de um documento de casos de teste.

Preserva a ordem original e descarta metadados (prioridade, verificabilidade,
massa, handoff). Blocos Gherkin que não pertencem a um CT — tipicamente os
blocos de `Funcionalidade` — são mantidos onde estavam.

Uso:
    python3 extrair_gherkin.py entrada.md [-o saida.md] [--titulo "..."]
"""
import argparse
import re
import sys

CT_HEADING = re.compile(r"^#{1,6}\s*(CT\d+\s*-\s*.+?)\s*$")
FENCE_OPEN = re.compile(r"^\s*```+\s*gherkin\s*$", re.IGNORECASE)
FENCE_CLOSE = re.compile(r"^\s*```+\s*$")


def extrair(linhas):
    """Retorna (lista de partes, n_cenarios)."""
    partes, ct_atual, ct_usado, dentro, buffer = [], None, True, False, []
    for linha in linhas:
        if not dentro:
            m = CT_HEADING.match(linha)
            if m:
                ct_atual, ct_usado = m.group(1), False
                continue
            if FENCE_OPEN.match(linha):
                dentro, buffer = True, []
            continue
        if FENCE_CLOSE.match(linha):
            dentro = False
            if ct_atual and not ct_usado:
                partes.append(f"### {ct_atual}\n")
                ct_usado = True
            partes.append("```gherkin\n" + "".join(buffer) + "```\n")
            continue
        buffer.append(linha)
    if dentro:
        print("aviso: bloco gherkin sem fechamento; ignorado", file=sys.stderr)
    n = sum(1 for p in partes if p.startswith("### CT"))
    return partes, n


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("entrada")
    ap.add_argument("-o", "--saida", help="arquivo de saída (padrão: stdout)")
    ap.add_argument("--titulo", help="título do documento de origem, para o cabeçalho")
    args = ap.parse_args()

    with open(args.entrada, encoding="utf-8") as f:
        partes, n = extrair(f.readlines())

    if not partes:
        print("nenhum bloco gherkin encontrado", file=sys.stderr)
        return 1

    saida = []
    if args.titulo:
        ultimo = max(
            (p[4:].split(" ")[0] for p in partes if p.startswith("### CT")),
            default="",
        )
        saida.append(f"# Cenários de Teste em Gherkin — {args.titulo}\n\n")
        saida.append(
            f"> Extração somente dos cenários em Gherkin ({n} cenários"
            + (f", CT001 a {ultimo}" if ultimo else "")
            + "). Contexto, massa de dados, verificabilidade e handoff estão no documento completo.\n\n"
        )
    saida.append("\n".join(p.rstrip("\n") + "\n" for p in partes))
    texto = "\n".join(l for l in "".join(saida).split("\n"))
    texto = re.sub(r"\n{3,}", "\n\n", texto)

    if args.saida:
        with open(args.saida, "w", encoding="utf-8") as f:
            f.write(texto)
        print(f"{n} cenários extraídos para {args.saida}", file=sys.stderr)
    else:
        sys.stdout.write(texto)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
