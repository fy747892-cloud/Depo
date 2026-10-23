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
  firstName: z.string().min(2, 'Ad en az 2 karakter olmalı.'),
  lastName: z.string().min(2, 'Soyad en az 2 karakter olmalı.'),
  email: z.string().email('Geçerli bir e-posta girin.'),
  password: z.string().min(8, 'Parola en az 8 karakter olmalı.'),
  role: z.enum(['ADAY', 'YONETICI'], {
    required_error: 'Lütfen hesap türünüzü seçin.'
  })
});

export default function RegisterPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    defaultValues: { role: 'ADAY' },
    resolver: zodResolver(schema)
  });

  async function submit(values: z.infer<typeof schema>) {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/kayit', values);
      if (!data?.accessToken || !data?.user) {
        throw new Error('Invalid auth response');
      }

      setSession(data.accessToken, data.user);
      router.replace(data.user.role === 'YONETICI' ? '/yonetici/panel' : '/aday/panel');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Kayıt oluşturulamadı. Bilgilerinizi kontrol edip tekrar deneyin.'));
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
          Yeni hesap
        </div>
        <h1 className="text-2xl font-bold text-zinc-950">Staj yolculuğunuzu başlatın</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-500">
          Profilinizi oluşturun, CV yükleyin ve size uygun açık staj yerlerine başvurun.
        </p>
        <form onSubmit={form.handleSubmit(submit, showValidationError)} className="mt-6 grid gap-4">
          <Input placeholder="Ad" autoComplete="given-name" {...form.register('firstName')} />
          {form.formState.errors.firstName && <p className="text-sm text-red-600">{form.formState.errors.firstName.message}</p>}
          <Input placeholder="Soyad" autoComplete="family-name" {...form.register('lastName')} />
          {form.formState.errors.lastName && <p className="text-sm text-red-600">{form.formState.errors.lastName.message}</p>}
          <Input placeholder="E-posta" autoComplete="email" {...form.register('email')} />
          {form.formState.errors.email && <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>}
          <Input placeholder="Parola" type="password" autoComplete="new-password" {...form.register('password')} />
          {form.formState.errors.password && <p className="text-sm text-red-600">{form.formState.errors.password.message}</p>}
          <select
            className="h-10 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            {...form.register('role')}
          >
            <option value="ADAY">Stajyer</option>
            <option value="YONETICI">Yönetici</option>
          </select>
          {form.formState.errors.role && <p className="text-sm text-red-600">{form.formState.errors.role.message}</p>}
          {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <Button disabled={loading} type="submit">
            {loading ? 'Kaydediliyor...' : 'Kayıt ol'}
          </Button>
        </form>
      </Card>
    </main>
  );
}
