/**
 * MOONBERRY İK - PUANTAJ MODULE
 * Puan hesaplama ve görüntüleme
 * @version 2.0
 */

// ==================== STATE ====================

let puantajData = [];
let puantajNotes = {};

// ==================== PUANTAJ INIT ====================

async function initPuantajPage() {
    console.log('[Puantaj] Sayfa başlatılıyor...');
    
    // Şube dropdown
    fillBranchSelect('puantajSube');
    
    // Ay ve yıl
    const now = new Date();
    const aySelect = document.getElementById('puantajAy');
    const yilSelect = document.getElementById('puantajYil');
    
    if (aySelect) aySelect.value = now.getMonth() + 1;
    if (yilSelect) yilSelect.value = now.getFullYear();
    
    // Puantaj yükle
    await loadPuantaj();
    
    console.log('[Puantaj] Sayfa hazır');
}

// ==================== PUANTAJ YÜKLE ====================

async function loadPuantaj() {
    const container = document.getElementById('puantajContainer');
    if (!container) return;
    
    const branch = document.getElementById('puantajSube')?.value || 'Tuzla Port';
    const ay = parseInt(document.getElementById('puantajAy')?.value) || (new Date().getMonth() + 1);
    const yil = parseInt(document.getElementById('puantajYil')?.value) || new Date().getFullYear();
    
    showLoading(container, 'Puantaj yükleniyor...');
    
    try {
        // Personel listesi
        const personelSnap = await db.collection('personel')
            .where('branch', '==', branch)
            .where('status', '==', 'active')
            .get();
        
        const personelList = [];
        personelSnap.forEach(doc => {
            personelList.push({ id: doc.id, ...doc.data() });
        });
        
        // Ayın tarih aralığı
        const monthStart = `${yil}-${String(ay).padStart(2, '0')}-01`;
        const monthEnd = `${yil}-${String(ay).padStart(2, '0')}-${getDaysInMonth(yil, ay - 1)}`;
        
        // Checklist verilerini al
        const checksSnap = await db.collection('checklistSubmissions')
            .where('branch', '==', branch)
            .where('date', '>=', monthStart)
            .where('date', '<=', monthEnd)
            .get();
        
        // Kişi bazında puan hesapla
        const puanMap = {};
        
        checksSnap.forEach(doc => {
            const data = doc.data();
            const submitter = normalizePersonelId(data.submittedByName || data.submittedBy);
            
            if (!puanMap[submitter]) {
                puanMap[submitter] = { platform: 0, temizlik: 0, shift: 0, total: 0 };
            }
            
            // Check türüne göre puan
            const type = data.type || '';
            const itemCount = Object.values(data.items || {}).filter(v => v === true || v === 'acik').length;
            
            if (type.includes('platform')) {
                puanMap[submitter].platform += itemCount;
            } else if (type.includes('temizlik')) {
                puanMap[submitter].temizlik += Math.min(itemCount, 8);
            } else {
                puanMap[submitter].shift += Math.min(itemCount, 10);
            }
        });
        
        // Toplam hesapla
        Object.values(puanMap).forEach(p => {
            p.total = p.platform + p.temizlik + p.shift;
        });
        
        // Puantaj notlarını al
        try {
            const notesDoc = await db.collection('puantajNotes').doc(`${getBranchKey(branch)}_${yil}_${ay}`).get();
            if (notesDoc.exists) {
                puantajNotes = notesDoc.data().notes || {};
            } else {
                puantajNotes = {};
            }
        } catch (e) {}
        
        // Tablo oluştur
        puantajData = personelList.map(p => {
            const key = normalizePersonelId(p.name);
            const puan = puanMap[key] || { platform: 0, temizlik: 0, shift: 0, total: 0 };
            return {
                ...p,
                displayName: getPersonelDisplayName(p),
                puan: puan,
                note: puantajNotes[key] || ''
            };
        });
        
        // Puana göre sırala (yüksekten düşüğe)
        puantajData.sort((a, b) => b.puan.total - a.puan.total);
        
        renderPuantajTable();
        renderPuantajSummary();
        
    } catch (error) {
        console.error('Puantaj yüklenemedi:', error);
        container.innerHTML = `<div class="empty-state"><span>❌</span><p>Yüklenirken hata oluştu</p></div>`;
    }
}

// ==================== PUANTAJ TABLOSU ====================

