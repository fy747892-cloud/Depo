/* ==========================================
   1. SERVICE WORKER & BAŞLATMA
   ========================================== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Kaydedildi!', reg))
            .catch(err => console.error('Service Worker Hatası:', err));
    });
}

/* ==========================================
   2. FIREBASE YAPILANDIRMASI
   ========================================== */
const firebaseConfig = {
    apiKey: "AIzaSyDn1NIA7zW7H-Gjz49urSJTVagq8IBmGQg",
    authDomain: "ecobildirim.firebaseapp.com",
    projectId: "ecobildirim",
    storageBucket: "ecobildirim.firebasestorage.app",
    messagingSenderId: "371214313757",
    appId: "1:371214313757:web:77f7de77b2148061c1d9f4"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
const googleProvider = new firebase.auth.GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });
const DOGRULAMA_MAIL_BEKLEME_MS = 60 * 1000;
const PUAN_BILDIRIM = 10;
const PUAN_ETKILESIM = 5;
const GRID_ADIMI = 0.003;
const TEMIZLIK_PUANI_COZULEN_SORUN = 10;
const CEVRECI_SEVIYELER = [
    { ad: "Çevreci Başlangıç", puan: 0 },
    { ad: "Yeşil Gönüllü", puan: 50 },
    { ad: "Doğa Dostu", puan: 120 },
    { ad: "Mahalle Koruyucusu", puan: 220 },
    { ad: "Erzurum Çevre Elçisi", puan: 360 },
    { ad: "EcoBildirim Lideri", puan: 550 }
];

/* ==========================================
   3. HARİTA VE İKONLAR
   ========================================== */
var erzurumSinir = L.latLngBounds(L.latLng(39.6, 40.8), L.latLng(40.1, 41.6));

var map = L.map('map', { 
    zoomControl: false,
    maxBounds: erzurumSinir,
    maxBoundsViscosity: 1.0
}).setView([39.9042, 41.2679], 13);

var ikonGrubu = L.layerGroup().addTo(map);
var gridGrubu = L.layerGroup().addTo(map);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

const cfg = { iconSize: [40, 40], iconAnchor: [20, 40], popupAnchor: [0, -40] };
const ikonlar = {
    kullanici: L.icon({ ...cfg, iconUrl: 'İkonlar/Kisi.png' }),
    cop: L.icon({ ...cfg, iconUrl: 'İkonlar/copbirikintisi.png.png' }),
    su: L.icon({ ...cfg, iconUrl: 'İkonlar/SuKirliliği.png' }),
    diger: L.icon({ ...cfg, iconUrl: 'İkonlar/diger.png' }),
    geridonusum: L.icon({ ...cfg, iconUrl: 'İkonlar/GeriDonusum2.png' }),
    copkutusu: L.icon({ ...cfg, iconUrl: 'İkonlar/copkutusu.png' }),
    kapak: L.icon({ ...cfg, iconUrl: 'İkonlar/Kapak.png' }),
    istenilenhizmet: L.icon({ ...cfg, iconUrl: 'İkonlar/istenilenhizmet.png' })
};

const bildirimAdlari = {
    cop: "Çöp Birikintisi",
    su: "Su Kirliliği",
    diger: "Diğer Çevre Sorunu",
    geridonusum: "Geri Dönüşüm Noktası",
    copkutusu: "Çöp Kutusu",
    kapak: "Kapak Toplama Noktası",
    istenilenhizmet: "İstenilen Hizmet"
};

let suAnkiFiltre = 'hepsi';
var kullaniciMarker = null;
let kullaniciKonumu = null;
const BILDIRIM_MESAFE_LIMITI = 50;
const MAKS_FOTO_BOYUTU = 3 * 1024 * 1024;

/* ==========================================
   4. ETİK KURALLAR (POP-UP) MANTIĞI
   ========================================== */
window.etikKurallariKontrolEt = function() {
    const onaylandiMi = localStorage.getItem('etikKurallarOnay');
    const modal = document.getElementById('terms-modal');
    if (!onaylandiMi && modal) {
        modal.classList.remove('hidden-element');
    }
};

window.etikKurallariOnayla = function() {
    localStorage.setItem('etikKurallarOnay', 'true');
    const modal = document.getElementById('terms-modal');
    if (modal) modal.classList.add('hidden-element');
};

function aktifKullaniciDogrulanmisMi() {
    return !!(auth.currentUser && auth.currentUser.emailVerified);
}

function kullaniciProfilRef() {
    return db.collection("kullanicilar").doc(auth.currentUser.uid);
}

async function kullaniciProfiliniHazirla(user) {
    if (!user || !user.emailVerified) return;

    const ref = db.collection("kullanicilar").doc(user.uid);
    const doc = await ref.get();
    
    // --- GEÇMİŞE DÖNÜK İSTATİSTİK TARAMASI ---
    // 1. Kullanıcının yaptığı tüm bildirimleri say
    const bildirimlerQs = await db.collection("bildirimler")
        .where("ekleyen", "==", user.email)
        .get();
    const gercekBildirimSayisi = bildirimlerQs.size;

    // 2. Kullanıcının onay verdiği (etkileşime girdiği) tüm bildirimleri say
    const etkilesimlerQs = await db.collection("bildirimler")
        .where("onaylayanlar", "array-contains", user.email)
        .get();
    const gercekEtkilesimSayisi = etkilesimlerQs.size;

    // 3. Toplam puanı yeniden hesapla
    const toplamPuan = (gercekBildirimSayisi * PUAN_BILDIRIM) + (gercekEtkilesimSayisi * PUAN_ETKILESIM);
    // ------------------------------------------

    const temelVeri = {
        email: user.email,
        ad: user.displayName || "",
        sonGiris: firebase.firestore.FieldValue.serverTimestamp(),
        puan: toplamPuan, // Geçmişe dönük güncel puan
        bildirimSayisi: gercekBildirimSayisi, // Gerçek bildirim sayısı
        etkilesimSayisi: gercekEtkilesimSayisi // Gerçek etkileşim sayısı
    };

    if (!doc.exists) {
        await ref.set({
            ...temelVeri,
            olusturmaTarihi: firebase.firestore.FieldValue.serverTimestamp()
        });
    } else {
        await ref.set(temelVeri, { merge: true });
    }
}

