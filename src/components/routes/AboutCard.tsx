import { PILOT } from "@/lib/config";

/** Cosa fa e cosa non fa NIGHTWAY, con le fonti dei dati. */
export function AboutCard() {
  return (
    <div className="glass-card p-4 text-sm text-dim">
      <p>
        NIGHTWAY confronta i percorsi a piedi su ciò che la mappa documenta e mostra dove i dati mancano. Area pilota: {PILOT.name}.
      </p>
      <p className="mt-2">
        Non valuta la sicurezza personale e non prevede reati: mostra caratteristiche ambientali documentate e i loro limiti. La scelta del percorso
        resta tua.
      </p>
      <p className="mt-2">
        Dati © contributori di{" "}
        <a href="https://www.openstreetmap.org/copyright" className="text-ink underline underline-offset-2">
          OpenStreetMap
        </a>{" "}
        (ODbL). Routing: Valhalla. Nessun account, nessun tragitto salvato.
      </p>
    </div>
  );
}
