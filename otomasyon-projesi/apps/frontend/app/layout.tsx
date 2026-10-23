import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stajyer ve İş Yeri Eşleştirme Sistemi',
  description: 'AI destekli stajyer ve iş yeri eşleştirme yönetimi'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
