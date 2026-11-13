# NIGHTWAY

Confronta percorsi pedonali a Roma sulle **caratteristiche ambientali documentate** su OpenStreetMap — illuminazione dichiarata, punti luce mappati, infrastruttura pedonale, servizi mappati — e mostra con la stessa evidenza **dove i dati mancano**. Un assistente vocale (agente ElevenLabs) risponde alle domande usando solo quei dati, a voce o in chat.

Progetto per [AgenticHack Rome](https://agentic.urbe.build/), 13–14 novembre 2026. Area pilota: **Testaccio / Ostiense**.

> NIGHTWAY non valuta la sicurezza personale, non prevede reati e non sa se un lampione è acceso. Mostra ciò che la mappa documenta e i limiti di quei dati.

## Cosa fa

1. Scegli partenza e arrivo sulla mappa, oppure nominali all'assistente («da Porta San Paolo al Mattatoio»).
2. Valhalla calcola da 1 a 3 percorsi pedonali reali: se ne esiste uno solo, ne vedi uno solo.
3. Ogni percorso viene diviso in tratti di circa 30 m, agganciati al way OSM percorso (distanza e direzione), e confrontato con i dati OSM dell'area.
4. Per ogni percorso vedi distanza, durata, **Evidence Coverage** (quanta parte del tracciato ha dati) e, solo se le evidenze bastano, l'**ERS** (Environmental Route Score, sperimentale).
5. Sulla mappa i tratti con illuminazione ignota sono disegnati tratteggiati, visibili quanto quelli noti.

## Avvio

```bash
npm install
cp .env.example .env.local   # aggiungi ELEVENLABS_API_KEY
npm run agent:setup          # crea l'agente su ElevenAgents e stampa ELEVENLABS_AGENT_ID
npm run dev                  # http://localhost:3000
```

Routing e mappa funzionano senza chiavi. `ELEVENLABS_API_KEY` attiva la lettura vocale del confronto; insieme a `ELEVENLABS_AGENT_ID` attiva l'assistente.

| Comando | Cosa fa |
|---|---|
| `npm test` | Test unitari (Vitest): normalizzazione, coverage, ERS, matching, provider, validazione |
| `npm run e2e` | Smoke test Playwright a 375 / 768 / 1024 / 1440 px (usa i provider reali) |
| `npm run typecheck` · `npm run lint` | Controlli statici |
| `npm run audit` | Rigenera `docs/AUDIT.md` dall'estrazione salvata (`-- --live` per interrogare Overpass) |
| `npm run agent:setup` | Crea o aggiorna l'agente e i suoi strumenti su ElevenAgents (prompt in `src/lib/agent/prompt.ts`) |
| `npm run snapshot` | Aggiorna `data/pilot-snapshot.json` con un'estrazione Overpass datata |

## Come sono calcolati i numeri

Dettaglio in `src/lib/scoring/` e `src/lib/geo/`; le soglie sono in `src/lib/config.ts` e sono **ipotesi di prodotto, non valori calibrati**.

| Dimensione | Peso | Valutabile dove | Punteggio |
|---|---:|---|---|
| Illuminazione dichiarata | 30% | il way ha il tag `lit` | `yes`/`automatic`/`24/7` = 100, `limited` = 50, `no` = 0 |
| Punti luce mappati | 20% | strade con almeno un `street_lamp` attribuito al percorso | quota di metri entro 35 m da un punto luce |
| Visibilità | 20% | mai, in questa versione | richiede dati 3D verificati |
| Infrastruttura pedonale | 20% | way pedonale o tag `sidewalk` presente | pedonale/marciapiede = 100, scale = 50, `sidewalk=no` = 0 |
| Servizi mappati | 10% | strade con almeno un servizio mappato entro 30 m | quota di metri con un servizio vicino |

- **Dato assente = ignoto.** Un tag mancante non entra nel punteggio e riduce la copertura; non vale mai zero.
- **Evidence Coverage** = metri valutabili / metri totali per dimensione, aggregati con i pesi.
- **ERS** = media pesata delle sole dimensioni valutabili, con pesi rinormalizzati; resta `null` sotto il 60% di copertura.
- **Punti luce:** attribuiti solo entro 15 m dal tracciato; se un'altra strada non adiacente è più vicina al punto luce, l'attribuzione è «incerta» e non entra nei calcoli.
- Se i percorsi hanno coperture molto diverse, l'app sconsiglia il confronto dei punteggi.

Secondo l'audit (`docs/AUDIT.md`) nell'area pilota il tag `lit` copre circa il 40% dei metri di rete e i punti luce mappati sono 162: con questi dati l'ERS resta quasi sempre «non calcolabile», ed è il comportamento voluto.

## Architettura

```text
Browser (Next.js + Leaflet)
   ├─ POST /api/routes  {origin, destination}
   ├─ POST /api/places  {query}             → luoghi con nome nei dati OSM dell'area
   ├─ POST /api/agent/session {mode}        → credenziale a tempo per l'agente ElevenAgents
   ├─ POST /api/speak   {text}              → sintesi vocale ElevenLabs
   └─ agente ElevenAgents (voce WebRTC o chat) ⇄ strumenti eseguiti nel browser
Route handler (Zod, rate limit, timeout)
   ├─ lib/routing/valhalla      percorsi pedonali, polyline6
   ├─ lib/osm/{overpass,dataset} una query per l'area, cache, più endpoint, snapshot di riserva
   ├─ lib/geo/{segment,match-evidence}
   ├─ lib/scoring/{coverage,ers}
   └─ lib/vision                 interfaccia + provider noop (disattivato)
```

L'assistente è un agente ElevenAgents (modello linguistico ospitato da ElevenLabs, voce italiana) con tre strumenti eseguiti nel browser: `find_place` (cerca luoghi per nome nei dati OSM dell'area), `compare_routes` (la stessa pipeline dell'API, e disegna i percorsi sulla mappa) e `route_streets` (evidenze strada per strada). L'agente è privato: il browser ottiene dal server una credenziale a tempo, la chiave non esce mai.

## Dati, provider e limiti

- **Routing:** Valhalla sul server pubblico FOSSGIS (`VALHALLA_URL`), fair use e senza SLA.
- **Evidenze:** OpenStreetMap via Overpass, © contributori di OpenStreetMap, licenza ODbL. Se Overpass non risponde entro 6 secondi l'app usa l'estrazione salvata in `data/pilot-snapshot.json` e lo dichiara nell'interfaccia con la data.
- **Mappa:** tile standard di OpenStreetMap, scurite via CSS; adatte a una demo, non a traffico elevato.
- **Vision:** interfaccia `VisionProvider` e flag `VISION_ENABLED` predisposti; nessun adapter Mapillary è collegato perché endpoint, classi, licenze e copertura non sono stati verificati con un token. L'app mostra «dati visivi non disponibili».
- **Privacy:** nessun account, nessun tragitto salvato, coordinate mai scritte nei log. Voce, domande all'assistente (con i punti selezionati) e testo da leggere sono elaborati da ElevenLabs.
- **Rate limit:** in memoria per istanza, sufficiente per la demo.
- **Layer ufficiale dei lampioni di Roma (Geoportale):** non verificato; non è usato.
- Rispetto alla specifica: la geometria usa una proiezione piana locale invece di Turf.js (pochi km, calcoli più semplici e testabili); il geocoder esterno è sostituito dalla ricerca per nome nei dati OSM dell'area.
