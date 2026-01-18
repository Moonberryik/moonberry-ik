/**
 * MOONBERRY İK - ADMIN MODULE
 * Yönetim paneli fonksiyonları
 * @version 2.0
 */

// ==================== ADMIN INIT ====================

async function initAdminPage() {
    console.log('[Admin] Sayfa başlatılıyor...');
    
    // İlk tab'ı yükle
    await selectAdminTab('users');
    
    console.log('[Admin] Sayfa hazır');
}

// ==================== TAB DEĞİŞİKLİĞİ ====================

async function selectAdminTab(tab) {
    // Tab butonlarını güncelle
    document.querySelectorAll('.admin-tabs .tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase().includes(tab));
    });
    
    // Tab içeriklerini güncelle
    document.querySelectorAll('.admin-tab').forEach(t => {
        t.classList.remove('active');
    });
    
    const activeTab = document.getElementById(`tab-${tab}`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // Tab verilerini yükle
    switch (tab) {
        case 'users':
            await loadAdminUsers();
            break;
        case 'settings':
            await loadAdminSettings();
            break;
        case 'points':
            await loadPointSettings();
            break;
        case 'branches':
            await loadAdminBranches();
            break;
        case 'logs':
            await loadAdminLogs();
            break;
    }
}

// ==================== KULLANICILAR ====================

