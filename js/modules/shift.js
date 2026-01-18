/**
 * MOONBERRY İK - SHIFT MODULE
 * Vardiya planlaması fonksiyonları
 * @version 2.0
 */

// ==================== STATE ====================

let currentShiftBranch = null;
let currentShiftWeek = null;
let shiftData = {};
let shiftPersonel = [];

// Shift türleri
const SHIFT_TYPES = {
    'TAM': { label: 'Tam Gün', color: '#27ae60', hours: 9 },
    'YARIM': { label: 'Yarım Gün', color: '#f39c12', hours: 4.5 },
    'OFF': { label: 'İzinli', color: '#95a5a6', hours: 0 },
    'IZIN': { label: 'Yıllık İzin', color: '#e74c3c', hours: 0 },
    'RAPOR': { label: 'Raporlu', color: '#9b59b6', hours: 0 },
    '': { label: '-', color: 'transparent', hours: 0 }
};

// Vardiya saatleri
const SHIFT_HOURS = {
    'A': { start: '08:00', end: '17:00', label: 'Açılışçı' },
    'K': { start: '14:00', end: '23:00', label: 'Kapanışçı' },
    'O': { start: '10:00', end: '19:00', label: 'Ortacı' },
};

// ==================== SHIFT INIT ====================

async function initShiftPage() {
    console.log('[Shift] Sayfa başlatılıyor...');
    
    // Şube dropdown'ı doldur
    fillBranchSelect('shiftSube');
    const subeSelect = document.getElementById('shiftSube');
    if (subeSelect) {
        currentShiftBranch = subeSelect.value;
    }
    
    // Admin butonlarını göster/gizle
    document.querySelectorAll('.manager-only').forEach(el => {
        el.style.display = isManager(STATE.currentUser?.role) ? '' : 'none';
    });
    
    // Barista sadece görüntüleyebilir
    if (!isManager(STATE.currentUser?.role)) {
        // Edit butonlarını gizle
        document.querySelectorAll('.shift-edit-btn').forEach(el => {
            el.style.display = 'none';
        });
    }
    
    // Haftaları yükle
    await loadShiftWeeks();
    
    console.log('[Shift] Sayfa hazır');
}

// ==================== HAFTA LİSTESİ ====================

async function loadShiftWeeks() {
    const weekSelect = document.getElementById('shiftWeek');
    const branch = document.getElementById('shiftSube')?.value || 'Tuzla Port';
    currentShiftBranch = branch;
    
    if (!weekSelect) return;
    
    weekSelect.innerHTML = '<option value="">Hafta seçiniz...</option>';
    
    try {
        // Son 8 haftayı göster
        const today = new Date();
        const weeks = [];
        
        for (let i = -2; i <= 5; i++) {
            const weekStart = getWeekStart(new Date(today.getTime() + i * 7 * 24 * 60 * 60 * 1000));
            const weekEnd = getWeekEnd(weekStart);
            const weekKey = formatDateLocal(weekStart);
            
            weeks.push({
                key: weekKey,
                label: `${formatDateTR(weekStart)} - ${formatDateTR(weekEnd)}`,
                isCurrent: i === 0
            });
        }
        
        // Firebase'den mevcut shift haftalarını al
        const snapshot = await db.collection('shifts')
            .where('branch', '==', branch)
            .orderBy('weekStart', 'desc')
            .limit(20)
            .get();
        
        const existingWeeks = new Set();
        snapshot.forEach(doc => {
            existingWeeks.add(doc.data().weekStart);
        });
        
        weeks.forEach(week => {
            const hasData = existingWeeks.has(week.key);
            weekSelect.innerHTML += `
                <option value="${week.key}" ${week.isCurrent ? 'selected' : ''}>
                    ${week.label} ${hasData ? '✓' : ''} ${week.isCurrent ? '(Bu Hafta)' : ''}
                </option>
            `;
        });
        
        // Otomatik yükle
        if (weekSelect.value) {
            currentShiftWeek = weekSelect.value;
            await loadShiftPlan();
        }
        
    } catch (error) {
        console.error('Hafta listesi yüklenemedi:', error);
    }
}

