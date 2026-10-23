'use client';

import { CalendarPlus, Check, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, getApiErrorMessage } from '@/lib/api';

type ApplicationStatus = 'BASVURULDU' | 'INCELEMEDE' | 'MULAKAT' | 'KABUL' | 'RED';

type HrApplication = {
  id: string;
  status: ApplicationStatus;
  totalScore: number;
  matchingResult?: unknown;
  candidate?: {
    user?: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  job?: {
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

function getMissingSkills(result: unknown) {
  if (!result || typeof result !== 'object') return '-';
  const missingSkills = (result as { missingSkills?: unknown }).missingSkills;
  if (!Array.isArray(missingSkills)) return '-';
  const text = missingSkills.filter((skill): skill is string => typeof skill === 'string' && skill.trim().length > 0).join(', ');
  return text || '-';
}

function getCandidateName(application: HrApplication) {
  const user = application.candidate?.user;
  return user ? `${user.firstName} ${user.lastName}` : 'Stajyer bilgisi yok';
}

function getCandidateEmail(application: HrApplication) {
  return application.candidate?.user?.email ?? '-';
}

function getPositionName(application: HrApplication) {
  return application.job?.positionName ?? 'Staj rolü bilgisi yok';
}

export default function HrApplicationsPage() {
  const [applications, setApplications] = useState<HrApplication[]>([]);
  const [search, setSearch] = useState('');
  const [position, setPosition] = useState('');
  const [minScore, setMinScore] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState('');

  async function loadApplications() {
    setError('');
    try {
      const { data } = await api.get<HrApplication[]>('/basvurular', { params: { view: 'hr' } });
      setApplications(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Başvurular getirilemedi. Stajyer veya yönetici hesabıyla giriş yaptığınızdan emin olun.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  const visibleApplications = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const normalizedPosition = position.trim().toLowerCase();
    const score = Number(minScore || 0);

    return applications.filter((application) => {
      const fullName = getCandidateName(application).toLowerCase();
      const email = getCandidateEmail(application).toLowerCase();
      const job = getPositionName(application).toLowerCase();

      return (
        (!normalizedSearch || fullName.includes(normalizedSearch) || email.includes(normalizedSearch)) &&
        (!normalizedPosition || job.includes(normalizedPosition)) &&
        (!score || application.totalScore >= score)
      );
    });
  }, [applications, minScore, position, search]);

  async function updateStatus(applicationId: string, status: ApplicationStatus) {
    setMessage('');
    setError('');
    setPendingAction(`${applicationId}:${status}`);
    try {
      const { data } = await api.patch<HrApplication>(`/basvurular/${applicationId}/durum`, { status });
      setApplications((current) => current.map((application) => (application.id === applicationId ? { ...application, status: data.status } : application)));
      setMessage(status === 'KABUL' ? 'Başvuru onaylandı.' : status === 'RED' ? 'Başvuru reddedildi.' : 'Başvuru durumu güncellendi.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Başvuru durumu güncellenemedi.'));
    } finally {
      setPendingAction('');
    }
  }

  async function scheduleInterview(applicationId: string) {
    setMessage('');
    setError('');
    setPendingAction(`${applicationId}:MULAKAT`);
    try {
      const scheduledAt = new Date();
      scheduledAt.setDate(scheduledAt.getDate() + 1);
      scheduledAt.setHours(10, 0, 0, 0);

      await api.post('/mulakatlar', {
        applicationId,
        scheduledAt: scheduledAt.toISOString(),
        location: 'Online'
      });
      await api.patch(`/basvurular/${applicationId}/durum`, { status: 'MULAKAT' });
      setApplications((current) => current.map((application) => (application.id === applicationId ? { ...application, status: 'MULAKAT' } : application)));
      setMessage('Görüşme yarın saat 10:00 için planlandı.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Görüşme planlanamadı.'));
    } finally {
      setPendingAction('');
    }
  }

  return (
    <DashboardShell title="Staj Başvurusu İnceleme">
      {message && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Card>
        <div className="grid gap-3 md:grid-cols-3">
          <Input placeholder="Stajyer adı veya e-posta" value={search} onChange={(event) => setSearch(event.target.value)} />
          <Input placeholder="Staj rolü filtresi" value={position} onChange={(event) => setPosition(event.target.value)} />
          <Input placeholder="Minimum skor" type="number" value={minScore} onChange={(event) => setMinScore(event.target.value)} />
        </div>
      </Card>
      <Card className="mt-5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-zinc-500">
              <tr><th className="py-2">Stajyer</th><th>Staj Rolü</th><th>AI Skoru</th><th>Eksik Beceriler</th><th>Durum</th><th>İşlem</th></tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td className="py-4 text-zinc-500" colSpan={6}>Başvurular yükleniyor...</td></tr>
              )}
              {!loading && visibleApplications.length === 0 && (
                <tr><td className="py-4 text-zinc-500" colSpan={6}>Gösterilecek başvuru bulunamadı.</td></tr>
              )}
              {visibleApplications.map((application) => (
                <tr key={application.id} className="border-t border-border">
                  <td className="py-3">
                    <p className="font-medium">{getCandidateName(application)}</p>
                    <p className="text-xs text-zinc-500">{getCandidateEmail(application)}</p>
                  </td>
                  <td>{getPositionName(application)}</td>
                  <td>%{application.totalScore}</td>
                  <td>{getMissingSkills(application.matchingResult)}</td>
                  <td>{statusLabel[application.status]}</td>
                  <td>
                    <div className="flex gap-2">
                      <Button
                        className="h-9 px-3"
                        disabled={pendingAction === `${application.id}:MULAKAT`}
                        title="Görüşme planla"
                        type="button"
                        onClick={() => scheduleInterview(application.id)}
                      >
                        <CalendarPlus size={15} />
                      </Button>
                      <Button
                        className="h-9 bg-blue-700 px-3 hover:bg-blue-800"
                        disabled={pendingAction === `${application.id}:KABUL`}
                        title="Onayla"
                        type="button"
                        onClick={() => updateStatus(application.id, 'KABUL')}
                      >
                        <Check size={15} />
                      </Button>
                      <Button
                        className="h-9 bg-zinc-800 px-3 hover:bg-zinc-900"
                        disabled={pendingAction === `${application.id}:RED`}
                        title="Reddet"
                        type="button"
                        onClick={() => updateStatus(application.id, 'RED')}
                      >
                        <X size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DashboardShell>
  );
}