function renderPuantajTable() {
    const container = document.getElementById('puantajContainer');
    if (!container) return;
    
    if (puantajData.length === 0) {
        container.innerHTML = `<div class="empty-state"><span>📭</span><p>Personel bulunamadı</p></div>`;
        return;
    }
    
    let html = `
        <table class="puantaj-table">
            <thead>
                <tr>
                    <th style="width:50px">#</th>
                    <th>Personel</th>
                    <th>Platform</th>
                    <th>Temizlik</th>
                    <th>Shift</th>
                    <th>Toplam</th>
                    <th>Not</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    puantajData.forEach((personel, index) => {
        const puanClass = personel.puan.total > 0 ? 'pos' : personel.puan.total < 0 ? 'neg' : 'neu';
        const key = normalizePersonelId(personel.name);
        
        html += `
            <tr>
                <td style="text-align:center;font-weight:600">${index + 1}</td>
                <td>
                    <div class="personel-row">
                        <div class="avatar">${personel.displayName.charAt(0)}</div>
                        <div class="p-info">
                            <div class="p-name">${personel.displayName}</div>
                            <div class="p-pos">${getRoleName(personel.position || personel.role)}</div>
                        </div>
                    </div>
                </td>
                <td style="text-align:center"><span class="puan ${personel.puan.platform > 0 ? 'pos' : 'neu'}">${personel.puan.platform}</span></td>
                <td style="text-align:center"><span class="puan ${personel.puan.temizlik > 0 ? 'pos' : 'neu'}">${personel.puan.temizlik}</span></td>
                <td style="text-align:center"><span class="puan ${personel.puan.shift > 0 ? 'pos' : 'neu'}">${personel.puan.shift}</span></td>
                <td style="text-align:center"><span class="puan ${puanClass}">${personel.puan.total}</span></td>
                <td>
                    <button class="note-btn" onclick="editPuantajNote('${key}', '${personel.displayName}')">
                        ${personel.note ? '📝' : '➕'} Not
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

// ==================== PUANTAJ ÖZETİ ====================

function renderPuantajSummary() {
    const summary = document.getElementById('puantajSummary');
    const content = document.getElementById('puantajSummaryContent');
    if (!summary || !content) return;
    
    summary.style.display = 'block';
    
    // Top 3
    const top3 = puantajData.slice(0, 3);
    
    content.innerHTML = `
        <div class="top-performers">
            ${top3.map((p, i) => `
                <div class="performer-card">
                    <div class="performer-rank rank-${i + 1}">${i + 1}</div>
                    <div class="performer-info">
                        <div class="performer-name">${p.displayName}</div>
                        <div class="performer-puan">${p.puan.total} puan</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// ==================== NOT DÜZENLEME ====================

function editPuantajNote(key, name) {
    const currentNote = puantajNotes[key] || '';
    
    showModal(`Not: ${name}`, `
        <textarea id="puantajNoteText" rows="4" style="width:100%;padding:10px;border:1px solid var(--cardBorder);border-radius:8px;resize:vertical">${currentNote}</textarea>
    `, `
        <button class="btn btn-secondary" onclick="closeModal()">İptal</button>
        <button class="btn btn-primary" onclick="savePuantajNote('${key}')">Kaydet</button>
    `);
}

async function savePuantajNote(key) {
    const note = document.getElementById('puantajNoteText')?.value || '';
    puantajNotes[key] = note;
    
    const branch = document.getElementById('puantajSube')?.value || 'Tuzla Port';
    const ay = parseInt(document.getElementById('puantajAy')?.value) || (new Date().getMonth() + 1);
    const yil = parseInt(document.getElementById('puantajYil')?.value) || new Date().getFullYear();
    
    try {
        await db.collection('puantajNotes').doc(`${getBranchKey(branch)}_${yil}_${ay}`).set({
            branch: branch,
            year: yil,
            month: ay,
            notes: puantajNotes,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        
        closeModal();
        showToast('Not kaydedildi', 'success');
        
        // Tabloyu güncelle
        const personel = puantajData.find(p => normalizePersonelId(p.name) === key);
        if (personel) personel.note = note;
        renderPuantajTable();
        
    } catch (error) {
        console.error('Not kaydedilemedi:', error);
        showToast('Kayıt başarısız', 'error');
    }
}

// ==================== PDF EXPORT ====================

async function exportPuantajPDF() {
    if (typeof pdfMake === 'undefined') {
        showToast('PDF kütüphanesi yüklenemedi', 'error');
        return;
    }
    
    const branch = document.getElementById('puantajSube')?.value || 'Tuzla Port';
    const ay = document.getElementById('puantajAy')?.selectedOptions[0]?.text || '';
    const yil = document.getElementById('puantajYil')?.value || '';
    
    const headers = ['#', 'Personel', 'Platform', 'Temizlik', 'Shift', 'Toplam'];
    const rows = puantajData.map((p, i) => [
        i + 1,
        p.displayName,
        p.puan.platform,
        p.puan.temizlik,
        p.puan.shift,
        p.puan.total
    ]);
    
    const docDefinition = {
        pageSize: 'A4',
        content: [
            { text: 'MOONBERRY COFFEE - PUANTAJ', style: 'header' },
            { text: `Şube: ${branch} | Dönem: ${ay} ${yil}`, style: 'subheader' },
            {
                table: {
                    headerRows: 1,
                    widths: [30, '*', 50, 50, 50, 50],
                    body: [headers, ...rows]
                }
            }
        ],
        styles: {
            header: { fontSize: 16, bold: true, margin: [0, 0, 0, 10] },
            subheader: { fontSize: 12, margin: [0, 0, 0, 15] }
        }
    };
    
    pdfMake.createPdf(docDefinition).download(`puantaj-${branch}-${ay}-${yil}.pdf`);
    showToast('PDF indiriliyor...', 'success');
}

// ==================== EXPORT ====================

window.initPuantajPage = initPuantajPage;
window.loadPuantaj = loadPuantaj;
window.editPuantajNote = editPuantajNote;
window.savePuantajNote = savePuantajNote;
window.exportPuantajPDF = exportPuantajPDF;

console.log('✓ puantaj.js yüklendi');
