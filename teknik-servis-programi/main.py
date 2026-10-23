import sys
import sqlite3
import json
import os
import shutil
from datetime import datetime

# PyQt6 arayüz bileşenleri: pencere, panel, tablo, buton, giriş alanı ve mesaj kutuları için kullanılır.
from PyQt6.QtWidgets import (QApplication, QComboBox, QTableWidgetItem, QTextEdit, QWidget, QVBoxLayout, QHBoxLayout, 
                             QLineEdit, QPushButton, QLabel, QFrame, QTableWidget, QHeaderView, QCheckBox, QMessageBox)

# Qt hizalama, klavye ve doğrulama yardımcıları arayüz davranışlarını yönetir.
from PyQt6.QtCore import QRegularExpression, Qt
from PyQt6.QtGui import QFont, QRegularExpressionValidator

#--- OTURUM İŞEMLERİ ---

# Oturum bilgisinin tutulacağı küçük JSON dosyasının adıdır.
CONFIG_FILE = "session.json"

def oturum_bilgisi_kaydet(ad_soyad):
    # Kullanıcı "Oturumu Açık Tut" derse personel adını dosyaya yazar.
    with open(CONFIG_FILE, "w") as f:
        json.dump({"oturum_acik": True, "personel": ad_soyad}, f)

def oturum_bilgisi_sil():
    # Oturum kapatılınca kayıtlı session dosyasını temizler.
    if os.path.exists(CONFIG_FILE):
        try: os.remove(CONFIG_FILE)
        except: pass

def oturum_kontrol():
    # Program açılışında daha önce açık bırakılmış oturum var mı diye bakar.
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r") as f:
                data = json.load(f)
                return data.get("oturum_acik", False), data.get("personel", "")
        except: return False, ""
    return False, ""
