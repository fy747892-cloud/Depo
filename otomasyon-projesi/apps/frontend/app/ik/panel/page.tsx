import { CalendarClock, CheckCircle2, Search, UsersRound } from 'lucide-react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';

export default function HrDashboard() {
  return (
    <DashboardShell title="Staj Yönetim Paneli">
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: 'Açık Staj Yeri', value: '12', icon: Search },
          { title: 'Yeni Stajyer Başvurusu', value: '84', icon: UsersRound },
          { title: 'Görüşme', value: '9', icon: CalendarClock },
          { title: 'Eşleşme', value: '17', icon: CheckCircle2 }
        ].map((item) => (
          <Card key={item.title}>
            <item.icon className="mb-4 text-blue-700" />
            <p className="text-sm text-zinc-500">{item.title}</p>
            <p className="mt-2 text-3xl font-bold">{item.value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <h2 className="font-semibold">Stajyer Eşleşme Listesi</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500"><tr><th className="py-2">Stajyer</th><th>Staj Rolü</th><th>Skor</th><th>Durum</th></tr></thead>
            <tbody>
              {['Ayşe Demir', 'Mehmet Kaya', 'Elif Şahin'].map((name, index) => (
                <tr key={name} className="border-t border-border"><td className="py-3">{name}</td><td>Frontend Stajyeri</td><td>%{[88, 76, 69][index]}</td><td>İncelemede</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardShell>
  );
}
