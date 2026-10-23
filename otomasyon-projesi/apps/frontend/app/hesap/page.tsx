'use client';

import { KeyRound, Mail, Save, UserRound } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, getApiErrorMessage } from '@/lib/api';
import { type User, useAuthStore } from '@/store/auth-store';

type AccountResponse = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: { name: User['role'] };
};

export default function AccountPage() {
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const [firstName, setFirstName] = useState(user?.firstName ?? '');
  const [lastName, setLastName] = useState(user?.lastName ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get<AccountResponse>('/kullanicilar/ben')
      .then((response) => {
        setFirstName(response.data.firstName);
        setLastName(response.data.lastName);
        setEmail(response.data.email);
        setPhone(response.data.phone ?? '');
        setUser({
          id: response.data.id,
          email: response.data.email,
          firstName: response.data.firstName,
          lastName: response.data.lastName,
          role: response.data.role.name
        });
      })
      .catch((err) => setError(getApiErrorMessage(err, 'Hesap bilgileri getirilemedi.')))
      .finally(() => setLoading(false));
  }, [setUser]);

  async function saveAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);

    try {
      const payload = {
        firstName,
        lastName,
        email,
        phone: phone || undefined,
        password: password || undefined
      };
      const { data } = await api.patch<AccountResponse>('/kullanicilar/ben', payload);
      setUser({
        id: data.id,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role.name
      });
      setPassword('');
      setMessage('Hesap bilgileri güncellendi.');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Hesap bilgileri güncellenemedi.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <DashboardShell title="Hesap Ayarları">
      {message && <p className="mb-4 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-5 lg:grid-cols-[1fr_0.7fr]">
        <Card>
          <div className="flex items-center gap-3">
            <UserRound className="text-blue-700" size={22} />
            <div>
              <h2 className="font-semibold text-zinc-950">Profil Bilgileri</h2>
              <p className="text-sm text-zinc-500">Ad, iletişim ve giriş bilgilerinizi güncelleyin.</p>
            </div>
          </div>

          <form onSubmit={saveAccount} className="mt-5 grid gap-4 md:grid-cols-2">
            <Input disabled={loading || saving} placeholder="Ad" autoComplete="given-name" value={firstName} onChange={(event) => setFirstName(event.target.value)} />
            <Input disabled={loading || saving} placeholder="Soyad" autoComplete="family-name" value={lastName} onChange={(event) => setLastName(event.target.value)} />
            <Input disabled={loading || saving} className="md:col-span-2" type="email" placeholder="E-posta" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input disabled={loading || saving} className="md:col-span-2" placeholder="Telefon" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
            <Input disabled={loading || saving} className="md:col-span-2" type="password" placeholder="Yeni parola (isteğe bağlı)" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} />
            <Button disabled={loading || saving} type="submit" className="md:col-span-2">
              <Save size={16} className="mr-2" /> {saving ? 'Kaydediliyor...' : 'Değişiklikleri kaydet'}
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="font-semibold text-zinc-950">Hesap Özeti</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 text-blue-700" size={18} />
              <div>
                <p className="text-zinc-500">E-posta</p>
                <p className="font-medium text-zinc-950">{email || '-'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <KeyRound className="mt-0.5 text-blue-700" size={18} />
              <div>
                <p className="text-zinc-500">Hesap Türü</p>
                <p className="font-medium text-zinc-950">{user?.role === 'YONETICI' ? 'Şirket / Yönetici' : 'Stajyer'}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </DashboardShell>
  );
}
