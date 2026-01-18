/**
 * MOONBERRY İK - MODÜLER UYGULAMA
 * Router, Auth, State Management, Page Loader
 * Version: 2.0
 * 
 * NOT: Bu dosya legacy.js'den ÖNCE yüklenir.
 * Firebase init ve temel fonksiyonları sağlar.
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

// Firebase zaten init edilmişse tekrar etme
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();

// ==================== GLOBAL STATE ====================
const STATE = {
    currentUser: null,
    currentPage: null,
    company: {
        name: 'Moonberry Coffee',
        taxId: '1234567890',
        address: 'İstanbul',
        vergiDairesi: 'Şişli',
        sicilNo: '123456',
        sgkNo: '12345678901234567890'
    },
    branches: ['Şişli (Merkez)', 'Tuzla Port'],
    branchCodes: {'Şişli (Merkez)': 'SIS', 'Tuzla Port': 'TZL'},
    positions: [],
    personelCache: {},
    loadedPages: new Set(),
    loadedModules: new Set()
};

// ==================== ROL BAZLI ERİŞİM ====================
const PAGE_PERMISSIONS = {
    // Herkes erişebilir
    'dashboard': ['barista', 'kasaci', 'part_time', 'stajyer', 'magaza_muduru', 'bolge_muduru', 'yonetici'],
    'checklist': ['barista', 'kasaci', 'part_time', 'stajyer', 'magaza_muduru', 'bolge_muduru', 'yonetici'],
    
    // Shift - barista sadece görüntüleyebilir
    'shift': ['barista', 'kasaci', 'part_time', 'stajyer', 'magaza_muduru', 'bolge_muduru', 'yonetici'],
    
    // Yönetim sayfaları - sadece müdürler
    'puantaj': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    'personel': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    
    // Belgeler - sadece müdürler
    'sozlesme': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    'tutanak': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    'savunma': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    'fesih': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    'istifa': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    'ibraname': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    'borc': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    'avans': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    'zimmet': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    
    // Admin - sadece yönetici
    'admin': ['yonetici'],
    'katalog': ['magaza_muduru', 'bolge_muduru', 'yonetici'],
    'preview': ['magaza_muduru', 'bolge_muduru', 'yonetici']
};

// Sayfa -> Dosya yolu eşleştirmesi
const PAGE_PATHS = {
    'dashboard': 'pages/dashboard.html',
    'checklist': 'pages/checklist.html',
    'shift': 'pages/shift.html',
    'puantaj': 'pages/puantaj.html',
    'personel': 'pages/personel.html',
    'admin': 'pages/admin.html',
    'preview': 'pages/preview.html',
    'katalog': 'pages/katalog.html',
    // Belgeler
    'sozlesme': 'pages/belgeler/sozlesme.html',
    'tutanak': 'pages/belgeler/tutanak.html',
    'savunma': 'pages/belgeler/savunma.html',
    'fesih': 'pages/belgeler/fesih.html',
    'istifa': 'pages/belgeler/istifa.html',
    'ibraname': 'pages/belgeler/ibraname.html',
    'borc': 'pages/belgeler/borc.html',
    'avans': 'pages/belgeler/avans.html',
    'zimmet': 'pages/belgeler/zimmet.html'
};

// Sayfa -> JS modülü eşleştirmesi
const PAGE_MODULES = {
    'dashboard': 'js/modules/dashboard.js',
    'checklist': 'js/modules/checklist.js',
    'shift': 'js/modules/shift.js',
    'puantaj': 'js/modules/puantaj.js',
    'personel': 'js/modules/personel.js',
    'admin': 'js/modules/admin.js',
    'sozlesme': 'js/modules/belgeler.js',
    'tutanak': 'js/modules/belgeler.js',
    'savunma': 'js/modules/belgeler.js',
    'fesih': 'js/modules/belgeler.js',
    'istifa': 'js/modules/belgeler.js',
    'ibraname': 'js/modules/belgeler.js',
    'borc': 'js/modules/belgeler.js',
    'avans': 'js/modules/belgeler.js',
    'zimmet': 'js/modules/belgeler.js'
};

// ==================== ROUTER ====================
class Router {
    constructor() {
        this.currentPage = null;
        this.pageCache = new Map();
        this.moduleCache = new Map();
    }
    
    // Erişim kontrolü
    canAccess(page) {
        if (!STATE.currentUser) return false;
        const allowedRoles = PAGE_PERMISSIONS[page];
        if (!allowedRoles) return true; // Tanımsız sayfa = herkese açık
        return allowedRoles.includes(STATE.currentUser.role);
    }
    
    // Sayfa yükle
    async loadPage(pageName) {
        console.log(`[Router] Sayfa yükleniyor: ${pageName}`);
        
        // Erişim kontrolü
        if (!this.canAccess(pageName)) {
            console.warn(`[Router] Erişim reddedildi: ${pageName}`);
            showToast('Bu sayfaya erişim yetkiniz yok', 'error');
            return false;
        }
        
        const container = document.getElementById('pageContainer');
        if (!container) {
            console.error('[Router] pageContainer bulunamadı');
            return false;
        }
        
        // Loading göster
        container.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:center;height:50vh;flex-direction:column;gap:20px">
                <div class="loading-spinner"></div>
                <div style="color:var(--tx2)">Yükleniyor...</div>
            </div>
        `;
        
        try {
            // HTML şablonunu yükle
            let html = this.pageCache.get(pageName);
            if (!html) {
                const path = PAGE_PATHS[pageName];
                if (!path) {
                    throw new Error(`Sayfa bulunamadı: ${pageName}`);
                }
                
                const response = await fetch(path);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${path}`);
                }
                html = await response.text();
                this.pageCache.set(pageName, html);
                console.log(`[Router] HTML yüklendi: ${pageName}`);
            }
            
            // HTML'i container'a ekle
            container.innerHTML = html;
            
            // JS modülünü yükle
            await this.loadModule(pageName);
            
            // Sayfa başlatma fonksiyonunu çağır
            const initFn = window[`init${capitalize(pageName)}Page`];
            if (typeof initFn === 'function') {
                await initFn();
                console.log(`[Router] Sayfa başlatıldı: ${pageName}`);
            }
            
            // State güncelle
            this.currentPage = pageName;
            STATE.currentPage = pageName;
            
            // Nav güncelle
            this.updateNav(pageName);
            
            return true;
            
        } catch (error) {
            console.error(`[Router] Sayfa yüklenemedi: ${pageName}`, error);
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:50vh;flex-direction:column;gap:20px">
                    <svg width="64" height="64" fill="none" stroke="#e74c3c" stroke-width="2" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                    <div style="color:#e74c3c;font-weight:600">Sayfa yüklenemedi</div>
                    <div style="color:var(--tx3)">${error.message}</div>
                    <button onclick="router.loadPage('dashboard')" class="btn btn-secondary">Dashboard'a Dön</button>
                </div>
            `;
            return false;
        }
    }
    
    // JS modülünü yükle
    async loadModule(pageName) {
        const modulePath = PAGE_MODULES[pageName];
        if (!modulePath) return;
        
        // Zaten yüklüyse atla
        if (STATE.loadedModules.has(modulePath)) {
            console.log(`[Router] Modül zaten yüklü: ${modulePath}`);
            return;
        }
        
        try {
            const script = document.createElement('script');
            script.src = modulePath;
            script.async = false;
            
            await new Promise((resolve, reject) => {
                script.onload = resolve;
                script.onerror = () => reject(new Error(`Modül yüklenemedi: ${modulePath}`));
                document.head.appendChild(script);
            });
            
            STATE.loadedModules.add(modulePath);
            console.log(`[Router] Modül yüklendi: ${modulePath}`);
        } catch (error) {
            console.warn(`[Router] Modül yüklenemedi: ${modulePath}`, error);
        }
    }
    
    // Navigasyon güncelle
    updateNav(pageName) {
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageName) {
                item.classList.add('active');
            }
        });
        
        // Belgeler grubundaysa parent'ı aç
        const belgelerPages = ['sozlesme', 'tutanak', 'savunma', 'fesih', 'istifa', 'ibraname', 'borc', 'avans', 'zimmet'];
        if (belgelerPages.includes(pageName)) {
            const belgelerGroup = document.querySelector('.nav-group:has([data-page="sozlesme"])');
            if (belgelerGroup) {
                belgelerGroup.classList.add('open');
            }
        }
    }
    
    // Rol bazlı nav filtreleme
    filterNavByRole() {
        if (!STATE.currentUser) return;
        
        const role = STATE.currentUser.role;
        
        document.querySelectorAll('.nav-item[data-page]').forEach(item => {
            const page = item.dataset.page;
            const allowed = PAGE_PERMISSIONS[page];
            
            if (allowed && !allowed.includes(role)) {
                item.style.display = 'none';
            } else {
                item.style.display = '';
            }
        });
        
        // Boş grupları gizle
        document.querySelectorAll('.nav-group').forEach(group => {
            const visibleItems = group.querySelectorAll('.nav-item[data-page]:not([style*="display: none"])');
            if (visibleItems.length === 0) {
                group.style.display = 'none';
            } else {
                group.style.display = '';
            }
        });
        
        console.log(`[Router] Nav filtrelendi: ${role}`);
    }
}

// Global router instance
const router = new Router();

// ==================== AUTH ====================
async function initAuth() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log(`[Auth] Kullanıcı girişi: ${user.email}`);
                
                // Kullanıcı bilgilerini yükle
                try {
                    // Önce users koleksiyonundan dene
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        STATE.currentUser = { uid: user.uid, email: user.email, ...userDoc.data() };
                    } else {
                        // Personel koleksiyonundan email ile ara
                        const personelSnap = await db.collection('personel').where('email', '==', user.email).get();
                        if (!personelSnap.empty) {
                            const personelData = personelSnap.docs[0].data();
                            STATE.currentUser = {
                                uid: user.uid,
                                email: user.email,
                                name: personelData.name || user.email,
                                role: personelData.role || 'barista',
                                branch: personelData.branch || 'Tuzla Port'
                            };
                        } else {
                            // Varsayılan kullanıcı
                            STATE.currentUser = {
                                uid: user.uid,
                                email: user.email,
                                name: user.email.split('@')[0],
                                role: 'barista',
                                branch: 'Tuzla Port'
                            };
                        }
                    }
                    
                    console.log(`[Auth] Kullanıcı yüklendi: ${STATE.currentUser.name} (${STATE.currentUser.role})`);
                    
                    // UI güncelle
                    updateUserUI();
                    router.filterNavByRole();
                    
                    resolve(true);
                    
                } catch (error) {
                    console.error('[Auth] Kullanıcı yüklenemedi:', error);
                    resolve(false);
                }
            } else {
                console.log('[Auth] Kullanıcı çıkışı');
                STATE.currentUser = null;
                window.location.href = 'login.html';
                resolve(false);
            }
        });
    });
}

function updateUserUI() {
    if (!STATE.currentUser) return;
    
    const nameEl = document.getElementById('userName');
    const roleEl = document.getElementById('userRole');
    const avatarEl = document.getElementById('userAvatar');
    
    if (nameEl) nameEl.textContent = STATE.currentUser.name || STATE.currentUser.email;
    if (roleEl) roleEl.textContent = getRoleName(STATE.currentUser.role);
    if (avatarEl) avatarEl.textContent = (STATE.currentUser.name || 'U').charAt(0).toUpperCase();
}

function getRoleName(role) {
    const names = {
        'yonetici': 'Yönetici',
        'bolge_muduru': 'Bölge Müdürü',
        'magaza_muduru': 'Mağaza Müdürü',
        'kasaci': 'Kasacı',
        'barista': 'Barista',
        'part_time': 'Part-Time',
        'stajyer': 'Stajyer'
    };
    return names[role] || role;
}

async function logout() {
    if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
        await auth.signOut();
        window.location.href = 'login.html';
    }
}

// ==================== UTILITIES ====================
function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer') || createToastContainer();
    
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span>${message}`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:10px;';
    document.body.appendChild(container);
    return container;
}

// Modal
function showModal(title, body, footer = '') {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;
    
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;
    document.getElementById('modalFooter').innerHTML = footer;
    overlay.classList.add('show');
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('show');
}

// Tarih formatlama
function formatDateLocal(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatDateTR(date) {
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ==================== GLOBAL goTo FUNCTION ====================
async function goTo(page) {
    await router.loadPage(page);
}

// ==================== CONFIG LOADER ====================
async function loadSystemConfig() {
    try {
        // Checklist types
        const typesDoc = await db.collection('config').doc('checklistTypes').get();
        if (typesDoc.exists) {
            STATE.checklistTypes = typesDoc.data();
        }
        
        // System config
        const configDoc = await db.collection('systemConfig').doc('checkRules').get();
        if (configDoc.exists) {
            STATE.systemConfig = configDoc.data();
        }
        
        console.log('[Config] Sistem ayarları yüklendi');
    } catch (error) {
        console.warn('[Config] Ayarlar yüklenemedi:', error.message);
    }
}

// ==================== PERSONEL CACHE ====================
async function loadPersonelCache() {
    try {
        const snapshot = await db.collection('personel').get();
        STATE.personelCache = {};
        snapshot.forEach(doc => {
            const data = doc.data();
            const key = normalizePersonelId(data.name);
            STATE.personelCache[key] = { id: doc.id, ...data };
        });
        console.log(`[Cache] Personel cache yüklendi: ${Object.keys(STATE.personelCache).length} kayıt`);
    } catch (error) {
        console.warn('[Cache] Personel cache yüklenemedi:', error.message);
    }
}

function normalizePersonelId(name) {
    if (!name) return '';
    return name.toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

// ==================== DARK MODE ====================
function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
}

// ==================== INIT ====================
async function initApp() {
    console.log('[App] Uygulama başlatılıyor...');
    
    // Tema
    initTheme();
    
    // Auth
    const authOk = await initAuth();
    if (!authOk) return;
    
    // Config ve cache
    await Promise.all([
        loadSystemConfig(),
        loadPersonelCache()
    ]);
    
    // Dashboard'ı yükle
    await router.loadPage('dashboard');
    
    console.log('[App] Uygulama hazır');
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', initApp);

console.log('✓ app.js yüklendi');
