/**
 * MOONBERRY İK - PUANTAJ.JS
 * Puantaj ve performans sistemi
 * @version 20
 */

// ==================== PUANTAJ YÜKLEME ====================

async function loadPuantaj() {
    const subeSelect = document.getElementById('puantajSube');
    const aySelect = document.getElementById('puantajAy');
    const yilSelect = document.getElementById('puantajYil');
    const container = document.getElementById('puantajContainer');
    
    if (!container) return;
    
    const sube = subeSelect?.value;
    const ay = aySelect?.value;
    const yil = yilSelect?.value;
    
    if (!sube || !ay || !yil) {
        container.innerHTML = '<p style="text-align:center;color:var(--tx2);padding:40px">Şube, ay ve yıl seçin</p>';
        return;
    }
    
    container.innerHTML = '<p style="text-align:center;color:var(--tx2);padding:40px">⏳ Yükleniyor...</p>';
    
    const period = `${yil}-${ay}`;
    
    try {
        // Şubedeki personeli al
        const personelSnapshot = await db.collection('personel')
            .where('branch', '==', sube)
            .where('status', '==', 'active')
            .get();
        
        const personelList = [];
        personelSnapshot.forEach(doc => {
            personelList.push({ id: doc.id, ...doc.data() });
        });
        
        if (personelList.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:var(--tx2);padding:40px">Bu şubede aktif personel yok</p>';
            return;
        }
        
        // Puantaj verilerini al
        const puantajSnapshot = await db.collection('puantaj')
            .where('branch', '==', sube)
            .where('period', '==', period)
            .get();
        
        const puantajData = {};
        puantajSnapshot.forEach(doc => {
            const d = doc.data();
            puantajData[d.personelId] = { id: doc.id, ...d };
        });
        
        // Puantaj notlarını al
        const notesSnapshot = await db.collection('puantajNotes')
            .where('branch', '==', sube)
            .where('period', '==', period)
            .get();
        
        const notesData = {};
        notesSnapshot.forEach(doc => {
            const d = doc.data();
            if (!notesData[d.personelId]) notesData[d.personelId] = [];
            notesData[d.personelId].push({ id: doc.id, ...d });
        });
        
        // Tabloyu render et
        renderPuantajTable(personelList, puantajData, notesData, sube, period);
        
    } catch (e) {
        console.error('Puantaj yükleme hatası:', e);
        container.innerHTML = '<p style="text-align:center;color:#e74c3c;padding:40px">Yükleme hatası</p>';
    }
}

