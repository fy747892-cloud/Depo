# Depo

Format öncesi bir araya getirilen proje kaynak kodları.

- `cevre-projesi/`: Firebase kullanan çevre projesi; HTML, CSS, JavaScript, kurallar ve görseller.
- `otomasyon-projesi/`: İşe alım otomasyonu; kurulum için klasörün README.md dosyasına bakın. `.env.example` dosyasından yerel `.env` oluşturun.
- `teknik-servis-programi/`: Python / PyQt6 teknik servis uygulaması. `pip install -r requirements.txt` ardından `python main.py` ile çalıştırılır.

## Yedek kapsamı

Bu depo kaynak kodu yedeğidir. `.env`, oturum bilgileri, yerel veritabanları, yüklenen müşteri belgeleri, bağımlılıklar, önbellekler ve loglar dahil değildir. Teknik servis `servis_takip.db` ve `session.json` dosyaları ile otomasyon `.env` dosyasını, kullanılan PostgreSQL verisini ve varsa `uploads/` belgelerini format öncesinde ayrıca güvenli bir konuma yedekleyin. Firebase üzerindeki canlı veriler bu depoya aktarılmamıştır. Önceki Git geçmişleri dahil edilmemiştir; mevcut dosyalar aktarılmıştır.
