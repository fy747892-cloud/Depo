# AI Destekli Stajyer ve İş Yeri Eşleştirme Sistemi

Next.js App Router, NestJS, PostgreSQL, Prisma, JWT, OpenAI ve n8n webhook entegrasyonu ile hazırlanmış stajyer ve iş yeri eşleştirme platformu.

## Mimari

- `apps/frontend`: Türkçe Next.js arayüzü, TailwindCSS, shadcn/ui yaklaşımı, Zustand, Axios, React Hook Form, Zod.
- `apps/backend`: NestJS modüler API, JWT kimlik doğrulama, rol bazlı yetkilendirme, dosya yükleme, n8n ve OpenAI servisleri.
- `prisma`: PostgreSQL veri modeli, enumlar, ilişkiler, indeksler ve zaman damgaları.
- `packages/shared`: Frontend ve backend arasında paylaşılabilir TypeScript tipleri.

## Kurulum ve Çalıştırma

PowerShell bu bilgisayarda `npm.ps1` çalıştırmayı engelleyebildiği için komutlarda `npm.cmd` kullanın.

1. Bağımlılıkları kurun: `npm.cmd install`
2. PostgreSQL'i başlatın: `docker compose up -d`
3. Prisma istemcisini üretin: `npm.cmd run prisma:generate`
4. Veritabanını migrate edin: `npm.cmd run prisma:migrate`
5. Demo kullanıcıları oluşturun: `npm.cmd run prisma:seed`
6. Backend ve frontend'i birlikte başlatın: `npm.cmd run dev`

Uygulama adresleri:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:4000/api`
- Prisma Studio: `npm.cmd run prisma:studio`

n8n staj yeri otomasyonu için `.env` dosyasındaki `N8N_JOB_CREATED_WEBHOOK_URL` değerine kendi webhook adresinizi yazın. Staj yeri oluşturulduğunda backend `job.created` payload'unu bu adrese gönderir.

Demo hesaplar:

- Stajyer: `aday@demo.com` / `Demo12345!`
- Yönetici: `yonetici@demo.com` / `Demo12345!`

## Ana Akışlar

- Stajyer kayıt olur, profilini doldurur, fotoğraf ve PDF/DOCX CV yükler.
- Backend güvenli dosya doğrulaması yapar ve CV analizini n8n webhook'una gönderir.
- n8n/OpenAI beceri, eğitim, deneyim, sertifika ve proje verilerini çıkarır.
- Stajyer bir staj yerine başvurduğunda eşleşme skoru 100 üzerinden hesaplanır.
- İş yeri yetkilileri başvuruları filtreler, AI analizini inceler, görüşme planlar ve karar verir.
- Yöneticiler kullanıcıları, rolleri, raporları, analitiği ve sistem ayarlarını yönetir.

## Roller

- `ADAY`: Stajyer profili, CV, başvuru ve bildirim ekranları.
- `YONETICI`: Kullanıcı, rol, rapor, analitik ve ayar yönetimi.

## Güvenlik

- JWT + bcrypt parola saklama.
- Rol bazlı guard yapısı.
- DTO seviyesinde doğrulama ve global validation pipe.
- Prisma ile parametreli sorgular.
- Helmet ile temel XSS ve güvenlik başlıkları.
- Ortam değişkenleri üzerinden gizli bilgi yönetimi.
