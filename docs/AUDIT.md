# Audit dei dati — area pilota

Generato da `npm run audit` (`scripts/audit.mts`). I numeri sono calcolati sull'estrazione indicata, non stimati.

```text
Area pilota: Testaccio / Ostiense, Roma — bbox S 41.866, W 12.464, N 41.886, E 12.488
Data estrazione: 2026-11-13T21:29:50.092Z (dati OSM al 2026-11-13T21:28:33Z, via overpass.openstreetmap.fr)
Rete analizzata (m): 237068 su 4334 way con tag highway percorribili
Rete con lit noto (m / %): 95176 / 40.1%
Rete con lit ignoto (m / %): 141892 / 59.9%
Punti street_lamp mappati (n): 162
Densità punti mappati (n/km di rete): 0.68
Servizi e attività mappati come nodi (n): 858
```

La densità riguarda i **punti mappati**, non i lampioni esistenti.

## Illuminazione dichiarata (`lit`)

| lit | Metri | Quota |
|---|---:|---:|
| `assente` | 141892 | 59.9% |
| `yes` | 92346 | 39.0% |
| `no` | 2830 | 1.2% |

## Tipo di way (`highway`)

| highway | Metri | Quota |
|---|---:|---:|
| `footway` | 96330 | 40.6% |
| `residential` | 44334 | 18.7% |
| `service` | 32674 | 13.8% |
| `secondary` | 20278 | 8.6% |
| `cycleway` | 11889 | 5.0% |
| `tertiary` | 9051 | 3.8% |
| `pedestrian` | 6726 | 2.8% |
| `path` | 5038 | 2.1% |
| `primary` | 4664 | 2.0% |
| `unclassified` | 2339 | 1.0% |
| `track` | 1907 | 0.8% |
| `steps` | 1708 | 0.7% |
| `secondary_link` | 65 | 0.0% |
| `tertiary_link` | 65 | 0.0% |

## Marciapiede (`sidewalk`)

| sidewalk | Metri | Quota |
|---|---:|---:|
| `assente` | 213616 | 90.1% |
| `both` | 12136 | 5.1% |
| `right` | 7143 | 3.0% |
| `no` | 2341 | 1.0% |
| `left` | 1009 | 0.4% |
| `separate` | 822 | 0.3% |

## Superficie (`surface`)

| surface | Metri | Quota |
|---|---:|---:|
| `assente` | 106886 | 45.1% |
| `asphalt` | 103940 | 43.8% |
| `sett` | 8952 | 3.8% |
| `paving_stones` | 4475 | 1.9% |
| `paved` | 3834 | 1.6% |
| `unpaved` | 1595 | 0.7% |
| `pebblestone` | 1456 | 0.6% |
| `compacted` | 1369 | 0.6% |
| `ground` | 1114 | 0.5% |
| `fine_gravel` | 1024 | 0.4% |
| `cobblestone` | 1019 | 0.4% |
| `concrete` | 972 | 0.4% |
| `gravel` | 129 | 0.1% |
| `metal` | 86 | 0.0% |
| `dirt` | 57 | 0.0% |
| `grass` | 51 | 0.0% |
| `sand` | 49 | 0.0% |
| `wood` | 37 | 0.0% |
| `rubber` | 20 | 0.0% |
| `concrete:plates` | 3 | 0.0% |
