/**
 * MOONBERRY İK - CHECKLIST MODULE
 * Günlük check, Temizlik, Platform check fonksiyonları
 * @version 2.0
 */

// ==================== STATE ====================

let currentChecklistTab = 'gunluk';
let currentChecklistBranch = null;
let currentChecklistDate = null;
let checklistItems = {};
let checklistTimers = {};

// ==================== CHECKLIST INIT ====================

async function initChecklistPage() {
    console.log('[Checklist] Sayfa başlatılıyor...');
    
    // Şube dropdown'ı doldur
    const subeSelect = document.getElementById('checklistSube');
    if (subeSelect) {
        fillBranchSelect('checklistSube');
        
        // Kullanıcı kendi şubesini değiştiremesin
        const isAdminUser = isRegionalOrAdmin(STATE.currentUser?.role);
        if (!isAdminUser && STATE.currentUser?.branch) {
            subeSelect.value = STATE.currentUser.branch;
            subeSelect.disabled = true;
        }
        
        currentChecklistBranch = subeSelect.value;
    }
    
    // Tarih bugün
    const dateInput = document.getElementById('checklistDate');
    if (dateInput) {
        dateInput.value = formatDateLocal(new Date());
        currentChecklistDate = dateInput.value;
    }
    
    // Admin butonlarını göster/gizle
    document.querySelectorAll('.manager-only').forEach(el => {
        el.style.display = isManager(STATE.currentUser?.role) ? '' : 'none';
    });
    
    // Bugünkü durum panelini yükle
    await loadChecklistTodayPanel();
    
    // İlk tab'ı yükle
    await loadChecklistTab('gunluk');
    
    console.log('[Checklist] Sayfa hazır');
}

// ==================== ŞUBE DEĞİŞİKLİĞİ ====================

async function onChecklistBranchChange() {
    const subeSelect = document.getElementById('checklistSube');
    if (subeSelect) {
        currentChecklistBranch = subeSelect.value;
    }
    
    await loadChecklistTodayPanel();
    await loadChecklistTab(currentChecklistTab);
}

// ==================== BUGÜNKÜ DURUM PANELİ ====================

async function loadChecklistTodayPanel() {
    const container = document.getElementById('checklistTodayGrid');
    if (!container) return;
    
    const today = formatDateLocal(new Date());
    const branch = currentChecklistBranch || 'Tuzla Port';
    const branchKey = getBranchKey(branch);
    
    const items = [
        { id: 'gunluk', name: 'Günlük Check', icon: '📋', color: '#008c95' },
        { id: 'acilis_hazirliklari', name: 'Açılış', icon: '🌅', color: '#27ae60' },
        { id: 'kapanis_hazirliklari', name: 'Kapanış', icon: '🌙', color: '#9b59b6' },
        { id: 'temizlik_acilisci', name: 'Temizlik (Açılışçı)', icon: '🧹', color: '#f39c12' },
        { id: 'temizlik_araci', name: 'Temizlik (Aracı)', icon: '🧹', color: '#f39c12' },
        { id: 'temizlik_kapanisci', name: 'Temizlik (Kapanışçı)', icon: '🧹', color: '#f39c12' },
    ];
    
    let html = '';
    
    for (const item of items) {
        let docId = `${branchKey}_${item.id}_${today}`;
        let status = 'Bekliyor';
        let statusClass = 'pending';
        
        try {
            const doc = await db.collection('checklistSubmissions').doc(docId).get();
            if (doc.exists) {
                status = 'Tamamlandı ✓';
                statusClass = 'done';
            }
        } catch (e) {}
        
        html += `
            <div class="today-item">
                <div class="today-icon" style="background:${item.color}">${item.icon}</div>
                <div class="today-info">
                    <div class="today-title">${item.name}</div>
                    <div class="today-status ${statusClass}">${status}</div>
                </div>
            </div>
        `;
    }
    
    container.innerHTML = html;
}

// ==================== TAB DEĞİŞİKLİĞİ ====================

async function selectCheckTab(tab) {
    currentChecklistTab = tab;
    
    // Tab butonlarını güncelle
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    
    await loadChecklistTab(tab);
}

