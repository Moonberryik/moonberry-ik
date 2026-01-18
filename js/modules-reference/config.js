/**
 * MOONBERRY İK - CONFIG.JS
 * Firebase yapılandırması ve global değişkenler
 * @version 20
 */

// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyCbc-8oWwOj2eR0J19f3T-UYT9vGI8PL7M",
    authDomain: "moonberry-ik.firebaseapp.com",
    projectId: "moonberry-ik",
    storageBucket: "moonberry-ik.firebasestorage.app",
    messagingSenderId: "4872042742",
    appId: "1:4872042742:web:24a9e5935e2b5591a794d7"
};

// ==================== GLOBAL DEĞİŞKENLER ====================
let db = null;
let currentUser = null;
let currentPage = 'dashboard';
let previousPage = null;
let SYSTEM_CONFIG = {};
let STATE = {};
let PERSONEL_DISPLAY_CACHE = new Map();

// ==================== SABİTLER ====================
const PAGE_NAMES = {
    dashboard: 'Ana Sayfa',
    personel: 'Personel Yönetimi',
    puantaj: 'Puantaj Sistemi',
    shift: 'Shift Planı',
    checklist: 'Checklist',
    sozlesme: 'İş Sözleşmesi',
    tutanak: 'Tutanak',
    savunma: 'Savunma Talep',
    fesih: 'Fesih Bildirimi',
    istifa: 'İstifa Dilekçesi',
    ibraname: 'İbraname',
    borc: 'Borç İkrar',
    zimmet: 'Zimmet Belgesi',
    katalog: 'İhlal Kataloğu',
    admin: 'Ayarlar',
    izin: 'İzin Yönetimi'
};

// Shift renkleri
const SHIFT_COLORS = {
    'AÇILIŞ': { bg: '#99CCFF', text: '#003366', border: '#6699CC' },
    'A': { bg: '#99CCFF', text: '#003366', border: '#6699CC' },
    'ARA': { bg: '#FFFF99', text: '#666600', border: '#CCCC66' },
    'KAPANIŞ': { bg: '#FFC000', text: '#663300', border: '#CC9900' },
    'K': { bg: '#FFC000', text: '#663300', border: '#CC9900' },
    'OFF': { bg: '#FF6666', text: '#FFFFFF', border: '#CC3333' },
    'İ': { bg: '#FF6666', text: '#FFFFFF', border: '#CC3333' },
    'Y.İ': { bg: '#D9EAD3', text: '#274E13', border: '#93C47D' },
    'RAPOR': { bg: '#F4CCCC', text: '#990000', border: '#E06666' },
    'BÖLGE MÜDÜRÜ': { bg: '#E1BEE7', text: '#6A1B9A', border: '#CE93D8' },
    'BÖLGE MÜD': { bg: '#E1BEE7', text: '#6A1B9A', border: '#CE93D8' },
    'BÖLGE M': { bg: '#E1BEE7', text: '#6A1B9A', border: '#CE93D8' },
    'TUZLA': { bg: '#E6B8AF', text: '#660000', border: '#CC9999' }
};

// Platform check saatleri (Firebase'den yüklenecek)
let PLATFORM_CHECK_TIMES = ['10:00', '12:00', '15:00', '18:00', '21:00', '00:00'];

// Temizlik shift kuralları
let TEMIZLIK_SHIFT_RULES = {
    acilisci: { deadline: '15:00' },
    araci: { deadline: '19:00' },
    kapanisci: { deadline: '02:00' }
};

// Şube çalışma saatleri
let BRANCH_HOURS = {};

