# MOONBERRY İK v20 - MODÜLER YAPI

## 📦 KURULUM

Bu klasörü (`moonberry-ik/`) sunucuya olduğu gibi yükleyin.

### Dosya Yapısı
```
moonberry-ik/
├── index.html              ← Ana uygulama
├── login.html              ← Giriş sayfası
├── css/
│   └── styles.css          ← Tüm stiller
├── js/
│   ├── legacy.js           ← Tüm JavaScript
│   └── modules-reference/  ← Gelecek modüller (referans)
└── README.md
```

## 🚀 KULLANIM

1. Tüm klasörü web sunucusuna yükleyin
2. `index.html` ana sayfa olarak ayarlayın
3. Firebase yapılandırması `js/legacy.js` içinde

## 📊 VERSİYON BİLGİLERİ

| Metrik | Değer |
|--------|-------|
| Versiyon | v20 |
| Tarih | 17 Ocak 2026 |
| index.html | 1,915 satır |
| styles.css | 320 satır |
| legacy.js | 15,513 satır |
| **TOPLAM** | **17,748 satır** |

## 🔄 GERİ DÖNÜŞ

Sorun çıkarsa monolitik versiyona dönün:
```
../backup_20260117_225012_index.html → index.html olarak kullanın
```

## 📁 REFERANS MODÜLLER

`js/modules-reference/` klasöründe gelecekte kullanılabilecek modüller:

| Modül | Satır | Açıklama |
|-------|-------|----------|
| config.js | 177 | Firebase, sabitler |
| utils.js | 232 | Yardımcı fonksiyonlar |
| auth.js | 110 | Kimlik doğrulama |
| personel.js | 265 | Personel yönetimi |
| shift.js | 671 | Shift planlama |
| puantaj.js | 346 | Puantaj sistemi |
| checklist.js | 621 | Checklist sistemi |
| admin.js | 337 | Yönetici paneli |
| app.js | 176 | Ana uygulama |

Bu modüller `legacy.js`'den fonksiyonları parça parça alarak aktifleştirilebilir.

## ✅ ÖZELLİKLER

- ✅ Personel yönetimi
- ✅ Shift planlama (sürükle-bırak)
- ✅ Puantaj sistemi (otomatik puan)
- ✅ Checklist sistemi (günlük/temizlik/platform)
- ✅ Check kuralları yönetim paneli
- ✅ Belge oluşturma (sözleşme, tutanak, vb.)
- ✅ Dashboard check kartları
- ✅ Dark mode
- ✅ Responsive tasarım

## 🔐 GÜVENLİK

- Firebase Authentication aktif
- Firestore güvenlik kuralları: `../firestore.rules`
- Session yönetimi dahil

---

**Moonberry Coffee © 2026**