// ==================== SHIFT PLANI YÜKLE ====================

async function loadShiftPlan() {
    const container = document.getElementById('shiftContainer');
    const weekSelect = document.getElementById('shiftWeek');
    const branch = currentShiftBranch || 'Tuzla Port';
    const weekStart = weekSelect?.value || currentShiftWeek;
    
    if (!container || !weekStart) {
        if (container) {
            container.innerHTML = `<div class="empty-state"><svg width="64" height="64" fill="none" stroke="var(--tx3)" stroke-width="1.5" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg><p>Hafta seçerek shift planını görüntüleyin</p></div>`;
        }
        return;
    }
    
    currentShiftWeek = weekStart;
    showLoading(container, 'Shift planı yükleniyor...');
    
    try {
        // Personel listesini al
        const personelSnap = await db.collection('personel')
            .where('branch', '==', branch)
            .where('status', '==', 'active')
            .get();
        
        shiftPersonel = [];
        personelSnap.forEach(doc => {
            const data = doc.data();
            shiftPersonel.push({
                id: doc.id,
                name: data.name,
                displayName: getPersonelDisplayName(data),
                position: data.position || 'barista'
            });
        });
        
        // İsme göre sırala
        shiftPersonel.sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'));
        
        // Shift verisini al
        const docId = `${getBranchKey(branch)}_${weekStart}`;
        const shiftDoc = await db.collection('shifts').doc(docId).get();
        
        if (shiftDoc.exists) {
            shiftData = shiftDoc.data();
        } else {
            shiftData = { shifts: {} };
        }
        
        // Tabloyu oluştur
        renderShiftTable();
        
    } catch (error) {
        console.error('Shift planı yüklenemedi:', error);
        container.innerHTML = `<div class="empty-state"><span>❌</span><p>Yüklenirken hata oluştu</p></div>`;
    }
}

// ==================== SHIFT TABLOSU RENDER ====================