function seviyeBilgisiHesapla(puan) {
    let mevcut = CEVRECI_SEVIYELER[0];
    let sonraki = null;

    for (let i = 0; i < CEVRECI_SEVIYELER.length; i++) {
        if (puan >= CEVRECI_SEVIYELER[i].puan) {
            mevcut = CEVRECI_SEVIYELER[i];
            sonraki = CEVRECI_SEVIYELER[i + 1] || null;
        }
    }

    if (!sonraki) {
        return { mevcut, sonraki, kalan: 0, progress: 100 };
    }

    const seviyeAraligi = sonraki.puan - mevcut.puan;
    const ilerleme = puan - mevcut.puan;
    return {
        mevcut,
        sonraki,
        kalan: sonraki.puan - puan,
        progress: Math.max(0, Math.min(100, Math.round((ilerleme / seviyeAraligi) * 100)))
    };
}

function guvenilirlikBilgisiHesapla(puan) {
    const seviye = seviyeBilgisiHesapla(puan);
    const seviyeIndex = CEVRECI_SEVIYELER.findIndex(item => item.ad === seviye.mevcut.ad);
    const skor = Math.min(100, 20 + (seviyeIndex * 12) + Math.round(seviye.progress * 0.28));

    let ad = "Yeni Katılımcı";
    if (skor >= 90) ad = "Topluluk Güvencesi";
    else if (skor >= 75) ad = "Çok Güvenilir";
    else if (skor >= 60) ad = "Güvenilir Gözlemci";
    else if (skor >= 45) ad = "Aktif Katılımcı";
    else if (skor >= 30) ad = "Gelişen Katılımcı";

    return { skor, ad };
}

