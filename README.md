[README.md](https://github.com/user-attachments/files/24695840/README.md)
# 🌙 Moonberry İK - Modüler Versiyon 2.0

## 📁 Dosya Yapısı

```
moonberry-ik-modular/
├── index.html              # Ana shell (sidebar + page container)
├── login.html              # Giriş sayfası
├── firestore.rules         # Firebase güvenlik kuralları
├── css/
│   └── styles.css          # Global stiller
├── js/
│   ├── app.js              # Router, Auth, State, Page Loader
│   ├── legacy-backup.js    # Eski monolitik JS (referans)
│   └── modules/            # Sayfa modülleri (opsiyonel)
├── pages/                  # HTML şablonları (Lazy Load)
│   ├── dashboard.html
│   ├── checklist.html
│   ├── shift.html
│   ├── puantaj.html
│   ├── personel.html
│   ├── admin.html
│   ├── preview.html
│   ├── katalog.html
│   └── belgeler/
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
    ├── seed-checklist.html
    └── test-tool.html
```

## 🔐 Güvenlik Özellikleri

### Rol Bazlı Erişim
- **Barista/Kasacı**: Dashboard, Checklist, Shift (görüntüleme)
- **Mağaza Müdürü**: + Puantaj, Personel, Belgeler
- **Yönetici**: + Admin panel

### Lazy Loading
- Sayfalar ihtiyaç halinde yüklenir
- Yetkisiz sayfalar HTML olarak bile yüklenmez
- F12 ile erişilemez

## 🚀 Kurulum

1. Tüm dosyaları GitHub'a yükleyin
2. Firebase Console'da `firestore.rules` güncelleyin
3. GitHub Pages veya hosting servisi ile yayınlayın

## 📋 Sayfa Erişim Matrisi

| Sayfa | Barista | Kasacı | Müdür | Yönetici |
|-------|---------|--------|-------|----------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Checklist | ✅ | ✅ | ✅ | ✅ |
| Shift | 👁️ | 👁️ | ✅ | ✅ |
| Puantaj | ❌ | ❌ | ✅ | ✅ |
| Personel | ❌ | ❌ | ✅ | ✅ |
| Belgeler | ❌ | ❌ | ✅ | ✅ |
| Admin | ❌ | ❌ | ❌ | ✅ |

## 🔄 Migration Notları

Bu versiyon mevcut legacy.js'i kullanmaya devam eder.
Sadece HTML şablonları ayrı dosyalara taşındı.

### Avantajlar:
- ✅ Mevcut fonksiyonlar bozulmaz
- ✅ Güvenlik iyileştirildi
- ✅ Aşamalı geçiş mümkün

### Sonraki Adımlar:
1. JS modüllerini ayrı dosyalara taşı
2. Her sayfa için bağımsız modül oluştur
3. Legacy.js'i kademeli olarak kaldır

## 📞 Destek

Moonberry Coffee - Tamaslan Kafe Restoran ve Gıda Hizmetleri
