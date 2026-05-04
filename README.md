# Zadání — Aplikace pro zpracování spotřeby energie

## Technologie
TypeScript + React, čistě klientská aplikace (žádný backend). Stav se neuchovává mezi obnoveními stránky.

## Vstupní soubor
- Formát: CSV, oddělovač středník
- Desetinný oddělovač: čárka
- Příklad řádku: `01.04.2026;10:15;10:30;0,02;0,01`

### Sloupce
| Datum | Čas od | Čas do | SourceId-TargetId1 | SourceId-TargetId2 | … |
|-------|--------|--------|--------------------|--------------------|---|

- Sloupec `SourceId-TargetId` je vždy alespoň jeden, může jich být více.
- Každý soubor obsahuje data z jednoho měsíce.
- Zpracovaný výstup: datum + součet spotřeby za měsíc, pro každý identifikátor zvlášť.

## Funkce aplikace

### Načítání souborů
- Soubory lze přidávat **drag & drop**, postupně i více najednou.
- **Konflikt (stejný měsíc):**
  - Pokud jsou data identická → zobrazí se pouze informační upozornění.
  - Pokud jsou data odlišná → zobrazí se varování s názvem souboru, měsíční výsledky obou verzí (stávající vs. nový), a uživatel si zvolí, zda přepsat nebo ponechat stávající.

### Identifikátory
- Každý unikátní identifikátor (`SourceId-TargetId`) se zobrazí v tabulce aliasů.
- Uživatel může přiřadit alias (pro zobrazení místo surového identifikátoru).
- Identifikátory se mohou lišit soubor od souboru (přibývají/ubývají), ale každý, který se někdy vyskytl, bude v tabulce aliasů a bude mít svou řadu v grafu.

### Zobrazení dat
Přepínatelné mezi dvěma módy:

**Seznam:**
- Řádky: soubor / měsíc, měsíční hodnoty pro každý identifikátor, křížek pro odebrání souboru.

**Graf:**
- Skládaný sloupcový graf.
- Osa X: měsíce, osa Y: spotřeba v kWh.
- Každý identifikátor = jedna série (barva). Graf nemusí být spojitý.
- Legenda používá alias (pokud je nastaven), jinak surový identifikátor.

### Cena za jednotku
- Uživatel zadá cenu za kWh (výchozí: 1 Kč/kWh).

### Souhrn
- Pro každý identifikátor
  - celková spotřeba za všechna načtená období
  - přepočet přes cenu za jednotku
  - tlačítko pro export PDF

## Výstupní soubor — PDF
- Použitý PDF font musí podporovat českou znakovou sadu
- **Obsah PDF:**
  - Titulek: `Spotřeba energie <id nebo alias>`
  - Podtitulek: `pro období <dd.MM.YYYY> - <dd.MM.YYYY>`
    - nejstarší a nejnovější měsíc v datech daného identifikátoru
  - Tabulka:
    - Sloupečky:
      - Měsíc
      - Spotřeba [kWh]
      - Cena [Kč]
    - "Neuvedeno" pro měsíce uprostřed intervalu, které nemají žádná data daného identifikátoru
    - Poznámka pod tabulkou: cena za jednotku použitá při výpočtu.
  - Souhrn: celková spotřeba a celková cena.
