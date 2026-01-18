# 🌙 Moonberry İK - Modüler v2.0

## 📊 Proje Özeti

| Metrik | Değer |
|--------|-------|
| Toplam JS | ~4,000 satır |
| Toplam HTML | ~35KB |
| Modül Sayısı | 8 |
| Sayfa Sayısı | 17 |
| Belge Türü | 9 |

## 📁 Dosya Yapısı

```
moonberry-ik-modular/
├── index.html              # Ana shell (sidebar + page container)
├── login.html              # Giriş sayfası
├── firestore.rules         # Firebase güvenlik kuralları
├── README.md
├── css/
│   └── styles.css          # Global stiller (23KB)
├── js/
│   ├── app.js              # Router, Auth, State (19KB)
│   └── modules/
│       ├── utils.js        # Ortak fonksiyonlar (531 satır)
│       ├── dashboard.js    # Ana sayfa (203 satır)
│       ├── checklist.js    # Günlük/Temizlik/Platform (591 satır)
│       ├── shift.js        # Vardiya planı (490 satır)
│       ├── puantaj.js      # Puan sistemi (316 satır)
│       ├── personel.js     # Personel yönetimi (369 satır)
│       ├── belgeler.js     # PDF belgeler (475 satır)
│       └── admin.js        # Yönetim paneli (476 satır)
├── pages/
│   ├── dashboard.html
│   ├── checklist.html
│   ├── shift.html
│   ├── puantaj.html
│   ├── personel.html
│   ├── admin.html
│   ├── katalog.html
│   ├── preview.html
│   └── belgeler/           # 9 belge şablonu
│       ├── sozlesme.html
│       ├── tutanak.html
│       ├── savunma.html
│       ├── fesih.html
│       ├── istifa.html
│       ├── ibraname.html
│       ├── borc.html
│       ├── avans.html
│       └── zimmet.html
└── tools/
    ├── test-tool.html      # Test aracı
    └── seed-checklist.html # Veri ekleme
```

## 🔐 Güvenlik & Erişim

### Rol Hiyerarşisi
1. **Yönetici**: Tüm erişim + Admin panel
2. **Bölge Müdürü**: Tüm şubeler
3. **Mağaza Müdürü**: Kendi şubesi + belgeler
4. **Kasacı/Barista**: Dashboard, Checklist, Shift (görüntüleme)

### Sayfa Erişim Matrisi

| Sayfa | Barista | Müdür | Yönetici |
|-------|---------|-------|----------|
| Dashboard | ✅ | ✅ | ✅ |
| Checklist | ✅ | ✅ | ✅ |
| Shift | 👁️ | ✅ | ✅ |
| Puantaj | ❌ | ✅ | ✅ |
| Personel | ❌ | ✅ | ✅ |
| Belgeler | ❌ | ✅ | ✅ |
| Admin | ❌ | ❌ | ✅ |

## 🚀 Kurulum

1. Firebase Console'da proje oluşturun
2. `firestore.rules` dosyasını yükleyin
3. GitHub Pages veya hosting'e deploy edin
4. İlk kullanıcıyı Firebase Auth'a ekleyin

## ⚡ Lazy Loading

- Sayfalar ilk açılışta değil, ihtiyaç halinde yüklenir
- Her modül sadece bir kez yüklenir
- Yetkisiz sayfalar HTML olarak bile yüklenmez

## 📱 Responsive

- Mobil uyumlu tasarım
- PWA hazır yapı
- Touch-friendly kontroller

---

**Moonberry Coffee** | Tamaslan Kafe Restoran ve Gıda Hizmetleri
