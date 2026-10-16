"use client";
export default function ListError({ reset }: { reset: () => void }) {
    return <main className="page-width py-16"><h1 className="section-heading">Liste şu an yüklenemedi</h1><p className="mt-4 text-muted">Geçici bir bağlantı sorunu olabilir. Biraz sonra yeniden deneyebilirsin.</p><button onClick={reset} className="button-secondary mt-6">Yeniden dene</button></main>;
}
