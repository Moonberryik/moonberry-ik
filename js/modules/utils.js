/**
 * MOONBERRY İK - UTILS MODULE
 * Tüm modüllerin kullandığı yardımcı fonksiyonlar
 * @version 2.0
 */

// ==================== TARİH FONKSİYONLARI ====================

// Timezone-safe tarih formatı (YYYY-MM-DD)
function formatDateLocal(date) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Türkçe tarih formatı (DD.MM.YYYY)
function formatDateTR(date) {
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Türkçe uzun tarih formatı
function formatDateLongTR(date) {
    const d = new Date(date);
    return d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Saat formatı (HH:MM)
function formatTime(date) {
    const d = new Date(date);
    return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
}

// Haftanın başlangıcını al (Pazartesi)
function getWeekStart(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Haftanın sonunu al (Pazar)
function getWeekEnd(date) {
    const start = getWeekStart(date);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return end;
}

// Ayın gün sayısı
function getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
}

// İki tarih arası gün farkı
function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ==================== METİN FONKSİYONLARI ====================

// Türkçe karakter normalize (ID için)
function normalizePersonelId(name) {
    if (!name) return '';
    return name
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/Ğ/g, 'g').replace(/Ü/g, 'u').replace(/Ş/g, 's')
        .replace(/İ/g, 'i').replace(/Ö/g, 'o').replace(/Ç/g, 'c')
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

// Türkçe karakterleri normalize et (arama için)
function normalizeTurkishChars(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c');
}

// İlk harfi büyük yap
function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Tam isimden kısa görüntü: "BÜŞRA SÖĞÜT" → "Büşra S."
function formatDisplayName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return '';
    if (parts.length === 1) return capitalize(parts[0]);
    const firstName = capitalize(parts[0]);
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
}

// Personel display name (codeName varsa onu kullan)
function getPersonelDisplayName(personelData) {
    if (!personelData) return '';
    if (typeof personelData === 'object') {
        if (personelData.codeName && personelData.codeName.trim()) {
            return personelData.codeName.trim();
        }
        return formatDisplayName(personelData.name || '');
    }
    return formatDisplayName(personelData);
}

// Para formatı
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2
    }).format(amount || 0);
}

// Sayı formatı (binlik ayraç)
function formatNumber(num) {
    return new Intl.NumberFormat('tr-TR').format(num || 0);
}

// ==================== ROL FONKSİYONLARI ====================

// Rol adı
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

// Yönetici mi?
function isManager(role) {
    return ['yonetici', 'bolge_muduru', 'magaza_muduru'].includes(role);
}

// Admin mi?
function isAdmin(role) {
    return role === 'yonetici';
}

// Bölge müdürü veya yönetici mi?
function isRegionalOrAdmin(role) {
    return ['yonetici', 'bolge_muduru'].includes(role);
}

// ==================== UI FONKSİYONLARI ====================

// Toast mesajı göster
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
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
    
    container.appendChild(toast);
    
    // Animasyon
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    document.body.appendChild(container);
    return container;
}

// Modal göster
function showModal(title, body, footer = '') {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;
    
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const footerEl = document.getElementById('modalFooter');
    
    if (titleEl) titleEl.textContent = title;
    if (bodyEl) bodyEl.innerHTML = body;
    if (footerEl) footerEl.innerHTML = footer;
    
    overlay.classList.add('show');
}

// Modal kapat
function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('show');
}

// Confirm dialog
function showConfirm(message, onConfirm, onCancel = null) {
    showModal(
        'Onay',
        `<p style="margin:0">${message}</p>`,
        `
        <button class="btn btn-secondary" onclick="closeModal();${onCancel ? onCancel + '()' : ''}">İptal</button>
        <button class="btn btn-primary" onclick="closeModal();${onConfirm}()">Onayla</button>
        `
    );
}

// Loading göster/gizle
function showLoading(container, message = 'Yükleniyor...') {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>${message}</p>
        </div>
    `;
}

function hideLoading(container) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;
    
    const loading = container.querySelector('.loading');
    if (loading) loading.remove();
}

// Empty state göster
function showEmptyState(container, message, icon = '📭') {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;
    
    container.innerHTML = `
        <div class="empty-state">
            <span style="font-size:3rem">${icon}</span>
            <p>${message}</p>
        </div>
    `;
}

// ==================== FORM FONKSİYONLARI ====================

// Form verilerini al
function getFormData(formId) {
    const form = document.getElementById(formId);
    if (!form) return {};
    
    const data = {};
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        if (!input.id && !input.name) return;
        const key = input.id || input.name;
        
        if (input.type === 'checkbox') {
            data[key] = input.checked;
        } else if (input.type === 'number') {
            data[key] = parseFloat(input.value) || 0;
        } else {
            data[key] = input.value;
        }
    });
    
    return data;
}

// Form doldur
function fillForm(formId, data) {
    const form = document.getElementById(formId);
    if (!form || !data) return;
    
    Object.entries(data).forEach(([key, value]) => {
        const input = form.querySelector(`#${key}, [name="${key}"]`);
        if (!input) return;
        
        if (input.type === 'checkbox') {
            input.checked = !!value;
        } else {
            input.value = value || '';
        }
    });
}

