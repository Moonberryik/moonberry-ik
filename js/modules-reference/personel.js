/**
 * MOONBERRY İK - PERSONEL.JS
 * Personel yönetimi
 * @version 20
 */

// ==================== PERSONEL CACHE ====================

// Personel display cache'i yükle
async function loadPersonelDisplayCache() {
    try {
        const snapshot = await db.collection('personel').get();
        PERSONEL_DISPLAY_CACHE.clear();
        
        snapshot.forEach(doc => {
            const data = doc.data();
            const displayName = getPersonelDisplayName(data);
            const uniqueId = data.uniqueId || normalizePersonelId(data.name);
            
            PERSONEL_DISPLAY_CACHE.set(uniqueId, {
                docId: doc.id,
                name: data.name,
                codeName: data.codeName,
                displayName: displayName,
                uniqueId: uniqueId,
                branch: data.branch,
                role: data.role
            });
            
            // Eski key'ler için de ekle
            PERSONEL_DISPLAY_CACHE.set(data.name, PERSONEL_DISPLAY_CACHE.get(uniqueId));
            if (data.codeName) {
                PERSONEL_DISPLAY_CACHE.set(data.codeName, PERSONEL_DISPLAY_CACHE.get(uniqueId));
            }
        });
        
        console.log('[Personel Cache] Yüklendi:', PERSONEL_DISPLAY_CACHE.size, 'kayıt');
    } catch (e) {
        console.warn('Personel cache yüklenemedi:', e);
    }
}

// Cache'den personel bul
function getPersonelFromCache(key) {
    if (!key) return null;
    
    // Direkt eşleşme
    if (PERSONEL_DISPLAY_CACHE.has(key)) {
        return PERSONEL_DISPLAY_CACHE.get(key);
    }
    
    // Normalize edilmiş key
    const normalizedKey = normalizePersonelId(key);
    if (PERSONEL_DISPLAY_CACHE.has(normalizedKey)) {
        return PERSONEL_DISPLAY_CACHE.get(normalizedKey);
    }
    
    // Tüm değerlerde ara
    for (const [k, v] of PERSONEL_DISPLAY_CACHE) {
        if (v.name === key || v.codeName === key || v.displayName === key) {
            return v;
        }
    }
    
    return null;
}

// ==================== PERSONEL LİSTE ====================

async function loadPersonelList() {
    const tbody = document.getElementById('personelTableBody');
    const countEl = document.getElementById('personelCount');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--tx2)">Yükleniyor...</td></tr>';
    
    try {
        const snapshot = await db.collection('personel').orderBy('name').get();
        const personelList = [];
        snapshot.forEach(doc => personelList.push({ id: doc.id, ...doc.data() }));
        
        if (countEl) countEl.textContent = personelList.length;
        
        if (personelList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--tx2)">Personel bulunamadı</td></tr>';
            return;
        }
        
        tbody.innerHTML = personelList.map(p => `
            <tr>
                <td style="font-weight:600">${p.name || '-'}</td>
                <td>${getPersonelDisplayName(p)}</td>
                <td>${p.branch || '-'}</td>
                <td>${p.position || '-'}</td>
                <td>
                    <span style="background:${p.status === 'active' ? 'rgba(39,174,96,.1)' : 'rgba(231,76,60,.1)'};color:${p.status === 'active' ? '#27ae60' : '#e74c3c'};padding:4px 10px;border-radius:6px;font-size:.75rem">
                        ${p.status === 'active' ? 'Aktif' : 'Pasif'}
                    </span>
                </td>
                <td>
                    <button onclick="editPersonel('${p.id}')" class="btn btn-ghost" style="padding:6px 10px;font-size:.75rem">Düzenle</button>
                </td>
            </tr>
        `).join('');
        
    } catch (e) {
        console.error('Personel listesi hatası:', e);
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:#e74c3c">Yükleme hatası</td></tr>';
    }
}

// ==================== PERSONEL CRUD ====================

