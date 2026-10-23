import sqlite3


def veritabani_hazirla():
    conn = sqlite3.connect('servis_takip.db')
    cursor = conn.cursor()
    
    # 1. Personel / Kullanıcı Tablosu
    cursor.execute('''CREATE TABLE IF NOT EXISTS kullanicilar 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                       kullanici_adi TEXT UNIQUE, 
                       sifre TEXT, 
                       ad_soyad TEXT)''')
    
    # 2. Müşteriler Tablosu
    cursor.execute('''CREATE TABLE IF NOT EXISTS musteriler 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                       ad_soyad TEXT, 
                       telefon TEXT,
                       adres TEXT)''')
    
    # 3. GENEL CİHAZLAR Tablosu (Laptop, Telefon vb. hepsi burada)
    cursor.execute('''CREATE TABLE IF NOT EXISTS cihazlar 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                       musteri_id INTEGER, 
                       cihaz_turu TEXT, 
                       marka TEXT, 
                       model TEXT, 
                       seri_no TEXT UNIQUE,
                       FOREIGN KEY (musteri_id) REFERENCES musteriler (id))''')
    
    # 4. Servis Kayıtları / İş Emirleri
    cursor.execute('''CREATE TABLE IF NOT EXISTS servis_kayitlari 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, 
                       cihaz_id INTEGER, 
                       ariza TEXT, 
                       durum TEXT DEFAULT 'Beklemede', 
                       ucret REAL DEFAULT 0.0,
                       kayit_tarihi TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       FOREIGN KEY (cihaz_id) REFERENCES cihazlar (id))''')
    
    # İlk giriş için örnek admin hesabı
    cursor.execute("INSERT OR IGNORE INTO kullanicilar (kullanici_adi, sifre, ad_soyad) VALUES (?, ?, ?)", 
                   ('admin', '1234', 'Teknik Sorumlu'))
    
    conn.commit()
    conn.close()
    print("Sıfır ve güncel veritabanı oluşturuldu.")