#--- VERİTABANI BAĞLAMA ---
# --- VERİTABANI BAĞLANTISI VE TABLO YAPILANDIRMASI ---
def veritabani_hazirla():
    # SQLite veritabanı dosyasına bağlanır; dosya yoksa otomatik oluşturulur.
    conn = sqlite3.connect('servis_takip.db')
    cursor = conn.cursor()
    
    # Kullanıcı, müşteri ve cihaz temel tablolarını oluşturur.
    cursor.execute('CREATE TABLE IF NOT EXISTS kullanicilar (id INTEGER PRIMARY KEY AUTOINCREMENT, kullanici_adi TEXT UNIQUE, sifre TEXT, ad_soyad TEXT)')
    cursor.execute('CREATE TABLE IF NOT EXISTS musteriler (id INTEGER PRIMARY KEY AUTOINCREMENT, ad_soyad TEXT, telefon TEXT, adres TEXT)')
    cursor.execute('CREATE TABLE IF NOT EXISTS cihazlar (id INTEGER PRIMARY KEY AUTOINCREMENT, musteri_id INTEGER, cihaz_turu TEXT, marka TEXT, model TEXT, seri_no TEXT UNIQUE)')
    
    # Servis kayıtları tablosunu tüm sütunlarla (yapilan_islem dahil) oluştur
    cursor.execute('''CREATE TABLE IF NOT EXISTS servis_kayitlari 
                      (id INTEGER PRIMARY KEY AUTOINCREMENT, cihaz_id INTEGER, ariza TEXT, 
                       durum TEXT DEFAULT "Beklemede", ucret REAL DEFAULT 0.0, 
                       personel_adi TEXT, yapilan_islem TEXT)''')
    
    # Mevcut veritabanına sütun ekleme kontrolü (OperationalError önleyici)
    try:
        # Eski veritabanlarında eksik olabilecek yapılan işlem alanını eklemeyi dener.
        cursor.execute("ALTER TABLE servis_kayitlari ADD COLUMN yapilan_islem TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass # Sütun zaten varsa devam et

    # Admin hesabını güncelle
    # Varsayılan yönetici hesabını sabit bilgilerle yeniden oluşturur.
    cursor.execute("DELETE FROM kullanicilar WHERE kullanici_adi = 'admin'")
    cursor.execute("INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad) VALUES (?, ?, ?)", 
                   ('admin', '1234', 'Fatih Yıldız'))
    
    # Tüm tablo ve kullanıcı değişikliklerini kaydedip bağlantıyı kapatır.
    conn.commit()
    conn.close() # BAĞLANTIYI SADECE BURADA KAPATIYORUZ
#--- ANA SAYFA GÖRÜNÜŞ VE FONKSİYONLAR ---
class AnaSayfa(QWidget):
    def __init__(self, personel_adi):
        super().__init__()

        # Giriş yapan personelin adı ekranda, kayıtlarda ve yetki kontrolünde kullanılır.
        self.personel_adi = personel_adi

        # Ana ekran açılmadan önce veritabanının güncel yapıda olduğundan emin olur.
        veritabani_hazirla()

        # Teknik servis ekranını tam ekran çalıştırır ve ana arka planı beyaz yapar.
        self.showFullScreen()
        self.setStyleSheet("background-color: white;")

        # Ana sayfa bileşenlerini kurar ve tabloyu ilk verilerle doldurur.
        self.arayuz_olustur()
        self.tabloyu_yenile()
    #--- GİRİŞ YAPTIKTAN SONRA ÇIKAN İLK EKRAN ---
    def arayuz_olustur(self):
        layout = QHBoxLayout(self)
        layout.setContentsMargins(0, 0, 0, 0)
        layout.setSpacing(0)
        #--- AÇILIR YAN MENÜ ---
        sidebar = QFrame()
        sidebar.setFixedWidth(300)
        sidebar.setStyleSheet("background-color: black;")
        s_lay = QVBoxLayout(sidebar)
        s_lay.setContentsMargins(30, 60, 30, 30)
        #--- LOGO ---
        # --- LOGO OLUŞTURMA VE DÜZENE EKLEME ---
        logo = QLabel("YALÇIN & YILDIZ\nTEKNİK SERVİS")
        logo.setWordWrap(True)
        logo.setAlignment(Qt.AlignmentFlag.AlignCenter)
        logo.setFixedWidth(240)
        logo.setStyleSheet("""color: white; font-size: 20px; font-weight: 900; letter-spacing: 1px; margin-bottom: 40px; border: none;""")
        s_lay.addWidget(logo)
        #--- MENÜ BUTONLARI ---
        self.btn_yeni = self.nav_btn("YENİ SERVİS KAYDI") 
        self.btn_yeni.clicked.connect(self.yeni_kayit_formu_ac) 
        s_lay.addWidget(self.btn_yeni) 
        self.btn_liste = self.nav_btn("TÜM CİHAZLAR")
        self.btn_liste.clicked.connect(self.tabloyu_yenile)
        s_lay.addWidget(self.btn_liste)
        self.btn_yedek = self.nav_btn("SİSTEMİ YEDEKLE")
        self.btn_yedek.clicked.connect(self.veritabani_yedekle)
        s_lay.addWidget(self.btn_yedek)
        #--- ADMİN PANELİ ---
        if self.personel_adi in ["Teknik Sorumlu", "Fatih Yıldız"]:
            self.btn_admin = self.nav_btn("YÖNETİCİ PANELİ")
            self.btn_admin.clicked.connect(self.admin_paneli_ac)
            s_lay.addWidget(self.btn_admin)
        else:
            self.btn_sifre = self.nav_btn("ŞİFREMİ DEĞİŞTİR")
            self.btn_sifre.clicked.connect(self.sifre_degistir_paneli_ac)
            s_lay.addWidget(self.btn_sifre)
        
        s_lay.addStretch()
        #--- OTURUM KAPAT ---
        self.btn_logout = QPushButton("OTURUMU KAPAT")
        self.btn_logout.setCursor(Qt.CursorShape.PointingHandCursor)
        self.btn_logout.setStyleSheet("QPushButton { color: #ff4d4d; text-align: left; padding: 15px 0; border: none; font-weight: 800; font-size: 11px; } QPushButton:hover { color: white; }")
        self.btn_logout.clicked.connect(self.oturum_kapat_onay)
        s_lay.addWidget(self.btn_logout)
       
        #--- İŞ TABLOSU ---
        info = QLabel(f"OTURUM: {self.personel_adi.upper()}")
        info.setStyleSheet("color: #444; font-size: 10px; font-weight: bold; margin-bottom: 10px;")
        s_lay.addWidget(info)
        icerik = QFrame()
        self.icerik_layout = QVBoxLayout(icerik)
        self.icerik_layout.setContentsMargins(60, 60, 60, 60) 
        baslik = QLabel("GÜNCEL İŞ LİSTESİ")
        baslik.setStyleSheet("color: black; font-size: 40px; font-weight: 800; letter-spacing: -2px;")
        self.icerik_layout.addWidget(baslik)
        #--- ARAMA ÇUBUĞU ---
        self.arama_cubugu = QLineEdit()
        self.arama_cubugu.setPlaceholderText("Müşteri adı veya marka/model ile ara...")
        self.arama_cubugu.setStyleSheet("QLineEdit { background-color: #f8f8f8; border: 1px solid #ddd; border-radius: 10px; padding: 12px; color: black; font-size: 14px; margin-bottom: 10px; } QLineEdit:focus { border: 1px solid black; }")
        self.arama_cubugu.textChanged.connect(self.tabloyu_yenile)
        self.icerik_layout.addWidget(self.arama_cubugu)
        #--- FİLTRELER ---
        filtre_layout = QHBoxLayout()
        filtre_layout.setSpacing(10)
        self.durum_butonlari = {}
        durumlar = ["Hepsi", "Beklemede", "Tamirde", "Tamamlandı", "Teslim Edildi"]
        
        for durum in durumlar:
            btn = QPushButton(durum.upper())
            btn.setCheckable(True)
            btn.setCursor(Qt.CursorShape.PointingHandCursor)
            btn.setStyleSheet("""
                QPushButton { 
                    background-color: #f8f8f8; border: 1px solid #ddd; border-radius: 15px; 
                    padding: 8px 15px; font-size: 11px; font-weight: bold; color: #666; 
                }
                QPushButton:checked { 
                    background-color: black; color: white; border: 1px solid black; 
                }
                QPushButton:hover:not(:checked) { background-color: #eee; }
            """)
            btn.clicked.connect(lambda ch, d=durum: self.durum_filtrele(d))
            filtre_layout.addWidget(btn)
            self.durum_butonlari[durum] = btn
        
        filtre_layout.addStretch()
        self.durum_butonlari["Hepsi"].setChecked(True)
        self.icerik_layout.addLayout(filtre_layout)
        #--- ARAMA YAPARKEN ÇIKAN ÖNERİLER ---
        self.oneri_listesi = QFrame(self)
        self.oneri_listesi.setStyleSheet("background-color: #000000; border-radius: 10px; border: 1px solid #333;")
        self.oneri_listesi.hide()
        self.oneri_layout = QVBoxLayout(self.oneri_listesi)
        self.oneri_layout.setContentsMargins(5, 5, 5, 5)
        #--- TABLO ---
        self.tablo = QTableWidget()
        self.tablo.setColumnCount(7)
        self.tablo.setHorizontalHeaderLabels(["ID", "CİHAZ", "MÜŞTERİ", "MARKA/MODEL", "DURUM", "PERSONEL", "İŞLEM"])
        self.tablo.setStyleSheet(self.tablo_stili())
        self.tablo.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        self.tablo.verticalHeader().setVisible(False)
        self.tablo.cellDoubleClicked.connect(lambda row, col: self.cihaz_duzenle_paneli_ac(row))
        
        self.icerik_layout.addWidget(self.tablo)
        layout.addWidget(sidebar)
        layout.addWidget(icerik)

    def nav_btn(self, txt):
        # Yan menüdeki tüm navigasyon butonları aynı stil ve imleç davranışını kullanır.
        b = QPushButton(txt)
        b.setCursor(Qt.CursorShape.PointingHandCursor)
        b.setStyleSheet("QPushButton { color: #666; text-align: left; padding: 15px 0; border: none; font-weight: 700; font-size: 12px; } QPushButton:hover { color: white; }")
        return b

    def tablo_stili(self):
        # İş listesi tablosunun hücre, başlık ve seçim renklerini tek merkezden döndürür.
        return """
            QTableWidget { 
                border: none; 
                background-color: white; 
                gridline-color: #f2f2f2; 
                font-size: 14px; 
                color: black; 
                selection-background-color: #f0f0f0; 
                selection-color: black; 
                outline: none;
                qproperty-wordWrap: false;
            }
            QTableWidget::item:focus { 
                background-color: #f0f0f0; 
                border: none; 
            }
            QHeaderView::section { 
                background-color: white; 
                padding: 15px; 
                border: none; 
                border-bottom: 2px solid black; 
                font-weight: bold; 
                font-size: 13px; 
                text-align: left; 
                color: black; 
            }
            QTableWidget::item { 
                padding: 5px 15px;
                border-bottom: 1px solid #f2f2f2; 
            }
        """

# VERİTABANINDAKİ KAYITLARI TABLOYA AKTARAN VE FİLTRELEYEN FONKSİYON
    def tabloyu_yenile(self):
        self.tablo.setRowCount(0) # Mevcut tabloyu temizle
        kelime = self.arama_cubugu.text().lower().strip() # Arama metnini al
        filtre = getattr(self, 'aktif_durum_filtresi', "Hepsi") # Aktif filtreyi kontrol et
        
        conn = sqlite3.connect('servis_takip.db')
        cur = conn.cursor()
        
        # SQL Sorgusu: Arama terimine ve durum filtresine göre verileri çeker
        sorgu = """
            SELECT s.id, c.cihaz_turu, m.ad_soyad, 
                   (CASE WHEN c.marka = c.model THEN c.marka ELSE c.marka || ' ' || c.model END), 
                   s.durum, s.personel_adi 
            FROM servis_kayitlari s 
            JOIN cihazlar c ON s.cihaz_id = c.id 
            JOIN musteriler m ON c.musteri_id = m.id 
            WHERE (m.ad_soyad LIKE ? OR c.marka LIKE ? OR c.model LIKE ? OR c.cihaz_turu LIKE ?)
        """
        parametreler = [f'%{kelime}%'] * 4
        
        if filtre != "Hepsi":
            sorgu += " AND s.durum = ?"
            parametreler.append(filtre)
            
        sorgu += " ORDER BY s.id DESC"
        
        cur.execute(sorgu, parametreler)
        veriler = cur.fetchall()
        
        # Çekilen her bir satırı tabloya yerleştir
        for satir_ind, veri in enumerate(veriler):
            self.tablo.insertRow(satir_ind)
            self.tablo.setRowHeight(satir_ind, 45) # Satır yüksekliğini sabitle
            
            # 0'dan 5'e kadar olan verileri (ID, Cihaz, Müşteri vb.) hücrelere ekle
            for sutun_ind, v in enumerate(veri):
                item = QTableWidgetItem(str(v))
                item.setTextAlignment(Qt.AlignmentFlag.AlignCenter) # Metni ortala
                
                # ID hücresine (Sütun 0) benzersiz kimliği gizli veri olarak ata
                if sutun_ind == 0: 
                    item.setData(Qt.ItemDataRole.UserRole, v)
        
                # Durum hücresi (Sütun 4) için aşamaya göre renk belirle
                if sutun_ind == 4:
                    if v == "Beklemede": item.setForeground(Qt.GlobalColor.gray)
                    elif v == "Tamirde": item.setForeground(Qt.GlobalColor.darkYellow)
                    elif v == "Tamamlandı": item.setForeground(Qt.GlobalColor.blue)
                    elif v == "Teslim Edildi": item.setForeground(Qt.GlobalColor.darkGreen)
                
                self.tablo.setItem(satir_ind, sutun_ind, item)

            # --- 6. SÜTUN: DÜZENLE BUTONUNU OLUŞTUR VE YERLEŞTİR ---
            edit_btn = QPushButton("DÜZENLE")
            edit_btn.setCursor(Qt.CursorShape.PointingHandCursor)
            edit_btn.setStyleSheet("""
                QPushButton {
                    background: #333; color: white; font-weight: bold; 
                    border-radius: 5px; padding: 5px; font-size: 10px;
                }
                QPushButton:hover { background: #444; }
            """)
            # Lambda fonksiyonu ile butonun tıklandığı satırın indeksini yakala
            edit_btn.clicked.connect(lambda ch, r=satir_ind: self.cihaz_duzenle_paneli_ac(r))
            self.tablo.setCellWidget(satir_ind, 6, edit_btn)
            
        conn.close()
    def admin_paneli_ac(self):
        # Yönetici paneli açılırken servis kayıtlarından özet istatistikleri toplar.
        conn = sqlite3.connect('servis_takip.db')
        cur = conn.cursor()

        # Toplam, bekleyen ve tamamlanmış iş sayılarını rapor kutularında göstermek için çeker.
        cur.execute("SELECT COUNT(*) FROM servis_kayitlari")
        toplam = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM servis_kayitlari WHERE durum = 'Beklemede'")
        bekleyen = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM servis_kayitlari WHERE durum IN ('Tamamlandı', 'Teslim Edildi')")
        biten = cur.fetchone()[0]
        
        # Yönetici paneli için ana ekranın üstüne yarı saydam bir katman açar.
        self.adm_ov = QFrame(self)
        self.adm_ov.setGeometry(self.rect())
        self.adm_ov.setStyleSheet("background: rgba(255, 255, 255, 0.9);")
        
        # Siyah panel rapor ve personel yönetimi alanlarını içinde taşır.
        box = QFrame(self.adm_ov)
        box.setFixedSize(950, 700) # Butonlar için genişlik biraz artırıldı
        box.setStyleSheet("background: black; border-radius: 30px;")
        box.move((self.width()-950)//2, (self.height()-700)//2)
        
        # Panel içi ana dikey yerleşimi ve kenar boşluklarını ayarlar.
        l = QVBoxLayout(box)
        l.setContentsMargins(40, 40, 40, 40)

        # Günlük servis raporu başlığı ve yan yana istatistik kutuları eklenir.
        l.addWidget(QLabel("GÜNLÜK SERVİS RAPORU", styleSheet="color: white; font-size: 14px; font-weight: 800; letter-spacing: 2px;"))
        h_stats = QHBoxLayout()
        h_stats.addLayout(self.stat_kutusu("TOPLAM İŞ", str(toplam)))
        h_stats.addLayout(self.stat_kutusu("BEKLEYEN", str(bekleyen)))
        h_stats.addLayout(self.stat_kutusu("TAMAMLANAN", str(biten)))
        l.addLayout(h_stats)
        
        # Rapor alanı ile personel tablosu arasına görsel ayırıcı çizgi koyar.
        l.addSpacing(20)
        l.addWidget(QFrame(styleSheet="background: #222; maxHeight: 1px;"))
        l.addSpacing(20)

        # Personel listesinin başlığı ve tablo başlıkları hazırlanır.
        l.addWidget(QLabel("PERSONEL LİSTESİ", styleSheet="color: white; font-size: 14px; font-weight: 800; letter-spacing: 2px;"))
        self.p_tablo = QTableWidget()
        self.p_tablo.setColumnCount(5)
        self.p_tablo.setHorizontalHeaderLabels(["PERSONEL ADI", "KULLANICI ADI", "DURUM", "ŞİFRE", "İŞLEM"])
        self.p_tablo.verticalHeader().setVisible(False)
        self.p_tablo.setStyleSheet("""
            QTableWidget { border: none; background-color: black; gridline-color: #222; font-size: 13px; color: white; outline: none; }
            QHeaderView::section { background-color: #111; padding: 12px; border: none; border-bottom: 2px solid white; font-weight: bold; color: white; text-align: center; }
            QTableWidget::item { border-bottom: 1px solid #222; color: white; }
        """)
        self.p_tablo.horizontalHeader().setSectionResizeMode(QHeaderView.ResizeMode.Stretch)
        l.addWidget(self.p_tablo)

        # Tüm kullanıcıları çekip yönetici tablosunun satırlarına dönüştürür.
        cur.execute("SELECT ad_soyad, kullanici_adi, id FROM kullanicilar")
        for satir_ind, veri in enumerate(cur.fetchall()):
            # Her personel için yeni bir tablo satırı açılır ve satır yüksekliği sabitlenir.
            self.p_tablo.insertRow(satir_ind)
            self.p_tablo.setRowHeight(satir_ind, 50)

            # Personel adı ve kullanıcı adı ilk iki sütuna yerleştirilir.
            for sutun_ind, v in enumerate(veri[:2]):
                item = QTableWidgetItem(str(v))
                item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
                self.p_tablo.setItem(satir_ind, sutun_ind, item)
            
            # Durum sütunu şimdilik çevrimiçi etiketiyle yeşil gösterilir.
            st_item = QTableWidgetItem("Çevrimiçi")
            st_item.setForeground(Qt.GlobalColor.green)
            st_item.setTextAlignment(Qt.AlignmentFlag.AlignCenter)
            self.p_tablo.setItem(satir_ind, 2, st_item)
            
            # Şifre sıfırlama butonu ilgili personelin id bilgisini iç fonksiyona taşır.
            sifre_btn = QPushButton("ŞİFRE SIFIRLA")
            sifre_btn.setCursor(Qt.CursorShape.PointingHandCursor)
            sifre_btn.setStyleSheet("""
                QPushButton {
                    background-color: #222; color: white; border: 1px solid #444;
                    border-radius: 6px; font-weight: bold; font-size: 10px; margin: 6px;
                }
                QPushButton:hover { background-color: #333; border-color: #666; }
            """)
            sifre_btn.clicked.connect(lambda ch, uid=veri[2], isim=veri[0]: self.personel_sifre_degistir_formu(uid, isim))
            self.p_tablo.setCellWidget(satir_ind, 3, sifre_btn)

            # Admin kullanıcısı silinemez; diğer personel için silme butonu gösterilir.
            if veri[1] != 'admin':
                del_btn = QPushButton("PERSONELİ SİL")
                del_btn.setCursor(Qt.CursorShape.PointingHandCursor)
                del_btn.setStyleSheet("""
                    QPushButton {
                        background-color: #450000; color: #ff4d4d; border: 1px solid #800000;
                        border-radius: 6px; font-weight: bold; font-size: 10px; margin: 6px;
                    }
                    QPushButton:hover { background-color: #ff4d4d; color: white; }
                """)
                del_btn.clicked.connect(lambda ch, uid=veri[2]: self.personel_sil_onay(uid))
                self.p_tablo.setCellWidget(satir_ind, 4, del_btn)
            else:
                # Admin satırında silme yerine yönetici etiketi gösterilir.
                admin_lbl = QLabel("YÖNETİCİ")
                admin_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
                admin_lbl.setStyleSheet("color: #555; font-weight: bold; font-size: 10px;")
                self.p_tablo.setCellWidget(satir_ind, 4, admin_lbl)

        # Yeni personel tanımlama butonu yönetici panelinden kayıt formunu açar.
        self.btn_p_ekle = QPushButton("YENİ PERSONEL TANIMLA")
        self.btn_p_ekle.setCursor(Qt.CursorShape.PointingHandCursor)
        self.btn_p_ekle.setStyleSheet("background: #222; color: white; padding: 15px; border-radius: 12px; font-weight: bold; margin-top: 10px;")
        self.btn_p_ekle.clicked.connect(self.kayit_paneli_ac)
        l.addWidget(self.btn_p_ekle)
        
        # Ana sayfaya dön butonu yönetici katmanını kapatır.
        btn_kapat = QPushButton("ANA SAYFAYA DÖN")
        btn_kapat.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_kapat.setStyleSheet("background: white; color: black; padding: 15px; border-radius: 12px; font-weight: bold; margin-top: 5px;")
        btn_kapat.clicked.connect(self.adm_ov.close)
        l.addWidget(btn_kapat)
        
        self.adm_ov.show()
        conn.close()
    def durum_filtrele(self, secili_durum):

        # Tüm filtre butonlarından yalnızca seçilen duruma ait olanı aktif işaretler.
        for durum, btn in self.durum_butonlari.items():
            btn.setChecked(durum == secili_durum)
        
        # Aktif durum filtresini saklar ve tabloyu bu filtreye göre yeniden yükler.
        self.aktif_durum_filtresi = secili_durum
        self.tabloyu_yenile()    
    def personel_sifre_degistir_formu(self, uid, isim):
        # Yönetici panelinden seçilen personel için şifre sıfırlama katmanı açar.
        self.ps_ov = QFrame(self)
        self.ps_ov.setGeometry(self.rect())
        self.ps_ov.setStyleSheet("background: rgba(0, 0, 0, 0.8);")

        # Şifre formu ekranın merkezindeki siyah kutu içinde gösterilir.
        box = QFrame(self.ps_ov)
        box.setFixedSize(400, 300)
        box.setStyleSheet("background: #111; border-radius: 20px; border: 1px solid #333;")
        box.move((self.width()-400)//2, (self.height()-300)//2)
        
        # Başlık, giriş alanı ve butonlar dikey yerleşime eklenir.
        layout = QVBoxLayout(box)
        layout.setContentsMargins(30, 30, 30, 30)
        
        # Başlık hangi personelin şifresinin değişeceğini gösterir.
        baslik = QLabel(f"{isim.upper()}\nYENİ ŞİFRE TANIMLA")
        baslik.setStyleSheet("color: white; font-weight: 900; font-size: 16px;")
        baslik.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(baslik)
        
        # Yeni şifre alanı yöneticinin gireceği şifreyi alır.
        yeni_sifre_input = QLineEdit()
        yeni_sifre_input.setPlaceholderText("Yeni Şifre Yazınız")
        yeni_sifre_input.setStyleSheet("background: #1a1a1a; color: white; padding: 15px; border-radius: 10px; border: 1px solid #222;")
        layout.addWidget(yeni_sifre_input)
        
        def kaydet():
            # Boş şifre girildiyse veritabanı güncellemesi yapılmaz.
            yeni_s = yeni_sifre_input.text().strip()
            if not yeni_s:
                return
            
            # Seçilen kullanıcı id'sine ait şifreyi veritabanında günceller.
            conn = sqlite3.connect('servis_takip.db')
            cur = conn.cursor()
            cur.execute("UPDATE kullanicilar SET sifre = ? WHERE id = ?", (yeni_s, uid))
            conn.commit()
            conn.close()
            
            self.ps_ov.close()
            self.ozel_mesaj_goster("BAŞARILI", f"{isim} personeline yeni şifre atandı.")

        # Şifreyi sıfırla butonu içteki kaydet fonksiyonunu çalıştırır.
        btn_kaydet = QPushButton("ŞİFREYİ SIFIRLA")
        btn_kaydet.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_kaydet.setStyleSheet("background: white; color: black; font-weight: bold; padding: 12px; border-radius: 10px;")
        btn_kaydet.clicked.connect(kaydet)
        
        # Vazgeç butonu şifre sıfırlama katmanını kapatır.
        btn_iptal = QPushButton("VAZGEÇ")
        btn_iptal.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_iptal.setStyleSheet("background: #222; color: #666; border: none; padding: 5px;")
        btn_iptal.clicked.connect(self.ps_ov.close)
        
        layout.addWidget(btn_kaydet)
        layout.addSpacing(10)
        layout.addWidget(btn_iptal)
        
        self.ps_ov.show()   

    def personel_sil_onay(self, uid):
        # Personel silme işlemi geri alınamayacağı için önce onay katmanı açılır.
        self.onay_p = QFrame(self); self.onay_p.setGeometry(self.rect()); self.onay_p.setStyleSheet("background: rgba(0,0,0,0.7);")
        # Onay mesajı ve butonlar ekranın ortasındaki küçük kutuda gösterilir.
        box = QFrame(self.onay_p); box.setFixedSize(400, 200); box.setStyleSheet("background: #111; border-radius: 20px; border: 1px solid #333;"); box.move((self.width()-400)//2, (self.height()-200)//2)
        l = QVBoxLayout(box); l.setContentsMargins(30,30,30,30)
        l.addWidget(QLabel("PERSONEL SİLİNSİN Mİ?", styleSheet="color: white; font-weight: bold; font-size: 16px;"), alignment=Qt.AlignmentFlag.AlignCenter)
        # Sil ve iptal butonları aynı satırda yan yana durur.
        btns = QHBoxLayout(); evet = QPushButton("SİL"); hayir = QPushButton("İPTAL")
        evet.setStyleSheet("background: #ff4d4d; color: white; font-weight: bold; padding: 10px; border-radius: 8px;")
        hayir.setStyleSheet("background: #333; color: white; padding: 10px; border-radius: 8px;")
        def sil():
            # Onay verilirse ilgili kullanıcı kaydı veritabanından silinir.
            conn = sqlite3.connect('servis_takip.db'); cur = conn.cursor()
            cur.execute("DELETE FROM kullanicilar WHERE id=?", (uid,)); conn.commit(); conn.close()
            # Silme sonrası onay penceresi kapanır ve yönetici paneli yenilenir.
            self.onay_p.close(); self.admin_paneli_ac()
        # Butonların tıklama olayları silme veya iptal davranışına bağlanır.
        evet.clicked.connect(sil); hayir.clicked.connect(self.onay_p.close)
        btns.addWidget(evet); btns.addWidget(hayir); l.addLayout(btns); self.onay_p.show()

    def cihaz_duzenle_paneli_ac(self, row):
        # 1. Veritabanından mevcut bilgileri çekme
        rid = self.tablo.item(row, 0).data(Qt.ItemDataRole.UserRole)
        conn = sqlite3.connect('servis_takip.db')
        cur = conn.cursor()
        cur.execute("SELECT ariza, ucret, durum, yapilan_islem FROM servis_kayitlari WHERE id=?", (rid,))
        veri = cur.fetchone()
        conn.close()

        # 2. Modern Overlay (Karartma) Tasarımı
        self.edit_ov = QFrame(self)
        self.edit_ov.setGeometry(self.rect())
        self.edit_ov.setStyleSheet("background: rgba(0, 0, 0, 0.85);")
        
        box = QFrame(self.edit_ov)
        box.setFixedSize(500, 680) 
        box.setStyleSheet("background: #111; border-radius: 25px; border: 1px solid #333;")
        box.move((self.width()-500)//2, (self.height()-680)//2)
        
        layout = QVBoxLayout(box)
        layout.setContentsMargins(40, 40, 40, 40)
        layout.setSpacing(15)

        # 3. Başlık ve Stil Tanımları
        baslik = QLabel("CİHAZ YÖNETİMİ")
        baslik.setStyleSheet("color: white; font-weight: 900; font-size: 20px; margin-bottom: 10px;")
        layout.addWidget(baslik)
        
        st_in = "background: #1a1a1a; color: white; padding: 12px; border-radius: 10px; border: 1px solid #2a2a2a;"
        st_lbl = "color: #666; font-size: 11px; font-weight: bold; margin-left: 2px;"

        # 4. Form Alanları
        layout.addWidget(QLabel("ARIZA", styleSheet=st_lbl))
        ariza_in = QLineEdit(); ariza_in.setText(veri[0]); ariza_in.setStyleSheet(st_in); layout.addWidget(ariza_in)
        
        layout.addWidget(QLabel("ÜCRET", styleSheet=st_lbl))
        ucret_in = QLineEdit(); ucret_in.setText(str(veri[1])); ucret_in.setStyleSheet(st_in); layout.addWidget(ucret_in)
        
        layout.addWidget(QLabel("DURUM", styleSheet=st_lbl))
        d_combo = QComboBox()
        d_combo.addItems(["Beklemede", "Tamirde", "Tamamlandı", "Teslim Edildi"])
        d_combo.setCurrentText(veri[2])
        d_combo.setStyleSheet(st_in)
        layout.addWidget(d_combo)

        layout.addWidget(QLabel("YAPILAN İŞLEMLER", styleSheet=st_lbl))
        islem_txt = QTextEdit()
        islem_txt.setPlaceholderText("İşlem detaylarını buraya yazın...")
        islem_txt.setText(veri[3] if veri[3] else "")
        islem_txt.setStyleSheet(st_in)
        layout.addWidget(islem_txt)

        def durum_degisti():
            # Durum tamir sürecine geçince işlem açıklaması alanını daha belirgin yapar.
            mevcut_durum = d_combo.currentText()
            if mevcut_durum in ["Tamirde", "Tamamlandı"]:
                islem_txt.setPlaceholderText("LÜTFEN YAPILAN İŞLEMLERİ BURAYA DETAYLICA YAZIN...")
                islem_txt.setStyleSheet(st_in + "border: 1px solid #444;")
            else:
                islem_txt.setPlaceholderText("İşlem detaylarını buraya yazın...")
                islem_txt.setStyleSheet(st_in)

        d_combo.currentTextChanged.connect(durum_degisti)
        durum_degisti()

        # 5. Butonlar (TEMİZLENMİŞ VE TEKE İNDİRİLMİŞ HALİ)
        layout.addSpacing(15)
        
        # İç Fonksiyon: Kaydetme İşlemi
        def kaydet():
            try:
                # Formdaki güncel değerleri servis_kayitlari tablosuna yazar.
                conn_db = sqlite3.connect('servis_takip.db')
                cur_db = conn_db.cursor()
                cur_db.execute("UPDATE servis_kayitlari SET ariza=?, ucret=?, durum=?, yapilan_islem=? WHERE id=?", 
                                (ariza_in.text(), ucret_in.text(), d_combo.currentText(), islem_txt.toPlainText(), rid))
                conn_db.commit()
                conn_db.close()
                # Kayıt sonrası düzenleme penceresi kapanır, tablo yenilenir ve başarı mesajı gösterilir.
                self.edit_ov.close()
                self.tabloyu_yenile()
                self.ozel_mesaj_goster("BAŞARILI", "Cihaz ve işlem bilgileri güncellendi.")
            except Exception as e:
                print(f"Hata: {e}")

        # Kaydet butonu formdaki değişiklikleri veritabanına aktarır.
        btn_save = QPushButton("DEĞİŞİKLİKLERİ KAYDET")
        btn_save.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_save.setStyleSheet("background: white; color: black; font-weight: bold; padding: 15px; border-radius: 12px;")
        btn_save.clicked.connect(kaydet)
        layout.addWidget(btn_save)
        
        # Vazgeç butonu değişiklik yapmadan düzenleme katmanını kapatır.
        btn_close = QPushButton("VAZGEÇ")
        btn_close.setCursor(Qt.CursorShape.PointingHandCursor)
        btn_close.clicked.connect(self.edit_ov.close)
        btn_close.setStyleSheet("color: #666; border: none; font-weight: bold;")
        layout.addWidget(btn_close)
        
        self.edit_ov.show()

    def stat_kutusu(self, isim, rakam):
        # Yönetici panelindeki küçük istatistik kutusunu başlık ve sayı olarak oluşturur.
        v = QVBoxLayout(); u = QLabel(isim); u.setStyleSheet("color: #666; font-size: 11px; font-weight: bold;")
        a = QLabel(rakam); a.setStyleSheet("color: white; font-size: 60px; font-weight: 900;")
        v.addWidget(u); v.addWidget(a); return v

    def sifre_degistir_paneli_ac(self):
        # Normal personel için kendi şifresini değiştirebileceği paneli açar.
        self.s_ov = QFrame(self); self.s_ov.setGeometry(self.rect()); self.s_ov.setStyleSheet("background: rgba(255,255,255,0.9);")
        # Şifre formu ekranın merkezinde siyah kutu olarak gösterilir.
        box = QFrame(self.s_ov); box.setFixedSize(400, 300); box.setStyleSheet("background: black; border-radius: 20px;"); box.move((self.width()-400)//2, (self.height()-300)//2)
        l = QVBoxLayout(box); l.setContentsMargins(30,30,30,30)
        l.addWidget(QLabel("YENİ ŞİFRE BELİRLE", styleSheet="color: white; font-weight: bold;"))
        # Yeni şifre alanı parolayı gizli karakterlerle alır.
        yeni_s = QLineEdit(); yeni_s.setEchoMode(QLineEdit.EchoMode.Password); yeni_s.setPlaceholderText("Yeni Şifre"); yeni_s.setStyleSheet("background: #1a1a1a; color: white; padding: 10px; border-radius: 5px;")
        l.addWidget(yeni_s)
        def guncelle():
            # Boş şifre girildiyse güncelleme yapılmaz.
            if len(yeni_s.text()) < 1: return
            # Giriş yapan personelin şifresi ad_soyad bilgisine göre güncellenir.
            conn = sqlite3.connect('servis_takip.db'); cur = conn.cursor()
            cur.execute("UPDATE kullanicilar SET sifre = ? WHERE ad_soyad = ?", (yeni_s.text(), self.personel_adi))
            conn.commit(); conn.close(); self.s_ov.close()
            self.ozel_mesaj_goster("BAŞARILI", "Şifreniz güncellendi.")
        # Güncelle ve iptal butonları şifre formunun işlemlerini yönetir.
        btn = QPushButton("GÜNCELLE"); btn.clicked.connect(guncelle); btn.setStyleSheet("background: white; color: black; padding: 10px; font-weight: bold;")
        l.addWidget(btn); l.addWidget(i := QPushButton("İPTAL")); i.clicked.connect(self.s_ov.close); i.setStyleSheet("color: white; border: none;")
        self.s_ov.show()

    def arama_yap(self):
        # Arama kutusundaki kelimeye göre öneri listesini hazırlar.
        kelime = self.arama_cubugu.text().lower().strip()
        # Arama boşsa öneri listesini kapatır ve ana tabloyu normal haline getirir.
        if len(kelime) < 1:
            if hasattr(self, 'oneri_listesi'): self.oneri_listesi.hide()
            self.tabloyu_yenile()
            return

        # Önceki öneri butonlarını temizleyerek listeyi yeni aramaya hazırlar.
        for i in reversed(range(self.oneri_layout.count())): 
            widget = self.oneri_layout.itemAt(i).widget()
            if widget: widget.setParent(None)

        # Müşteri adı veya cihaz türüne göre en fazla 5 öneri kaydı çeker.
        conn = sqlite3.connect('servis_takip.db')
        cur = conn.cursor()
        cur.execute("""
            SELECT DISTINCT m.ad_soyad, c.cihaz_turu 
            FROM servis_kayitlari s 
            JOIN cihazlar c ON s.cihaz_id = c.id 
            JOIN musteriler m ON c.musteri_id = m.id 
            WHERE m.ad_soyad LIKE ? OR c.cihaz_turu LIKE ? 
            LIMIT 5
        """, (f'%{kelime}%', f'%{kelime}%'))
        
        sonuclar = cur.fetchall()
        conn.close()

        # Sonuç varsa her öneriyi tıklanabilir buton olarak listeye ekler.
        if sonuclar:
            for ad, tur in sonuclar:
                gosterim = f"{tur.upper()} | {ad}" if kelime in tur.lower() else f"{ad} | {tur}"
                btn = QPushButton(gosterim)
                btn.setStyleSheet("QPushButton { color: white; text-align: left; padding: 12px; border: none; border-bottom: 1px solid #222; } QPushButton:hover { background: #333; }")
                btn.clicked.connect(lambda ch, text=ad: self.oneri_sec(text))
                self.oneri_layout.addWidget(btn)
            
            # Öneri kutusunu arama çubuğunun hemen altına hizalar.
            bar_pos = self.arama_cubugu.mapTo(self, self.arama_cubugu.rect().bottomLeft())
            self.oneri_listesi.setFixedWidth(self.arama_cubugu.width())
            self.oneri_listesi.move(bar_pos.x(), bar_pos.y())
            self.oneri_listesi.show()
            self.oneri_listesi.raise_()
        else:
            # Sonuç yoksa öneri alanını gizler.
            self.oneri_listesi.hide()
    def oneri_sec(self, text):
        # Kullanıcı öneriye tıklayınca arama kutusunu seçilen metinle doldurur.
        self.arama_cubugu.setText(text)
        self.oneri_listesi.hide()
        self.tabloyu_yenile()

    def yeni_kayit_formu_ac(self):
        # Yeni servis kaydı için ana ekranın üstüne açık renkli bir katman açar.
        self.form_ov = QFrame(self); self.form_ov.setGeometry(self.rect()); self.form_ov.setStyleSheet("background: rgba(255, 255, 255, 0.9);")
        # Servis kayıt formu ekran ortasında siyah panel olarak gösterilir.
        box = QFrame(self.form_ov); box.setFixedSize(550, 780); box.setStyleSheet("background: black; border-radius: 30px;"); box.move((self.width()-550)//2, (self.height()-780)//2)
        # Form başlığı, alanlar ve butonlar dikey yerleşimde tutulur.
        f_lay = QVBoxLayout(box); f_lay.setContentsMargins(40, 40, 40, 40); f_lay.setSpacing(10)
        lbl = QLabel("YENİ SERVİS KAYDI"); lbl.setAlignment(Qt.AlignmentFlag.AlignCenter); lbl.setStyleSheet("color: white; font-size: 26px; font-weight: 900; letter-spacing: 2px;")
        f_lay.addWidget(lbl)
        
        # Servis formundaki tüm metin kutuları için ortak koyu stil tanımlanır.
        st = "QLineEdit { background: #1a1a1a; border: 1px solid #333; border-radius: 10px; padding: 12px; color: white; }"
        
        def alan_olustur(etiket, max_len, yer_tutucu):
            # Etiket ve metin kutusunu birlikte oluşturup forma ekleyen yardımcı fonksiyondur.
            f_lay.addWidget(l := QLabel(etiket)); l.setStyleSheet("color: #666; font-size: 11px; font-weight: bold;")
            inp = QLineEdit(); inp.setStyleSheet(st); inp.setMaxLength(max_len); 
            inp.setPlaceholderText(yer_tutucu)
            f_lay.addWidget(inp); return inp

        # Müşteri ve cihaz bilgileri için gerekli form alanları oluşturulur.
        self.f_ad = alan_olustur("MÜŞTERİ AD SOYAD", 50, "Örn: Ahmet Yılmaz")
        self.f_tl = alan_olustur("TELEFON", 11, "Örn: 05XXXXXXXXX")
        self.f_tr = alan_olustur("CİHAZ TÜRÜ", 20, "Örn: Laptop, Telefon, Tablet")
        self.f_mk = alan_olustur("MARKA / MODEL", 40, "Örn: Asus Rog Strix / iPhone 15")
        self.f_ar = alan_olustur("ARIZA TANIMI", 100, "Örn: Ekran kırık, sıvı teması var")
        self.f_uc = alan_olustur("TAHMİNİ ÜCRET", 7, "Örn: 1500")
        
        # Telefon alanı 0 ile başlayan 11 haneli numarayı, ücret alanı ise sadece rakamı kabul eder.
        self.f_tl.setValidator(QRegularExpressionValidator(QRegularExpression(r"^0\d{10}$")))
        self.f_uc.setValidator(QRegularExpressionValidator(QRegularExpression(r"^\d+$")))
        
        # Kayıt ve iptal butonları servis formunun alt kısmına eklenir.
        k_btn = QPushButton("KAYDI TAMAMLA"); k_btn.setStyleSheet("background: white; color: black; padding: 15px; border-radius: 12px; font-weight: bold;"); k_btn.clicked.connect(self.servis_kaydet_db)
        f_lay.addWidget(k_btn); i_btn = QPushButton("İPTAL"); i_btn.clicked.connect(self.form_ov.close); i_btn.setStyleSheet("color: white; border: none;"); f_lay.addWidget(i_btn); self.form_ov.show()

    def servis_kaydet_db(self):
        # Yeni servis formundaki tüm değerleri alanlardan okur.
        ad, tl, tr, mk, ar, uc = self.f_ad.text(), self.f_tl.text(), self.f_tr.text(), self.f_mk.text(), self.f_ar.text(), self.f_uc.text()
        # Müşteri adı ve marka/model zorunlu alan olarak kontrol edilir.
        if not (ad and mk): return
        # Müşteri kaydı oluşturulur ve yeni müşteri id'si alınır.
        conn = sqlite3.connect('servis_takip.db'); cur = conn.cursor()
        cur.execute("INSERT INTO musteriler (ad_soyad, telefon) VALUES (?,?)", (ad, tl)); mid = cur.lastrowid
        # Cihaz kaydı müşteriye bağlanır ve yeni cihaz id'si alınır.
        cur.execute("INSERT INTO cihazlar (musteri_id, cihaz_turu, marka, model) VALUES (?,?,?,?)", (mid, tr, mk, mk)); cid = cur.lastrowid
        # Servis kaydı cihaz id'si ve giriş yapan personel adıyla oluşturulur.
        cur.execute("INSERT INTO servis_kayitlari (cihaz_id, ariza, ucret, personel_adi) VALUES (?,?,?,?)", (cid, ar, uc, self.personel_adi))
        # Kayıt tamamlandıktan sonra form kapanır, tablo yenilenir ve başarı mesajı gösterilir.
        conn.commit(); conn.close(); self.form_ov.close(); self.tabloyu_yenile()
        self.ozel_mesaj_goster("BAŞARILI", "Servis kaydı oluşturuldu.")

    def durum_guncelle_paneli_ac(self, row, col):
        # Tıklanan tablo satırındaki servis id'sini gizli UserRole bilgisinden alır.
        rid = self.tablo.item(row, 0).data(Qt.ItemDataRole.UserRole)
        # Durum değiştirme için ana ekranın üstüne yarı saydam panel açar.
        self.g_ov = QFrame(self); self.g_ov.setGeometry(self.rect()); self.g_ov.setStyleSheet("background: rgba(255,255,255,0.8);")
        # Durum seçim kutusu ve butonlar ortadaki siyah kutuda gösterilir.
        box = QFrame(self.g_ov); box.setFixedSize(400, 350); box.setStyleSheet("background: black; border-radius: 20px;"); box.move((self.width()-400)//2, (self.height()-350)//2)
        l = QVBoxLayout(box); l.setContentsMargins(30, 30, 30, 30)
        # Kullanılabilecek servis durumları açılır listeye eklenir.
        self.d_sec = QComboBox(); self.d_sec.addItems(["Beklemede", "Tamirde", "Tamamlandı", "Teslim Edildi"]); self.d_sec.setStyleSheet("background: #1a1a1a; color: white; padding: 10px;")
        l.addWidget(self.d_sec)
        # Kaydet butonu seçilen durumu ilgili servis kaydına yazar; iptal butonu paneli kapatır.
        btn = QPushButton("DURUMU KAYDET"); btn.clicked.connect(lambda: self.durum_kaydet_db(rid)); btn.setStyleSheet("background: white; color: black; font-weight: bold; padding: 10px;"); l.addWidget(btn)
        i = QPushButton("İPTAL"); i.clicked.connect(self.g_ov.close); i.setStyleSheet("color: white; border: none;"); l.addWidget(i); self.g_ov.show()

    def durum_kaydet_db(self, rid):
        # Durum seçimini veritabanındaki servis kaydına işler.
        conn = sqlite3.connect('servis_takip.db'); cur = conn.cursor()
        cur.execute("UPDATE servis_kayitlari SET durum = ? WHERE id = ?", (self.d_sec.currentText(), rid)); conn.commit(); conn.close(); self.g_ov.close(); self.tabloyu_yenile()
        self.ozel_mesaj_goster("BAŞARILI", "Kayıt durumu güncellendi.")

    def veritabani_yedekle(self):
        # Veritabanı yedekleme onayı için ana ekranın üstüne katman açar.
        ov = QFrame(self); ov.setGeometry(self.rect()); ov.setStyleSheet("background: rgba(255,255,255,0.8);")
        # Yedekleme sorusu ve butonlar ortadaki siyah kutuda gösterilir.
        box = QFrame(ov); box.setFixedSize(400, 200); box.setStyleSheet("background: black; border-radius: 20px;"); box.move((self.width()-400)//2, (self.height()-200)//2)
        l = QVBoxLayout(box); l.setContentsMargins(30,30,30,30)
        l.addWidget(QLabel("SİSTEM YEDEKLENSİN MI?", styleSheet="color: white; font-weight: bold; font-size: 14px;"), alignment=Qt.AlignmentFlag.AlignCenter)
        # Yedekleme ve iptal butonları aynı satırda gösterilir.
        btns = QHBoxLayout(); e = QPushButton("YEDEKLE"); h = QPushButton("İPTAL")
        e.setStyleSheet("background: white; color: black; font-weight: bold; padding: 10px; border-radius: 8px;")
        h.setStyleSheet("background: #222; color: white; padding: 10px; border-radius: 8px;")
        def yap():
            try:
                # Veritabanı dosyasını masaüstüne tarih-saat içeren yeni bir adla kopyalar.
                hedef = os.path.join(os.path.expanduser("~"), "Desktop", f"yedek_{datetime.now().strftime('%Y%m%d_%H%M')}.db")
                shutil.copy2('servis_takip.db', hedef); ov.close()
                self.ozel_mesaj_goster("BAŞARILI", "Yedek masaüstüne kaydedildi.")
            except: ov.close()
        # Buton tıklamaları yedekleme işlemini başlatır veya onay panelini kapatır.
        e.clicked.connect(yap); h.clicked.connect(ov.close); btns.addWidget(e); btns.addWidget(h); l.addLayout(btns); ov.show()

    def ozel_mesaj_goster(self, baslik, icerik):
        # Başarı veya bilgi mesajlarını göstermek için ortak modal katman oluşturur.
        ov = QFrame(self); ov.setGeometry(self.rect()); ov.setStyleSheet("background: rgba(255,255,255,0.8);")
        # Mesaj kutusu ekranın ortasında küçük siyah panel olarak durur.
        box = QFrame(ov); box.setFixedSize(300, 180); box.setStyleSheet("background: black; border-radius: 20px;"); box.move((self.width()-300)//2, (self.height()-180)//2)
        l = QVBoxLayout(box); l.setContentsMargins(25,25,25,25)
        # Başlık ve içerik metni kullanıcıya işlem sonucunu anlatır.
        l.addWidget(QLabel(baslik, styleSheet="color: white; font-weight: 900; font-size: 18px;"), alignment=Qt.AlignmentFlag.AlignCenter)
        l.addWidget(QLabel(icerik, styleSheet="color: #888; font-size: 13px;"), alignment=Qt.AlignmentFlag.AlignCenter)
        # Tamam butonu mesaj katmanını kapatır.
        b = QPushButton("TAMAM"); b.clicked.connect(ov.close); b.setStyleSheet("background: white; color: black; font-weight: bold; padding: 10px; border-radius: 10px; margin-top: 10px;")
        l.addWidget(b); ov.show()

    def programi_kapat_onay(self):
        # ESC ile program kapatılmak istendiğinde karartılmış onay katmanı açılır.
        self.kapat_ov = QFrame(self)
        self.kapat_ov.setGeometry(self.rect())
        self.kapat_ov.setStyleSheet("background: rgba(0, 0, 0, 0.7);")
        
        # Onay kutusu
        box = QFrame(self.kapat_ov)
        box.setFixedSize(400, 200)
        box.setStyleSheet("background: #111; border-radius: 20px; border: 1px solid #333;")
        box.move((self.width()-400)//2, (self.height()-200)//2)
        
        l = QVBoxLayout(box)
        l.setContentsMargins(30,30,30,30)
        
        # Kullanıcıya programı tamamen kapatmak isteyip istemediği sorulur.
        msg = QLabel("PROGRAMI KAPATMAK İSTİYOR MUSUNUZ?")
        msg.setStyleSheet("color: white; font-weight: bold; font-size: 14px;")
        msg.setAlignment(Qt.AlignmentFlag.AlignCenter)
        l.addWidget(msg)
        
        # Evet ve vazgeç butonları onay kutusunun alt bölümüne eklenir.
        btns = QHBoxLayout()
        evet = QPushButton("EVET, KAPAT")
        evet.setStyleSheet("background: white; color: black; font-weight: bold; padding: 10px; border-radius: 8px;")
        evet.clicked.connect(self.close)
        
        hayir = QPushButton("VAZGEÇ")
        hayir.setStyleSheet("background: #222; color: white; padding: 10px; border-radius: 8px;")
        hayir.clicked.connect(self.kapat_ov.close)
        
        btns.addWidget(evet)
        btns.addWidget(hayir)
        l.addLayout(btns)
        self.kapat_ov.show()

    def oturum_kapat_onay(self):
        # Oturumu kapat butonuna basılınca kullanıcıdan son onay alınır.
        self.logout_ov = QFrame(self)
        self.logout_ov.setGeometry(self.rect())
        self.logout_ov.setStyleSheet("background: rgba(0, 0, 0, 0.7);")
        
        # Onay kutusu ana ekranın ortasına konumlandırılır.
        box = QFrame(self.logout_ov)
        box.setFixedSize(400, 200)
        box.setStyleSheet("background: #111; border-radius: 20px; border: 1px solid #333;")
        box.move((self.width()-400)//2, (self.height()-200)//2)
        
        l = QVBoxLayout(box)
        l.setContentsMargins(30, 30, 30, 30)
        
        # Oturum kapatma sorusu iki satır halinde gösterilir.
        msg = QLabel("OTURUMU KAPATMAK İSTEDİĞİNİZE\nEMİN MİSİNİZ?")
        msg.setStyleSheet("color: white; font-weight: bold; font-size: 14px;")
        msg.setAlignment(Qt.AlignmentFlag.AlignCenter)
        l.addWidget(msg)
        
        # Oturumu kapat ve vazgeç seçenekleri yan yana hazırlanır.
        btns = QHBoxLayout()
        evet = QPushButton("OTURUMU KAPAT")
        evet.setCursor(Qt.CursorShape.PointingHandCursor)
        evet.setStyleSheet("background: white; color: black; font-weight: bold; padding: 10px; border-radius: 8px;")
        evet.clicked.connect(self.oturum_kapat_kesin) 
        
        hayir = QPushButton("VAZGEÇ")
        hayir.setCursor(Qt.CursorShape.PointingHandCursor)
        hayir.setStyleSheet("background: #222; color: white; padding: 10px; border-radius: 8px;")
        hayir.clicked.connect(self.logout_ov.close)
        
        btns.addWidget(evet)
        btns.addWidget(hayir)
        l.addLayout(btns)
        self.logout_ov.show()

    def oturum_kapat_kesin(self):
        # Kaydedilmiş oturum bilgisini siler ve giriş ekranını yeniden açar.
        oturum_bilgisi_sil()
        self.login_win = GirisEkrani()
        self.login_win.show()
        self.close()

    def keyPressEvent(self, event): 
        # Ana sayfada ESC tuşu program kapatma onayını açar.
        if event.key() == Qt.Key.Key_Escape:
            self.programi_kapat_onay()

    def kayit_paneli_ac(self):
        # Yönetici panelinden yeni personel tanımlamak için kayıt katmanı açılır.
        self.ov_r = QFrame(self); self.ov_r.setGeometry(self.rect()); self.ov_r.setStyleSheet("background: rgba(255,255,255,0.7);")
        # Personel kayıt formu ekran ortasında siyah panel olarak gösterilir.
        box = QFrame(self.ov_r); box.setFixedSize(450, 520); box.setStyleSheet("background: black; border-radius: 30px;"); box.move((self.width()-450)//2, (self.height()-520)//2)
        # Form alanları ve işlem butonları dikey yerleşime eklenir.
        l = QVBoxLayout(box); l.setContentsMargins(40,40,40,40); l.setSpacing(15)
        l.addWidget(QLabel("YENİ PERSONEL TANIMLA", styleSheet="color: white; font-weight: 900; font-size: 18px;"))
        # Ad, kullanıcı adı ve şifre alanları ortak koyu giriş stili kullanır.
        in_st = "QLineEdit { background: #151515; border: 1px solid #252525; border-radius: 12px; padding: 15px; color: white; }"
        ad, ka, si = QLineEdit(), QLineEdit(), QLineEdit()
        for i, p in zip([ad, ka, si], ["Ad Soyad", "Kullanıcı Adı", "Şifre"]): i.setPlaceholderText(p); i.setStyleSheet(in_st); l.addWidget(i)
        # Şifre alanındaki karakterler ekranda gizlenir.
        si.setEchoMode(QLineEdit.EchoMode.Password)
        def kaydet():
            # Boş alan varsa personel kaydı yapılmaz.
            if not (ad.text() and ka.text() and si.text()): return
            try:
                # Yeni personel bilgileri kullanicilar tablosuna eklenir.
                conn = sqlite3.connect('servis_takip.db'); cur = conn.cursor()
                cur.execute("INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad) VALUES (?,?,?)", (ka.text(), si.text(), ad.text()))
                conn.commit(); conn.close(); self.ov_r.close()
                self.ozel_mesaj_goster("BAŞARILI", "Personel kaydı tamamlandı.")
                # Yönetici tablosu açıksa yeni personel görünsün diye panel yenilenir.
                if hasattr(self, 'p_tablo'): self.admin_paneli_ac()
            except: pass
        # Kaydet ve iptal butonları personel kayıt formunu tamamlar veya kapatır.
        b = QPushButton("KAYDI TAMAMLA"); b.clicked.connect(kaydet); b.setStyleSheet("background: white; color: black; padding: 15px; font-weight: 900; border-radius: 12px;")
        ipt = QPushButton("İPTAL"); ipt.clicked.connect(self.ov_r.close); ipt.setStyleSheet("background: #1a1a1a; color: #666; padding: 15px; border-radius: 12px;")
        l.addWidget(b); l.addWidget(ipt); self.ov_r.show()

class GirisEkrani(QWidget):
    def __init__(self):
        super().__init__()

        # Uygulama açılırken tabloların ve varsayılan admin hesabının hazır olduğundan emin olur.
        veritabani_hazirla()

        # Giriş ekranını ana uygulama ile aynı davranışta tam ekran başlatır.
        self.showFullScreen()
        self.setStyleSheet("background-color: #f4f5f7;")
        self.arayuz_olustur()

    def arayuz_olustur(self):
        # Ana yerleşim tüm giriş panelini ekranın ortasında tutar.
        main_l = QVBoxLayout(self)
        main_l.setAlignment(Qt.AlignmentFlag.AlignCenter)
        main_l.setContentsMargins(30, 30, 30, 30)

        # Dış panel; başlık, form ve personel bilgisini tek kart içinde toplar.
        self.pnl = QFrame()
        self.pnl.setFixedSize(480, 650)
        self.pnl.setStyleSheet("""
            QFrame {
                background-color: #0b0b0b;
                border-radius: 24px;
                border: 1px solid #202020;
            }
        """)

        # Panel içi dikey yerleşim; bölümler arası boşluğu dengeler.
        pl = QVBoxLayout(self.pnl)
        pl.setContentsMargins(42, 38, 42, 34)
        pl.setSpacing(14)

        # Marka başlığı, giriş ekranının hangi işletmeye ait olduğunu ilk bakışta gösterir.
        t = QLabel("YILDIZ & YALÇIN\nTEKNİK SERVİS")
        t.setAlignment(Qt.AlignmentFlag.AlignCenter)
        t.setStyleSheet("""
            color: white;
            font-size: 34px;
            font-weight: 900;
            letter-spacing: 0px;
            border: none;
            margin-bottom: 2px;
        """)
        pl.addWidget(t)

        # Yardımcı metin kullanıcıya bu ekranın personel girişi için olduğunu belirtir.
        alt_baslik = QLabel("Personel oturum ekranı")
        alt_baslik.setAlignment(Qt.AlignmentFlag.AlignCenter)
        alt_baslik.setStyleSheet("color: #8b8b8b; font-size: 12px; border: none; margin-bottom: 8px;")
        pl.addWidget(alt_baslik)

        # Ortak giriş alanı stili kullanıcı adı ve şifre kutularında tekrar kullanılır.
        input_stili = """
            QLineEdit {
                background: #151515;
                border: 1px solid #2c2c2c;
                border-radius: 12px;
                padding: 14px;
                color: white;
                font-size: 13px;
            }
            QLineEdit:focus {
                border: 1px solid white;
            }
        """

        # Kullanıcı adı alanı, veritabanındaki kullanici_adi sütunu ile eşleşecek metni alır.
        self.k_in = QLineEdit()
        self.k_in.setPlaceholderText("Kullanıcı Adı")
        self.k_in.setStyleSheet(input_stili)
        pl.addWidget(self.k_in)

        # Şifre alanı yazılan karakterleri gizleyerek personel girişini güvenli gösterir.
        self.s_in = QLineEdit()
        self.s_in.setPlaceholderText("Şifre")
        self.s_in.setEchoMode(QLineEdit.EchoMode.Password)
        self.s_in.setStyleSheet(input_stili)
        self.s_in.returnPressed.connect(self.kontrol_et)
        pl.addWidget(self.s_in)

        # Hata etiketi, boş veya hatalı girişlerde kullanıcıyı aynı ekranda bilgilendirir.
        self.hata_lbl = QLabel("")
        self.hata_lbl.setAlignment(Qt.AlignmentFlag.AlignCenter)
        self.hata_lbl.setStyleSheet("color: #ff6b6b; font-size: 11px; font-weight: bold; border: none;")
        pl.addWidget(self.hata_lbl)

        # Oturumu açık tut seçeneği işaretlenirse başarılı girişten sonra session.json dosyası yazılır.
        self.hatirla = QCheckBox("Oturumu Açık Tut")
        self.hatirla.setStyleSheet("""
            QCheckBox {
                background-color: #0b0b0b;
                color: #666;
                font-size: 11px;
                border: none;
            }
            QCheckBox::indicator {
                background-color: #0b0b0b;
                border: 1px solid #444;
                width: 14px;
                height: 14px;
            }
            QCheckBox::indicator:checked {
                background-color: #222;
                border: 1px solid #777;
            }
        """)
        pl.addWidget(self.hatirla)

        # Admin bilgi kutusu ilk kurulumda giriş yapılabilmesi için varsayılan bilgileri görünür tutar.
        admin_info = QFrame()
        admin_info.setStyleSheet("background: #151515; border-radius: 12px; border: 1px solid #303030;")
        al = QVBoxLayout(admin_info)
        al.setContentsMargins(16, 10, 16, 10)
        al.setSpacing(4)

        # Kutunun başlığı, aşağıdaki bilginin yönetici hesabına ait olduğunu açıklar.
        info_lbl = QLabel("YÖNETİCİ BİLGİLERİ")
        info_lbl.setStyleSheet("color: #62d26f; font-weight: bold; font-size: 10px; border: none;")
        al.addWidget(info_lbl)

        # Varsayılan kullanıcı adı ve şifre bilgisi ilk kullanım kolaylığı sağlar.
        detay_lbl = QLabel("Kullanıcı: admin  |  Şifre: 1234")
        detay_lbl.setStyleSheet("color: #a8a8a8; font-size: 12px; border: none;")
        al.addWidget(detay_lbl)
        pl.addWidget(admin_info)

        # Giriş butonu kullanıcı adı ve şifreyi kontrol eden fonksiyonu çalıştırır.
        self.g_btn = QPushButton("GİRİŞ YAP")
        self.g_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        self.g_btn.setStyleSheet("""
            QPushButton {
                background: white;
                color: black;
                font-weight: 900;
                padding: 15px;
                border-radius: 12px;
                font-size: 13px;
            }
            QPushButton:hover {
                background: #e8e8e8;
            }
        """)
        self.g_btn.clicked.connect(self.kontrol_et)
        pl.addWidget(self.g_btn)

        # Kayıt butonu yeni personel oluşturma penceresini açar.
        k_btn = QPushButton("KAYIT OL")
        k_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        k_btn.setStyleSheet("""
            QPushButton {
                background: #1a1a1a;
                color: white;
                padding: 14px;
                border-radius: 12px;
                border: 1px solid #333;
                font-weight: 900;
            }
            QPushButton:hover {
                background: #242424;
                border-color: #555;
            }
        """)
        k_btn.clicked.connect(self.kayit_paneli_ac)
        pl.addWidget(k_btn)

        # Esnek boşluk, personel listesini panelin alt bölümüne iter.
        pl.addStretch()

        # Kayıtlı personel başlığı alt kısımda kullanıcıya mevcut hesapları gösterir.
        p_lbl = QLabel("KAYITLI PERSONELLER")
        p_lbl.setStyleSheet("color: #565656; font-size: 10px; font-weight: 800; border: none;")
        pl.addWidget(p_lbl)

        # Personel listesi veritabanından okunur ve uzun isimlerde satıra taşacak şekilde ayarlanır.
        self.p_listesi_lbl = QLabel(self.get_p_list())
        self.p_listesi_lbl.setStyleSheet("color: #9a9a9a; font-size: 11px; border: none;")
        self.p_listesi_lbl.setWordWrap(True)
        pl.addWidget(self.p_listesi_lbl)

        # Hazırlanan panel ana yerleşime eklenerek ekranda görünür hale getirilir.
        main_l.addWidget(self.pnl, alignment=Qt.AlignmentFlag.AlignCenter)

    def get_p_list(self):
        # Veritabanındaki personel adlarını okuyup giriş ekranında gösterilecek metne dönüştürür.
        conn = None
        try:
            conn = sqlite3.connect('servis_takip.db')
            cur = conn.cursor()
            cur.execute("SELECT ad_soyad FROM kullanicilar ORDER BY ad_soyad")
            res = [r[0] for r in cur.fetchall()]
            return ", ".join(res) if res else "Kayıtlı personel yok"
        except sqlite3.Error:
            return "Liste yüklenemedi"
        finally:
            if conn:
                conn.close()

    def kontrol_et(self):
        # Form alanlarındaki boşlukları temizleyip doğrulama için hazırlar.
        kadi = self.k_in.text().strip()
        sifre = self.s_in.text().strip()

        # Eksik bilgi varsa veritabanına gitmeden ekranda uyarı gösterir.
        if not kadi or not sifre:
            self.hata_lbl.setText("Kullanıcı adı ve şifre giriniz.")
            return

        # Girilen kullanıcı adı ve şifreye karşılık gelen personeli veritabanında arar.
        conn = sqlite3.connect('servis_takip.db')
        cur = conn.cursor()
        cur.execute("SELECT ad_soyad FROM kullanicilar WHERE kullanici_adi=? AND sifre=?", (kadi, sifre))
        u = cur.fetchone()
        conn.close()

        # Kullanıcı bulunduysa isteğe bağlı oturum kaydı yapılır ve ana sayfa açılır.
        if u:
            if self.hatirla.isChecked():
                oturum_bilgisi_kaydet(u[0])
            self.main = AnaSayfa(u[0])
            self.main.show()
            self.close()
            return

        # Kullanıcı bulunamadığında form açık kalır ve net hata mesajı gösterilir.
        self.hata_lbl.setText("Kullanıcı adı veya şifre hatalı.")

    def kayit_paneli_ac(self):
        # Yeni personel kaydı için ana ekranın üstüne modal benzeri yarı saydam katman açar.
        self.ov_r = QFrame(self)
        self.ov_r.setGeometry(self.rect())
        self.ov_r.setStyleSheet("background: rgba(255,255,255,0.7);")

        # Kayıt formu ekranın merkezinde sabit boyutlu bir kutu olarak gösterilir.
        box = QFrame(self.ov_r)
        box.setFixedSize(450, 520)
        box.setStyleSheet("background: black; border-radius: 30px;")
        box.move((self.width()-450)//2, (self.height()-520)//2)

        # Form alanları ve butonlar dikey yerleşimde tutulur.
        l = QVBoxLayout(box)
        l.setContentsMargins(40, 40, 40, 40)
        l.setSpacing(15)

        baslik = QLabel("YENİ PERSONEL KAYDI")
        baslik.setStyleSheet("color: white; font-weight: 900; font-size: 18px;")
        l.addWidget(baslik)

        # Tüm kayıt formu girişleri aynı görsel stili kullanır.
        in_st = "QLineEdit { background: #151515; border: 1px solid #252525; border-radius: 12px; padding: 15px; color: white; }"
        ad = QLineEdit()
        ka = QLineEdit()
        si = QLineEdit()

        # Ad soyad, kullanıcı adı ve şifre alanlarını tek döngü ile forma ekler.
        for alan, yer_tutucu in zip([ad, ka, si], ["Ad Soyad", "Kullanıcı Adı", "Şifre"]):
            alan.setPlaceholderText(yer_tutucu)
            alan.setStyleSheet(in_st)
            l.addWidget(alan)

        # Şifre alanındaki metni gizleyerek kayıt sırasında ekran güvenliğini artırır.
        si.setEchoMode(QLineEdit.EchoMode.Password)

        # Kayıt uyarıları aynı form içinde gösterilir.
        kayit_hata = QLabel("")
        kayit_hata.setStyleSheet("color: #ff6b6b; font-size: 11px; font-weight: bold;")
        l.addWidget(kayit_hata)

        def kaydet():
            # Boş alan varsa kayıt yapılmadan kullanıcı uyarılır.
            if not (ad.text().strip() and ka.text().strip() and si.text().strip()):
                kayit_hata.setText("Tüm alanları doldurunuz.")
                return

            # Bilgiler doluysa yeni personel kullanicilar tablosuna eklenir.
            conn = None
            try:
                conn = sqlite3.connect('servis_takip.db')
                cur = conn.cursor()
                cur.execute(
                    "INSERT INTO kullanicilar (kullanici_adi, sifre, ad_soyad) VALUES (?,?,?)",
                    (ka.text().strip(), si.text().strip(), ad.text().strip())
                )
                conn.commit()
                self.p_listesi_lbl.setText(self.get_p_list())
                self.ov_r.close()
            except sqlite3.IntegrityError:
                kayit_hata.setText("Bu kullanıcı adı zaten kayıtlı.")
            except sqlite3.Error:
                kayit_hata.setText("Kayıt sırasında bir hata oluştu.")
            finally:
                if conn:
                    conn.close()

        # Kaydı tamamla butonu formdaki bilgileri veritabanına yazar.
        b = QPushButton("KAYDI TAMAMLA")
        b.setCursor(Qt.CursorShape.PointingHandCursor)
        b.clicked.connect(kaydet)
        b.setStyleSheet("background: white; color: black; padding: 15px; font-weight: 900; border-radius: 12px;")

        # Vazgeç butonu kayıt katmanını kapatıp giriş ekranına geri döndürür.
        ipt = QPushButton("VAZGEÇ")
        ipt.setCursor(Qt.CursorShape.PointingHandCursor)
        ipt.clicked.connect(self.ov_r.close)
        ipt.setStyleSheet("background: #1a1a1a; color: #666; padding: 15px; border-radius: 12px;")

        l.addWidget(b)
        l.addWidget(ipt)
        self.ov_r.show()

    def keyPressEvent(self, event):
        # ESC tuşu giriş ekranında uygulamadan çıkış onayını açar.
        if event.key() == Qt.Key.Key_Escape:
            self.cikis_onay_paneli_ac()

    def cikis_onay_paneli_ac(self):
        # Çıkış onayı için ekranı karartan bir katman oluşturur.
        self.cikis_ov = QFrame(self)
        self.cikis_ov.setGeometry(self.rect())
        self.cikis_ov.setStyleSheet("background: rgba(0, 0, 0, 0.8);")

        # Onay kutusu ekranın ortasında gösterilir.
        box = QFrame(self.cikis_ov)
        box.setFixedSize(400, 220)
        box.setStyleSheet("background: #111; border-radius: 20px; border: 1px solid #333;")
        box.move((self.width()-400)//2, (self.height()-220)//2)

        # Onay metni ve butonlar aynı dikey yerleşimde tutulur.
        layout = QVBoxLayout(box)
        layout.setContentsMargins(30, 30, 30, 30)

        # Kullanıcıya çıkış kararını net şekilde sorar.
        soru = QLabel("UYGULAMADAN ÇIKMAK\nİSTEDİĞİNİZE EMİN MİSİNİZ?")
        soru.setStyleSheet("color: white; font-weight: bold; font-size: 14px;")
        soru.setAlignment(Qt.AlignmentFlag.AlignCenter)
        layout.addWidget(soru)

        # Evet ve vazgeç butonları yatay olarak yan yana yerleşir.
        buton_alani = QHBoxLayout()

        # Evet butonu giriş penceresini kapatır ve uygulamanın kapanmasını sağlar.
        evet_btn = QPushButton("ÇIKIŞ YAP")
        evet_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        evet_btn.setStyleSheet("background: white; color: black; font-weight: bold; padding: 12px; border-radius: 10px;")
        evet_btn.clicked.connect(self.close)

        # Vazgeç butonu sadece onay katmanını kapatır.
        hayir_btn = QPushButton("VAZGEÇ")
        hayir_btn.setCursor(Qt.CursorShape.PointingHandCursor)
        hayir_btn.setStyleSheet("background: #222; color: white; padding: 12px; border-radius: 10px;")
        hayir_btn.clicked.connect(self.cikis_ov.close)

        # Butonlar yerleşime eklenir ve onay paneli görünür yapılır.
        buton_alani.addWidget(evet_btn)
        buton_alani.addWidget(hayir_btn)
        layout.addLayout(buton_alani)

        self.cikis_ov.show()
if __name__ == "__main__":
    # PyQt uygulama nesnesini oluşturur ve tüm arayüzde kullanılacak varsayılan fontu ayarlar.
    app = QApplication(sys.argv); app.setFont(QFont("Segoe UI", 10))

    # Kayıtlı oturum varsa doğrudan ana sayfayı, yoksa giriş ekranını açar.
    acik, pers = oturum_kontrol(); win = AnaSayfa(pers) if acik else GirisEkrani()

    # Seçilen ilk pencereyi gösterir ve PyQt olay döngüsünü başlatır.
    win.show(); sys.exit(app.exec())
