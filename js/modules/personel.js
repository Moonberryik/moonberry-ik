/**
 * MOONBERRY İK - PERSONEL MODULE
 * Personel yönetimi CRUD işlemleri
 * @version 2.0
 */

// ==================== STATE ====================

let personelList = [];
let filteredPersonelList = [];

// ==================== PERSONEL INIT ====================

async function initPersonelPage() {
    console.log('[Personel] Sayfa başlatılıyor...');
    
    // Şube dropdown
    fillBranchSelect('personelSube', true);
    
    // Durum dropdown varsayılan: active
    const durumSelect = document.getElementById('personelDurum');
    if (durumSelect) durumSelect.value = 'active';
    
    // Personel listesini yükle
    await loadPersonelList();
    
    console.log('[Personel] Sayfa hazır');
}

// ==================== PERSONEL LİSTESİ ====================

async function loadPersonelList() {
    const container = document.getElementById('personelContainer');
    if (!container) return;
    
    showLoading(container, 'Personel listesi yükleniyor...');
    
    const branch = document.getElementById('personelSube')?.value || '';
    const durum = document.getElementById('personelDurum')?.value || 'active';
    
    try {
        let query = db.collection('personel');
        
        if (branch) {
            query = query.where('branch', '==', branch);
        }
        if (durum) {
            query = query.where('status', '==', durum);
        }
        
        const snapshot = await query.get();
        
        personelList = [];
        snapshot.forEach(doc => {
            personelList.push({ id: doc.id, ...doc.data() });
        });
        
        // İsme göre sırala
        personelList.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'tr'));
        
        filteredPersonelList = [...personelList];
        
        renderPersonelGrid();
        updatePersonelStats();
        
    } catch (error) {
        console.error('Personel listesi yüklenemedi:', error);
        container.innerHTML = `<div class="empty-state"><span>❌</span><p>Yüklenirken hata oluştu</p></div>`;
    }
}

// ==================== PERSONEL GRID ====================

