import { AboutCard } from "@/components/routes/AboutCard";
import { EvidenceLegend } from "@/components/routes/EvidenceLegend";

export default function NativeInfoPage() {
  return (
    <main className="grid gap-4 px-4 pb-8 pt-2">
      <h1 className="sr-only">Come leggere la mappa</h1>
      <EvidenceLegend />
      <AboutCard />
    </main>
  );
}
