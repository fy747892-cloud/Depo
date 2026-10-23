'use client';

import { Clock3, FileCheck2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Card } from '@/components/ui/card';
import { api, getApiErrorMessage } from '@/lib/api';

type ApplicationStatus = 'BASVURULDU' | 'INCELEMEDE' | 'MULAKAT' | 'KABUL' | 'RED';

type CandidateApplication = {
  id: string;
  status: ApplicationStatus;
  totalScore: number;
  job: {
    positionName: string;
    department: string;
  };
};

const statusLabel: Record<ApplicationStatus, string> = {
  BASVURULDU: 'Başvuruldu',
  INCELEMEDE: 'İncelemede',
  MULAKAT: 'Görüşme',
  KABUL: 'Onaylandı',
  RED: 'Reddedildi'
};

export default function CandidateApplicationsPage() {
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CandidateApplication[]>('/basvurular')
      .then((response) => setApplications(response.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Staj başvuruları getirilemedi. Stajyer hesabıyla giriş yaptığınızdan emin olun.')))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardShell title="Staj Başvurularım">
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="grid gap-4">
        {loading && <p className="text-sm text-zinc-500">Staj başvuruları yükleniyor...</p>}
        {!loading && applications.length === 0 && !error && <p className="text-sm text-zinc-500">Henüz staj başvurunuz bulunmuyor.</p>}
        {applications.map((application) => (
          <Card key={application.id} className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-blue-700">{application.job.department}</p>
              <h2 className="mt-1 font-semibold text-zinc-950">{application.job.positionName}</h2>
              <p className="mt-2 flex items-center gap-2 text-sm text-zinc-500"><Clock3 size={16} /> Durum: {statusLabel[application.status]}</p>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-blue-50 px-4 py-3">
              <FileCheck2 size={18} className="text-blue-700" />
              <span className="text-sm font-medium text-blue-900">AI Skoru %{application.totalScore}</span>
            </div>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
