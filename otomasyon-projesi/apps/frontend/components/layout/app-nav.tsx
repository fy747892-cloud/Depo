'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BriefcaseBusiness, ClipboardList, FilePlus2, LayoutDashboard, LogOut, Settings, ShieldCheck, UserRound, Users } from 'lucide-react';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';

export function AppNav() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const hydrate = useAuthStore((state) => state.hydrate);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!hasHydrated) hydrate();
  }, [hasHydrated, hydrate]);

  const candidateLinks = [
    { href: '/aday/panel', label: 'Stajyer Paneli', icon: UserRound },
    { href: '/aday/profil', label: 'Profil Düzenle', icon: Settings },
    { href: '/aday/ilanlar', label: 'Staj Yerleri', icon: LayoutDashboard },
    { href: '/aday/basvurular', label: 'Başvurularım', icon: ClipboardList }
  ];
  const companyLinks = [
    { href: '/ik/panel', label: 'Şirket Paneli', icon: BriefcaseBusiness },
    { href: '/ik/ilanlar', label: 'Staj İlanları', icon: FilePlus2 },
    { href: '/ik/basvurular', label: 'Gelen Başvurular', icon: ClipboardList },
    { href: '/yonetici/panel', label: 'Yönetici', icon: ShieldCheck },
    { href: '/yonetici/kullanicilar', label: 'Kullanıcılar', icon: Users }
  ];
  const links = [
    ...(user?.role === 'YONETICI' ? companyLinks : candidateLinks),
    { href: '/hesap', label: 'Hesap Ayarları', icon: Settings }
  ];

  function handleLogout() {
    logout();
    router.replace('/giris');
  }

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-20 border-b border-blue-100 bg-white/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="font-bold text-blue-900">Staj Eşleştirme</div>
          <button className="rounded-md px-2 py-1 text-sm font-medium text-red-700" type="button" onClick={handleLogout}>
            Çıkış
          </button>
        </div>
        <nav className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="flex shrink-0 items-center gap-2 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-700">
              <item.icon size={16} />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <aside className="hidden min-h-screen w-64 shrink-0 border-r border-blue-100 bg-white p-5 md:flex md:flex-col">
        <div className="mb-8 text-lg font-bold text-blue-900">Staj Eşleştirme</div>
        <nav className="space-y-2">
          {links.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-700 transition hover:bg-blue-50 hover:text-blue-700">
              <item.icon size={18} />
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          className="mt-auto flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50"
          type="button"
          onClick={handleLogout}
        >
          <LogOut size={18} />
          Çıkış yap
        </button>
      </aside>
    </>
  );
}