async function loadChecklistTab(tab) {
    const container = document.getElementById('checklistContent');
    if (!container) return;
    
    showLoading(container, 'Yükleniyor...');
    
    try {
        switch (tab) {
            case 'gunluk':
                await loadGunlukChecklist();
                break;
            case 'temizlik':
                await loadTemizlikChecklist();
                break;
            case 'platform':
                await loadPlatformChecklist();
                break;
            case 'gecmis':
                await loadChecklistHistory();
                break;
            default:
                await loadGunlukChecklist();
        }
    } catch (error) {
        console.error('[Checklist] Tab yüklenemedi:', error);
        container.innerHTML = `<div class="empty-state"><span>❌</span><p>Yüklenirken hata oluştu</p></div>`;
    }
}

// ==================== GÜNLÜK CHECK ====================

async function loadGunlukChecklist() {
    const container = document.getElementById('checklistContent');
    if (!container) return;
    
    const branch = currentChecklistBranch || 'Tuzla Port';
    const branchKey = getBranchKey(branch);
    const date = currentChecklistDate || formatDateLocal(new Date());
    
    // Checklist türlerini yükle
    let types = [];
    try {
        const typesDoc = await db.collection('config').doc('checklistTypes').get();
        if (typesDoc.exists) {
            const data = typesDoc.data();
            types = data.gunluk || data[branch]?.filter(t => t.id === 'gunluk') || [];
        }
    } catch (e) {
        console.warn('Checklist türleri yüklenemedi');
    }
    
    // Mevcut verileri yükle
    const docId = `${branchKey}_gunluk_${date}`;
    let existingData = null;
    try {
        const doc = await db.collection('checklistSubmissions').doc(docId).get();
        if (doc.exists) {
            existingData = doc.data();
        }
    } catch (e) {}
    
    // Varsayılan maddeler
    const defaultItems = [
        { id: 'kasa_acilis', text: 'Kasa açılış kontrolü yapıldı', category: 'Açılış' },
        { id: 'kahve_makinesi', text: 'Kahve makinesi ısıtıldı ve temizlendi', category: 'Ekipman' },
        { id: 'buzdolabi', text: 'Buzdolabı sıcaklığı kontrol edildi', category: 'Gıda Güvenliği' },
        { id: 'malzeme_kontrol', text: 'Malzeme stok kontrolü yapıldı', category: 'Stok' },
        { id: 'temizlik_genel', text: 'Genel temizlik yapıldı', category: 'Temizlik' },
        { id: 'masa_sandalye', text: 'Masa ve sandalyeler düzenlendi', category: 'Düzen' },
        { id: 'vitrin', text: 'Vitrin ürünleri tazeLendi', category: 'Ürün' },
        { id: 'pos_kontrol', text: 'POS cihazı test edildi', category: 'Kasa' },
    ];
    
    const items = types.length > 0 ? types : defaultItems;
    checklistItems.gunluk = items;
    
    // HTML oluştur
    let html = `
        <div class="checklist-section">
            <h4>📋 Günlük Kontrol Listesi - ${formatDateTR(date)}</h4>
    `;
    
    items.forEach((item, index) => {
        const isChecked = existingData?.items?.[item.id] || false;
        html += `
            <div class="check-item ${isChecked ? 'done' : ''}" onclick="toggleCheckItem('gunluk', '${item.id}', this)">
                <div class="check-box ${isChecked ? 'checked' : ''}">${isChecked ? '✓' : ''}</div>
                <div class="item-text">${item.text}</div>
                ${item.category ? `<span class="item-cat">${item.category}</span>` : ''}
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="submit-bar">
            <span class="submit-info">${existingData ? '✓ Daha önce kaydedilmiş' : 'Henüz kaydedilmedi'}</span>
            <button class="btn btn-primary" onclick="submitChecklist('gunluk')">💾 Kaydet</button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ==================== TEMİZLİK CHECK ====================

async function loadTemizlikChecklist() {
    const container = document.getElementById('checklistContent');
    if (!container) return;
    
    const branch = currentChecklistBranch || 'Tuzla Port';
    const branchKey = getBranchKey(branch);
    const date = currentChecklistDate || formatDateLocal(new Date());
    
    // Hangi vardiyayı gösterelim? Saate göre
    const hour = new Date().getHours();
    let currentShift = 'acilisci';
    if (hour >= 14 && hour < 18) currentShift = 'araci';
    if (hour >= 18) currentShift = 'kapanisci';
    
    // Temizlik maddeleri
    const temizlikItems = {
        acilisci: [
            { id: 't1', text: 'Zemin süpürüldü ve silindi', category: 'Zemin' },
            { id: 't2', text: 'Tezgah ve çalışma alanları temizlendi', category: 'Tezgah' },
            { id: 't3', text: 'Kahve makinesi temizlendi', category: 'Ekipman' },
            { id: 't4', text: 'Buzdolabı içi kontrol edildi', category: 'Ekipman' },
            { id: 't5', text: 'Çöpler boşaltıldı', category: 'Çöp' },
            { id: 't6', text: 'Tuvalet temizlendi', category: 'Tuvalet' },
            { id: 't7', text: 'Vitrin camları silindi', category: 'Cam' },
            { id: 't8', text: 'Dış alan temizlendi', category: 'Dış Mekan' },
        ],
        araci: [
            { id: 't1', text: 'Zemin kontrol edildi', category: 'Zemin' },
            { id: 't2', text: 'Tezgah temizlendi', category: 'Tezgah' },
            { id: 't3', text: 'Çöpler kontrol edildi', category: 'Çöp' },
            { id: 't4', text: 'Tuvalet kontrol edildi', category: 'Tuvalet' },
            { id: 't5', text: 'Masa ve sandalyeler düzenlendi', category: 'Düzen' },
            { id: 't6', text: 'Malzeme eksikleri not edildi', category: 'Stok' },
        ],
        kapanisci: [
            { id: 't1', text: 'Zemin detaylı temizlendi', category: 'Zemin' },
            { id: 't2', text: 'Tezgah dezenfekte edildi', category: 'Tezgah' },
            { id: 't3', text: 'Kahve makinesi kapatma temizliği', category: 'Ekipman' },
            { id: 't4', text: 'Buzdolabı düzenlendi', category: 'Ekipman' },
            { id: 't5', text: 'Tüm çöpler boşaltıldı', category: 'Çöp' },
            { id: 't6', text: 'Tuvalet kapanış temizliği', category: 'Tuvalet' },
            { id: 't7', text: 'Kasa kapatıldı', category: 'Kasa' },
            { id: 't8', text: 'Işıklar ve cihazlar kontrol edildi', category: 'Güvenlik' },
        ]
    };
    
    // Vardiya seçici
    let html = `
        <div class="shift-selector" style="display:flex;gap:10px;margin-bottom:20px">
            <button class="btn ${currentShift === 'acilisci' ? 'btn-primary' : ''}" onclick="loadTemizlikShift('acilisci')">🌅 Açılışçı</button>
            <button class="btn ${currentShift === 'araci' ? 'btn-primary' : ''}" onclick="loadTemizlikShift('araci')">☀️ Aracı</button>
            <button class="btn ${currentShift === 'kapanisci' ? 'btn-primary' : ''}" onclick="loadTemizlikShift('kapanisci')">🌙 Kapanışçı</button>
        </div>
    `;
    
    // Mevcut verileri yükle
    const docId = `${branchKey}_temizlik_${currentShift}_${date}`;
    let existingData = null;
    try {
        const doc = await db.collection('checklistSubmissions').doc(docId).get();
        if (doc.exists) {
            existingData = doc.data();
        }
    } catch (e) {}
    
    const items = temizlikItems[currentShift];
    checklistItems.temizlik = items;
    checklistItems.temizlikShift = currentShift;
    
    html += `
        <div class="checklist-section">
            <h4>🧹 Temizlik Listesi - ${currentShift === 'acilisci' ? 'Açılışçı' : currentShift === 'araci' ? 'Aracı' : 'Kapanışçı'}</h4>
    `;
    
    items.forEach((item) => {
        const isChecked = existingData?.items?.[item.id] || false;
        html += `
            <div class="check-item ${isChecked ? 'done' : ''}" onclick="toggleCheckItem('temizlik', '${item.id}', this)">
                <div class="check-box ${isChecked ? 'checked' : ''}">${isChecked ? '✓' : ''}</div>
                <div class="item-text">${item.text}</div>
                ${item.category ? `<span class="item-cat">${item.category}</span>` : ''}
            </div>
        `;
    });
    
    html += `
        </div>
        <div class="submit-bar">
            <span class="submit-info">${existingData ? '✓ Daha önce kaydedilmiş' : 'Henüz kaydedilmedi'}</span>
            <button class="btn btn-primary" onclick="submitChecklist('temizlik')">💾 Kaydet</button>
        </div>
    `;
    
    container.innerHTML = html;
}

async function loadTemizlikShift(shift) {
    checklistItems.temizlikShift = shift;
    await loadTemizlikChecklist();
}

// ==================== PLATFORM CHECK ====================

async function loadPlatformChecklist() {
    const container = document.getElementById('checklistContent');
    if (!container) return;
    
    const branch = currentChecklistBranch || 'Tuzla Port';
    const branchKey = getBranchKey(branch);
    const date = currentChecklistDate || formatDateLocal(new Date());
    
    const platforms = [
        { id: 'trendyol', name: 'Trendyol Yemek', logo: '🟠', color: '#f27a1a' },
        { id: 'getir', name: 'Getir Yemek', logo: '🟣', color: '#5d3ebc' },
        { id: 'yemeksepeti', name: 'Yemeksepeti', logo: '🔴', color: '#fa0050' },
        { id: 'migros', name: 'Migros Yemek', logo: '🟢', color: '#ff6600' },
    ];
    
    // Mevcut saate göre hangi check zamanındayız?
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const checkTimes = ['10:00', '12:00', '15:00', '18:00', '21:00', '00:00'];
    
    let currentTime = checkTimes[0];
    for (const time of checkTimes) {
        const [h, m] = time.split(':').map(Number);
        const timeMinutes = h * 60 + m;
        if (currentMinutes >= timeMinutes) {
            currentTime = time;
        }
    }
    
    // Mevcut verileri yükle
    const docId = `${branchKey}_platform_${date}_${currentTime.replace(':', '')}`;
    let existingData = null;
    try {
        const doc = await db.collection('checklistSubmissions').doc(docId).get();
        if (doc.exists) {
            existingData = doc.data();
        }
    } catch (e) {}
    
    checklistItems.platform = platforms;
    checklistItems.platformTime = currentTime;
    
    let html = `
        <div class="checklist-timer">
            <span class="checklist-timer-label">Şu anki check zamanı:</span>
            <span class="checklist-timer-value">${currentTime}</span>
        </div>
        <div class="checklist-section">
            <h4>📱 Platform Durumları</h4>
            <div class="platform-grid">
    `;
    
    platforms.forEach(platform => {
        const status = existingData?.items?.[platform.id] || null;
        html += `
            <div class="platform-card">
                <div class="platform-header">
                    <span class="platform-logo" style="background:${platform.color};color:#fff;width:40px;height:40px;border-radius:10px;display:flex;align-items:center;justify-content:center">${platform.logo}</span>
                    <span class="platform-name">${platform.name}</span>
                </div>
                <div class="platform-btns">
                    <button class="platform-btn acik ${status === 'acik' ? 'active' : ''}" onclick="setPlatformStatus('${platform.id}', 'acik', this)">✓ Açık</button>
                    <button class="platform-btn kapali ${status === 'kapali' ? 'active' : ''}" onclick="setPlatformStatus('${platform.id}', 'kapali', this)">✕ Kapalı</button>
                </div>
            </div>
        `;
    });
    
    html += `
            </div>
        </div>
        <div class="submit-bar">
            <span class="submit-info">${existingData ? '✓ Daha önce kaydedilmiş' : 'Henüz kaydedilmedi'}</span>
            <button class="btn btn-primary" onclick="submitChecklist('platform')">💾 Kaydet</button>
        </div>
    `;
    
    container.innerHTML = html;
}

function setPlatformStatus(platformId, status, btn) {
    // Aynı platform'daki diğer butonları pasif yap
    const card = btn.closest('.platform-card');
    card.querySelectorAll('.platform-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    
    // State'e kaydet
    if (!checklistItems.platformStatus) checklistItems.platformStatus = {};
    checklistItems.platformStatus[platformId] = status;
}

// ==================== GEÇMİŞ ====================

async function loadChecklistHistory() {
    const container = document.getElementById('checklistContent');
    if (!container) return;
    
    const branch = currentChecklistBranch || 'Tuzla Port';
    const branchKey = getBranchKey(branch);
    
    // Son 30 günü getir
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    try {
        const snapshot = await db.collection('checklistSubmissions')
            .where('branch', '==', branch)
            .where('date', '>=', formatDateLocal(startDate))
            .orderBy('date', 'desc')
            .limit(50)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = `<div class="empty-state"><span>📭</span><p>Son 30 günde kayıt bulunamadı</p></div>`;
            return;
        }
        
        let html = `
            <div class="checklist-section">
                <h4>📜 Son 30 Gün</h4>
                <div class="history-list">
        `;
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const itemCount = Object.keys(data.items || {}).length;
            const checkedCount = Object.values(data.items || {}).filter(v => v === true || v === 'acik').length;
            const percentage = itemCount > 0 ? Math.round((checkedCount / itemCount) * 100) : 0;
            
            let statusClass = 'done';
            let statusText = 'Tamamlandı';
            if (percentage < 100 && percentage > 0) {
                statusClass = 'partial';
                statusText = `%${percentage}`;
            } else if (percentage === 0) {
                statusClass = 'missed';
                statusText = 'Eksik';
            }
            
            html += `
                <div class="history-item">
                    <div class="history-info">
                        <span class="history-date">${formatDateTR(data.date)}</span>
                        <span class="history-type">${data.type || 'Genel'}</span>
                    </div>
                    <span class="history-badge ${statusClass}">${statusText}</span>
                </div>
            `;
        });
        
        html += `</div></div>`;
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Geçmiş yüklenemedi:', error);
        container.innerHTML = `<div class="empty-state"><span>❌</span><p>Geçmiş yüklenirken hata oluştu</p></div>`;
    }
}

// ==================== CHECK TOGGLE & SUBMIT ====================

function toggleCheckItem(type, itemId, element) {
    const checkBox = element.querySelector('.check-box');
    const isChecked = checkBox.classList.toggle('checked');
    
    checkBox.innerHTML = isChecked ? '✓' : '';
    element.classList.toggle('done', isChecked);
    
    // State'e kaydet
    if (!checklistItems[type + 'Status']) checklistItems[type + 'Status'] = {};
    checklistItems[type + 'Status'][itemId] = isChecked;
}

async function submitChecklist(type) {
    const branch = currentChecklistBranch || 'Tuzla Port';
    const branchKey = getBranchKey(branch);
    const date = currentChecklistDate || formatDateLocal(new Date());
    
    let docId, items, checkType;
    
    switch (type) {
        case 'gunluk':
            docId = `${branchKey}_gunluk_${date}`;
            items = checklistItems.gunlukStatus || {};
            checkType = 'gunluk';
            break;
        case 'temizlik':
            const shift = checklistItems.temizlikShift || 'acilisci';
            docId = `${branchKey}_temizlik_${shift}_${date}`;
            items = checklistItems.temizlikStatus || {};
            checkType = `temizlik_${shift}`;
            break;
        case 'platform':
            const time = checklistItems.platformTime || '10:00';
            docId = `${branchKey}_platform_${date}_${time.replace(':', '')}`;
            items = checklistItems.platformStatus || {};
            checkType = 'platform';
            break;
        default:
            showToast('Bilinmeyen checklist türü', 'error');
            return;
    }
    
    try {
        await db.collection('checklistSubmissions').doc(docId).set({
            branch: branch,
            branchKey: branchKey,
            date: date,
            type: checkType,
            items: items,
            submittedBy: STATE.currentUser?.email || 'unknown',
            submittedByName: STATE.currentUser?.name || 'Unknown',
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast('Checklist kaydedildi!', 'success');
        
        // Bugünkü paneli güncelle
        await loadChecklistTodayPanel();
        
    } catch (error) {
        console.error('Checklist kaydedilemedi:', error);
        showToast('Kayıt başarısız: ' + error.message, 'error');
    }
}

// ==================== AYARLAR ====================

function openChecklistSettings() {
    showModal('Checklist Ayarları', `
        <p>Checklist ayarları Admin panelinden yapılabilir.</p>
        <ul>
            <li>Checklist maddeleri</li>
            <li>Check saatleri</li>
            <li>Puan kuralları</li>
        </ul>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Kapat</button>`);
}

// ==================== EXPORT ====================

window.initChecklistPage = initChecklistPage;
window.onChecklistBranchChange = onChecklistBranchChange;
window.selectCheckTab = selectCheckTab;
window.loadChecklistTab = loadChecklistTab;
window.loadTemizlikShift = loadTemizlikShift;
window.setPlatformStatus = setPlatformStatus;
window.toggleCheckItem = toggleCheckItem;
window.submitChecklist = submitChecklist;
window.openChecklistSettings = openChecklistSettings;

console.log('✓ checklist.js yüklendi');
