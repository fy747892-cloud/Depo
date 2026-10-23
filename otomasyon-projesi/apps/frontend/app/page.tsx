import Link from 'next/link';
import { ArrowRight, BrainCircuit, FileSearch, Workflow } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="app-shell min-h-screen">
      <section className="mx-auto grid min-h-screen max-w-6xl content-center gap-10 px-6 py-10 md:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-7">
          <div>
            <p className="mb-3 text-sm font-medium text-blue-700">AI destekli staj eşleştirme platformu</p>
            <h1 className="text-4xl font-bold tracking-normal text-zinc-950 md:text-6xl">Stajyer ve iş yeri eşleştirme sistemi</h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-zinc-600">
              Stajyer profilleri, CV analizi, staj yeri yönetimi, eşleşme süreçleri ve n8n otomasyonları için uçtan uca Türkçe yönetim deneyimi.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/giris" className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-white transition hover:bg-blue-700">
              Giriş yap <ArrowRight size={17} />
            </Link>
            <Link href="/kayit" className="inline-flex h-11 items-center rounded-md border border-blue-100 bg-white px-5 text-sm font-medium text-zinc-800 transition hover:border-blue-200 hover:bg-blue-50">
              Yeni hesap oluştur
            </Link>
          </div>
        </div>
        <div className="grid gap-4">
          {[
            { icon: FileSearch, title: 'CV Analizi', text: 'PDF/DOCX özgeçmişlerden beceri, eğitim, deneyim ve proje çıkarımı.' },
            { icon: BrainCircuit, title: 'AI Eşleştirme', text: 'Stajyer becerileri ile iş yeri beklentilerini 100 puan üzerinden karşılaştırır.' },
            { icon: Workflow, title: 'n8n Otomasyon', text: 'CV analizi, aday eşleştirme ve görüşme bildirimleri için webhook akışları.' }
          ].map((item) => (
            <div key={item.title} className="rounded-lg border border-blue-100 bg-white p-5 shadow-sm shadow-blue-950/5">
              <item.icon className="mb-4 text-blue-700" />
              <h2 className="font-semibold text-zinc-950">{item.title}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