function renderShiftTable() {
    const container = document.getElementById('shiftContainer');
    if (!container) return;
    
    // Haftanın günleri
    const weekStart = new Date(currentShiftWeek);
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    const dates = [];
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        dates.push({
            dayName: days[i],
            date: formatDateLocal(date),
            dayNum: date.getDate()
        });
    }
    
    const canEdit = isManager(STATE.currentUser?.role);
    
    let html = `
        <table class="shift-table">
            <thead>
                <tr>
                    <th style="text-align:left">Personel</th>
                    ${dates.map(d => `<th>${d.dayName}<br><small>${d.dayNum}</small></th>`).join('')}
                    <th>Toplam</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    shiftPersonel.forEach(personel => {
        let totalHours = 0;
        const personelKey = normalizePersonelId(personel.name);
        
        html += `
            <tr>
                <td class="name-cell" title="${personel.name}">${personel.displayName}</td>
        `;
        
        dates.forEach((day, dayIndex) => {
            const shiftKey = `${personelKey}_${dayIndex}`;
            const shiftValue = shiftData.shifts?.[shiftKey] || '';
            const shiftInfo = SHIFT_TYPES[shiftValue] || SHIFT_TYPES[''];
            
            totalHours += shiftInfo.hours;
            
            html += `
                <td class="shift-cell ${shiftValue.toLowerCase()}" 
                    data-personel="${personelKey}" 
                    data-day="${dayIndex}"
                    ${canEdit ? `onclick="editShiftCell('${personelKey}', ${dayIndex})"` : ''}
                    style="background:${shiftInfo.color}20;color:${shiftInfo.color}">
                    ${shiftValue || '-'}
                </td>
            `;
        });
        
        html += `
                <td style="font-weight:600">${totalHours}s</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        <div class="shift-legend">
            ${Object.entries(SHIFT_TYPES).filter(([k]) => k).map(([key, val]) => `
                <span class="legend-item">
                    <span class="legend-color" style="background:${val.color}"></span>
                    ${key}: ${val.label}
                </span>
            `).join('')}
        </div>
    `;
    
    container.innerHTML = html;
    
    // Özeti göster
    showShiftSummary();
}

// ==================== SHIFT HÜCRE DÜZENLEME ====================

function editShiftCell(personelKey, dayIndex) {
    if (!isManager(STATE.currentUser?.role)) {
        showToast('Sadece yöneticiler düzenleyebilir', 'warning');
        return;
    }
    
    const shiftKey = `${personelKey}_${dayIndex}`;
    const currentValue = shiftData.shifts?.[shiftKey] || '';
    
    const options = Object.entries(SHIFT_TYPES).map(([key, val]) => `
        <option value="${key}" ${key === currentValue ? 'selected' : ''}>${key || '-'} - ${val.label}</option>
    `).join('');
    
    showModal('Shift Düzenle', `
        <div style="margin-bottom:15px">
            <label style="display:block;margin-bottom:5px">Shift Türü:</label>
            <select id="shiftTypeSelect" style="width:100%;padding:10px;border:1px solid var(--cardBorder);border-radius:8px">
                ${options}
            </select>
        </div>
        <div style="margin-bottom:15px">
            <label style="display:block;margin-bottom:5px">Vardiya:</label>
            <select id="shiftHourSelect" style="width:100%;padding:10px;border:1px solid var(--cardBorder);border-radius:8px">
                <option value="">Belirtilmemiş</option>
                ${Object.entries(SHIFT_HOURS).map(([k, v]) => `<option value="${k}">${k} - ${v.label} (${v.start}-${v.end})</option>`).join('')}
            </select>
        </div>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="saveShiftCell('${personelKey}', ${dayIndex})">Kaydet</button>
    `);
}

async function saveShiftCell(personelKey, dayIndex) {
    const shiftType = document.getElementById('shiftTypeSelect')?.value || '';
    const shiftHour = document.getElementById('shiftHourSelect')?.value || '';
    
    const shiftKey = `${personelKey}_${dayIndex}`;
    
    if (!shiftData.shifts) shiftData.shifts = {};
    shiftData.shifts[shiftKey] = shiftType;
    
    if (shiftHour) {
        if (!shiftData.hours) shiftData.hours = {};
        shiftData.hours[shiftKey] = shiftHour;
    }
    
    closeModal();
    
    // Firebase'e kaydet
    try {
        const branch = currentShiftBranch || 'Tuzla Port';
        const docId = `${getBranchKey(branch)}_${currentShiftWeek}`;
        
        await db.collection('shifts').doc(docId).set({
            branch: branch,
            weekStart: currentShiftWeek,
            shifts: shiftData.shifts,
            hours: shiftData.hours || {},
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: STATE.currentUser?.email || 'unknown'
        }, { merge: true });
        
        showToast('Kaydedildi', 'success');
        renderShiftTable();
        
    } catch (error) {
        console.error('Kayıt hatası:', error);
        showToast('Kayıt başarısız', 'error');
    }
}

// ==================== ÖZET ====================

function showShiftSummary() {
    const summaryDiv = document.getElementById('shiftSummary');
    const contentDiv = document.getElementById('shiftSummaryContent');
    if (!summaryDiv || !contentDiv) return;
    
    summaryDiv.style.display = 'block';
    
    // İstatistikleri hesapla
    let totalShifts = 0;
    let totalHours = 0;
    let offDays = 0;
    
    Object.values(shiftData.shifts || {}).forEach(shift => {
        if (shift && shift !== 'OFF' && shift !== 'IZIN' && shift !== 'RAPOR') {
            totalShifts++;
            totalHours += SHIFT_TYPES[shift]?.hours || 0;
        } else if (shift) {
            offDays++;
        }
    });
    
    contentDiv.innerHTML = `
        <div class="summary-item">
            <div class="summary-value">${shiftPersonel.length}</div>
            <div class="summary-label">Personel</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${totalShifts}</div>
            <div class="summary-label">Çalışma Günü</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${totalHours}</div>
            <div class="summary-label">Toplam Saat</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${offDays}</div>
            <div class="summary-label">İzin Günü</div>
        </div>
    `;
}

// ==================== YENİ SHIFT OLUŞTUR ====================

function createNewShift() {
    showModal('Yeni Shift Oluştur', `
        <p>Seçili hafta için boş shift planı oluşturulacak.</p>
        <p><strong>Hafta:</strong> ${currentShiftWeek}</p>
        <p><strong>Şube:</strong> ${currentShiftBranch}</p>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="confirmCreateShift()">Oluştur</button>
    `);
}

async function confirmCreateShift() {
    closeModal();
    
    try {
        const branch = currentShiftBranch || 'Tuzla Port';
        const docId = `${getBranchKey(branch)}_${currentShiftWeek}`;
        
        await db.collection('shifts').doc(docId).set({
            branch: branch,
            weekStart: currentShiftWeek,
            shifts: {},
            hours: {},
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: STATE.currentUser?.email || 'unknown'
        });
        
        showToast('Shift planı oluşturuldu', 'success');
        await loadShiftPlan();
        
    } catch (error) {
        console.error('Oluşturma hatası:', error);
        showToast('Oluşturulamadı', 'error');
    }
}

// ==================== PDF İNDİR ====================

async function downloadShiftPDF() {
    if (typeof pdfMake === 'undefined') {
        showToast('PDF kütüphanesi yüklenemedi', 'error');
        return;
    }
    
    const weekStart = new Date(currentShiftWeek);
    const days = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
    
    // Tablo başlıkları
    const headers = ['Personel', ...days, 'Toplam'];
    
    // Tablo satırları
    const rows = shiftPersonel.map(personel => {
        const personelKey = normalizePersonelId(personel.name);
        let totalHours = 0;
        
        const cells = [personel.displayName];
        
        for (let i = 0; i < 7; i++) {
            const shiftKey = `${personelKey}_${i}`;
            const shiftValue = shiftData.shifts?.[shiftKey] || '-';
            const shiftInfo = SHIFT_TYPES[shiftValue] || SHIFT_TYPES[''];
            totalHours += shiftInfo.hours;
            cells.push(shiftValue);
        }
        
        cells.push(`${totalHours}s`);
        return cells;
    });
    
    const docDefinition = {
        pageSize: 'A4',
        pageOrientation: 'landscape',
        content: [
            { text: 'MOONBERRY COFFEE - SHIFT PLANI', style: 'header' },
            { text: `Şube: ${currentShiftBranch} | Hafta: ${formatDateTR(weekStart)}`, style: 'subheader' },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto'],
                    body: [headers, ...rows]
                }
            }
        ],
        styles: {
            header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
            subheader: { fontSize: 12, margin: [0, 0, 0, 15] }
        }
    };
    
    pdfMake.createPdf(docDefinition).download(`shift-${currentShiftBranch}-${currentShiftWeek}.pdf`);
    showToast('PDF indiriliyor...', 'success');
}

// ==================== EXPORT ====================

window.initShiftPage = initShiftPage;
window.loadShiftWeeks = loadShiftWeeks;
window.loadShiftPlan = loadShiftPlan;
window.editShiftCell = editShiftCell;
window.saveShiftCell = saveShiftCell;
window.createNewShift = createNewShift;
window.confirmCreateShift = confirmCreateShift;
window.downloadShiftPDF = downloadShiftPDF;

console.log('✓ shift.js yüklendi');
