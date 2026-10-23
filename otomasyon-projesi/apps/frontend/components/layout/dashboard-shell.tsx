import { AppNav } from './app-nav';

export function DashboardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="app-shell flex">
      <AppNav />
      <section className="min-h-screen flex-1 p-5 pt-32 md:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-500">Stajyer ve iş yeri eşleşme yönetimi</p>
            <h1 className="text-2xl font-bold text-zinc-950">{title}</h1>
          </div>
        </div>
        {children}
      </section>
    </main>
  );
}
