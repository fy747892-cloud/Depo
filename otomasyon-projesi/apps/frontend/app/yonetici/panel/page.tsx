'use client';

import { BarChart3, BriefcaseBusiness, ClipboardList, MessageSquareText, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { api, getApiErrorMessage } from '@/lib/api';

type Analytics = {
  users: number;
  candidates: number;
  jobs: number;
  applications: number;
  interviews: number;
};

type StatusReport = {
  status: 'BASVURULDU' | 'INCELEMEDE' | 'MULAKAT' | 'KABUL' | 'RED';
  _count: { status: number };
};

const emptyAnalytics: Analytics = {
  users: 0,
  candidates: 0,
  jobs: 0,
  applications: 0,
  interviews: 0
};

const statusLabel: Record<StatusReport['status'], string> = {
  BASVURULDU: 'Başvuruldu',
  INCELEMEDE: 'İncelemede',
  MULAKAT: 'Görüşme',
  KABUL: 'Onaylandı',
  RED: 'Reddedildi'
};

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<Analytics>(emptyAnalytics);
  const [reports, setReports] = useState<StatusReport[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      setError('');
      try {
        const [analyticsResponse, reportsResponse] = await Promise.all([
          api.get<Analytics>('/yonetici/analitik'),
          api.get<StatusReport[]>('/yonetici/raporlar')
        ]);
        setAnalytics(analyticsResponse.data);
        setReports(reportsResponse.data);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Yönetici paneli verileri getirilemedi.'));
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const cards = useMemo(
    () => [
      { title: 'Kullanıcı', value: analytics.users, icon: Users },
      { title: 'Stajyer', value: analytics.candidates, icon: BarChart3 },
      { title: 'Staj Yeri', value: analytics.jobs, icon: BriefcaseBusiness },
      { title: 'Başvuru', value: analytics.applications, icon: ClipboardList },
      { title: 'Görüşme', value: analytics.interviews, icon: MessageSquareText }
    ],
    [analytics]
  );

  const totalApplications = Math.max(analytics.applications, 1);

  return (
    <DashboardShell title="Yönetici Paneli">
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4 md:grid-cols-5">
        {cards.map((item) => (
          <Card key={item.title}>
            <item.icon className="mb-4 text-blue-700" />
            <p className="text-sm text-zinc-500">{item.title}</p>
            <p className="mt-2 text-3xl font-bold">{loading ? '-' : item.value}</p>
          </Card>
        ))}
      </div>
      <Card className="mt-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold">Başvuru Durumları</h2>
            <p className="mt-1 text-sm text-zinc-500">Tüm staj başvurularının güncel dağılımı.</p>
          </div>
          <BarChart3 className="text-blue-700" />
        </div>
        <div className="mt-5 space-y-4">
          {loading && <p className="text-sm text-zinc-500">Raporlar yükleniyor...</p>}
          {!loading && reports.length === 0 && <p className="text-sm text-zinc-500">Henüz raporlanacak başvuru yok.</p>}
          {reports.map((report) => {
            const count = report._count.status;
            const percentage = Math.round((count / totalApplications) * 100);

            return (
              <div key={report.status}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-700">{statusLabel[report.status]}</span>
                  <span className="text-zinc-500">{count} başvuru</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-blue-700" style={{ width: `${percentage}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </DashboardShell>
  );
}