// Check kuralları
let CHECK_RULES = {
    gunluk: {
        name: 'Günlük Check',
        window: { before: 60, after: 60 },
        lateWindow: 60,
        points: { onTime: 1, late: -2, missed: -2 }
    },
    platform: {
        name: 'Platform Check',
        timeSlots: PLATFORM_CHECK_TIMES,
        window: { before: 30, after: 30 },
        lateWindow: 30,
        points: { onTime: 0, late: -1, missed: -1 }
    },
    acilis: {
        name: 'Açılış',
        deadline: '11:00',
        window: { before: 0, after: 120 },
        points: { onTime: 1, late: -1, missed: -2 }
    },
    kapanis: {
        name: 'Kapanış',
        deadline: '23:59',
        window: { before: 120, after: 0 },
        points: { onTime: 1, late: -1, missed: -2 }
    },
    mudur: {
        name: 'Müdür Kontrol',
        deadline: '21:00',
        points: { onTime: 1, late: -1, missed: -2 }
    },
    aylik: {
        name: 'Temizlik ve Bakım',
        shiftRules: TEMIZLIK_SHIFT_RULES,
        shifts: {
            acilisci: { deadline: '15:00', window: { start: '10:00', end: '15:00' } },
            araci: { deadline: '19:00', window: { start: '11:00', end: '19:00' } },
            kapanisci: { deadline: '02:00', window: { start: '16:00', end: '02:00' } }
        },
        points: { onTime: 0, late: -1, missed: -1 }
    }
};

// Shift süresi (saat)
let SHIFT_DURATION = 9;

// Yaygın saatler (dropdown için)
const COMMON_TIMES = ['07:00', '07:30', '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30', '00:00', '00:30', '01:00', '01:30', '02:00'];

// Platform listesi
let PLATFORMS = ['Trendyol', 'Yemek Sepeti', 'Getir Yemek', 'Migros'];

// WhatsApp grup linkleri
let WHATSAPP_GROUPS = {};

// Checklist türleri
let CHECKLIST_TYPES = {};

// ==================== DEFAULT STATE ====================
const DEFAULT_STATE = {
    company: {
        name: 'TAMASLAN KAFE RESTORAN VE GIDA HİZMETLERİ SANAYİ İÇ VE DIŞ TİCARET LİMİTED ŞİRKETİ',
        short: 'MOONBERRY COFFEE',
        mersis: '0817072351000001',
        address: 'DUATEPE MAH. ERGENEKON CAD. KONAK APT NO: 109 C ŞİŞLİ / İSTANBUL',
        tel: '+90 533 486 63 66',
        email: 'info@moonberrycoffee.com',
        vergiNo: '8170723510',
        vergiDairesi: 'Şişli',
        kep: 'tamaslan@hs01.kep.tr'
    },
    branches: ['Şişli (Merkez)', 'Tuzla Port'],
    branchCodes: {'Şişli (Merkez)': 'SIS', 'Tuzla Port': 'TZL'}
};

// Varsayılan puantaj kuralları
const DEFAULT_PUANTAJ_RULES = [
    { id: 'R01', title: '5x "1 Yıldız"', effect: 'prim_yok', desc: 'Aynı ay içinde 5 kez 1 yıldız alan personel prim hakkını kaybeder' },
    { id: 'R02', title: 'Online ≤2 Yıldız', effect: '-1', desc: 'Online platformlarda (Google, Yemeksepeti vb.) 2 veya altı yıldız alınması' },
    { id: 'R03', title: 'Mazeretsiz Devamsızlık', effect: '-2', desc: 'Mazeretsiz devamsızlık yapılması' },
    { id: 'R04', title: 'Müşteri Şikayeti', effect: '-1', desc: 'Doğrulanmış müşteri şikayeti' }
];

// ==================== SVG İKONLAR ====================
const ICONS = {
    sunrise: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 18a5 5 0 00-10 0"/><line x1="12" y1="2" x2="12" y2="9"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="8 6 12 2 16 6"/></svg>',
    sunset: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 18a5 5 0 00-10 0"/><line x1="12" y1="9" x2="12" y2="2"/><line x1="4.22" y1="10.22" x2="5.64" y2="11.64"/><line x1="1" y1="18" x2="3" y2="18"/><line x1="21" y1="18" x2="23" y2="18"/><line x1="18.36" y1="11.64" x2="19.78" y2="10.22"/><line x1="23" y1="22" x2="1" y2="22"/><polyline points="16 6 12 10 8 6"/></svg>',
    'clipboard-check': '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/></svg>',
    smartphone: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
    calendar: '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
    check: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>',
    x: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    trash: '<svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>'
};

// İkon getir
function getIcon(name) {
    return ICONS[name] || ICONS['clipboard-check'];
}

console.log('✓ config.js yüklendi');
