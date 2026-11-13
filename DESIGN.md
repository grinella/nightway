# NIGHTWAY — Design

Unica fonte per palette e font. Modalità: **Operate** (strumento a mappa). Direzione: **Notte al sodio**.

## Scena d'uso
Telefono in mano per strada, di sera, occhi adattati al buio. Per questo il tema è scuro: una schermata chiara abbaglierebbe. La mappa è la superficie principale; i pannelli sono opachi e stanno ai bordi.

## Colore
Neutri blu-notte, un solo accento: l'ambra dei lampioni al sodio. L'ambra significa sempre e solo «illuminazione dichiarata / punto luce mappato» o azione primaria.

| Token | Valore | Uso |
|---|---|---|
| `--color-night` | `#0b0f17` | fondo pagina e mappa |
| `--color-panel` | `#121826` | pannelli |
| `--color-raised` | `#1a2233` | elementi selezionati, campi |
| `--color-line` | `#2a3550` | bordi |
| `--color-ink` | `#e8ecf4` | testo |
| `--color-dim` | `#a3aec4` | testo secondario |
| `--color-sodium` | `#ffb347` | illuminazione dichiarata, azione primaria, focus |
| `--color-unknown` | `#8f9bb3` | dato ignoto |
| `--color-unlit` | `#7aa2e8` | `lit=no` dichiarato |
| `--color-alert` | `#ff9a8a` | errori |

## Codifica delle evidenze (mai solo colore)
- `lit` yes / automatic / 24/7: linea ambra continua.
- `lit=limited`: linea ambra a tratti lunghi.
- `lit=no`: linea azzurra continua.
- `lit` ignoto: linea grigia a tratti corti, stesso spessore delle altre.
- Punto luce attribuito: disco ambra pieno. Attribuzione incerta: anello ambra vuoto.

## Tipografia
Atkinson Hyperlegible Next per tutto: nata per la leggibilità in condizioni difficili. Scala fissa in rem (0.8125 / 0.875 / 1 / 1.125 / 1.375), numeri tabellari per distanze, tempi e percentuali. Nessun font display.

## Forma
Raggio 10px sui contenitori, 8px sui controlli. Elevazione con il solo bordo, senza ombre. Nessun vetro, nessun gradiente.

## Layout
- ≥1024px: mappa a tutto schermo, pannello laterale sinistro di 26rem.
- <1024px: mappa in alto (52svh), pannello sotto, scorrimento naturale della pagina.

## Movimento
Transizioni di stato a 160ms; nessuna animazione d'ingresso. `prefers-reduced-motion` le azzera.
