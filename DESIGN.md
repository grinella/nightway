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