async function editPersonel(id) {
    try {
        const doc = await db.collection('personel').doc(id).get();
        if (!doc.exists) {
            toast('Personel bulunamadı', 'error');
            return;
        }
        
        const p = doc.data();
        
        const content = `
            <form id="personelEditForm">
                <input type="hidden" id="personelEditId" value="${id}">
                <div style="display:grid;gap:16px">
                    <div>
                        <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Ad Soyad</label>
                        <input type="text" id="personelEditName" value="${p.name || ''}" class="form-input" style="width:100%">
                    </div>
                    <div>
                        <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Kod Adı (Shift'te görünecek)</label>
                        <input type="text" id="personelEditCodeName" value="${p.codeName || ''}" class="form-input" style="width:100%" placeholder="${formatDisplayName(p.name)}">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                        <div>
                            <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Şube</label>
                            <select id="personelEditBranch" class="form-input" style="width:100%">
                                ${(STATE.branches || DEFAULT_STATE.branches).map(b => `<option value="${b}" ${b === p.branch ? 'selected' : ''}>${b}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Pozisyon</label>
                            <select id="personelEditPosition" class="form-input" style="width:100%">
                                ${(STATE.positions || DEFAULT_STATE.positions || []).map(pos => `<option value="${pos.name}" ${pos.name === p.position ? 'selected' : ''}>${pos.name}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Durum</label>
                        <select id="personelEditStatus" class="form-input" style="width:100%">
                            <option value="active" ${p.status === 'active' ? 'selected' : ''}>Aktif</option>
                            <option value="inactive" ${p.status === 'inactive' ? 'selected' : ''}>Pasif</option>
                        </select>
                    </div>
                </div>
            </form>
        `;
        
        const buttons = `
            <button onclick="closeModal()" class="btn btn-ghost">İptal</button>
            <button onclick="savePersonel()" class="btn btn-primary">Kaydet</button>
        `;
        
        showModal('Personel Düzenle', content, buttons);
        
    } catch (e) {
        toast('Personel yüklenemedi', 'error');
    }
}

async function savePersonel() {
    const id = document.getElementById('personelEditId')?.value;
    const name = document.getElementById('personelEditName')?.value?.trim();
    const codeName = document.getElementById('personelEditCodeName')?.value?.trim();
    const branch = document.getElementById('personelEditBranch')?.value;
    const position = document.getElementById('personelEditPosition')?.value;
    const status = document.getElementById('personelEditStatus')?.value;
    
    if (!name) {
        toast('Ad soyad gerekli', 'error');
        return;
    }
    
    try {
        const data = {
            name,
            codeName: codeName || '',
            displayName: codeName || formatDisplayName(name),
            branch,
            position,
            status,
            uniqueId: normalizePersonelId(name),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        if (id) {
            await db.collection('personel').doc(id).update(data);
        } else {
            data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('personel').add(data);
        }
        
        toast('Personel kaydedildi', 'success');
        closeModal();
        loadPersonelList();
        loadPersonelDisplayCache();
        
        // Shift senkronizasyonu
        syncAllShiftPersonelNames?.();
        
    } catch (e) {
        console.error('Personel kayıt hatası:', e);
        toast('Kayıt hatası', 'error');
    }
}

function addPersonel() {
    const content = `
        <form id="personelEditForm">
            <input type="hidden" id="personelEditId" value="">
            <div style="display:grid;gap:16px">
                <div>
                    <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Ad Soyad</label>
                    <input type="text" id="personelEditName" class="form-input" style="width:100%">
                </div>
                <div>
                    <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Kod Adı (Shift'te görünecek)</label>
                    <input type="text" id="personelEditCodeName" class="form-input" style="width:100%" placeholder="Boş bırakılırsa otomatik oluşturulur">
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
                    <div>
                        <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Şube</label>
                        <select id="personelEditBranch" class="form-input" style="width:100%">
                            ${(STATE.branches || DEFAULT_STATE.branches).map(b => `<option value="${b}">${b}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Pozisyon</label>
                        <select id="personelEditPosition" class="form-input" style="width:100%">
                            ${(STATE.positions || DEFAULT_STATE.positions || []).map(pos => `<option value="${pos.name}">${pos.name}</option>`).join('')}
                        </select>
                    </div>
                </div>
                <div>
                    <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Durum</label>
                    <select id="personelEditStatus" class="form-input" style="width:100%">
                        <option value="active">Aktif</option>
                        <option value="inactive">Pasif</option>
                    </select>
                </div>
            </div>
        </form>
    `;
    
    const buttons = `
        <button onclick="closeModal()" class="btn btn-ghost">İptal</button>
        <button onclick="savePersonel()" class="btn btn-primary">Kaydet</button>
    `;
    
    showModal('Yeni Personel', content, buttons);
}

console.log('✓ personel.js yüklendi');
