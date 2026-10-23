'use client';

import { MapPin, Search, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, getApiErrorMessage } from '@/lib/api';

type ApiJob = {
  id: string;
  positionName: string;
  department: string;
  workMode: 'OFISTE' | 'UZAKTAN' | 'HIBRIT';
  requiredSkills: { id: string; name: string }[];
};

const workModeLabel = {
  OFISTE: 'Ofiste',
  UZAKTAN: 'Uzaktan',
  HIBRIT: 'Hibrit'
};

export default function JobsPage() {
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [query, setQuery] = useState('');
  const [workMode, setWorkMode] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState('');

  useEffect(() => {
    api.get<ApiJob[]>('/ilanlar')
      .then((response) => setJobs(response.data))
      .catch((err) => setError(getApiErrorMessage(err, 'Staj yerleri getirilemedi.')))
      .finally(() => setLoading(false));
  }, []);

  const visibleJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return jobs.filter((job) => {
      const searchableText = [
        job.positionName,
        job.department,
        ...job.requiredSkills.map((skill) => skill.name)
      ].join(' ').toLowerCase();

      return (!normalizedQuery || searchableText.includes(normalizedQuery)) && (!workMode || job.workMode === workMode);
    });
  }, [jobs, query, workMode]);

  async function apply(jobId: string) {
    setMessage('');
    setError('');
    setApplyingId(jobId);
    try {
      await api.post('/basvurular', { jobId });
      setMessage('Staj başvurunuz başarıyla alındı.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Başvuru gönderilemedi. Stajyer hesabıyla giriş yaptığınızdan emin olun.'));
    } finally {
      setApplyingId('');
    }
  }

  return (
    <DashboardShell title="Aktif Staj Yerleri">
      {message && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card className="mb-5">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 text-zinc-400" size={16} />
            <Input className="pl-9" placeholder="Rol, departman veya beceri ara" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select
            className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            value={workMode}
            onChange={(event) => setWorkMode(event.target.value)}
          >
            <option value="">Tüm çalışma şekilleri</option>
            <option value="OFISTE">Ofiste</option>
            <option value="UZAKTAN">Uzaktan</option>
            <option value="HIBRIT">Hibrit</option>
          </select>
        </div>
      </Card>

      {loading && <p className="text-sm text-zinc-500">Staj yerleri yükleniyor...</p>}
      {!loading && visibleJobs.length === 0 && !error && <p className="text-sm text-zinc-500">Aramanıza uygun aktif staj yeri bulunamadı.</p>}
      <div className="grid gap-4 lg:grid-cols-3">
        {visibleJobs.map((job) => (
          <Card key={job.id}>
            <p className="text-sm text-blue-700">{job.department}</p>
            <h2 className="mt-2 text-lg font-semibold">{job.positionName}</h2>
            <p className="mt-3 flex items-center gap-2 text-sm text-zinc-500"><MapPin size={16} /> {workModeLabel[job.workMode]}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {job.requiredSkills.map((skill) => <span key={skill.id} className="rounded-md bg-blue-50 px-2 py-1 text-xs text-blue-700">{skill.name}</span>)}
            </div>
            <Button className="mt-5 w-full" disabled={applyingId === job.id} onClick={() => apply(job.id)}>
              <Send size={16} className="mr-2" /> {applyingId === job.id ? 'Gönderiliyor...' : 'Staja başvur'}
            </Button>
          </Card>
        ))}
      </div>
    </DashboardShell>
  );
}
