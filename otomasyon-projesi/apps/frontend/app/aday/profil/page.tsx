'use client';

import { type FormEvent, useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, getApiErrorMessage } from '@/lib/api';

type CandidateProfile = {
  title?: string | null;
  summary?: string | null;
  user?: {
    phone?: string | null;
  };
  skills?: {
    skill: {
      name: string;
    };
  }[];
};

export default function CandidateProfilePage() {
  const [title, setTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [summary, setSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<CandidateProfile>('/aday/profil')
      .then((response) => {
        setTitle(response.data.title ?? '');
        setPhone(response.data.user?.phone ?? '');
        setSummary(response.data.summary ?? '');
        setSkills(response.data.skills?.map((item) => item.skill.name).join(', ') ?? '');
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Profil bilgileri getirilemedi.')))
      .finally(() => setLoading(false));
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    const skillList = skills
      .split(',')
      .map((skill) => skill.trim())
      .filter(Boolean);

    try {
      await api.patch('/aday/profil', { title, summary, phone, skills: skillList });
      setMessage('Profil bilgileri güncellendi.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Profil güncellenemedi. Giriş yaptığınızdan emin olun.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="Stajyer Profili">
      <div className="grid gap-5">
        <Card>
          <h2 className="font-semibold">Kişisel Bilgiler</h2>
          <p className="mt-1 text-sm text-zinc-500">Profiliniz ne kadar dolu olursa eşleşme kalitesi o kadar artar.</p>
          <form onSubmit={saveProfile} className="mt-5 grid gap-4 md:grid-cols-2">
            <Input disabled={loading || saving} placeholder="Ünvan" value={title} onChange={(event) => setTitle(event.target.value)} />
            <Input disabled={loading || saving} placeholder="Telefon" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            <Input disabled={loading || saving} className="md:col-span-2" placeholder="Özet" value={summary} onChange={(event) => setSummary(event.target.value)} />
            <label className="grid gap-2 text-sm font-medium text-zinc-700 md:col-span-2">
              Özellikler ve beceriler
              <textarea
                className="min-h-28 rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition placeholder:text-zinc-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                disabled={loading || saving}
                placeholder="React, TypeScript, iletişim, takım çalışması"
                value={skills}
                onChange={(event) => setSkills(event.target.value)}
              />
            </label>
            <Button disabled={loading || saving} type="submit">
              {saving ? 'Kaydediliyor...' : 'Profili güncelle'}
            </Button>
          </form>
        </Card>
      </div>
      {message && <p className="mt-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    </DashboardShell>
  );
}
