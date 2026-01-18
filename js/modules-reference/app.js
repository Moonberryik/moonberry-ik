/**
 * MOONBERRY İK - APP.JS
 * Ana uygulama başlatma ve navigasyon
 * @version 20
 */

// ==================== NAVIGATION ====================

function goTo(page) {
    if (page && page.startsWith('page-')) {
        page = page.replace('page-', '');
    }
    
    logActivity('page_view', { page: page, from: currentPage });
    
    previousPage = currentPage;
    currentPage = page;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    const targetPage = document.getElementById('page-' + page);
    if (targetPage) {
        targetPage.classList.add('active');
    } else {
        console.error('Sayfa bulunamadı:', 'page-' + page);
        return;
    }
    
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
    if (navItem) navItem.classList.add('active');
    
    const pageName = document.getElementById('currentPageName');
    if (pageName) pageName.textContent = PAGE_NAMES[page] || page;
    
    // Sayfa yükleme fonksiyonları
    if (page === 'dashboard') loadTodayChecks?.();
    if (page === 'katalog') renderViolations?.();
    if (page === 'admin') renderAdminLists?.();
    if (page === 'personel') loadPersonelList?.();
    if (page === 'puantaj') { 
        populateSubeSelect('puantajSube'); 
        const now = new Date();
        const aySelect = document.getElementById('puantajAy');
        const yilSelect = document.getElementById('puantajYil');
        if (aySelect) aySelect.value = String(now.getMonth() + 1).padStart(2, '0');
        if (yilSelect) yilSelect.value = String(now.getFullYear());
        loadPuantaj?.(); 
    }
    if (page === 'shift') { 
        populateSubeSelect('shiftSube'); 
        loadShiftList?.();
    }
    if (page === 'checklist') loadChecklist?.();
    
    // Belge sayfaları
    if (page === 'istifa') { populateSubeSelect('istifa_sube'); populatePozisyonSelect('istifa_pozisyon'); }
    if (page === 'ibraname') { populateSubeSelect('ibra_sube'); populatePozisyonSelect('ibra_pozisyon'); }
    if (page === 'sozlesme') populateSubeSelect('soz_sube');
    if (page === 'tutanak') populateSubeSelect('tut_sube');
    if (page === 'savunma') populateSubeSelect('sav_sube');
    if (page === 'fesih') populateSubeSelect('fes_sube');
    if (page === 'borc') populateSubeSelect('borc_sube');
    if (page === 'avans') populateSubeSelect('avans_sube');
    if (page === 'zimmet') populateSubeSelect('zimmet_sube');
    if (page === 'izin') loadIzinList?.();
}

// ==================== INIT ====================

function initUI() {
    document.getElementById('companyName').textContent = STATE.company?.name || DEFAULT_STATE.company.name;
    populateSelects?.();
    loadDarkMode();
    loadPersonelDisplayCache?.();
}

function loadDarkMode() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateDarkModeIcon(savedTheme);
}

function updateDarkModeIcon(theme) {
    const btn = document.getElementById('darkModeToggle');
    if (btn) {
        btn.innerHTML = theme === 'dark' 
            ? '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
            : '<svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
    }
}

function toggleDarkMode() {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateDarkModeIcon(newTheme);
}

// Sidebar toggle
function toggleNavGroup(label) {
    label.classList.toggle('collapsed');
    const items = label.nextElementSibling;
    if (items) items.classList.toggle('collapsed');
}

// ==================== STATE ====================

async function loadState() {
    try {
        const doc = await db.collection('settings').doc('state').get();
        if (doc.exists) {
            STATE = { ...DEFAULT_STATE, ...doc.data() };
        } else {
            STATE = { ...DEFAULT_STATE };
            await db.collection('settings').doc('state').set(STATE);
        }
    } catch (e) {
        STATE = { ...DEFAULT_STATE };
    }
}

async function saveState() {
    try {
        await db.collection('settings').doc('state').set(STATE);
        toast('Ayarlar kaydedildi', 'success');
    } catch (e) {
        toast('Kayıt hatası', 'error');
    }
}

// ==================== FIREBASE INIT ====================

document.addEventListener('DOMContentLoaded', async function() {
    // Firebase initialize
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        
        // Auth state listener
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                try {
                    const userDoc = await db.collection('users').doc(user.uid).get();
                    if (userDoc.exists) {
                        currentUser = { id: user.uid, email: user.email, ...userDoc.data() };
                    } else {
                        currentUser = { id: user.uid, email: user.email, name: user.email, role: 'personel' };
                    }
                    
                    // Session başlat
                    const sessionId = await startSession?.(user);
                    if (sessionId) currentUser.sessionId = sessionId;
                    
                    // UI güncelle
                    document.getElementById('userDisplayName').textContent = currentUser.name || currentUser.email;
                    document.getElementById('userRoleDisplay').textContent = currentUser.role || 'Personel';
                    
                    logActivity('login', { device: navigator.userAgent });
                    
                } catch (e) {
                    currentUser = { id: user.uid, email: user.email, name: user.email, role: 'personel' };
                }
            } else {
                window.location.replace('login.html');
            }
        });
    }
    
    await loadState();
    await loadSystemConfig?.();
    initUI();
});

console.log('✓ app.js yüklendi');
