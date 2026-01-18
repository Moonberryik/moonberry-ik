/**
 * MOONBERRY İK - SHIFT.JS
 * Shift planlama sistemi
 * @version 20
 */

// ==================== SABİTLER ====================
const SHIFT_TYPES = ['AÇILIŞ', 'ARA', 'KAPANIŞ', 'OFF', 'Y.İ', 'BÖLGE MÜDÜRÜ'];
const PARTTIME_START = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
const PARTTIME_END = ['11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'];

const SHIFT_ANNOUNCEMENTS = [
    { text: 'AÇILIŞ PERSONELİ İŞE GEÇ KALMAMALIDIR!', color: '#2E7D32', bg: '#C6EFCE' },
    { text: 'İZİN GÜNÜ YOKSA; YEMEK VE MOLA SÜRESİ SEÇİMİ PERSONELİN KENDİ SEÇİMİNDEDİR.', color: '#2E7D32', bg: '#C6EFCE' },
    { text: "SHIFT'E YILDIZ (*) SEMBOLÜ OLAN GÜNLER ÖZEL İSTEK GÜNLERİDİR.", color: '#9C5700', bg: '#FFEB9C' },
    { text: 'KAPANIŞTAN AÇILIŞ GELECEK PERSONEL YÖNETİCİLERİNİ UYARACAK!', color: '#C00000', bg: '#FFC7CE' }
];

// ==================== YARDIMCI FONKSİYONLAR ====================

function formatWeekWithYear(weekLabel, weekStart) {
    if (!weekStart) return weekLabel || 'Tarih Yok';
    const year = weekStart.split('-')[0];
    const label = weekLabel || weekStart;
    if (label.includes(year) || label.includes('2024') || label.includes('2025') || label.includes('2026')) {
        return label;
    }
    return `${label} (${year})`;
}

function getShiftColorExcel(val) {
    if (!val) return SHIFT_COLORS.default || { bg: '#F3F3F3', border: '#CCCCCC', text: '#333333' };
    const cleanVal = val.replace(/\*/g, '').trim().toUpperCase();
    
    if (SHIFT_COLORS[cleanVal]) return SHIFT_COLORS[cleanVal];
    if (cleanVal === 'A' || cleanVal.includes('AÇILI')) return SHIFT_COLORS['AÇILIŞ'];
    if (cleanVal === 'K' || cleanVal.includes('KAPANI')) return SHIFT_COLORS['KAPANIŞ'];
    if (cleanVal === 'İ' || cleanVal === 'IZN') return SHIFT_COLORS['OFF'];
    if (cleanVal.includes('BÖLGE') || cleanVal.includes('BOLGE')) return SHIFT_COLORS['BÖLGE MÜDÜRÜ'];
    if (/^\d{1,2}[:\-\.]\d{2}/.test(cleanVal) || /^\d{4}$/.test(cleanVal)) {
        return { bg: '#E8F4FD', text: '#1E5B94', border: '#90CAF9' };
    }
    
    return SHIFT_COLORS.default || { bg: '#F3F3F3', border: '#CCCCCC', text: '#333333' };
}

function formatShiftValue(val) {
    if (!val) return '';
    return val.replace(/\*/g, '').trim();
}

// ==================== SHIFT LİSTELEME ====================

