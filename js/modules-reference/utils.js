/**
 * MOONBERRY İK - UTILS.JS
 * Yardımcı fonksiyonlar
 * @version 20
 */

// ==================== İSİM İŞLEMLERİ ====================

// Türkçe karakter destekli normalize
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

// Türkçe karakter normalize (karşılaştırma için)
function normalizeTurkishChars(str) {
    if (!str) return '';
    return str
        .toLowerCase()
        .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/Ğ/g, 'g').replace(/Ü/g, 'u').replace(/Ş/g, 's')
        .replace(/İ/g, 'i').replace(/Ö/g, 'o').replace(/Ç/g, 'c');
}

// "BÜŞRA SÖĞÜT" → "Büşra S."
function formatDisplayName(fullName) {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 0) return '';
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    if (parts.length === 1) return capitalize(parts[0]);
    const firstName = capitalize(parts[0]);
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
}

// İsim kısaltma: "BÜŞRA SÖĞÜT" → "Büşra S."
function formatShortName(fullName) {
    return formatDisplayName(fullName);
}

// codeName varsa onu, yoksa formatDisplayName(name)
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

// ==================== TARİH İŞLEMLERİ ====================

// YYYY-MM-DD formatı (local timezone)
function formatDateLocal(date) {
    const d = date instanceof Date ? date : new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Hafta başlangıcı (Pazartesi)
function getWeekStart(date = new Date()) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
}

// Tarih formatla (Türkçe)
function formatDateTR(date) {
    if (!date) return '';
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ==================== SAAT İŞLEMLERİ ====================

// "HH:MM" → dakika
function timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + (m || 0);
}

// Dakika → "HH:MM"
function minutesToTime(minutes) {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ==================== TOAST BİLDİRİM ====================

function toast(message, type = '') {
    const existing = document.getElementById('toast-notification');
    if (existing) existing.remove();
    
    const bg = type === 'success' ? 'linear-gradient(135deg,#00c9a7,#008c95)' : 
               type === 'error' ? 'linear-gradient(135deg,#e74c3c,#c0392b)' : 
               'linear-gradient(135deg,#3498db,#2980b9)';
    
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.style.cssText = `
        position:fixed;bottom:24px;left:50%;transform:translateX(-50%);
        background:${bg};color:#fff;padding:14px 28px;
        border-radius:12px;font-size:.9rem;font-weight:500;z-index:10001;
        box-shadow:0 8px 32px rgba(0,0,0,.2);animation:slideUp .3s ease;
        display:flex;align-items:center;gap:10px;max-width:90%;
    `;
    
    const icon = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    toast.innerHTML = `<span style="font-size:1.1rem">${icon}</span><span>${message}</span>`;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ==================== MODAL SİSTEMİ ====================

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) modal.style.display = 'none';
    document.body.style.overflow = '';
}

function showModal(title, content, buttons = '') {
    let modal = document.getElementById('modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal';
        modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:none;align-items:center;justify-content:center;padding:20px';
        modal.innerHTML = '<div id="modal-content" style="background:var(--bg2);border-radius:16px;max-width:600px;width:100%;max-height:90vh;overflow-y:auto;border:1px solid var(--cardBorder)"></div>';
        document.body.appendChild(modal);
        modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    }
    
    modal.querySelector('#modal-content').innerHTML = `
        <div style="padding:24px;border-bottom:1px solid var(--cardBorder);display:flex;justify-content:space-between;align-items:center">
            <h3 style="font-size:1.1rem;font-weight:600;color:var(--tx)">${title}</h3>
            <button onclick="closeModal()" style="background:none;border:none;font-size:1.5rem;cursor:pointer;color:var(--tx2)">&times;</button>
        </div>
        <div style="padding:24px">${content}</div>
        ${buttons ? `<div style="padding:16px 24px;border-top:1px solid var(--cardBorder);display:flex;gap:12px;justify-content:flex-end">${buttons}</div>` : ''}
    `;
    
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// ==================== FORM HELPERS ====================

function populateSubeSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const branches = STATE.branches || DEFAULT_STATE.branches;
    select.innerHTML = branches.map(b => `<option value="${b}">${b}</option>`).join('');
    
    // Varsayılan olarak kullanıcının şubesini seç
    if (currentUser?.branch && branches.includes(currentUser.branch)) {
        select.value = currentUser.branch;
    }
}

function populatePozisyonSelect(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    
    const positions = STATE.positions || DEFAULT_STATE.positions;
    select.innerHTML = positions.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
}

// ==================== SHIFT RENKLERİ ====================

function getShiftColorExcel(value) {
    if (!value) return { bg: '#fff', text: '#999', border: '#ddd' };
    const cleanValue = value.replace(/\*/g, '').trim().toUpperCase();
    
    // Direkt eşleşme
    if (SHIFT_COLORS[cleanValue]) return SHIFT_COLORS[cleanValue];
    
    // Kısaltma eşleşmeleri
    if (cleanValue === 'A' || cleanValue.includes('AÇILI')) return SHIFT_COLORS['AÇILIŞ'];
    if (cleanValue === 'K' || cleanValue.includes('KAPANI')) return SHIFT_COLORS['KAPANIŞ'];
    if (cleanValue === 'İ' || cleanValue === 'OFF' || cleanValue === 'IZN') return SHIFT_COLORS['OFF'];
    if (cleanValue.includes('BÖLGE') || cleanValue.includes('BOLGE')) return SHIFT_COLORS['BÖLGE MÜDÜRÜ'];
    
    // Saat formatı
    if (/^\d{1,2}[:\-\.]\d{2}/.test(cleanValue) || /^\d{4}$/.test(cleanValue)) {
        return { bg: '#E8F4FD', text: '#1E5B94', border: '#90CAF9' };
    }
    
    // Varsayılan
    return { bg: '#f5f5f5', text: '#333', border: '#ddd' };
}

// ==================== AKTİVİTE LOG ====================

function logActivity(action, details = {}) {
    if (!db || !currentUser) return;
    
    try {
        db.collection('activityLog').add({
            userId: currentUser.id || currentUser.email,
            userName: currentUser.name || currentUser.email,
            action,
            details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            userAgent: navigator.userAgent?.substring(0, 200)
        });
    } catch (e) {
        // Sessizce başarısız ol
    }
}

console.log('✓ utils.js yüklendi');