// Form temizle
function clearForm(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    const inputs = form.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else if (input.type === 'date') {
            input.value = formatDateLocal(new Date());
        } else if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        } else {
            input.value = '';
        }
    });
}

// ==================== VALIDATION ====================

// TC Kimlik No doğrulama
function validateTCKN(tckn) {
    if (!tckn || tckn.length !== 11) return false;
    if (!/^\d{11}$/.test(tckn)) return false;
    if (tckn[0] === '0') return false;
    
    const digits = tckn.split('').map(Number);
    const sum1 = digits[0] + digits[2] + digits[4] + digits[6] + digits[8];
    const sum2 = digits[1] + digits[3] + digits[5] + digits[7];
    
    const check1 = ((sum1 * 7) - sum2) % 10;
    const check2 = (digits.slice(0, 10).reduce((a, b) => a + b, 0)) % 10;
    
    return check1 === digits[9] && check2 === digits[10];
}

// Email doğrulama
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Telefon doğrulama (Türkiye)
function validatePhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10 || cleaned.length === 11;
}

// ==================== DEBOUNCE & THROTTLE ====================

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ==================== LOCAL STORAGE ====================

function saveToStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (e) {
        console.warn('LocalStorage save failed:', e);
        return false;
    }
}

function loadFromStorage(key, defaultValue = null) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : defaultValue;
    } catch (e) {
        console.warn('LocalStorage load failed:', e);
        return defaultValue;
    }
}

function removeFromStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        return false;
    }
}

// ==================== ŞUBE FONKSİYONLARI ====================

// Şube key oluştur (Firestore için)
function getBranchKey(branchName) {
    return branchName.replace(/[^a-zA-Z0-9]/g, '_');
}

// Şube dropdown doldur
function fillBranchSelect(selectId, includeAll = false) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const branches = STATE.branches || ['Tuzla Port', 'Şişli (Merkez)'];
    
    select.innerHTML = includeAll ? '<option value="">Tümü</option>' : '';
    branches.forEach(branch => {
        select.innerHTML += `<option value="${branch}">${branch}</option>`;
    });
    
    // Kullanıcının şubesini seç
    if (STATE.currentUser?.branch && !includeAll) {
        const userBranch = STATE.currentUser.branch;
        if (branches.includes(userBranch)) {
            select.value = userBranch;
        }
    }
}

// ==================== PERSONEL FONKSİYONLARI ====================

// Personel dropdown doldur
async function fillPersonelSelect(selectId, branchFilter = null) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    select.innerHTML = '<option value="">Seçiniz...</option>';
    
    try {
        let query = db.collection('personel').where('status', '==', 'active');
        if (branchFilter) {
            query = query.where('branch', '==', branchFilter);
        }
        
        const snapshot = await query.get();
        const personelList = [];
        
        snapshot.forEach(doc => {
            const data = doc.data();
            personelList.push({
                id: doc.id,
                name: data.name,
                displayName: getPersonelDisplayName(data),
                branch: data.branch
            });
        });
        
        // İsme göre sırala
        personelList.sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));
        
        personelList.forEach(p => {
            select.innerHTML += `<option value="${p.id}" data-name="${p.name}" data-branch="${p.branch}">${p.displayName}</option>`;
        });
        
    } catch (error) {
        console.error('Personel listesi yüklenemedi:', error);
    }
}

// ==================== EXPORT (Global) ====================

// Tüm fonksiyonları window'a ekle
window.formatDateLocal = formatDateLocal;
window.formatDateTR = formatDateTR;
window.formatDateLongTR = formatDateLongTR;
window.formatTime = formatTime;
window.getWeekStart = getWeekStart;
window.getWeekEnd = getWeekEnd;
window.getDaysInMonth = getDaysInMonth;
window.daysBetween = daysBetween;
window.normalizePersonelId = normalizePersonelId;
window.normalizeTurkishChars = normalizeTurkishChars;
window.capitalize = capitalize;
window.formatDisplayName = formatDisplayName;
window.getPersonelDisplayName = getPersonelDisplayName;
window.formatCurrency = formatCurrency;
window.formatNumber = formatNumber;
window.getRoleName = getRoleName;
window.isManager = isManager;
window.isAdmin = isAdmin;
window.isRegionalOrAdmin = isRegionalOrAdmin;
window.showToast = showToast;
window.showModal = showModal;
window.closeModal = closeModal;
window.showConfirm = showConfirm;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.showEmptyState = showEmptyState;
window.getFormData = getFormData;
window.fillForm = fillForm;
window.clearForm = clearForm;
window.validateTCKN = validateTCKN;
window.validateEmail = validateEmail;
window.validatePhone = validatePhone;
window.debounce = debounce;
window.throttle = throttle;
window.saveToStorage = saveToStorage;
window.loadFromStorage = loadFromStorage;
window.removeFromStorage = removeFromStorage;
window.getBranchKey = getBranchKey;
window.fillBranchSelect = fillBranchSelect;
window.fillPersonelSelect = fillPersonelSelect;

console.log('✓ utils.js yüklendi');