async function loadShiftList() {
    const subeSelect = document.getElementById('shiftSube');
    const haftaSelect = document.getElementById('shiftHafta');
    
    if (!subeSelect || !haftaSelect) return;
    
    const selectedSube = subeSelect.value;
    if (!selectedSube) {
        haftaSelect.innerHTML = '<option value="">-- Önce Mağaza Seçin --</option>';
        return;
    }
    
    haftaSelect.innerHTML = '<option value="">⏳ Yükleniyor...</option>';
    
    try {
        const snapshot = await db.collection('shifts').get();
        let weeks = [];
        
        snapshot.forEach(doc => {
            const d = doc.data();
            if (d.branch === selectedSube) {
                weeks.push({ id: doc.id, ...d });
            }
        });
        
        weeks.sort((a, b) => (b.weekStart || '').localeCompare(a.weekStart || ''));
        
        const today = new Date();
        const todayWeekStart = getWeekStart(today);
        const todayWeekKey = formatDateLocal(todayWeekStart);
        
        if (weeks.length === 0) {
            haftaSelect.innerHTML = '<option value="">Shift planı bulunamadı</option>';
            return;
        }
        
        haftaSelect.innerHTML = weeks.map((w, i) => {
            const isCurrent = w.weekStart === todayWeekKey;
            const label = formatWeekWithYear(w.weekLabel, w.weekStart);
            return `<option value="${w.id}" ${isCurrent ? 'selected' : ''}>${label}${isCurrent ? ' 📍' : ''}</option>`;
        }).join('');
        
        // İlk yükleme
        loadShiftWeek();
        
    } catch (e) {
        console.error('Shift listesi hatası:', e);
        haftaSelect.innerHTML = '<option value="">Yükleme hatası</option>';
    }
}

// ==================== SHIFT YÜKLEME ====================

async function loadShiftWeek() {
    const haftaSelect = document.getElementById('shiftHafta');
    const container = document.getElementById('shiftTableContainer');
    
    if (!haftaSelect || !container) return;
    
    const docId = haftaSelect.value;
    if (!docId) {
        container.innerHTML = '<p style="text-align:center;color:var(--tx2);padding:40px">Hafta seçin</p>';
        return;
    }
    
    container.innerHTML = '<p style="text-align:center;color:var(--tx2);padding:40px">⏳ Yükleniyor...</p>';
    
    try {
        const doc = await db.collection('shifts').doc(docId).get();
        if (!doc.exists) {
            container.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:40px">Shift bulunamadı</p>';
            return;
        }
        
        renderShiftTable(doc.data(), docId);
        
    } catch (e) {
        console.error('Shift yükleme hatası:', e);
        container.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:40px">Yükleme hatası</p>';
    }
}

// ==================== SHIFT TABLOSU RENDER ====================