async function loadAdminUsers() {
    const container = document.getElementById('adminUsersList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    try {
        const snapshot = await db.collection('users').get();
        
        if (snapshot.empty) {
            // Personelden kullanıcıları al
            const personelSnap = await db.collection('personel')
                .where('email', '!=', null)
                .get();
            
            let html = '';
            personelSnap.forEach(doc => {
                const data = doc.data();
                if (data.email) {
                    html += renderUserItem(doc.id, {
                        email: data.email,
                        name: data.name,
                        role: data.role || data.position || 'barista',
                        branch: data.branch
                    });
                }
            });
            
            container.innerHTML = html || '<p style="color:var(--tx2)">Kullanıcı bulunamadı</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            html += renderUserItem(doc.id, doc.data());
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Kullanıcılar yüklenemedi:', error);
        container.innerHTML = '<p style="color:var(--tx2)">Yüklenirken hata oluştu</p>';
    }
}

function renderUserItem(id, user) {
    const displayName = user.name || user.email?.split('@')[0] || 'Kullanıcı';
    const initial = displayName.charAt(0).toUpperCase();
    
    return `
        <div class="user-item">
            <div class="user-info">
                <div class="user-avatar">${initial}</div>
                <div class="user-details">
                    <h4>${displayName}</h4>
                    <p>${user.email || '-'} | ${getRoleName(user.role)} | ${user.branch || '-'}</p>
                </div>
            </div>
            <div class="user-actions">
                <button class="btn btn-sm" onclick="editAdminUser('${id}')">✏️</button>
                <button class="btn btn-sm" onclick="deleteAdminUser('${id}')" style="color:#e74c3c">🗑️</button>
            </div>
        </div>
    `;
}

function openNewUserModal() {
    showModal('Yeni Kullanıcı', `
        <div style="display:grid;gap:15px">
            <div class="form-group">
                <label>Email *</label>
                <input type="email" id="newUserEmail" placeholder="email@example.com">
            </div>
            <div class="form-group">
                <label>Ad Soyad</label>
                <input type="text" id="newUserName" placeholder="Ad Soyad">
            </div>
            <div class="form-group">
                <label>Rol</label>
                <select id="newUserRole">
                    <option value="barista">Barista</option>
                    <option value="kasaci">Kasacı</option>
                    <option value="magaza_muduru">Mağaza Müdürü</option>
                    <option value="bolge_muduru">Bölge Müdürü</option>
                    <option value="yonetici">Yönetici</option>
                </select>
            </div>
            <div class="form-group">
                <label>Şube</label>
                <select id="newUserBranch">
                    ${(STATE.branches || ['Tuzla Port', 'Şişli (Merkez)']).map(b => `<option value="${b}">${b}</option>`).join('')}
                </select>
            </div>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="saveNewUser()">Kaydet</button>
    `);
}

async function saveNewUser() {
    const email = document.getElementById('newUserEmail')?.value?.trim();
    const name = document.getElementById('newUserName')?.value?.trim();
    const role = document.getElementById('newUserRole')?.value;
    const branch = document.getElementById('newUserBranch')?.value;
    
    if (!email) {
        showToast('Email zorunludur', 'error');
        return;
    }
    
    try {
        await db.collection('users').doc(email.replace(/[^a-zA-Z0-9]/g, '_')).set({
            email: email,
            name: name || email.split('@')[0],
            role: role,
            branch: branch,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeModal();
        showToast('Kullanıcı eklendi', 'success');
        await loadAdminUsers();
        
    } catch (error) {
        console.error('Kullanıcı eklenemedi:', error);
        showToast('Kayıt başarısız', 'error');
    }
}

async function editAdminUser(id) {
    showToast('Düzenleme özelliği yakında eklenecek', 'info');
}

async function deleteAdminUser(id) {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;
    
    try {
        await db.collection('users').doc(id).delete();
        showToast('Kullanıcı silindi', 'success');
        await loadAdminUsers();
    } catch (error) {
        console.error('Kullanıcı silinemedi:', error);
        showToast('Silme başarısız', 'error');
    }
}

// ==================== AYARLAR ====================

async function loadAdminSettings() {
    try {
        const doc = await db.collection('systemConfig').doc('general').get();
        if (doc.exists) {
            const data = doc.data();
            const companyName = document.getElementById('settingCompanyName');
            const taxId = document.getElementById('settingTaxId');
            
            if (companyName) companyName.value = data.companyName || 'Moonberry Coffee';
            if (taxId) taxId.value = data.taxId || '';
        }
    } catch (error) {
        console.warn('Ayarlar yüklenemedi:', error);
    }
}

async function saveGeneralSettings() {
    const companyName = document.getElementById('settingCompanyName')?.value;
    const taxId = document.getElementById('settingTaxId')?.value;
    const adminPin = document.getElementById('settingAdminPin')?.value;
    
    try {
        await db.collection('systemConfig').doc('general').set({
            companyName: companyName,
            taxId: taxId,
            adminPin: adminPin || null,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast('Ayarlar kaydedildi', 'success');
        
    } catch (error) {
        console.error('Ayarlar kaydedilemedi:', error);
        showToast('Kayıt başarısız', 'error');
    }
}

// ==================== PUAN AYARLARI ====================

async function loadPointSettings() {
    try {
        const doc = await db.collection('systemConfig').doc('checkRules').get();
        if (doc.exists) {
            const data = doc.data();
            const settings = data.settings || {};
            
            const pointPlatform = document.getElementById('pointPlatform');
            const pointCleaning = document.getElementById('pointCleaning');
            const pointShift = document.getElementById('pointShift');
            const pointLatePenalty = document.getElementById('pointLatePenalty');
            
            if (pointPlatform) pointPlatform.value = settings.points?.platform || 1;
            if (pointCleaning) pointCleaning.value = settings.points?.cleaning || 1;
            if (pointShift) pointShift.value = settings.points?.shift || 1;
            if (pointLatePenalty) pointLatePenalty.value = settings.lateDeductionPercent || 50;
        }
    } catch (error) {
        console.warn('Puan ayarları yüklenemedi:', error);
    }
}

async function savePointSettings() {
    const platform = parseInt(document.getElementById('pointPlatform')?.value) || 1;
    const cleaning = parseInt(document.getElementById('pointCleaning')?.value) || 1;
    const shift = parseInt(document.getElementById('pointShift')?.value) || 1;
    const latePenalty = parseInt(document.getElementById('pointLatePenalty')?.value) || 50;
    
    try {
        await db.collection('systemConfig').doc('checkRules').set({
            settings: {
                points: {
                    platform: platform,
                    cleaning: cleaning,
                    shift: shift
                },
                lateDeductionPercent: latePenalty
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        showToast('Puan ayarları kaydedildi', 'success');
        
    } catch (error) {
        console.error('Puan ayarları kaydedilemedi:', error);
        showToast('Kayıt başarısız', 'error');
    }
}

// ==================== ŞUBELER ====================

async function loadAdminBranches() {
    const container = document.getElementById('adminBranchesList');
    if (!container) return;
    
    const branches = STATE.branches || ['Tuzla Port', 'Şişli (Merkez)'];
    
    container.innerHTML = branches.map(branch => `
        <div class="branch-item">
            <div class="branch-info">
                <div class="branch-details">
                    <h4>${branch}</h4>
                    <p>Aktif şube</p>
                </div>
            </div>
            <div class="branch-actions">
                <button class="btn btn-sm" onclick="editBranch('${branch}')">✏️</button>
            </div>
        </div>
    `).join('');
}

function openNewBranchModal() {
    showModal('Yeni Şube', `
        <div style="display:grid;gap:15px">
            <div class="form-group">
                <label>Şube Adı *</label>
                <input type="text" id="newBranchName" placeholder="Şube adı">
            </div>
            <div class="form-group">
                <label>Şube Kodu</label>
                <input type="text" id="newBranchCode" placeholder="Örn: TZL" maxlength="3">
            </div>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="saveNewBranch()">Kaydet</button>
    `);
}

async function saveNewBranch() {
    const name = document.getElementById('newBranchName')?.value?.trim();
    const code = document.getElementById('newBranchCode')?.value?.trim()?.toUpperCase();
    
    if (!name) {
        showToast('Şube adı zorunludur', 'error');
        return;
    }
    
    try {
        // Mevcut şubelere ekle
        const newBranches = [...(STATE.branches || []), name];
        const newCodes = { ...(STATE.branchCodes || {}), [name]: code || name.substring(0, 3).toUpperCase() };
        
        await db.collection('systemConfig').doc('branches').set({
            list: newBranches,
            codes: newCodes,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        STATE.branches = newBranches;
        STATE.branchCodes = newCodes;
        
        closeModal();
        showToast('Şube eklendi', 'success');
        await loadAdminBranches();
        
    } catch (error) {
        console.error('Şube eklenemedi:', error);
        showToast('Kayıt başarısız', 'error');
    }
}

function editBranch(branch) {
    showToast('Şube düzenleme özelliği yakında eklenecek', 'info');
}

// ==================== LOGLAR ====================

async function loadAdminLogs() {
    const container = document.getElementById('adminLogsList');
    if (!container) return;
    
    container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
    
    const logType = document.getElementById('logType')?.value || '';
    const logDate = document.getElementById('logDate')?.value || '';
    
    try {
        let query = db.collection('activityLogs').orderBy('timestamp', 'desc').limit(50);
        
        if (logType) {
            query = query.where('type', '==', logType);
        }
        
        const snapshot = await query.get();
        
        if (snapshot.empty) {
            container.innerHTML = '<p style="color:var(--tx2);text-align:center;padding:20px">Log kaydı bulunamadı</p>';
            return;
        }
        
        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const time = data.timestamp?.toDate ? formatTime(data.timestamp.toDate()) : '-';
            const date = data.timestamp?.toDate ? formatDateTR(data.timestamp.toDate()) : '-';
            
            html += `
                <div class="log-item">
                    <span class="log-time">${date} ${time}</span>
                    <span class="log-type">${data.type || 'genel'}</span>
                    <span class="log-msg">${data.message || data.action || '-'}</span>
                </div>
            `;
        });
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Loglar yüklenemedi:', error);
        container.innerHTML = '<p style="color:var(--tx2)">Loglar yüklenirken hata oluştu</p>';
    }
}

// ==================== PREVIEW & KATALOG ====================

async function initPreviewPage() {
    console.log('[Preview] Sayfa hazır');
}

async function initKatalogPage() {
    console.log('[Katalog] Sayfa başlatılıyor...');
    
    // Şubeleri göster
    const branchList = document.getElementById('branchList');
    if (branchList) {
        const branches = STATE.branches || ['Tuzla Port', 'Şişli (Merkez)'];
        branchList.innerHTML = branches.map(b => `
            <div class="settings-item">
                <span class="settings-item-name">${b}</span>
            </div>
        `).join('');
    }
    
    // Pozisyonları göster
    const positionList = document.getElementById('positionList');
    if (positionList) {
        const positions = ['yonetici', 'bolge_muduru', 'magaza_muduru', 'kasaci', 'barista', 'part_time', 'stajyer'];
        positionList.innerHTML = positions.map(p => `
            <div class="settings-item">
                <span class="settings-item-name">${getRoleName(p)}</span>
            </div>
        `).join('');
    }
    
    console.log('[Katalog] Sayfa hazır');
}

// ==================== EXPORT ====================

window.initAdminPage = initAdminPage;
window.selectAdminTab = selectAdminTab;
window.loadAdminUsers = loadAdminUsers;
window.openNewUserModal = openNewUserModal;
window.saveNewUser = saveNewUser;
window.editAdminUser = editAdminUser;
window.deleteAdminUser = deleteAdminUser;
window.loadAdminSettings = loadAdminSettings;
window.saveGeneralSettings = saveGeneralSettings;
window.loadPointSettings = loadPointSettings;
window.savePointSettings = savePointSettings;
window.loadAdminBranches = loadAdminBranches;
window.openNewBranchModal = openNewBranchModal;
window.saveNewBranch = saveNewBranch;
window.editBranch = editBranch;
window.loadAdminLogs = loadAdminLogs;
window.initPreviewPage = initPreviewPage;
window.initKatalogPage = initKatalogPage;

console.log('✓ admin.js yüklendi');