function renderPersonelGrid() {
    const container = document.getElementById('personelContainer');
    if (!container) return;
    
    if (filteredPersonelList.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>📭</span><p>Personel bulunamadı</p></div>`;
        return;
    }
    
    let html = '<div class="personel-grid">';
    
    filteredPersonelList.forEach(personel => {
        const displayName = getPersonelDisplayName(personel);
        const statusClass = personel.status === 'active' ? 'active' : 'passive';
        const statusText = personel.status === 'active' ? 'Aktif' : 'Pasif';
        
        html += `
            <div class="personel-card">
                <div class="p-header">
                    <div class="p-avatar">${displayName.charAt(0)}</div>
                    <div class="p-info">
                        <h4>${displayName} <span class="status-badge ${statusClass}">${statusText}</span></h4>
                        <p>${getRoleName(personel.position || personel.role || 'barista')}</p>
                    </div>
                </div>
                <div class="p-details">
                    <div class="p-row"><span class="p-label">Şube</span><span class="p-value">${personel.branch || '-'}</span></div>
                    <div class="p-row"><span class="p-label">Başlangıç</span><span class="p-value">${personel.startDate ? formatDateTR(personel.startDate) : '-'}</span></div>
                    <div class="p-row"><span class="p-label">Email</span><span class="p-value">${personel.email || '-'}</span></div>
                    <div class="p-row"><span class="p-label">Telefon</span><span class="p-value">${personel.phone || '-'}</span></div>
                </div>
                <div class="p-actions">
                    <button class="btn-edit" onclick="editPersonel('${personel.id}')">✏️ Düzenle</button>
                    <button class="btn-docs" onclick="openPersonelDocs('${personel.id}')">📄 Belgeler</button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// ==================== ARAMA FİLTRE ====================

function filterPersonel() {
    const search = document.getElementById('personelSearch')?.value?.toLowerCase() || '';
    
    if (!search) {
        filteredPersonelList = [...personelList];
    } else {
        filteredPersonelList = personelList.filter(p => {
            const name = (p.name || '').toLowerCase();
            const codeName = (p.codeName || '').toLowerCase();
            const email = (p.email || '').toLowerCase();
            
            return name.includes(search) || 
                   codeName.includes(search) || 
                   email.includes(search) ||
                   normalizeTurkishChars(name).includes(normalizeTurkishChars(search));
        });
    }
    
    renderPersonelGrid();
}

// ==================== İSTATİSTİKLER ====================

function updatePersonelStats() {
    const total = document.getElementById('totalPersonel');
    const active = document.getElementById('activePersonel');
    const passive = document.getElementById('passivePersonel');
    
    const activeCount = personelList.filter(p => p.status === 'active').length;
    const passiveCount = personelList.filter(p => p.status !== 'active').length;
    
    if (total) total.textContent = personelList.length;
    if (active) active.textContent = activeCount;
    if (passive) passive.textContent = passiveCount;
}

// ==================== YENİ PERSONEL ====================

function openNewPersonelModal() {
    showModal('Yeni Personel', `
        <div style="display:grid;gap:15px">
            <div class="form-group">
                <label>Ad Soyad *</label>
                <input type="text" id="newPersonelName" placeholder="Ad Soyad">
            </div>
            <div class="form-group">
                <label>Kod Adı (Kısa isim)</label>
                <input type="text" id="newPersonelCodeName" placeholder="Örn: Büşra S.">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="newPersonelEmail" placeholder="email@example.com">
            </div>
            <div class="form-group">
                <label>Telefon</label>
                <input type="tel" id="newPersonelPhone" placeholder="5XX XXX XX XX">
            </div>
            <div class="form-group">
                <label>Şube *</label>
                <select id="newPersonelBranch">
                    ${(STATE.branches || ['Tuzla Port', 'Şişli (Merkez)']).map(b => `<option value="${b}">${b}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Pozisyon *</label>
                <select id="newPersonelPosition">
                    <option value="barista">Barista</option>
                    <option value="kasaci">Kasacı</option>
                    <option value="magaza_muduru">Mağaza Müdürü</option>
                    <option value="part_time">Part-Time</option>
                    <option value="stajyer">Stajyer</option>
                </select>
            </div>
            <div class="form-group">
                <label>İşe Başlama Tarihi</label>
                <input type="date" id="newPersonelStartDate" value="${formatDateLocal(new Date())}">
            </div>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="saveNewPersonel()">Kaydet</button>
    `);
}

async function saveNewPersonel() {
    const name = document.getElementById('newPersonelName')?.value?.trim();
    const codeName = document.getElementById('newPersonelCodeName')?.value?.trim();
    const email = document.getElementById('newPersonelEmail')?.value?.trim();
    const phone = document.getElementById('newPersonelPhone')?.value?.trim();
    const branch = document.getElementById('newPersonelBranch')?.value;
    const position = document.getElementById('newPersonelPosition')?.value;
    const startDate = document.getElementById('newPersonelStartDate')?.value;
    
    if (!name) {
        showToast('Ad Soyad zorunludur', 'error');
        return;
    }
    
    try {
        const docId = normalizePersonelId(name);
        
        await db.collection('personel').doc(docId).set({
            name: name,
            codeName: codeName || '',
            email: email || '',
            phone: phone || '',
            branch: branch,
            position: position,
            role: position,
            startDate: startDate || null,
            status: 'active',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: STATE.currentUser?.email || 'unknown'
        });
        
        closeModal();
        showToast('Personel eklendi', 'success');
        await loadPersonelList();
        
    } catch (error) {
        console.error('Personel eklenemedi:', error);
        showToast('Kayıt başarısız: ' + error.message, 'error');
    }
}

// ==================== PERSONEL DÜZENLE ====================

function editPersonel(personelId) {
    const personel = personelList.find(p => p.id === personelId);
    if (!personel) return;
    
    showModal('Personel Düzenle', `
        <div style="display:grid;gap:15px">
            <div class="form-group">
                <label>Ad Soyad *</label>
                <input type="text" id="editPersonelName" value="${personel.name || ''}">
            </div>
            <div class="form-group">
                <label>Kod Adı</label>
                <input type="text" id="editPersonelCodeName" value="${personel.codeName || ''}">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="editPersonelEmail" value="${personel.email || ''}">
            </div>
            <div class="form-group">
                <label>Telefon</label>
                <input type="tel" id="editPersonelPhone" value="${personel.phone || ''}">
            </div>
            <div class="form-group">
                <label>Şube</label>
                <select id="editPersonelBranch">
                    ${(STATE.branches || ['Tuzla Port', 'Şişli (Merkez)']).map(b => 
                        `<option value="${b}" ${personel.branch === b ? 'selected' : ''}>${b}</option>`
                    ).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Pozisyon</label>
                <select id="editPersonelPosition">
                    <option value="barista" ${personel.position === 'barista' ? 'selected' : ''}>Barista</option>
                    <option value="kasaci" ${personel.position === 'kasaci' ? 'selected' : ''}>Kasacı</option>
                    <option value="magaza_muduru" ${personel.position === 'magaza_muduru' ? 'selected' : ''}>Mağaza Müdürü</option>
                    <option value="part_time" ${personel.position === 'part_time' ? 'selected' : ''}>Part-Time</option>
                    <option value="stajyer" ${personel.position === 'stajyer' ? 'selected' : ''}>Stajyer</option>
                </select>
            </div>
            <div class="form-group">
                <label>Durum</label>
                <select id="editPersonelStatus">
                    <option value="active" ${personel.status === 'active' ? 'selected' : ''}>Aktif</option>
                    <option value="passive" ${personel.status !== 'active' ? 'selected' : ''}>Pasif</option>
                </select>
            </div>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="saveEditPersonel('${personelId}')">Kaydet</button>
    `);
}

async function saveEditPersonel(personelId) {
    const name = document.getElementById('editPersonelName')?.value?.trim();
    const codeName = document.getElementById('editPersonelCodeName')?.value?.trim();
    const email = document.getElementById('editPersonelEmail')?.value?.trim();
    const phone = document.getElementById('editPersonelPhone')?.value?.trim();
    const branch = document.getElementById('editPersonelBranch')?.value;
    const position = document.getElementById('editPersonelPosition')?.value;
    const status = document.getElementById('editPersonelStatus')?.value;
    
    if (!name) {
        showToast('Ad Soyad zorunludur', 'error');
        return;
    }
    
    try {
        await db.collection('personel').doc(personelId).update({
            name: name,
            codeName: codeName || '',
            email: email || '',
            phone: phone || '',
            branch: branch,
            position: position,
            role: position,
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: STATE.currentUser?.email || 'unknown'
        });
        
        closeModal();
        showToast('Personel güncellendi', 'success');
        await loadPersonelList();
        
    } catch (error) {
        console.error('Personel güncellenemedi:', error);
        showToast('Güncelleme başarısız: ' + error.message, 'error');
    }
}

// ==================== PERSONEL BELGELERİ ====================

function openPersonelDocs(personelId) {
    const personel = personelList.find(p => p.id === personelId);
    if (!personel) return;
    
    const displayName = getPersonelDisplayName(personel);
    
    showModal(`${displayName} - Belgeler`, `
        <div style="display:grid;gap:10px">
            <button class="btn" onclick="goTo('sozlesme');closeModal();setTimeout(()=>document.getElementById('sozlesmePersonel').value='${personelId}',100)">📄 İş Sözleşmesi</button>
            <button class="btn" onclick="goTo('tutanak');closeModal()">📋 Tutanak</button>
            <button class="btn" onclick="goTo('savunma');closeModal()">📝 Savunma İstem</button>
            <button class="btn" onclick="goTo('fesih');closeModal()">📑 Fesih Bildirimi</button>
            <button class="btn" onclick="goTo('istifa');closeModal()">✍️ İstifa Dilekçesi</button>
            <button class="btn" onclick="goTo('ibraname');closeModal()">✅ İbraname</button>
        </div>
    `, `<button class="btn btn-secondary" onclick="closeModal()">Kapat</button>`);
}

// ==================== EXPORT ====================

window.initPersonelPage = initPersonelPage;
window.loadPersonelList = loadPersonelList;
window.filterPersonel = filterPersonel;
window.openNewPersonelModal = openNewPersonelModal;
window.saveNewPersonel = saveNewPersonel;
window.editPersonel = editPersonel;
window.saveEditPersonel = saveEditPersonel;
window.openPersonelDocs = openPersonelDocs;

console.log('✓ personel.js yüklendi');
