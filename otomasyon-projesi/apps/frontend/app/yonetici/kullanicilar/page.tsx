'use client';

import { ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, getApiErrorMessage } from '@/lib/api';

type UserRow = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  role: { name: 'ADAY' | 'YONETICI' };
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadUsers(nextSearch = search, nextRole = role) {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.get<UserRow[]>('/kullanicilar', {
        params: {
          search: nextSearch.trim() || undefined,
          role: nextRole || undefined
        }
      });
      setUsers(data);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Kullanıcılar getirilemedi. Yönetici hesabıyla giriş yaptığınızdan emin olun.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers('', '');
  }, []);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    loadUsers();
  }

  return (
    <DashboardShell title="Kullanıcı Yönetimi">
      {error && <p className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Card>
        <form onSubmit={applyFilters} className="grid gap-3 md:grid-cols-[1fr_220px_140px]">
          <Input placeholder="Kullanıcı ara" value={search} onChange={(event) => setSearch(event.target.value)} />
          <select
            className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="">Tüm roller</option>
            <option value="ADAY">Stajyer</option>
            <option value="YONETICI">Yönetici</option>
          </select>
          <Button disabled={loading} type="submit"><ShieldCheck size={16} className="mr-2" /> Uygula</Button>
        </form>
      </Card>
      <Card className="mt-5">
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500"><tr><th className="py-2">Ad Soyad</th><th>E-posta</th><th>Rol</th><th>Durum</th></tr></thead>
          <tbody>
            {loading && <tr><td className="py-4 text-zinc-500" colSpan={4}>Kullanıcılar yükleniyor...</td></tr>}
            {!loading && users.length === 0 && <tr><td className="py-4 text-zinc-500" colSpan={4}>Kullanıcı bulunamadı.</td></tr>}
            {users.map((user) => (
              <tr key={user.id} className="border-t border-border">
                <td className="py-3 font-medium">{user.firstName} {user.lastName}</td>
                <td>{user.email}</td>
                <td>{user.role.name}</td>
                <td>{user.isActive ? 'Aktif' : 'Pasif'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </DashboardShell>
  );
}
