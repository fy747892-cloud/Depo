'use client';

import { BriefcaseBusiness, CalendarDays, Plus, Trash2 } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, getApiErrorMessage } from '@/lib/api';

type HrJob = {
  id: string;
  positionName: string;
  department: string;
  description: string;
  educationRequirement?: string | null;
  experienceRequirement?: string | null;
  workMode: 'OFISTE' | 'UZAKTAN' | 'HIBRIT';
  deadline: string;
  requiredSkills: { id: string; name: string }[];
  _count?: { applications: number };
};

const workModeLabel = {
  OFISTE: 'Ofiste',
  UZAKTAN: 'Uzaktan',
  HIBRIT: 'Hibrit'
};

export default function HrJobsPage() {
  const [jobs, setJobs] = useState<HrJob[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState('');

  const totalApplications = useMemo(
    () => jobs.reduce((total, job) => total + (job._count?.applications ?? 0), 0),
    [jobs]
  );

  async function loadJobs() {
    setError('');
    try {
      const { data } = await api.get<HrJob[]>('/ilanlar');
      setJobs(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Staj yerleri getirilemedi.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadJobs();
  }, []);

  async function createJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const requiredSkills = String(form.get('requiredSkills') ?? '')
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    try {
      const { data } = await api.post<HrJob>('/ilanlar', {
        positionName: form.get('positionName'),
        department: form.get('department'),
        description: form.get('description'),
        requiredSkills,
        educationRequirement: form.get('educationRequirement') || undefined,
        experienceRequirement: form.get('experienceRequirement') || undefined,
        workMode: form.get('workMode'),
        deadline: form.get('deadline')
      });
      formElement.reset();
      setJobs((current) => [data, ...current]);
      setMessage('Staj yeri başarıyla yayınlandı.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Staj yeri yayınlanamadı. Stajyer veya yönetici hesabıyla giriş yaptığınızdan emin olun.'));
    } finally {
      setSaving(false);
    }
  }

  async function removeJob(jobId: string) {
    setMessage('');
    setError('');
    setRemovingId(jobId);
    try {
      await api.delete(`/ilanlar/${jobId}`);
      setJobs((current) => current.filter((job) => job.id !== jobId));
      setMessage('Staj yeri yayından kaldırıldı.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Staj yeri yayından kaldırılamadı.'));
    } finally {
      setRemovingId('');
    }
  }

  return (
    <DashboardShell title="Staj İlanları Yönetimi">
      {message && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="mb-5 grid gap-4 md:grid-cols-3">
        <Card className="rounded-md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-blue-700">
              <BriefcaseBusiness size={20} />
            </span>
            <div>
              <p className="text-sm text-zinc-500">Yayındaki staj yeri</p>
              <p className="text-2xl font-semibold text-zinc-950">{jobs.length}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-md">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-sky-50 text-sky-700">
              <CalendarDays size={20} />
            </span>
            <div>
              <p className="text-sm text-zinc-500">Toplam stajyer başvurusu</p>
              <p className="text-2xl font-semibold text-zinc-950">{totalApplications}</p>
            </div>
          </div>
        </Card>
        <Card className="rounded-md bg-zinc-950 text-white">
          <p className="text-sm text-zinc-300">Otomasyon</p>
          <p className="mt-2 text-lg font-semibold">Staj yeri yayınlandığında eşleşme webhook'u tetiklenir.</p>
        </Card>
      </div>

      <Card className="rounded-md">
        <h2 className="font-semibold">Yeni Staj Yeri Oluştur</h2>
        <form onSubmit={createJob} className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Staj rolü
            <Input name="positionName" placeholder="Frontend Stajyeri" required />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            İş yeri / departman
            <Input name="department" placeholder="Teknoloji Departmanı" required />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Çalışma şekli
            <select name="workMode" className="h-10 rounded-md border border-border bg-white px-3 text-sm" defaultValue="HIBRIT">
              <option value="OFISTE">Ofiste</option>
              <option value="UZAKTAN">Uzaktan</option>
              <option value="HIBRIT">Hibrit</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Son başvuru tarihi
            <Input name="deadline" type="date" required />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Beklenen beceriler
            <Input name="requiredSkills" placeholder="React, SQL, İngilizce" required />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700">
            Eğitim beklentisi
            <Input name="educationRequirement" placeholder="Üniversite öğrencisi veya yeni mezun" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700 md:col-span-2">
            Deneyim beklentisi
            <Input name="experienceRequirement" placeholder="Okul projeleri veya temel ürün geliştirme deneyimi" />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-700 md:col-span-2">
            Staj açıklaması
            <textarea
              name="description"
              className="min-h-32 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              placeholder="Staj kapsamını, öğrenme hedeflerini, mentorluk yapısını ve çalışma düzenini yazın."
              required
            />
          </label>
          <Button disabled={saving} type="submit" className="md:w-fit">
            <Plus size={16} className="mr-2" />
            {saving ? 'Yayınlanıyor...' : 'Staj Yerini Yayınla'}
          </Button>
        </form>
      </Card>

      <Card className="mt-5 rounded-md">
        <h2 className="font-semibold">Yayındaki Staj Yerleri</h2>
        <div className="mt-4 grid gap-3">
          {loading && <p className="text-sm text-zinc-500">Staj yerleri yükleniyor...</p>}
          {!loading && jobs.length === 0 && <p className="text-sm text-zinc-500">Yayında staj yeri bulunamadı.</p>}
          {jobs.map((job) => (
            <div key={job.id} className="flex flex-col gap-3 rounded-md border border-border p-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-medium text-blue-700">{job.department} · {workModeLabel[job.workMode]}</p>
                <h3 className="mt-1 font-semibold">{job.positionName}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{job.description}</p>
                <p className="mt-2 text-sm text-zinc-500">{job.requiredSkills.map((skill) => skill.name).join(', ') || 'Beceri belirtilmedi'}</p>
                <p className="mt-1 text-xs text-zinc-500">Stajyer başvurusu: {job._count?.applications ?? 0}</p>
              </div>
              <Button
                className="bg-zinc-800 hover:bg-zinc-900 md:w-auto"
                disabled={removingId === job.id}
                type="button"
                onClick={() => removeJob(job.id)}
              >
                <Trash2 size={16} className="mr-2" />
                {removingId === job.id ? 'Kaldırılıyor...' : 'Yayından Kaldır'}
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}