async function cevrecilikPuaniEkle(tip) {
    if (!aktifKullaniciDogrulanmisMi()) return;

    const artanPuan = tip === 'bildirim' ? PUAN_BILDIRIM : PUAN_ETKILESIM;
    const sayacAlani = tip === 'bildirim' ? 'bildirimSayisi' : 'etkilesimSayisi';

    await kullaniciProfilRef().set({
        email: auth.currentUser.email,
        puan: firebase.firestore.FieldValue.increment(artanPuan),
        [sayacAlani]: firebase.firestore.FieldValue.increment(1),
        sonPuanTarihi: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

function bolgeBilgisiOlustur(lat, lng) {
    const baseLat = Math.floor(lat / GRID_ADIMI) * GRID_ADIMI;
    const baseLng = Math.floor(lng / GRID_ADIMI) * GRID_ADIMI;
    const bolgeId = `${baseLat.toFixed(3)}_${baseLng.toFixed(3)}`;

    return {
        id: bolgeId,
        baseLat,
        baseLng,
        bounds: [
            [baseLat, baseLng],
            [baseLat + GRID_ADIMI, baseLng + GRID_ADIMI]
        ]
    };
}

function bolgeBilgisiIddenOlustur(bolgeId) {
    const [latText, lngText] = bolgeId.split('_');
    const baseLat = Number(latText);
    const baseLng = Number(lngText);

    if (Number.isNaN(baseLat) || Number.isNaN(baseLng)) return null;

    return {
        id: bolgeId,
        baseLat,
        baseLng,
        bounds: [
            [baseLat, baseLng],
            [baseLat + GRID_ADIMI, baseLng + GRID_ADIMI]
        ]
    };
}

async function bolgeBildirimSayisiniArtir(lat, lng) {
    const bolge = bolgeBilgisiOlustur(lat, lng);
    await db.collection("bolge_temizlik_puanlari").doc(bolge.id).set({
        bolgeId: bolge.id,
        baseLat: bolge.baseLat,
        baseLng: bolge.baseLng,
        toplamBildirimSayisi: firebase.firestore.FieldValue.increment(1),
        cozulmusBildirimSayisi: firebase.firestore.FieldValue.increment(0),
        temizlikPuani: firebase.firestore.FieldValue.increment(0),
        sonGuncelleme: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

async function bolgeCozumSayisiniArtir(lat, lng) {
    const bolge = bolgeBilgisiOlustur(lat, lng);
    await db.collection("bolge_temizlik_puanlari").doc(bolge.id).set({
        bolgeId: bolge.id,
        baseLat: bolge.baseLat,
        baseLng: bolge.baseLng,
        cozulmusBildirimSayisi: firebase.firestore.FieldValue.increment(1),
        temizlikPuani: firebase.firestore.FieldValue.increment(TEMIZLIK_PUANI_COZULEN_SORUN),
        sonGuncelleme: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
}

function gridRengi(puan) {
    if (puan >= 50) return "#1e8449";
    if (puan >= 30) return "#27ae60";
    if (puan >= 10) return "#58d68d";
    return "#a9dfbf";
}

function gridleriYukle() {
    gridGrubu.clearLayers();

    db.collection("bolge_temizlik_puanlari").get().then(qs => {
        qs.forEach(doc => {
            const d = doc.data();
            const bolge = bolgeBilgisiIddenOlustur(d.bolgeId || doc.id);
            if (!bolge) return;

            const puan = d.temizlikPuani || 0;
            L.rectangle(bolge.bounds, {
                color: gridRengi(puan),
                weight: 1,
                fillColor: gridRengi(puan),
                fillOpacity: puan > 0 ? 0.22 : 0.10,
                interactive: false
            }).addTo(gridGrubu);
        });
    });
}

async function bolgeOzetiGetir(lat, lng) {
    const bolge = bolgeBilgisiOlustur(lat, lng);
    const bolgeDoc = await db.collection("bolge_temizlik_puanlari").doc(bolge.id).get();
    const stats = bolgeDoc.exists ? bolgeDoc.data() : {};
    const hizmetTipleri = ['geridonusum', 'copkutusu', 'kapak', 'istenilenhizmet'];
    const hizmetQs = await db.collection("bildirimler")
        .where("bolgeId", "==", bolge.id)
        .where("tip", "in", hizmetTipleri)
        .get();

    return {
        bolgeId: bolge.id,
        toplamBildirimSayisi: stats.toplamBildirimSayisi || 0,
        cozulmusBildirimSayisi: stats.cozulmusBildirimSayisi || 0,
        temizlikPuani: stats.temizlikPuani || 0,
        hizmetNoktasiSayisi: hizmetQs.size
    };
}

function bolgeOzetiHtml(ozet) {
    return `
        <div class="region-summary">
            <h4>Bölge Özeti</h4>
            <div class="region-summary-grid">
                <div><strong>${ozet.toplamBildirimSayisi}</strong><span>Bildirim</span></div>
                <div><strong>${ozet.cozulmusBildirimSayisi}</strong><span>Çözüldü</span></div>
                <div><strong>${ozet.hizmetNoktasiSayisi}</strong><span>Hizmet</span></div>
                <div><strong>${ozet.temizlikPuani}</strong><span>Puan</span></div>
            </div>
        </div>
    `;
}

function sidebarDurumunuGuncelle() {
    const girisli = aktifKullaniciDogrulanmisMi();
    document.querySelectorAll('.guest-only').forEach(el => {
        el.style.display = girisli ? 'none' : 'block';
    });
    document.querySelectorAll('.auth-only').forEach(el => {
        el.style.display = girisli ? 'block' : 'none';
    });
}

function haritayiGoster(konumaGit = false) {
    const homePage = document.getElementById('home-page');
    const authCont = document.getElementById('auth-container');
    const mainHeader = document.getElementById('main-header');
    const mapDiv = document.getElementById('map');
    const locBtn = document.getElementById('locate-btn');

    if(homePage) homePage.style.display = 'none';
    if(authCont) authCont.classList.add('hidden-element');
    if(mainHeader) mainHeader.classList.remove('hidden-element');
    if(mapDiv) mapDiv.classList.remove('hidden-element');
    if(locBtn) locBtn.style.display = aktifKullaniciDogrulanmisMi() ? 'flex' : 'none';

    setTimeout(() => {
        map.invalidateSize();
        verileriYukle();
        if (konumaGit && aktifKullaniciDogrulanmisMi()) konumumaGit();
    }, 300);
}

window.girisGerekliAc = function() {
    const modal = document.getElementById('login-required-modal');
    if (modal) modal.classList.remove('hidden-element');
};

window.girisGerekliKapat = function() {
    const modal = document.getElementById('login-required-modal');
    if (modal) modal.classList.add('hidden-element');
};

window.girisPaneliAc = function(form = 'login') {
    const homePage = document.getElementById('home-page');
    const authCont = document.getElementById('auth-container');
    const mainHeader = document.getElementById('main-header');
    const mapDiv = document.getElementById('map');
    const locBtn = document.getElementById('locate-btn');

    if(homePage) homePage.style.display = 'none';
    if(authCont) authCont.classList.remove('hidden-element');
    if(mainHeader) mainHeader.classList.add('hidden-element');
    if(mapDiv) mapDiv.classList.add('hidden-element');
    if(locBtn) locBtn.style.display = 'none';
    formDegistir(form);
};

/* ==========================================
   5. SAYFA VE OTURUM YÖNETİMİ
   ========================================== */
window.menuAc = () => document.getElementById("side-menu").style.width = "250px";
window.menuKapat = () => document.getElementById("side-menu").style.width = "0";

auth.onAuthStateChanged(user => {
    sidebarDurumunuGuncelle();
    const homePage = document.getElementById('home-page');
    const authCont = document.getElementById('auth-container');
    const mainHeader = document.getElementById('main-header');
    const mapDiv = document.getElementById('map');
    const locBtn = document.getElementById('locate-btn');

    if (user && user.emailVerified) {
        kullaniciProfiliniHazirla(user).finally(() => {
            haritayiGoster(true);
            setTimeout(() => etikKurallariKontrolEt(), 650);
        });
    } else if (user && !user.emailVerified) {
        girisPaneliAc('login');
    } else {
        if(homePage) homePage.style.display = 'block';
        if(authCont) authCont.classList.add('hidden-element');
        if(mainHeader) mainHeader.classList.add('hidden-element');
        if(mapDiv) mapDiv.classList.add('hidden-element');
        if(locBtn) locBtn.style.display = 'none';
        menuKapat();
    }
});

window.sayfaDegistir = function(hedef) {
    const homePage = document.getElementById('home-page');
    const authCont = document.getElementById('auth-container');
    const mainHeader = document.getElementById('main-header');
    const mapDiv = document.getElementById('map');
    const locBtn = document.getElementById('locate-btn');

    // Her şeyi gizle
    if(homePage) homePage.style.display = 'none';
    if(authCont) authCont.classList.add('hidden-element');
    if(mainHeader) mainHeader.classList.add('hidden-element');
    if(mapDiv) mapDiv.classList.add('hidden-element');
    if(locBtn) locBtn.style.display = 'none';

    if (hedef === 'home') {
        if(homePage) homePage.style.display = 'block';
    } else if (hedef === 'map') {
        haritayiGoster(aktifKullaniciDogrulanmisMi());
    } else if (hedef === 'login') {
        if (auth.currentUser) {
            if (!auth.currentUser.emailVerified) {
                girisPaneliAc('login');
                alert("Haritaya geçmeden önce e-posta adresinizi doğrulamanız gerekiyor. Mail gelmediyse giriş ekranındaki 'Doğrulama Maili Gönder' butonunu kullanın.");
                return;
            }

            haritayiGoster(true);
            etikKurallariKontrolEt();
        } else {
            girisPaneliAc('login');
        }
    }
};

window.formDegistir = function(hedef) {
    ['login-form', 'register-form', 'reset-form'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden-element');
    });
    const hedefForm = document.getElementById(hedef + '-form');
    if (hedefForm) hedefForm.classList.remove('hidden-element');
};

/* ==========================================
   6. KONUM VE HARİTA ETKİLEŞİMİ
   ========================================== */
window.konumumaGit = function() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            const lat = pos.coords.latitude, lng = pos.coords.longitude;
            kullaniciKonumu = L.latLng(lat, lng);
            if (kullaniciMarker) map.removeLayer(kullaniciMarker);
            kullaniciMarker = L.marker([lat, lng], {icon: ikonlar.kullanici}).addTo(map).bindPopup(`Buradasınız<br><small>Bildirimleri bu konumun ${BILDIRIM_MESAFE_LIMITI} metre çevresine bırakabilirsiniz.</small>`);
            map.flyTo([lat, lng], 18, { animate: true, duration: 1.5 });
        }, () => {
            alert("Konumunuz alınamadı. Bildirim bırakmak için lütfen konum izni verin.");
        }, { enableHighAccuracy: true });
    }
};

function bildirimMesafeUyarisi(latlng, mesaj) {
    L.popup()
        .setLatLng(latlng)
        .setContent(`<div style="max-width:220px;"><b>Konum Uyarısı</b><br>${mesaj}</div>`)
        .openOn(map);
}

map.on('click', async function(e) {
    if (!erzurumSinir.contains(e.latlng)) { alert("🚨 Sadece Erzurum!"); return; }

    if (!aktifKullaniciDogrulanmisMi()) {
        girisGerekliAc();
        return;
    }

    if (!kullaniciKonumu) {
        konumumaGit();
        bildirimMesafeUyarisi(e.latlng, `Bildirim bırakmadan önce konumunuzun doğrulanması gerekiyor. Lütfen konum izni verin; ardından bulunduğunuz noktanın ${BILDIRIM_MESAFE_LIMITI} metre çevresine bildirim bırakabilirsiniz.`);
        return;
    }

    const mesafe = kullaniciKonumu.distanceTo(e.latlng);
    if (mesafe > BILDIRIM_MESAFE_LIMITI) {
        bildirimMesafeUyarisi(e.latlng, `Bu nokta bildirim alanınızın dışında. Bildirimi bulunduğunuz konumun ${BILDIRIM_MESAFE_LIMITI} metre çevresine bırakabilirsiniz. Seçtiğiniz nokta yaklaşık ${Math.round(mesafe)} metre uzakta.`);
        return;
    }

    const isMobile = window.innerWidth <= 600;
    const bolgeOzeti = await bolgeOzetiGetir(e.latlng.lat, e.latlng.lng);
    const formHtml = `
        <div class="report-panel">
            <div class="cevre-form report-form">
                <div id="kirlilik-div">
                    <label>🚨 Kirlilik Bildir</label>
                    <select id="sel-kirlilik" onchange="ozelFormKontrol('kirlilik')">
                        <option value="">Seçiniz...</option>
                        <option value="cop">Çöp Birikintisi</option>
                        <option value="su">Su Kirliliği</option>
                        <option value="diger">Diğer Çevre Sorunu</option>
                    </select>
                </div>
                <div id="hizmet-div">
                    <label>♻️ Hizmet Bildir</label>
                    <select id="sel-hizmet" onchange="ozelFormKontrol('hizmet')">
                        <option value="">Seçiniz...</option>
                        <option value="geridonusum">Geri Dönüşüm Noktası</option>
                        <option value="copkutusu">Çöp Kutusu</option>
                        <option value="kapak">Kapak Toplama Noktası</option>
                        <option value="istenilenhizmet">İstenilen Hizmet</option>
                    </select>
                </div>
                <div id="not-alani" style="display:none;">
                    <textarea id="not-metni" placeholder="Açıklama yazın..."></textarea>
                    <label class="photo-label" for="bildirim-foto">Fotoğraf ekle (isteğe bağlı)</label>
                    <input type="file" id="bildirim-foto" accept="image/*" capture="environment">
                    <button onclick="kaydet(${e.latlng.lat}, ${e.latlng.lng}, this)" class="btn-modern btn-primary">Kaydet</button>
                </div>
                <button onclick="${isMobile ? 'sheetKapat()' : 'map.closePopup()'}" class="btn-modern btn-danger">İptal</button>
            </div>
            ${bolgeOzetiHtml(bolgeOzeti)}
        </div>`;

    if (isMobile) {
        document.getElementById('sheet-content').innerHTML = formHtml;
        document.getElementById('mobile-bottom-sheet').classList.add('active');
    } else {
        L.popup().setLatLng(e.latlng).setContent(formHtml).openOn(map);
    }
});

window.ozelFormKontrol = function(tip) {
    const kDiv = document.getElementById('kirlilik-div'), hDiv = document.getElementById('hizmet-div'), nAlan = document.getElementById('not-alani');
    const kVal = document.getElementById('sel-kirlilik').value, hVal = document.getElementById('sel-hizmet').value;
    if (tip === 'kirlilik' && kVal !== "") { hDiv.style.display = 'none'; nAlan.style.display = 'block'; }
    else if (tip === 'hizmet' && hVal !== "") { kDiv.style.display = 'none'; nAlan.style.display = 'block'; }
    else { kDiv.style.display = 'block'; hDiv.style.display = 'block'; nAlan.style.display = 'none'; }
};

window.sheetKapat = () => document.getElementById('mobile-bottom-sheet').classList.remove('active');

/* ==========================================
   7. VERİ VE BİLDİRİM İŞLEMLERİ
   ========================================== */
function verileriYukle() {
    ikonGrubu.clearLayers();
    gridleriYukle();
    db.collection("bildirimler").get().then(qs => {
        qs.forEach(async (doc) => {
            const d = doc.data(), id = doc.id, onay = d.onaySayisi || 0;
            
            // --- ENTEGRASYON KATMANI ---
            // Eğer bildirimde bolgeId yoksa, konuma göre hesapla ve veritabanını güncelle
            if (!d.bolgeId && d.enlem && d.boylam) {
                const yeniBolge = bolgeBilgisiOlustur(d.enlem, d.boylam);
                d.bolgeId = yeniBolge.id; // Bellekteki veriyi anlık güncelle
                
                // Veritabanında eksik olan bolgeId'yi tamamla
                db.collection("bildirimler").doc(id).update({
                    bolgeId: yeniBolge.id
                }).then(() => {
                    // Bölge istatistiklerini (temizlik puanı vb.) bu eski bildirim için tetikle
                    bolgeBildirimSayisiniArtir(d.enlem, d.boylam);
                }).catch(err => console.error("Eski veri güncellenirken hata:", err));
            }
            // ---------------------------

            const kirlilikler = ['cop', 'su', 'diger'];
            let kat = kirlilikler.includes(d.tip) ? 'kirlilik' : 'hizmet';
            const filtreEslesiyor = suAnkiFiltre === 'hepsi' || suAnkiFiltre === kat || suAnkiFiltre === d.tip;
            
            if(onay < 5 && filtreEslesiyor) {
                let isim = bildirimAdlari[d.tip] || "Bildirim";
                let p = `<div style="min-width:180px;"><b>${isim}</b><br>${escapeHtml(d.not || "")}<br><small>Ekleyen: ${escapeHtml(d.ekleyen || "")}</small><br>`;
                
                if (d.fotoUrl) p += `<img src="${d.fotoUrl}" class="report-photo" alt="Bildirim fotoğrafı">`;
                
                if (kat === 'kirlilik') {
                    const onayFonksiyonu = aktifKullaniciDogrulanmisMi() ? `sorunGiderildi('${id}')` : 'girisGerekliAc()';
                    p += `<button onclick="${onayFonksiyonu}" class="btn-modern btn-primary" style="font-size:11px;">Bu sorun artık yok (${onay}/5)</button>`;
                }
                
                if (auth.currentUser && auth.currentUser.email === d.ekleyen) {
                    p += `<button onclick="bildirimiSil('${id}')" class="btn-modern btn-danger" style="font-size:11px;">🗑️ Bildirimi Kaldır</button>`;
                }
                
                p += `</div>`;
                L.marker([d.enlem, d.boylam], {icon: ikonlar[d.tip]}).addTo(ikonGrubu).bindPopup(p);
            }
        });
    });
}
function escapeHtml(deger) {
    return String(deger)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function fotoYukle(file) {
    if (!file) return { url: "", path: "" };
    if (file.size > MAKS_FOTO_BOYUTU) {
        throw new Error("Fotoğraf en fazla 3 MB olabilir.");
    }

    const kullanici = auth.currentUser;
    const uzanti = file.name.split('.').pop() || 'jpg';
    const dosyaAdi = `${Date.now()}-${Math.random().toString(36).slice(2)}.${uzanti}`;
    const ref = storage.ref().child(`bildirim-fotograflari/${kullanici.uid}/${dosyaAdi}`);
    const snap = await ref.put(file);
    return {
        url: await snap.ref.getDownloadURL(),
        path: snap.ref.fullPath
    };
}

window.kaydet = async (lat, lng, kaydetBtn) => {
    const tip = document.getElementById('sel-kirlilik').value || document.getElementById('sel-hizmet').value;
    const hedefKonum = L.latLng(lat, lng);
    const mesafe = kullaniciKonumu ? kullaniciKonumu.distanceTo(hedefKonum) : Infinity;
    if (mesafe > BILDIRIM_MESAFE_LIMITI) {
        bildirimMesafeUyarisi(hedefKonum, `Bu nokta bildirim alanınızın dışında. Lütfen bulunduğunuz konumun ${BILDIRIM_MESAFE_LIMITI} metre çevresinden bir nokta seçin.`);
        return;
    }

    const fotoInput = document.getElementById('bildirim-foto');
    if (kaydetBtn) {
        kaydetBtn.disabled = true;
        kaydetBtn.textContent = "Kaydediliyor...";
    }

    try {
        const foto = await fotoYukle(fotoInput?.files?.[0]);
        const bolge = bolgeBilgisiOlustur(lat, lng);
        await db.collection("bildirimler").add({ 
            tip, enlem: lat, boylam: lng, not: document.getElementById('not-metni').value, 
            ekleyen: auth.currentUser.email, onaySayisi: 0, onaylayanlar: [],
            fotoUrl: foto.url,
            fotoPath: foto.path,
            bolgeId: bolge.id,
            zaman: firebase.firestore.FieldValue.serverTimestamp() 
        });
        await bolgeBildirimSayisiniArtir(lat, lng);
        await cevrecilikPuaniEkle('bildirim');

        window.innerWidth <= 600 ? sheetKapat() : map.closePopup(); 
        verileriYukle(); 
    } catch (error) {
        alert(error.message || "Bildirim kaydedilirken bir hata oluştu.");
    } finally {
        if (kaydetBtn) {
            kaydetBtn.disabled = false;
            kaydetBtn.textContent = "Kaydet";
        }
    }
};

window.sorunGiderildi = (id) => {
    if (!aktifKullaniciDogrulanmisMi()) {
        girisGerekliAc();
        return;
    }
    const email = auth.currentUser.email;
    const ref = db.collection("bildirimler").doc(id);
    ref.get().then(doc => {
        if (doc.exists) {
            const data = doc.data();
            const onaylar = data.onaylayanlar || [];
            if (onaylar.includes(email)) return alert("Zaten onayladınız!");
            const yeniOnaySayisi = (data.onaySayisi || 0) + 1;
            ref.update({
                onaySayisi: firebase.firestore.FieldValue.increment(1),
                onaylayanlar: firebase.firestore.FieldValue.arrayUnion(email)
            }).then(async () => {
                if (yeniOnaySayisi === 5) {
                    await bolgeCozumSayisiniArtir(data.enlem, data.boylam);
                }
                await cevrecilikPuaniEkle('etkilesim');
                verileriYukle();
            });
        }
    });
};

/* ==========================================
   8. DİĞER KOMUTLAR (AUTH, DESTEK, UI)
   ========================================== */
function emailGecerliMi(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function dogrulamaMailAyarlariniAl() {
    const origin = window.location.origin;
    const pathname = window.location.pathname;

    if (origin && origin !== 'null' && origin.startsWith('http')) {
        return {
            url: `${origin}${pathname}`,
            handleCodeInApp: false
        };
    }

    return undefined;
}

async function dogrulamaMailiGonderKullaniciya(user) {
    await user.sendEmailVerification(dogrulamaMailAyarlariniAl());
}

function authHataMesaji(error) {
    const kod = error?.code || "";
    if (kod === "auth/too-many-requests") return "Çok fazla deneme yapıldı. Firebase geçici olarak mail/giriş denemelerini sınırladı. Lütfen 15-30 dakika bekleyip tekrar deneyin.";
    if (kod === "auth/user-not-found") return "Bu e-posta adresiyle kayıtlı hesap bulunamadı.";
    if (kod === "auth/wrong-password" || kod === "auth/invalid-credential") return "E-posta veya şifre hatalı.";
    if (kod === "auth/invalid-email") return "E-posta adresi geçerli görünmüyor.";
    if (kod === "auth/network-request-failed") return "Bağlantı sorunu oluştu. İnternet bağlantınızı kontrol edip tekrar deneyin.";
    if (kod === "auth/unauthorized-continue-uri") return "Firebase ayarlarında bu site adresi yetkili değil. Firebase Console > Authentication > Settings > Authorized domains bölümünü kontrol edin.";
    if (kod === "auth/operation-not-allowed") return "Bu giriş yöntemi Firebase tarafında aktif değil. Firebase Console > Authentication > Sign-in method bölümünden Google girişini etkinleştirin.";
    if (kod === "auth/account-exists-with-different-credential") return "Bu e-posta adresi farklı bir giriş yöntemiyle kayıtlı. Önce mevcut yöntemle giriş yapın.";
    return error?.message || "İşlem sırasında bir hata oluştu.";
}

window.girisYap = async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!emailGecerliMi(email)) return alert("Lütfen geçerli bir e-posta adresi girin.");
    if (!password) return alert("Lütfen şifrenizi girin.");

    try {
        const sonuc = await auth.signInWithEmailAndPassword(email, password);
        if (!sonuc.user.emailVerified) {
            girisPaneliAc('login');
            alert("E-posta adresiniz henüz doğrulanmamış. Mail gelmediyse 'Doğrulama Maili Gönder' butonuna basabilirsiniz. Çok denendi uyarısı alırsanız lütfen bir süre bekleyin.");
        }
    } catch (error) {
        alert(authHataMesaji(error));
        girisPaneliAc('login');
    }
};

window.kayitOl = async () => {
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;

    if (!emailGecerliMi(email)) return alert("Lütfen geçerli bir e-posta adresi girin.");
    if (password.length < 6) return alert("Şifre en az 6 karakter olmalıdır.");

    try {
        const sonuc = await auth.createUserWithEmailAndPassword(email, password);
        await dogrulamaMailiGonderKullaniciya(sonuc.user);
        await auth.signOut();
        alert("Kayıt oluşturuldu. Haritaya giriş yapmadan önce e-posta adresinize gelen doğrulama bağlantısına tıklayın.");
        formDegistir('login');
    } catch (error) {
        alert(authHataMesaji(error));
    }
};

window.dogrulamaMailiGonder = async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const sonGonderim = Number(localStorage.getItem('sonDogrulamaMailiZamani') || 0);
    const kalanSure = DOGRULAMA_MAIL_BEKLEME_MS - (Date.now() - sonGonderim);

    if (!emailGecerliMi(email)) return alert("Doğrulama maili göndermek için e-posta adresinizi girin.");
    if (!password) return alert("Güvenlik için şifrenizi de girmeniz gerekiyor.");
    if (kalanSure > 0) return alert(`Tekrar mail istemeden önce yaklaşık ${Math.ceil(kalanSure / 1000)} saniye bekleyin.`);

    try {
        const sonuc = await auth.signInWithEmailAndPassword(email, password);
        if (sonuc.user.emailVerified) {
            await auth.signOut();
            girisPaneliAc('login');
            alert("Bu e-posta adresi zaten doğrulanmış. Giriş yapabilirsiniz.");
            return;
        }

        await dogrulamaMailiGonderKullaniciya(sonuc.user);
        localStorage.setItem('sonDogrulamaMailiZamani', String(Date.now()));
        await auth.signOut();
        girisPaneliAc('login');
        alert("Doğrulama maili tekrar gönderildi. Lütfen gelen kutusu, spam ve promosyonlar klasörlerini kontrol edin.");
    } catch (error) {
        alert(authHataMesaji(error));
        girisPaneliAc('login');
    }
};

window.googleIleGiris = async () => {
    try {
        await auth.signInWithPopup(googleProvider);
    } catch (error) {
        if (error?.code === "auth/popup-blocked") {
            try {
                await auth.signInWithRedirect(googleProvider);
                return;
            } catch (redirectError) {
                alert(authHataMesaji(redirectError));
                return;
            }
        }

        if (error?.code === "auth/popup-closed-by-user") {
            alert("Google giriş penceresi kapatıldı. Giriş yapmak için tekrar deneyebilirsiniz.");
            return;
        }

        alert(authHataMesaji(error));
    }
};
window.sifreSifirla = () => {
    const email = document.getElementById('reset-email').value;
    if (!email) return alert("E-posta girin!");
    auth.sendPasswordResetEmail(email).then(() => { alert("Bağlantı gönderildi!"); formDegistir('login'); }).catch(e => alert(e.message));
};

window.bildirimiSil = async (id) => {
    if (!aktifKullaniciDogrulanmisMi()) {
        girisGerekliAc();
        return;
    }
    if (!confirm("Silinsin mi?")) return;

    const ref = db.collection("bildirimler").doc(id);
    const doc = await ref.get();
    const data = doc.exists ? doc.data() : null;

    if (data?.fotoPath) {
        try {
            await storage.ref(data.fotoPath).delete();
        } catch (error) {
            console.warn("Fotoğraf silinemedi:", error);
        }
    }

    await ref.delete();
    verileriYukle();
};
window.filtrele = (tip, el) => { suAnkiFiltre = tip; document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); el.classList.add('active'); verileriYukle(); };
window.cikisYap = () => confirm("Emin misiniz?") && auth.signOut();
window.hesabimAc = async () => {
    menuKapat();
    if (!aktifKullaniciDogrulanmisMi()) {
        girisGerekliAc();
        return;
    }

    await kullaniciProfiliniHazirla(auth.currentUser);
    const doc = await kullaniciProfilRef().get();
    const data = doc.exists ? doc.data() : {};
    const puan = data.puan || 0;
    const seviye = seviyeBilgisiHesapla(puan);
    const guvenilirlik = guvenilirlikBilgisiHesapla(puan);
    const email = auth.currentUser.email || "-";

    document.querySelector('.account-avatar').textContent = email.charAt(0).toUpperCase();
    document.getElementById('account-email').textContent = email;
    document.getElementById('account-level-name').textContent = seviye.mevcut.ad;
    document.getElementById('account-points').textContent = `${puan} çevreci puanı`;
    document.getElementById('account-progress-fill').style.width = `${seviye.progress}%`;
    document.getElementById('account-next-level').textContent = seviye.sonraki
        ? `Bir sonraki seviye: ${seviye.sonraki.ad}. Kalan puan: ${seviye.kalan}.`
        : "En yüksek seviyedesiniz. Harika ilerleme!";
    document.getElementById('account-trust-score').textContent = `${guvenilirlik.skor}/100`;
    document.getElementById('account-trust-name').textContent = guvenilirlik.ad;
    document.getElementById('account-report-count').textContent = data.bildirimSayisi || 0;
    document.getElementById('account-action-count').textContent = data.etkilesimSayisi || 0;
    document.getElementById('account-modal').classList.remove('hidden-element');
};
window.hesabimKapat = () => document.getElementById('account-modal').classList.add('hidden-element');
window.destekFormuAc = () => {
    menuKapat();
    if (!aktifKullaniciDogrulanmisMi()) {
        girisGerekliAc();
        return;
    }
    document.getElementById('destek-modal').classList.remove('hidden-element');
};
window.destekKapat = () => document.getElementById('destek-modal').classList.add('hidden-element');
window.destekGonder = () => {
    if (!aktifKullaniciDogrulanmisMi()) {
        girisGerekliAc();
        return;
    }
    const m = document.getElementById('destek-mesaj').value;
    if(!m) return;
    db.collection("destek_mesajlari").add({ mesaj: m, ekleyen: auth.currentUser.email, tarih: firebase.firestore.FieldValue.serverTimestamp() }).then(() => { alert("İletildi!"); destekKapat(); });
};

const legalIcerikler = {
    about: {
        title: "Hakkımızda",
        body: `
            <p><b>EcoBildirim Erzurum</b>, şehirde görülen çevre kirliliği ve ihtiyaç duyulan belediye hizmet noktalarının harita üzerinde bildirilmesini amaçlayan yerel bir çevre bildirim sistemidir.</p>
            <h4>Projenin Amacı</h4>
            <p>Vatandaşların çevre sorunlarını hızlıca işaretleyebilmesi, diğer kullanıcıların bu bildirimleri teyit edebilmesi ve böylece temizlik, geri dönüşüm ve çevre koruma süreçlerine destek olunması hedeflenir.</p>
            <h4>Çalışma Mantığı</h4>
            <ul>
                <li>Kullanıcı harita üzerinde bir nokta seçerek kirlilik veya hizmet bildirimi oluşturur.</li>
                <li>Bildirimler konum, kategori, not, ekleyen kullanıcı ve zaman bilgisiyle kaydedilir.</li>
                <li>Diğer kullanıcılar kirlilik bildirimlerini onaylayarak sorunun artık bulunmadığını belirtebilir.</li>
                <li>Belirlenen onay sayısına ulaşan bildirimler aktif harita görünümünden kaldırılır.</li>
            </ul>
            <p>Bu bölüm proje tanıtımı amacı taşır; resmi kurum işlemleri için ayrıca yetkili mercilerle iletişime geçilmesi gerekir.</p>
        `
    },
    terms: {
        title: "Kullanım Şartları",
        body: `
            <p>EcoBildirim'i kullanan herkes aşağıdaki kullanım ilkelerini kabul etmiş sayılır.</p>
            <h4>Doğru Bildirim İlkesi</h4>
            <ul>
                <li>Yalnızca gerçekten gözlemlenen çevre kirliliği veya hizmet noktaları bildirilmelidir.</li>
                <li>Yanıltıcı, şaka amaçlı, hakaret içeren veya gerçeğe aykırı bildirim yapılmamalıdır.</li>
                <li>Bildirim notlarında kişisel veri, özel adres detayı veya üçüncü kişileri hedef alan ifadeler paylaşılmamalıdır.</li>
            </ul>
            <h4>Kullanıcı Sorumluluğu</h4>
            <p>Kullanıcı, gönderdiği bildirim ve açıklamanın doğruluğundan sorumludur. Sistem, çevresel farkındalık ve bildirim kolaylığı sağlamak için geliştirilmiştir.</p>
            <h4>Hizmetin Kullanımı</h4>
            <p>Uygulama kötüye kullanım, yoğun teknik hata veya güvenlik riski durumlarında erişimi sınırlama, bildirimleri kaldırma veya gerekli kayıtları inceleme hakkını saklı tutar.</p>
        `
    },
    privacy: {
        title: "Gizlilik Politikası",
        body: `
            <p>EcoBildirim, uygulamanın çalışması için gerekli sınırlı kullanıcı ve bildirim verilerini işler.</p>
            <h4>Toplanan Veriler</h4>
            <ul>
                <li>Giriş ve hesap işlemleri için e-posta adresi.</li>
                <li>Harita bildirimi için seçilen konum, kategori, not ve bildirim zamanı.</li>
                <li>Kirlilik bildirimlerinde onay veren kullanıcı bilgisi.</li>
                <li>Kullanıcı izin verirse cihaz konumu, yalnızca haritada kullanıcıyı konumlandırmak için kullanılır.</li>
            </ul>
            <h4>Verilerin Kullanım Amacı</h4>
            <p>Veriler bildirimleri haritada göstermek, kullanıcı hesabını yönetmek, kötüye kullanımı azaltmak ve destek mesajlarını değerlendirmek için kullanılır.</p>
            <h4>Saklama ve Güvenlik</h4>
            <p>Veriler Firebase altyapısında tutulur. Kullanıcılar kendi bildirimlerini kaldırabilir. Gereksiz, hatalı veya kötüye kullanım niteliğindeki içerikler yönetimsel olarak kaldırılabilir.</p>
            <p>Bu metin bilgilendirme amaçlıdır; yayın ve resmi süreçler öncesinde hukuki danışmanlıkla son hale getirilmesi önerilir.</p>
        `
    }
};

window.legalModalAc = function(tip) {
    const icerik = legalIcerikler[tip];
    const modal = document.getElementById('legal-modal');
    const title = document.getElementById('legal-modal-title');
    const body = document.getElementById('legal-modal-body');
    if (!icerik || !modal || !title || !body) return;

    title.textContent = icerik.title;
    body.innerHTML = icerik.body;
    modal.classList.remove('hidden-element');
};

window.legalModalKapat = function() {
    const modal = document.getElementById('legal-modal');
    if (modal) modal.classList.add('hidden-element');
};

window.scrollToElement = (id) => document.getElementById(id).scrollIntoView({ behavior: 'smooth' });

// Resimleri Ortalama (Açılış için)
window.addEventListener('load', () => {
    const wrappers = document.querySelectorAll('.info-card-img-wrapper');
    wrappers.forEach(wrapper => {
        const img = wrapper.querySelector('img');
        if (img) {
            const scrollAmount = (img.offsetWidth - wrapper.offsetWidth) / 2;
            wrapper.scrollLeft = scrollAmount;
        }
    });
});