function renderShiftTable(shift, docId) {
    const container = document.getElementById('shiftTableContainer');
    if (!container) return;
    
    const days = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
    const shortDays = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const personelShifts = shift.personelShifts || {};
    const personelOrder = shift.personelOrder || Object.keys(personelShifts);
    const personelNames = shift.personelNames || {};
    const personelFullNames = shift.personelFullNames || {};
    
    // Tarih hesaplama
    const weekStart = shift.weekStart ? new Date(shift.weekStart) : new Date();
    const dates = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        dates.push(d.getDate());
    }
    
    let html = `
        <div style="overflow-x:auto">
            <table class="shift-table" style="width:100%;border-collapse:collapse;font-size:.85rem">
                <thead>
                    <tr style="background:var(--bg3)">
                        <th style="padding:12px;text-align:left;border:1px solid var(--cardBorder);min-width:150px">Personel</th>
                        ${days.map((d, i) => `<th style="padding:12px;text-align:center;border:1px solid var(--cardBorder);min-width:80px">${shortDays[i]}<br><small style="color:var(--tx2)">${dates[i]}</small></th>`).join('')}
                    </tr>
                </thead>
                <tbody>
    `;
    
    personelOrder.forEach((key, idx) => {
        const shifts = personelShifts[key] || {};
        const displayName = personelNames[key] || key;
        const fullName = personelFullNames[key] || key;
        
        html += `<tr draggable="true" data-idx="${idx}" ondragstart="handleShiftDragStart(event, '${docId}', ${idx})" ondragover="handleShiftDragOver(event)" ondrop="handleShiftDrop(event, '${docId}', ${idx})" ondragend="handleShiftDragEnd(event)">`;
        html += `<td style="padding:10px;border:1px solid var(--cardBorder);font-weight:600;background:var(--bg2)" title="${fullName}">${displayName}</td>`;
        
        for (let i = 0; i < 7; i++) {
            const val = shifts[i] || '';
            const hasStar = val.includes('*');
            const colors = getShiftColorExcel(val);
            
            html += `<td style="padding:8px;border:1px solid var(--cardBorder);text-align:center;background:${colors.bg};color:${colors.text};cursor:pointer;position:relative" onclick="editShiftCell('${docId}', '${key}', ${i}, '${val.replace(/'/g, "\\'")}')">`;
            html += `<span style="font-weight:600">${formatShiftValue(val)}</span>`;
            if (hasStar) html += '<span style="position:absolute;top:2px;right:4px;color:#f39c12">★</span>';
            html += '</td>';
        }
        
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    
    // Aksiyonlar
    html += `
        <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
            <button onclick="addPersonelToShift('${docId}')" class="btn btn-primary">+ Personel Ekle</button>
            <button onclick="removePersonelFromShift('${docId}')" class="btn btn-ghost">- Personel Çıkar</button>
            <button onclick="downloadShiftPDF()" class="btn btn-ghost">📄 PDF</button>
            <button onclick="printShift()" class="btn btn-ghost">🖨️ Yazdır</button>
        </div>
    `;
    
    container.innerHTML = html;
}

// ==================== HÜCRE DÜZENLEME ====================

function editShiftCell(docId, key, dayIdx, currentVal) {
    const hasStar = currentVal.includes('*');
    const cleanVal = currentVal.replace(/\*/g, '').trim();
    
    const content = `
        <div style="display:grid;gap:16px">
            <div>
                <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:8px">Shift Türü</label>
                <select id="shiftCellSelect" class="form-input" style="width:100%" onchange="document.getElementById('shiftCellCustom').style.display = this.value === 'custom' ? 'block' : 'none'">
                    <option value="">-- Seçin --</option>
                    <optgroup label="Vardiya">
                        <option value="AÇILIŞ" ${cleanVal === 'AÇILIŞ' || cleanVal === 'A' ? 'selected' : ''}>Açılış</option>
                        <option value="ARA" ${cleanVal === 'ARA' ? 'selected' : ''}>Ara</option>
                        <option value="KAPANIŞ" ${cleanVal === 'KAPANIŞ' || cleanVal === 'K' ? 'selected' : ''}>Kapanış</option>
                    </optgroup>
                    <optgroup label="İzin">
                        <option value="OFF" ${cleanVal === 'OFF' || cleanVal === 'İ' ? 'selected' : ''}>OFF (İzin)</option>
                        <option value="Y.İ" ${cleanVal === 'Y.İ' ? 'selected' : ''}>Y.İ (Yıllık İzin)</option>
                        <option value="RAPOR" ${cleanVal === 'RAPOR' ? 'selected' : ''}>Rapor</option>
                    </optgroup>
                    <optgroup label="Özel">
                        <option value="BÖLGE MÜDÜRÜ" ${cleanVal.includes('BÖLGE') ? 'selected' : ''}>Bölge Müdürü</option>
                        <option value="TUZLA" ${cleanVal === 'TUZLA' ? 'selected' : ''}>Tuzla</option>
                        <option value="custom">Özel Saat...</option>
                    </optgroup>
                </select>
            </div>
            <div id="shiftCellCustom" style="display:none">
                <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:8px">Özel Değer</label>
                <input type="text" id="shiftCellCustomVal" class="form-input" style="width:100%" placeholder="Örn: 10:00/19:00" value="${cleanVal}">
            </div>
            <div>
                <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
                    <input type="checkbox" id="shiftCellStar" ${hasStar ? 'checked' : ''}>
                    <span style="font-size:.85rem">★ Özel İstek (Yıldız)</span>
                </label>
            </div>
        </div>
    `;
    
    const buttons = `
        <button onclick="closeModal()" class="btn btn-ghost">İptal</button>
        <button onclick="saveShiftCell('${docId}', '${key}', ${dayIdx})" class="btn btn-primary">Kaydet</button>
    `;
    
    showModal('Shift Düzenle', content, buttons);
}

async function saveShiftCell(docId, key, dayIdx) {
    const select = document.getElementById('shiftCellSelect');
    const customInput = document.getElementById('shiftCellCustomVal');
    const starCheck = document.getElementById('shiftCellStar');
    
    let value = select.value === 'custom' ? customInput.value.trim() : select.value;
    if (starCheck.checked && value) value = '*' + value;
    
    await updateShiftCell(docId, key, dayIdx, value);
    closeModal();
}

async function updateShiftCell(docId, name, dayIdx, value) {
    try {
        const doc = await db.collection('shifts').doc(docId).get();
        if (!doc.exists) {
            toast('Shift bulunamadı', 'error');
            return;
        }
        
        const data = doc.data();
        const personelShifts = data.personelShifts || {};
        
        if (!personelShifts[name]) personelShifts[name] = {};
        personelShifts[name][dayIdx] = value;
        
        await db.collection('shifts').doc(docId).update({
            personelShifts,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        loadShiftWeek();
        toast('Shift güncellendi', 'success');
        
    } catch (e) {
        console.error('Shift güncelleme hatası:', e);
        toast('Güncelleme hatası', 'error');
    }
}

// ==================== SÜRÜKLE-BIRAK ====================

let draggedShiftRow = null;

function handleShiftDragStart(e, docId, idx) {
    draggedShiftRow = { docId, idx };
    e.target.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
}

function handleShiftDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.style.background = 'rgba(0,140,149,0.1)';
}

function handleShiftDrop(e, docId, targetIdx) {
    e.preventDefault();
    e.currentTarget.style.background = '';
    
    if (draggedShiftRow && draggedShiftRow.docId === docId && draggedShiftRow.idx !== targetIdx) {
        reorderShiftPersonel(docId, draggedShiftRow.idx, targetIdx);
    }
}

function handleShiftDragEnd(e) {
    e.target.style.opacity = '1';
    document.querySelectorAll('.shift-table tr').forEach(r => r.style.background = '');
    draggedShiftRow = null;
}

async function reorderShiftPersonel(docId, fromIdx, toIdx) {
    try {
        const doc = await db.collection('shifts').doc(docId).get();
        if (!doc.exists) return;
        
        const data = doc.data();
        const order = [...(data.personelOrder || Object.keys(data.personelShifts || {}))];
        
        const [moved] = order.splice(fromIdx, 1);
        order.splice(toIdx, 0, moved);
        
        await db.collection('shifts').doc(docId).update({
            personelOrder: order,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        loadShiftWeek();
        
    } catch (e) {
        console.error('Sıralama hatası:', e);
        toast('Sıralama hatası', 'error');
    }
}

// ==================== PERSONEL EKLE/ÇIKAR ====================

async function addPersonelToShift(docId) {
    try {
        const doc = await db.collection('shifts').doc(docId).get();
        if (!doc.exists) return;
        
        const shift = doc.data();
        const branch = shift.branch;
        const existingKeys = Object.keys(shift.personelShifts || {});
        
        // Şubedeki personeli al
        const snapshot = await db.collection('personel')
            .where('branch', '==', branch)
            .where('status', '==', 'active')
            .get();
        
        const available = [];
        snapshot.forEach(d => {
            const p = d.data();
            const displayName = getPersonelDisplayName(p);
            const uniqueId = p.uniqueId || normalizePersonelId(p.name);
            
            // Zaten eklenmişse atla
            const isAdded = existingKeys.some(k => 
                k === displayName || k === uniqueId || k === p.name || k === p.codeName
            );
            
            if (!isAdded) {
                available.push({ id: d.id, ...p, displayName, uniqueId });
            }
        });
        
        if (available.length === 0) {
            toast('Eklenecek personel yok', 'info');
            return;
        }
        
        const content = `
            <div style="max-height:400px;overflow-y:auto">
                ${available.map(p => `
                    <label style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--cardBorder);cursor:pointer">
                        <input type="checkbox" value="${p.id}" data-name="${p.name}" data-display="${p.displayName}" data-uid="${p.uniqueId}">
                        <span style="font-weight:600">${p.displayName}</span>
                        <span style="color:var(--tx2);font-size:.8rem">(${p.name})</span>
                    </label>
                `).join('')}
            </div>
        `;
        
        const buttons = `
            <button onclick="closeModal()" class="btn btn-ghost">İptal</button>
            <button onclick="confirmAddPersonelToShift('${docId}')" class="btn btn-primary">Ekle</button>
        `;
        
        showModal('Personel Ekle', content, buttons);
        
    } catch (e) {
        console.error('Personel listesi hatası:', e);
        toast('Yükleme hatası', 'error');
    }
}

async function confirmAddPersonelToShift(docId) {
    const checks = document.querySelectorAll('#modal input[type="checkbox"]:checked');
    if (checks.length === 0) {
        toast('Personel seçin', 'error');
        return;
    }
    
    try {
        const doc = await db.collection('shifts').doc(docId).get();
        const data = doc.data();
        const personelShifts = data.personelShifts || {};
        const personelOrder = data.personelOrder || Object.keys(personelShifts);
        const personelNames = data.personelNames || {};
        const personelFullNames = data.personelFullNames || {};
        
        checks.forEach(c => {
            const displayName = c.dataset.display;
            const fullName = c.dataset.name;
            const uniqueId = c.dataset.uid;
            
            // Key olarak displayName kullan
            personelShifts[displayName] = {};
            personelOrder.push(displayName);
            personelNames[displayName] = displayName;
            personelFullNames[displayName] = fullName;
        });
        
        await db.collection('shifts').doc(docId).update({
            personelShifts,
            personelOrder,
            personelNames,
            personelFullNames,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeModal();
        loadShiftWeek();
        toast('Personel eklendi', 'success');
        
    } catch (e) {
        toast('Ekleme hatası', 'error');
    }
}

async function removePersonelFromShift(docId) {
    try {
        const doc = await db.collection('shifts').doc(docId).get();
        if (!doc.exists) return;
        
        const shift = doc.data();
        const personelShifts = shift.personelShifts || {};
        const keys = Object.keys(personelShifts);
        
        if (keys.length === 0) {
            toast('Çıkarılacak personel yok', 'info');
            return;
        }
        
        const personelNames = shift.personelNames || {};
        
        const content = `
            <div style="max-height:400px;overflow-y:auto">
                ${keys.map(k => `
                    <label style="display:flex;align-items:center;gap:12px;padding:12px;border-bottom:1px solid var(--cardBorder);cursor:pointer">
                        <input type="checkbox" value="${k}">
                        <span style="font-weight:600">${personelNames[k] || k}</span>
                    </label>
                `).join('')}
            </div>
        `;
        
        const buttons = `
            <button onclick="closeModal()" class="btn btn-ghost">İptal</button>
            <button onclick="confirmRemovePersonelFromShift('${docId}')" class="btn" style="background:#e74c3c;color:#fff">Çıkar</button>
        `;
        
        showModal('Personel Çıkar', content, buttons);
        
    } catch (e) {
        toast('Yükleme hatası', 'error');
    }
}

async function confirmRemovePersonelFromShift(docId) {
    const checks = document.querySelectorAll('#modal input[type="checkbox"]:checked');
    if (checks.length === 0) {
        toast('Personel seçin', 'error');
        return;
    }
    
    try {
        const doc = await db.collection('shifts').doc(docId).get();
        const data = doc.data();
        const personelShifts = { ...data.personelShifts };
        let personelOrder = [...(data.personelOrder || Object.keys(personelShifts))];
        const personelNames = { ...data.personelNames };
        const personelFullNames = { ...data.personelFullNames };
        
        checks.forEach(c => {
            const key = c.value;
            delete personelShifts[key];
            delete personelNames[key];
            delete personelFullNames[key];
            personelOrder = personelOrder.filter(k => k !== key);
        });
        
        await db.collection('shifts').doc(docId).update({
            personelShifts,
            personelOrder,
            personelNames,
            personelFullNames,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeModal();
        loadShiftWeek();
        toast('Personel çıkarıldı', 'success');
        
    } catch (e) {
        toast('Çıkarma hatası', 'error');
    }
}

// ==================== YENİ SHIFT OLUŞTUR ====================

function showNewShiftModal() {
    const branches = STATE.branches || DEFAULT_STATE.branches;
    
    const content = `
        <div style="display:grid;gap:16px">
            <div>
                <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:8px">Mağaza</label>
                <select id="newShiftBranch" class="form-input" style="width:100%">
                    ${branches.map(b => `<option value="${b}">${b}</option>`).join('')}
                </select>
            </div>
            <div>
                <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:8px">Hafta Başlangıcı (Pazartesi)</label>
                <input type="date" id="newShiftWeekStart" class="form-input" style="width:100%">
            </div>
            <div>
                <label style="display:flex;align-items:center;gap:8px">
                    <input type="checkbox" id="newShiftCopyPrev" checked>
                    <span style="font-size:.85rem">Geçen haftadan kopyala</span>
                </label>
            </div>
        </div>
    `;
    
    const buttons = `
        <button onclick="closeModal()" class="btn btn-ghost">İptal</button>
        <button onclick="createNewShift()" class="btn btn-primary">Oluştur</button>
    `;
    
    showModal('Yeni Shift Planı', content, buttons);
    
    // Varsayılan tarih: gelecek pazartesi
    const today = new Date();
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + (8 - today.getDay()) % 7);
    document.getElementById('newShiftWeekStart').value = formatDateLocal(nextMonday);
}

async function createNewShift() {
    const branch = document.getElementById('newShiftBranch')?.value;
    const weekStart = document.getElementById('newShiftWeekStart')?.value;
    const copyPrev = document.getElementById('newShiftCopyPrev')?.checked;
    
    if (!branch || !weekStart) {
        toast('Tüm alanları doldurun', 'error');
        return;
    }
    
    try {
        // Aynı hafta var mı kontrol et
        const existing = await db.collection('shifts')
            .where('branch', '==', branch)
            .where('weekStart', '==', weekStart)
            .get();
        
        if (!existing.empty) {
            toast('Bu hafta için shift zaten var', 'error');
            return;
        }
        
        let personelShifts = {};
        let personelOrder = [];
        let personelNames = {};
        let personelFullNames = {};
        
        if (copyPrev) {
            // Önceki haftayı bul
            const prevWeekDate = new Date(weekStart);
            prevWeekDate.setDate(prevWeekDate.getDate() - 7);
            const prevWeekStart = formatDateLocal(prevWeekDate);
            
            const prevSnapshot = await db.collection('shifts')
                .where('branch', '==', branch)
                .where('weekStart', '==', prevWeekStart)
                .get();
            
            if (!prevSnapshot.empty) {
                const prevData = prevSnapshot.docs[0].data();
                personelShifts = JSON.parse(JSON.stringify(prevData.personelShifts || {}));
                personelOrder = [...(prevData.personelOrder || Object.keys(personelShifts))];
                personelNames = JSON.parse(JSON.stringify(prevData.personelNames || {}));
                personelFullNames = JSON.parse(JSON.stringify(prevData.personelFullNames || {}));
            }
        }
        
        // Eğer kopyalama yapılmadıysa şubeden personel al
        if (Object.keys(personelShifts).length === 0) {
            const personelSnapshot = await db.collection('personel')
                .where('branch', '==', branch)
                .where('status', '==', 'active')
                .get();
            
            personelSnapshot.forEach(doc => {
                const p = doc.data();
                const displayName = getPersonelDisplayName(p);
                personelShifts[displayName] = {};
                personelOrder.push(displayName);
                personelNames[displayName] = displayName;
                personelFullNames[displayName] = p.name;
            });
        }
        
        // Hafta label'ı oluştur
        const startDate = new Date(weekStart);
        const endDate = new Date(weekStart);
        endDate.setDate(endDate.getDate() + 6);
        const weekLabel = `${startDate.getDate()} - ${endDate.getDate()} ${startDate.toLocaleDateString('tr-TR', { month: 'long' })}`;
        
        await db.collection('shifts').add({
            branch,
            weekStart,
            weekLabel,
            personelShifts,
            personelOrder,
            personelNames,
            personelFullNames,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser?.id || 'unknown'
        });
        
        closeModal();
        document.getElementById('shiftSube').value = branch;
        loadShiftList();
        toast('Shift planı oluşturuldu', 'success');
        
    } catch (e) {
        console.error('Shift oluşturma hatası:', e);
        toast('Oluşturma hatası', 'error');
    }
}

console.log('✓ shift.js yüklendi');