function renderPuantajTable(personelList, puantajData, notesData, sube, period) {
    const container = document.getElementById('puantajContainer');
    if (!container) return;
    
    let html = `
        <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:.85rem">
                <thead>
                    <tr style="background:var(--bg3)">
                        <th style="padding:12px;text-align:left;border:1px solid var(--cardBorder)">Personel</th>
                        <th style="padding:12px;text-align:center;border:1px solid var(--cardBorder)">Puan</th>
                        <th style="padding:12px;text-align:center;border:1px solid var(--cardBorder)">Notlar</th>
                        <th style="padding:12px;text-align:center;border:1px solid var(--cardBorder)">İşlem</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    personelList.forEach(p => {
        const personelId = normalizePersonelId(p.name);
        const puantaj = puantajData[personelId] || { score: 3 };
        const notes = notesData[personelId] || [];
        const displayName = getPersonelDisplayName(p);
        
        // Puan hesaplama
        let totalPoints = 0;
        notes.forEach(n => {
            totalPoints += n.points || 0;
        });
        
        const scoreColor = totalPoints > 0 ? '#27ae60' : totalPoints < 0 ? '#e74c3c' : 'var(--tx)';
        
        html += `
            <tr>
                <td style="padding:12px;border:1px solid var(--cardBorder)">
                    <div style="font-weight:600">${displayName}</div>
                    <div style="font-size:.8rem;color:var(--tx2)">${p.name}</div>
                </td>
                <td style="padding:12px;text-align:center;border:1px solid var(--cardBorder)">
                    <span style="font-size:1.2rem;font-weight:700;color:${scoreColor}">${totalPoints > 0 ? '+' : ''}${totalPoints}</span>
                </td>
                <td style="padding:12px;border:1px solid var(--cardBorder)">
                    ${notes.length > 0 ? `
                        <div style="display:flex;flex-wrap:wrap;gap:4px">
                            ${notes.slice(0, 3).map(n => `
                                <span style="background:${n.points > 0 ? 'rgba(39,174,96,.1)' : 'rgba(231,76,60,.1)'};color:${n.points > 0 ? '#27ae60' : '#e74c3c'};padding:2px 6px;border-radius:4px;font-size:.7rem">
                                    ${n.type || 'Not'}
                                </span>
                            `).join('')}
                            ${notes.length > 3 ? `<span style="color:var(--tx2);font-size:.75rem">+${notes.length - 3}</span>` : ''}
                        </div>
                    ` : '<span style="color:var(--tx3);font-size:.8rem">-</span>'}
                </td>
                <td style="padding:12px;text-align:center;border:1px solid var(--cardBorder)">
                    <button onclick="addPuantajNote('${personelId}', '${p.name}', '${sube}', '${period}')" class="btn btn-ghost" style="padding:6px 10px;font-size:.75rem">+ Not</button>
                    <button onclick="viewPuantajDetails('${personelId}', '${p.name}', '${sube}', '${period}')" class="btn btn-ghost" style="padding:6px 10px;font-size:.75rem">Detay</button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    
    // Özet
    let totalPositive = 0, totalNegative = 0;
    Object.values(notesData).forEach(notes => {
        notes.forEach(n => {
            if (n.points > 0) totalPositive += n.points;
            else if (n.points < 0) totalNegative += n.points;
        });
    });
    
    html += `
        <div style="margin-top:20px;display:flex;gap:20px;flex-wrap:wrap">
            <div style="background:rgba(39,174,96,.1);border-radius:8px;padding:16px;flex:1;min-width:150px">
                <div style="font-size:.8rem;color:#27ae60;margin-bottom:4px">Toplam Pozitif</div>
                <div style="font-size:1.5rem;font-weight:700;color:#27ae60">+${totalPositive}</div>
            </div>
            <div style="background:rgba(231,76,60,.1);border-radius:8px;padding:16px;flex:1;min-width:150px">
                <div style="font-size:.8rem;color:#e74c3c;margin-bottom:4px">Toplam Negatif</div>
                <div style="font-size:1.5rem;font-weight:700;color:#e74c3c">${totalNegative}</div>
            </div>
            <div style="background:var(--bg3);border-radius:8px;padding:16px;flex:1;min-width:150px">
                <div style="font-size:.8rem;color:var(--tx2);margin-bottom:4px">Net Puan</div>
                <div style="font-size:1.5rem;font-weight:700;color:var(--tx)">${totalPositive + totalNegative}</div>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
}

// ==================== PUANTAJ NOT EKLE ====================

function addPuantajNote(personelId, personelName, branch, period) {
    const content = `
        <div style="display:grid;gap:16px">
            <div>
                <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Personel</label>
                <input type="text" class="form-input" style="width:100%" value="${personelName}" disabled>
            </div>
            <div>
                <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Not Türü</label>
                <select id="noteType" class="form-input" style="width:100%">
                    <option value="basari">✓ Başarı (+puan)</option>
                    <option value="ihlal">✕ İhlal (-puan)</option>
                    <option value="check">📋 Check Notu</option>
                    <option value="other">📝 Diğer</option>
                </select>
            </div>
            <div>
                <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Puan</label>
                <input type="number" id="notePoints" class="form-input" style="width:100%" value="0">
            </div>
            <div>
                <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Açıklama</label>
                <textarea id="noteDescription" class="form-input" style="width:100%;min-height:80px" placeholder="Not detayı..."></textarea>
            </div>
        </div>
    `;
    
    const buttons = `
        <button onclick="closeModal()" class="btn btn-ghost">İptal</button>
        <button onclick="savePuantajNote('${personelId}', '${personelName}', '${branch}', '${period}')" class="btn btn-primary">Kaydet</button>
    `;
    
    showModal('Puantaj Notu Ekle', content, buttons);
}

async function savePuantajNote(personelId, personelName, branch, period) {
    const type = document.getElementById('noteType')?.value;
    const points = parseInt(document.getElementById('notePoints')?.value) || 0;
    const description = document.getElementById('noteDescription')?.value?.trim();
    
    if (!description) {
        toast('Açıklama girin', 'error');
        return;
    }
    
    try {
        await db.collection('puantajNotes').add({
            personelId,
            personelName,
            branch,
            period,
            type,
            points,
            description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentUser?.id || 'unknown'
        });
        
        toast('Not eklendi', 'success');
        closeModal();
        loadPuantaj();
        
    } catch (e) {
        toast('Kayıt hatası', 'error');
    }
}

// ==================== PUANTAJ DETAY ====================

async function viewPuantajDetails(personelId, personelName, branch, period) {
    try {
        const snapshot = await db.collection('puantajNotes')
            .where('personelId', '==', personelId)
            .where('period', '==', period)
            .orderBy('createdAt', 'desc')
            .get();
        
        const notes = [];
        snapshot.forEach(doc => notes.push({ id: doc.id, ...doc.data() }));
        
        let totalPoints = 0;
        notes.forEach(n => totalPoints += n.points || 0);
        
        const typeNames = {
            basari: 'Başarı',
            ihlal: 'İhlal',
            check: 'Check',
            other: 'Diğer'
        };
        
        const content = `
            <div style="margin-bottom:20px;padding:16px;background:var(--bg3);border-radius:8px;text-align:center">
                <div style="font-size:.85rem;color:var(--tx2)">Toplam Puan</div>
                <div style="font-size:2rem;font-weight:700;color:${totalPoints > 0 ? '#27ae60' : totalPoints < 0 ? '#e74c3c' : 'var(--tx)'}">
                    ${totalPoints > 0 ? '+' : ''}${totalPoints}
                </div>
            </div>
            
            ${notes.length === 0 ? '<p style="text-align:center;color:var(--tx2)">Henüz not yok</p>' : `
                <div style="display:grid;gap:12px;max-height:400px;overflow-y:auto">
                    ${notes.map(n => `
                        <div style="background:var(--bg3);border-radius:8px;padding:16px">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
                                <span style="background:${n.points > 0 ? 'rgba(39,174,96,.1)' : n.points < 0 ? 'rgba(231,76,60,.1)' : 'var(--bg2)'};color:${n.points > 0 ? '#27ae60' : n.points < 0 ? '#e74c3c' : 'var(--tx2)'};padding:4px 8px;border-radius:6px;font-size:.75rem">
                                    ${typeNames[n.type] || n.type}
                                </span>
                                <span style="font-weight:600;color:${n.points > 0 ? '#27ae60' : n.points < 0 ? '#e74c3c' : 'var(--tx)'}">
                                    ${n.points > 0 ? '+' : ''}${n.points}
                                </span>
                            </div>
                            <p style="color:var(--tx);font-size:.9rem;margin-bottom:8px">${n.description || '-'}</p>
                            <div style="font-size:.75rem;color:var(--tx3)">
                                ${n.createdAt?.toDate?.()?.toLocaleString('tr-TR') || '-'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        `;
        
        showModal(`${personelName} - Puantaj Detayı`, content, '<button onclick="closeModal()" class="btn btn-ghost">Kapat</button>');
        
    } catch (e) {
        toast('Yükleme hatası', 'error');
    }
}

// ==================== OTOMATİK PUANTAJ NOTU ====================

async function createAutoPuantajNote(personelId, personelName, checkType, timeSlot, status, points, branch, date) {
    if (!personelId || points === 0) return;
    
    const period = date.substring(0, 7); // YYYY-MM
    const typeNames = {
        platform: 'Platform Check',
        gunluk: 'Günlük Check',
        temizlik: 'Temizlik',
        acilis: 'Açılış',
        kapanis: 'Kapanış'
    };
    
    const statusNames = {
        onTime: 'Vaktinde',
        late: 'Geç',
        missed: 'Yapılmadı'
    };
    
    try {
        await db.collection('puantajNotes').add({
            personelId,
            personelName,
            branch,
            period,
            type: 'check',
            points,
            description: `${typeNames[checkType] || checkType} - ${timeSlot} - ${statusNames[status] || status}`,
            checkType,
            timeSlot,
            status,
            date,
            isAutomatic: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`[Auto Puantaj] ${personelName}: ${points} puan (${checkType})`);
        
    } catch (e) {
        console.warn('Otomatik puantaj hatası:', e);
    }
}

console.log('✓ puantaj.js yüklendi');
