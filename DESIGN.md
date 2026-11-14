# NIGHTWAY — Design

Unica fonte per palette, materiali e font. Modalità: **Operate** (strumento a mappa). Direzione: **Notte al sodio, in vetro**.

## Scena d'uso
Telefono in mano per strada, di sera, occhi adattati al buio: tema scuro, mappa a tutto schermo, comandi che galleggiano sopra come lastre di vetro. La disposizione segue le app di navigazione (Google Maps, Waze): indicazione in alto, pulsanti rotondi a destra, pannello dei percorsi in basso, navigazione sotto il pollice.

## Elementi in pagina
| Elemento | Posizione | Contenuto |
|---|---|---|
| Mappa | tutto lo schermo | percorsi, punti luce, dati mappati attorno, area pilota |
| Barra in alto | capsula in alto | nome, cosa fare adesso, errori, pulsante per cancellare A e B |
| Pulsanti flottanti | colonna a destra | dati mappati attorno (interruttore), inquadra i percorsi |
| Pannello | in basso su telefono (trascinabile: basso / metà / alto), colonna a sinistra su desktop | contenuto della sezione attiva |
| Barra di navigazione | capsula in basso su telefono, sotto la barra in alto su desktop | Percorsi · Assistente · Legenda |
| Attribuzione OSM | sotto la barra in alto | sempre visibile, mai coperta dal pannello |

## Materiale: vetro
Il vetro è una lastra tinta che **devia** ciò che le sta dietro, senza sfocarlo. La rifrazione è un filtro SVG di spostamento (`feDisplacementMap`) applicato allo sfondo dell'elemento con `backdrop-filter: url(#nw-lens)`: la mappa di spostamento è neutra al centro e piega la luce verso l'interno lungo i bordi, come una lente. Nessun `blur()` in tutto il progetto.

| Classe | Uso | Tinta | Lente |
|---|---|---|---|
| `.glass` | comandi piccoli: barra in alto, navigazione, pulsanti flottanti | 66% | bordo largo, effetto evidente |
| `.glass.glass-dense` | superfici dove si legge: il pannello | 90% | bordo stretto |
| `.glass-card` | schede e righe di dati dentro una lastra | velo chiaro 6% | nessuna (sta già sul vetro) |

Ogni lastra ha un riflesso chiaro sul bordo superiore, un filo di luce sugli altri lati e un'ombra morbida sotto. Senza sfocatura la leggibilità dipende dalla tinta: non scendere sotto il 66% dove c'è testo.

**Limite verificato (iOS 26.5, simulatore):** WebKit accetta `backdrop-filter: url()` ma non applica lo spostamento allo sfondo. Su iPhone il vetro mantiene tinta, saturazione e riflessi; la rifrazione vera si vede su Chrome (desktop e Android).

## Colore
Neutri blu-notte, un solo accento: l'ambra dei lampioni al sodio. L'ambra significa «illuminazione dichiarata / punto luce mappato», selezione corrente o azione primaria.

| Token | Valore | Uso |
|---|---|---|
| `--color-night` | `#0b0f17` | fondo, tinta del vetro |
| `--color-ink` | `#f2f5fa` | testo |
| `--color-dim` | `#b4bdd0` | testo secondario |
| `--color-sodium` | `#ffb347` | illuminazione dichiarata, selezione, azione primaria, focus |
| `--color-unknown` | `#a3aec4` | dato ignoto |
| `--color-unlit` | `#7aa2e8` | `lit=no` dichiarato |
| `--color-alert` | `#ffa397` | errori |

## Codifica delle evidenze (mai solo colore)
- `lit` yes / automatic / 24/7: linea ambra continua.
- `lit=limited`: linea ambra a tratti lunghi.
- `lit=no`: linea azzurra continua.
- `lit` ignoto: linea grigia a tratti corti, stesso spessore delle altre.
- Punto luce attribuito: disco ambra pieno. Attribuzione incerta: anello ambra vuoto.

## Tipografia
Font di sistema (San Francisco su Apple, Roboto su Android): l'app deve sembrare parte del telefono. Numeri tabellari. Nelle schede dei percorsi la durata è il dato più grande (1.75rem, bold), come nelle app di navigazione.

## Controlli
- `.btn`: capsula di vetro, alta almeno 44 px. `.btn-primary`: ambra piena, una sola per schermata.
- `.btn-row`: voce di elenco toccabile, alta almeno 48 px.
- `.fab`: pulsante rotondo flottante da 48 px; l'icona diventa ambra quando è attivo.
- `.chip`: etichetta di dato dentro una scheda.
- `.field`: campo di testo incassato nel vetro.
- Icone a tratto uniforme (24 px, spessore 1.75), mai emoji.

## Movimento
Il pannello segue il dito e si aggancia alla posizione più vicina in 280 ms; i controlli rispondono alla pressione con una lieve riduzione di scala. Nessuna animazione d'ingresso. `prefers-reduced-motion` azzera le transizioni.

## App iOS: comandi nativi (dal 14/11/2026)

Nell'app iOS il vetro è il Liquid Glass di sistema, non quello ricostruito in CSS. La struttura segue l'app Musica:

- **Barra a schede** nativa (`UITabBarController`): Mappa, Assistente, Legenda. Si riduce quando la pagina scorre.
- **Capsula di stato** sopra la barra (`UITabAccessory`), come il mini player: dice cosa fare o riassume il percorso scelto (durata, distanza, luce nota). Un tocco apre il pannello dei percorsi; la X cancella partenza e arrivo.
- **Pannello dei percorsi**: foglio di sistema a due altezze; a metà altezza la mappa dietro resta utilizzabile.
- **Pulsanti rotondi** in vetro sulla mappa: vista 3D, dati attorno, inquadra i percorsi.
- **Assistente e Legenda** sono pagine intere con titolo grande.

Il contenuto di ogni schermata è una pagina web (`/native/map`, `/native/routes`, `/native/assistant`, `/native/info`) con sfondo trasparente; l'involucro (`native/ios/App/App/Shell.swift`) ricopia lo stato dell'app (`src/lib/app-state.ts`) da una pagina all'altra. La versione web nel browser mantiene il vetro in CSS descritto sopra.

## Mappa 3D

MapLibre GL JS con lo stile vettoriale scuro di OpenFreeMap (dati OpenStreetMap, schema OpenMapTiles, senza chiave): vista inclinata, edifici estrusi dalle altezze mappate, alone sui punti luce del percorso scelto. L'attribuzione resta sempre visibile in alto a sinistra.

## L'assistente sulla mappa

L'assistente non sta in un pannello: è un globo al sodio agganciato alla mappa. Un tocco avvia o chiude la conversazione a voce; fermo quando è spento, respira in ascolto, pulsa mentre parla. Accanto, una didascalia riporta ciò che sta dicendo. Quando descrive un percorso o una strada fa volare la camera lungo il tracciato (strumento `show_route`), con un globo più piccolo che fa da guida; lo stesso volo parte da «Guarda il percorso» nel pannello, che intanto si chiude. Un tocco sulla mappa interrompe il volo. La scheda Assistente è la trascrizione, con il campo per scrivere.
