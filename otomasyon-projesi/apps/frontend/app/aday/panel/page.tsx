'use client';

import Link from 'next/link';
import { Bell, BriefcaseBusiness, FileText, Send, Target, Tags, UserRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

type ApplicationStatus = 'BASVURULDU' | 'INCELEMEDE' | 'MULAKAT' | 'KABUL' | 'RED';

type CandidateProfile = {
  title?: string | null;
  summary?: string | null;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
  skills?: {
    skill: {
      name: string;
    };
  }[];
};

type CandidateApplication = {
  id: string;
  status: ApplicationStatus;
  totalScore: number;
  job: {
    positionName: string;
    department: string;
  };
};

type ApiJob = {
  id: string;
  positionName: string;
  department: string;
  workMode: 'OFISTE' | 'UZAKTAN' | 'HIBRIT';
  requiredSkills: { id: string; name: string }[];
};

const statusLabel: Record<ApplicationStatus, string> = {
  BASVURULDU: 'Başvuruldu',
  INCELEMEDE: 'İncelemede',
  MULAKAT: 'Görüşme',
  KABUL: 'Onaylandı',
  RED: 'Reddedildi'
};

export default function CandidateDashboard() {
  const user = useAuthStore((state) => state.user);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [error, setError] = useState('');
  const [applyingId, setApplyingId] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<CandidateProfile>('/aday/profil'),
      api.get<CandidateApplication[]>('/basvurular'),
      api.get<ApiJob[]>('/ilanlar')
    ])
      .then(([profileResponse, applicationResponse, jobsResponse]) => {
        setProfile(profileResponse.data);
        setApplications(applicationResponse.data);
        setJobs(jobsResponse.data);
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Stajyer paneli bilgileri getirilemedi.')));
  }, []);

  const openJobs = Math.max(jobs.length - applications.length, 0);
  const highestScore = applications.reduce((max, application) => Math.max(max, application.totalScore), 0);
  const activeApplications = applications.filter((application) => !['KABUL', 'RED'].includes(application.status)).length;
  const profileCompletion = useMemo(() => {
    const checks = [
      Boolean(profile?.user?.firstName),
      Boolean(profile?.user?.lastName),
      Boolean(profile?.user?.email),
      Boolean(profile?.user?.phone),
      Boolean(profile?.title),
      Boolean(profile?.summary),
      Boolean(profile?.skills?.length)
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [profile]);
  const profileSkills = profile?.skills?.map((item) => item.skill.name) ?? [];
  const recommendedJobs = jobs
    .filter((job) => !applications.some((application) => application.job.positionName === job.positionName))
    .slice(0, 3);

  async function apply(jobId: string) {
    setError('');
    setApplyingId(jobId);
    try {
      const { data } = await api.post<CandidateApplication>('/basvurular', { jobId });
      setApplications((current) => [data, ...current]);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Başvuru gönderilemedi.'));
    } finally {
      setApplyingId('');
    }
  }

  return (
    <DashboardShell title="Stajyer Paneli">
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { title: 'Profil Tamamlanma', value: `%${profileCompletion}`, icon: UserRound },
          { title: 'Aktif Başvuru', value: String(activeApplications), icon: FileText },
          { title: 'En Yüksek Skor', value: highestScore ? `%${highestScore}` : '-', icon: Target },
          { title: 'Başvurulabilir İlan', value: String(openJobs), icon: Bell }
        ].map((item) => (
          <Card key={item.title}>
            <item.icon className="mb-4 text-blue-700" />
            <p className="text-sm text-zinc-500">{item.title}</p>
            <p className="mt-2 text-3xl font-bold">{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm text-blue-700">{profile?.title || 'Stajyer adayı'}</p>
              <h2 className="mt-1 text-lg font-semibold text-zinc-950">
                {profile?.user ? `${profile.user.firstName} ${profile.user.lastName}` : `${user?.firstName ?? ''} ${user?.lastName ?? ''}`}
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                {profile?.summary || 'Profil özetinizi ekleyerek şirketlerin sizi daha hızlı değerlendirmesini sağlayın.'}
              </p>
            </div>
            <Link href="/aday/profil">
              <Button type="button">Profili düzenle</Button>
            </Link>
          </div>
          <div className="mt-5 border-t border-border pt-4">
            <div className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <Tags size={16} className="text-blue-700" />
              Beceriler ve özellikler
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {profileSkills.length > 0 ? (
                profileSkills.map((skill) => (
                  <span key={skill} className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">{skill}</span>
                ))
              ) : (
                <p className="text-sm text-zinc-500">Profilinizi düzenleyerek becerilerinizi ekleyin.</p>
              )}
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-zinc-950">Son Başvurular</h2>
          <div className="mt-4 space-y-3">
            {applications.length === 0 && <p className="text-sm text-zinc-500">Henüz başvuru yok.</p>}
            {applications.slice(0, 3).map((application) => (
              <div key={application.id} className="rounded-md border border-border p-3">
                <p className="font-medium text-zinc-950">{application.job.positionName}</p>
                <p className="mt-1 text-sm text-zinc-500">{application.job.department} · {statusLabel[application.status]} · %{application.totalScore}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-zinc-950">Önerilen Staj İlanları</h2>
            <p className="text-sm text-zinc-500">Başvuru yapmadığınız güncel ilanlar.</p>
          </div>
          <Link href="/aday/ilanlar" className="text-sm font-medium text-blue-700">Tümünü gör</Link>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {recommendedJobs.map((job) => (
            <div key={job.id} className="rounded-md border border-border p-4">
              <BriefcaseBusiness className="text-blue-700" size={20} />
              <p className="mt-3 text-sm text-blue-700">{job.department}</p>
              <h3 className="mt-1 font-semibold text-zinc-950">{job.positionName}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {job.requiredSkills.slice(0, 3).map((skill) => <span key={skill.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">{skill.name}</span>)}
              </div>
              <Button className="mt-4 w-full" disabled={applyingId === job.id} onClick={() => apply(job.id)}>
                <Send size={16} className="mr-2" /> {applyingId === job.id ? 'Gönderiliyor...' : 'Başvur'}
              </Button>
            </div>
          ))}
          {recommendedJobs.length === 0 && <p className="text-sm text-zinc-500">Şu an önerilecek yeni ilan bulunmuyor.</p>}
        </div>
      </Card>
    </DashboardShell>
  );
}
