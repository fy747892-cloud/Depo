'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { api, getApiErrorMessage } from '@/lib/api';
import { useAuthStore } from '@/store/auth-store';

const schema = z.object({
  email: z.string().email('Geçerli bir e-posta girin.'),
  password: z.string().min(8, 'Parola en az 8 karakter olmalı.')
});

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  async function submit(values: z.infer<typeof schema>) {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/giris', values);
      if (!data?.accessToken || !data?.user?.role) {
        throw new Error('Invalid auth response');
      }
      setSession(data.accessToken, data.user);
      router.replace(data.user.role === 'YONETICI' ? '/yonetici/panel' : '/aday/panel');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Giriş yapılamadı. Bilgilerinizi kontrol edip tekrar deneyin.'));
    } finally {
      setLoading(false);
    }
  }

  function showValidationError() {
    setError('Lütfen formdaki hataları düzeltin.');
  }

  return (
    <main className="app-shell grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <div className="mb-6 inline-flex rounded-md bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
          StajBul
        </div>
        <h1 className="text-2xl font-bold text-zinc-950">Tekrar hoş geldiniz</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Başvurularınızı, eşleşmelerinizi ve görüşmelerinizi tek panelden yönetin.
        </p>
        <form onSubmit={form.handleSubmit(submit, showValidationError)} className="mt-6 space-y-4">
          <Input placeholder="E-posta" autoComplete="email" {...form.register('email')} />
          {form.formState.errors.email && <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>}
          <Input placeholder="Parola" type="password" autoComplete="current-password" {...form.register('password')} />
          {form.formState.errors.password && <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>}
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button className="w-full" disabled={loading} type="submit">
            {loading ? 'Giriş yapılıyor...' : 'Giriş yap'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
