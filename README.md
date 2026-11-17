# Esfer@ extractor de qualificacions

Extensió de Chrome (Manifest V3) que extreu les qualificacions de la pantalla
**Avaluacions finals → Qualificacions per al tutor del grup** d'Esfer@
(`bfgh.aplicacions.ensenyament.gencat.cat`) i les exporta a CSV o JSON.

## Què fa

A la llista de la pantalla, cada fila (mòdul o RA) té un enllaç **Modifica** a la
columna Accions. L'extensió:

1. Fa clic a cada «Modifica», un darrere l'altre.
2. Espera que carregui la taula d'alumnes d'aquell element.
3. Llegeix la taula i torna a la llista.
4. Desa el progrés a `chrome.storage.local`, de manera que pots tancar el popup i
   tornar-lo a obrir sense perdre res.

Tot passa al teu navegador: l'extensió no envia dades enlloc.

## Instal·lació

No és a la Chrome Web Store; es carrega en mode desenvolupador.

1. Descarrega o clona aquest repositori:
   ```bash
   git clone https://github.com/surikata3k/esfera-extractor.git
   ```
2. Obre `chrome://extensions` i activa el **Mode de desenvolupador** (cantonada superior dreta).
3. Prem **Carrega descomprimida** i tria la carpeta `extensio-extractor`.
4. (Opcional) Fixa la icona de l'extensió a la barra del navegador.

Quan canviïs el codi, prem **Recarrega** a la targeta de l'extensió a `chrome://extensions`.

## Ús

1. Inicia sessió a Esfer@ i obre **Avaluacions finals → Qualificacions per al tutor del grup**,
   fins a veure la llista d'elements curriculars amb els enllaços «Modifica».
2. Fes clic a la icona de l'extensió i prem **Inicia**.
3. Espera que acabi (uns 3 s per element, uns 5 minuts per a 90 elements). **No tanquis ni
   canviïs la pestanya d'Esfer@** mentre s'executa.
4. Baixa el resultat amb els botons del popup.

### Botons

| Botó | Què fa |
|---|---|
| **Inicia** | Comença el recorregut de tota la llista. |
| **Atura** | Acaba l'element en curs, atura l'extracció i baixa automàticament el CSV amb el que s'ha fet fins ara. Mantén el popup obert fins que es baixi. |
| **Baixa CSV** | Una fila per alumne i element (format llarg). |
| **Baixa taula CSV** | Taula creuada: una fila per alumne i les columnes agrupades per mòdul i, dins de cada mòdul, els seus RA. |
| **Baixa JSON** | Les mateixes dades que el CSV, en JSON. |
| **Neteja** | Esborra les dades desades de l'extensió. |

## Format de les dades

### CSV (format llarg)

Separador `;`, codificació UTF-8 amb BOM (s'obre bé a Excel).

| Columna | Origen |
|---|---|
| Mòdul codi | Element curricular, de l'inici fins al primer `-` |
| Mòdul | Primera part del codi, separat per `_` |
| Cicle | Segona part del codi |
| RA | Resta del codi (buit si l'element és el mòdul) |
| Mòdul nom | Del primer `-` fins al `¬` |
| Id. alumne, 1r cognom, 2n cognom, Nom, Document | Taula de detall |
| Qualificació | Vegeu més avall |

**Qualificació:** si després del primer `-` hi ha un valor numèric, es queda només el
número (p. ex. `7-Notable` → `7`). Si no, es deixa el valor original
(p. ex. `NP-No presentat`).

### Taula CSV (format creuat)

- Una fila per alumne: `Id. alumne`, `1r cognom`, `2n cognom`, `Nom`, `Document`.
- Dues files de capçalera: la primera amb el mòdul (codi i nom) i la segona amb els seus RA.
  La qualificació del mòdul en si (sense RA) apareix com a columna `Global`.
- Cada cel·la és la **Qualificació** de l'alumne per a aquell mòdul/RA; buida si no n'hi ha.
- El mòdul es determina pel codi fins al segment del cicle (`0156_IC10`, `M_OP_02_IC10`).

```
;;;;;0156_IC10 Anglès Professional (GM);
Id. alumne;1r cognom;2n cognom;Nom;Document;Global;01RA
...
```

## Limitacions

- No gestiona llistes paginades: només recorre els enllaços «Modifica» visibles.
- Depèn de l'estructura actual d'Esfer@ (`ng-click="toQualificacions(...)"`,
  taules `grades-table`). Si l'aplicació canvia, caldrà adaptar `popup.js`.
- Si una taula no carrega, l'error es mostra al popup i l'extracció continua amb el següent element.

## Privadesa

Les dades extretes (que inclouen dades personals d'alumnat, com el document d'identitat)
es guarden només al navegador (`chrome.storage.local`) i als fitxers que baixes.
Tracta aquests fitxers d'acord amb la normativa de protecció de dades del centre i
no els pugis al repositori.

## Estructura

```
extensio-extractor/
├── manifest.json   # Manifest V3; permisos: activeTab, scripting, storage
├── popup.html      # Interfície del popup
└── popup.js        # Recorregut, extracció i exportació
```
