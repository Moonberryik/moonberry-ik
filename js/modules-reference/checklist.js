/**
 * MOONBERRY İK - CHECKLIST.JS
 * Checklist sistemi
 * @version 20
 */

// ==================== CHECKLIST DEĞİŞKENLER ====================
let checklistStartTime = null;
let selectedChecklistBranch = null;
let personnelMapping = [];

// ==================== CHECKLIST YÜKLEME ====================

async function loadChecklist() {
    const tabContainer = document.getElementById('checklistTabs');
    const contentContainer = document.getElementById('checklistContent');
    
    if (!tabContainer || !contentContainer) return;
    
    // Şube seçimi
    const isAdmin = ['yonetici', 'bolge_muduru'].includes(currentUser?.role);
    const branches = isAdmin ? (STATE.branches || ['Tuzla Port', 'Şişli (Merkez)']) : [currentUser?.branch || 'Tuzla Port'];
    selectedChecklistBranch = selectedChecklistBranch || branches[0];
    
    // Tab'ları oluştur
    tabContainer.innerHTML = `
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px">
            ${branches.map(b => `
                <button class="btn ${b === selectedChecklistBranch ? 'btn-primary' : 'btn-ghost'}" 
                        onclick="selectChecklistBranch('${b}')">${b}</button>
            `).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="btn btn-ghost" data-tab="gunluk" onclick="loadChecklistTab('gunluk')">📋 Günlük</button>
            <button class="btn btn-ghost" data-tab="temizlik" onclick="loadChecklistTab('temizlik')">🧹 Temizlik</button>
            <button class="btn btn-ghost" data-tab="platform" onclick="loadChecklistTab('platform')">📱 Platform</button>
            <button class="btn btn-ghost" data-tab="history" onclick="loadChecklistTab('history')">📊 Geçmiş</button>
        </div>
    `;
    
    // Varsayılan tab
    loadChecklistTab('gunluk');
}

function selectChecklistBranch(branch) {
    selectedChecklistBranch = branch;
    loadChecklist();
}

async function loadChecklistTab(tab) {
    const contentContainer = document.getElementById('checklistContent');
    if (!contentContainer) return;
    
    // Tab butonlarını güncelle
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-ghost');
    });
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('btn-primary');
    document.querySelector(`[data-tab="${tab}"]`)?.classList.remove('btn-ghost');
    
    contentContainer.innerHTML = '<div style="text-align:center;padding:40px;color:var(--tx2)">⏳ Yükleniyor...</div>';
    
    switch (tab) {
        case 'gunluk':
            await renderDailyChecklist();
            break;
        case 'temizlik':
            await renderCleaningChecklist();
            break;
        case 'platform':
            await renderPlatformChecklist();
            break;
        case 'history':
            await renderChecklistHistory();
            break;
    }
}

// ==================== GÜNLÜK CHECKLIST ====================

async function renderDailyChecklist() {
    const container = document.getElementById('checklistContent');
    if (!container) return;
    
    const branch = selectedChecklistBranch;
    const today = formatDateLocal(new Date());
    const branchKey = branch.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Bugünkü submission var mı?
    let isCompleted = false;
    let submissionData = null;
    
    try {
        const doc = await db.collection('checklistSubmissions').doc(`${branchKey}_gunluk_${today}`).get();
        if (doc.exists) {
            isCompleted = true;
            submissionData = doc.data();
        }
    } catch (e) {}
    
    if (isCompleted) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px">
                <div style="width:80px;height:80px;background:linear-gradient(135deg,rgba(39,174,96,.2),rgba(39,174,96,.1));border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
                    <svg width="40" height="40" fill="none" stroke="#27ae60" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style="color:var(--tx);margin-bottom:8px">Bugünkü Checklist Tamamlandı</h3>
                <p style="color:var(--tx2)">Dolduran: ${submissionData?.personName || '-'}</p>
                <p style="color:var(--tx2);font-size:.85rem">${new Date(submissionData?.submittedAt?.toDate?.() || Date.now()).toLocaleString('tr-TR')}</p>
            </div>
        `;
        return;
    }
    
    // Checklist maddelerini yükle
    const items = await getChecklistItems(branch, 'gunluk');
    
    container.innerHTML = `
        <div style="background:var(--cardBg);border:1px solid var(--cardBorder);border-radius:12px;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                <h3 style="font-size:1.1rem;font-weight:600;color:var(--tx)">📋 Günlük Checklist</h3>
                <span style="color:var(--tx2);font-size:.85rem">${branch} • ${formatDateTR(new Date())}</span>
            </div>
            
            <div style="margin-bottom:20px">
                <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Dolduran Personel</label>
                <input type="text" id="checklistPersonName" class="form-input" style="width:100%" value="${currentUser?.name || ''}" placeholder="Adınızı girin">
            </div>
            
            <div id="checklistItems" style="display:grid;gap:12px;margin-bottom:20px">
                ${items.map((item, i) => `
                    <div class="checklist-item" style="background:var(--bg3);border-radius:8px;padding:16px;border:1px solid var(--cardBorder)">
                        <div style="font-weight:600;color:var(--tx);margin-bottom:8px">${i + 1}. ${item.title}</div>
                        ${item.description ? `<div style="font-size:.85rem;color:var(--tx2);margin-bottom:12px">${item.description}</div>` : ''}
                        <div style="display:flex;gap:12px">
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                                <input type="radio" name="check_${i}" value="done">
                                <span style="color:#27ae60">✓ Yapıldı</span>
                            </label>
                            <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                                <input type="radio" name="check_${i}" value="notdone">
                                <span style="color:#e74c3c">✕ Yapılmadı</span>
                            </label>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <button onclick="submitDailyChecklist('${branch}', '${today}')" class="btn btn-primary" style="width:100%">
                ✓ Checklist'i Tamamla
            </button>
        </div>
    `;
    
    checklistStartTime = new Date();
}

async function getChecklistItems(branch, type) {
    // Firebase'den veya varsayılan listeden al
    try {
        const doc = await db.collection('config').doc('checklistTypes').get();
        if (doc.exists) {
            const data = doc.data();
            if (data[branch] && Array.isArray(data[branch])) {
                const typeData = data[branch].find(t => t.id === type);
                if (typeData?.items) return typeData.items;
            }
        }
    } catch (e) {}
    
    // Varsayılan günlük checklist
    return [
        { title: 'Mağaza temizliği kontrol edildi', description: 'Zemin, masalar, tezgah' },
        { title: 'Kasa sayımı yapıldı', description: 'Açılış/kapanış sayımı' },
        { title: 'Ürün son kullanma tarihleri kontrol edildi', description: 'SKT kontrolü' },
        { title: 'Ekipman çalışıyor', description: 'Espresso makinesi, buzdolabı, vs.' },
        { title: 'Platform siparişleri kontrol edildi', description: 'Trendyol, Yemeksepeti, Getir' }
    ];
}

async function submitDailyChecklist(branch, date) {
    const personName = document.getElementById('checklistPersonName')?.value?.trim();
    if (!personName) {
        toast('Lütfen adınızı girin', 'error');
        return;
    }
    
    const items = document.querySelectorAll('#checklistItems .checklist-item');
    const responses = [];
    let allAnswered = true;
    let doneCount = 0;
    
    items.forEach((item, i) => {
        const done = item.querySelector(`input[name="check_${i}"][value="done"]`);
        const notdone = item.querySelector(`input[name="check_${i}"][value="notdone"]`);
        
        if (!done?.checked && !notdone?.checked) {
            allAnswered = false;
            item.style.borderColor = '#e74c3c';
        } else {
            item.style.borderColor = 'var(--cardBorder)';
            if (done?.checked) doneCount++;
            responses.push({ index: i, done: done?.checked || false });
        }
    });
    
    if (!allAnswered) {
        toast('Tüm maddeleri işaretleyin', 'error');
        return;
    }
    
    try {
        const branchKey = branch.replace(/[^a-zA-Z0-9]/g, '_');
        const submissionId = `${branchKey}_gunluk_${date}`;
        
        await db.collection('checklistSubmissions').doc(submissionId).set({
            branch,
            type: 'gunluk',
            date,
            personName,
            submittedBy: currentUser?.id,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            items: responses,
            completionRate: Math.round((doneCount / items.length) * 100),
            startTime: checklistStartTime?.toISOString(),
            endTime: new Date().toISOString()
        });
        
        toast('Checklist tamamlandı!', 'success');
        loadChecklistTab('gunluk');
        
    } catch (e) {
        console.error('Checklist kayıt hatası:', e);
        toast('Kayıt hatası', 'error');
    }
}

// ==================== TEMİZLİK CHECKLIST ====================

async function renderCleaningChecklist() {
    const container = document.getElementById('checklistContent');
    if (!container) return;
    
    const branch = selectedChecklistBranch;
    const today = formatDateLocal(new Date());
    const branchKey = branch.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Vardiya belirleme
    const hour = new Date().getHours();
    let shift = 'acilisci';
    if (hour >= 11 && hour < 16) shift = 'araci';
    if (hour >= 16 || hour < 2) shift = 'kapanisci';
    
    const shiftNames = { acilisci: 'Açılışçı', araci: 'Aracı', kapanisci: 'Kapanışçı' };
    
    // Bu vardiya için submission var mı?
    let isCompleted = false;
    let submissionData = null;
    
    try {
        const doc = await db.collection('checklistSubmissions').doc(`${branchKey}_temizlik_${today}_${shift}`).get();
        if (doc.exists) {
            isCompleted = true;
            submissionData = doc.data();
        }
    } catch (e) {}
    
    if (isCompleted) {
        container.innerHTML = `
            <div style="text-align:center;padding:40px">
                <div style="width:80px;height:80px;background:linear-gradient(135deg,rgba(241,196,15,.2),rgba(241,196,15,.1));border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
                    <svg width="40" height="40" fill="none" stroke="#f1c40f" stroke-width="2" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 style="color:var(--tx);margin-bottom:8px">${shiftNames[shift]} Temizlik Tamamlandı</h3>
                <p style="color:var(--tx2)">Dolduran: ${submissionData?.personName || '-'}</p>
            </div>
        `;
        return;
    }
    
    // Temizlik maddeleri
    const items = [
        'Zemin silindi',
        'Masalar temizlendi',
        'Tezgah dezenfekte edildi',
        'Çöpler boşaltıldı',
        'Buzdolabı kontrol edildi',
        'Espresso makinesi temizlendi',
        'WC kontrol edildi'
    ];
    
    container.innerHTML = `
        <div style="background:var(--cardBg);border:1px solid var(--cardBorder);border-radius:12px;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                <h3 style="font-size:1.1rem;font-weight:600;color:var(--tx)">🧹 Temizlik Checklist (${shiftNames[shift]})</h3>
                <span style="color:var(--tx2);font-size:.85rem">${branch}</span>
            </div>
            
            <div style="margin-bottom:20px">
                <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Dolduran Personel</label>
                <input type="text" id="cleaningPersonName" class="form-input" style="width:100%" value="${currentUser?.name || ''}">
            </div>
            
            <div id="cleaningItems" style="display:grid;gap:10px;margin-bottom:20px">
                ${items.map((item, i) => `
                    <label style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg3);border-radius:8px;cursor:pointer">
                        <input type="checkbox" id="clean_${i}">
                        <span style="color:var(--tx)">${item}</span>
                    </label>
                `).join('')}
            </div>
            
            <button onclick="submitCleaningChecklist('${branch}', '${today}', '${shift}')" class="btn btn-primary" style="width:100%">
                ✓ Temizlik Tamamlandı
            </button>
        </div>
    `;
}

async function submitCleaningChecklist(branch, date, shift) {
    const personName = document.getElementById('cleaningPersonName')?.value?.trim();
    if (!personName) {
        toast('Lütfen adınızı girin', 'error');
        return;
    }
    
    const checkboxes = document.querySelectorAll('#cleaningItems input[type="checkbox"]');
    const checkedCount = Array.from(checkboxes).filter(c => c.checked).length;
    
    if (checkedCount < checkboxes.length) {
        toast('Tüm maddeleri işaretleyin', 'error');
        return;
    }
    
    try {
        const branchKey = branch.replace(/[^a-zA-Z0-9]/g, '_');
        const submissionId = `${branchKey}_temizlik_${date}_${shift}`;
        
        await db.collection('checklistSubmissions').doc(submissionId).set({
            branch,
            type: 'temizlik',
            shift,
            date,
            personName,
            submittedBy: currentUser?.id,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            completionRate: 100
        });
        
        toast('Temizlik tamamlandı!', 'success');
        loadChecklistTab('temizlik');
        
    } catch (e) {
        toast('Kayıt hatası', 'error');
    }
}

// ==================== PLATFORM CHECKLIST ====================

async function renderPlatformChecklist() {
    const container = document.getElementById('checklistContent');
    if (!container) return;
    
    const branch = selectedChecklistBranch;
    const today = formatDateLocal(new Date());
    const branchKey = branch.replace(/[^a-zA-Z0-9]/g, '_');
    const platforms = PLATFORMS || ['Trendyol', 'Yemek Sepeti', 'Getir Yemek', 'Migros'];
    const times = PLATFORM_CHECK_TIMES || ['10:00', '12:00', '15:00', '18:00', '21:00', '00:00'];
    
    // Şu anki saate en yakın check zamanını bul
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let currentTimeSlot = times[0];
    
    for (const t of times) {
        const [h, m] = t.split(':').map(Number);
        if (currentMinutes >= h * 60 + (m || 0) - 30) {
            currentTimeSlot = t;
        }
    }
    
    // Bu saat için submission var mı?
    let isCompleted = false;
    try {
        const doc = await db.collection('checklistSubmissions').doc(`${branchKey}_platform_${today}_${currentTimeSlot.replace(':', '')}`).get();
        isCompleted = doc.exists;
    } catch (e) {}
    
    container.innerHTML = `
        <div style="background:var(--cardBg);border:1px solid var(--cardBorder);border-radius:12px;padding:20px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
                <h3 style="font-size:1.1rem;font-weight:600;color:var(--tx)">📱 Platform Check</h3>
                <span style="color:var(--tx2);font-size:.85rem">${branch} • ${currentTimeSlot}</span>
            </div>
            
            ${isCompleted ? `
                <div style="text-align:center;padding:20px;background:rgba(39,174,96,.1);border-radius:8px">
                    <span style="color:#27ae60;font-weight:600">✓ ${currentTimeSlot} check'i tamamlandı</span>
                </div>
            ` : `
                <div style="margin-bottom:20px">
                    <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Dolduran Personel</label>
                    <input type="text" id="platformPersonName" class="form-input" style="width:100%" value="${currentUser?.name || ''}">
                </div>
                
                <div id="platformItems" style="display:grid;gap:12px;margin-bottom:20px">
                    ${platforms.map((p, i) => `
                        <div style="background:var(--bg3);border-radius:8px;padding:16px">
                            <div style="font-weight:600;color:var(--tx);margin-bottom:12px">${p}</div>
                            <div style="display:flex;gap:16px">
                                <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                                    <input type="radio" name="platform_${i}" value="open">
                                    <span style="color:#27ae60">🟢 Açık</span>
                                </label>
                                <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                                    <input type="radio" name="platform_${i}" value="closed">
                                    <span style="color:#e74c3c">🔴 Kapalı</span>
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <button onclick="submitPlatformChecklist('${branch}', '${today}', '${currentTimeSlot}')" class="btn btn-primary" style="width:100%">
                    ✓ Platform Check Tamamla
                </button>
            `}
            
            <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--cardBorder)">
                <h4 style="font-size:.9rem;font-weight:600;color:var(--tx2);margin-bottom:12px">Bugünkü Check'ler</h4>
                <div style="display:flex;gap:8px;flex-wrap:wrap">
                    ${times.map(t => {
                        const [h] = t.split(':').map(Number);
                        const isPast = currentMinutes > h * 60 + 30;
                        return `<span style="padding:6px 12px;border-radius:6px;font-size:.8rem;background:${isPast ? 'var(--bg3)' : 'transparent'};color:${isPast ? 'var(--tx2)' : 'var(--tx)'}">${t}</span>`;
                    }).join('')}
                </div>
            </div>
        </div>
    `;
}

async function submitPlatformChecklist(branch, date, timeSlot) {
    const personName = document.getElementById('platformPersonName')?.value?.trim();
    if (!personName) {
        toast('Lütfen adınızı girin', 'error');
        return;
    }
    
    const platforms = PLATFORMS || ['Trendyol', 'Yemek Sepeti', 'Getir Yemek', 'Migros'];
    const results = [];
    let allAnswered = true;
    
    platforms.forEach((p, i) => {
        const open = document.querySelector(`input[name="platform_${i}"][value="open"]`);
        const closed = document.querySelector(`input[name="platform_${i}"][value="closed"]`);
        
        if (!open?.checked && !closed?.checked) {
            allAnswered = false;
        } else {
            results.push({ platform: p, status: open?.checked ? 'open' : 'closed' });
        }
    });
    
    if (!allAnswered) {
        toast('Tüm platformları işaretleyin', 'error');
        return;
    }
    
    try {
        const branchKey = branch.replace(/[^a-zA-Z0-9]/g, '_');
        const submissionId = `${branchKey}_platform_${date}_${timeSlot.replace(':', '')}`;
        
        await db.collection('checklistSubmissions').doc(submissionId).set({
            branch,
            type: 'platform',
            date,
            timeSlot,
            personName,
            submittedBy: currentUser?.id,
            submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
            platforms: results
        });
        
        toast('Platform check tamamlandı!', 'success');
        loadChecklistTab('platform');
        
    } catch (e) {
        toast('Kayıt hatası', 'error');
    }
}

// ==================== GEÇMİŞ ====================

async function renderChecklistHistory() {
    const container = document.getElementById('checklistContent');
    if (!container) return;
    
    const branch = selectedChecklistBranch;
    
    try {
        const snapshot = await db.collection('checklistSubmissions')
            .where('branch', '==', branch)
            .orderBy('submittedAt', 'desc')
            .limit(50)
            .get();
        
        if (snapshot.empty) {
            container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--tx2)">Henüz checklist kaydı yok</div>';
            return;
        }
        
        const typeNames = { gunluk: 'Günlük', temizlik: 'Temizlik', platform: 'Platform' };
        
        container.innerHTML = `
            <div style="display:grid;gap:12px">
                ${snapshot.docs.map(doc => {
                    const d = doc.data();
                    const date = d.submittedAt?.toDate?.() || new Date();
                    return `
                        <div style="background:var(--cardBg);border:1px solid var(--cardBorder);border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center">
                            <div>
                                <div style="font-weight:600;color:var(--tx)">${typeNames[d.type] || d.type}</div>
                                <div style="font-size:.85rem;color:var(--tx2)">${d.personName} • ${d.date}</div>
                            </div>
                            <div style="text-align:right">
                                <div style="font-size:.85rem;color:var(--tx2)">${date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</div>
                                ${d.completionRate ? `<div style="font-size:.8rem;color:#27ae60">${d.completionRate}% tamamlandı</div>` : ''}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
    } catch (e) {
        console.error('Geçmiş yükleme hatası:', e);
        container.innerHTML = '<div style="text-align:center;padding:40px;color:#e74c3c">Yükleme hatası</div>';
    }
}

// ==================== DASHBOARD ENTEGRASYONU ====================

async function loadTodayChecks() {
    updateDashboardCheckCards?.();
}

async function updateDashboardCheckCards() {
    const now = new Date();
    let today = new Date(now);
    if (now.getHours() < 2) today.setDate(today.getDate() - 1);
    const todayStr = formatDateLocal(today);
    
    const isAdmin = ['yonetici', 'bolge_muduru'].includes(currentUser?.role);
    const branches = isAdmin ? (STATE.branches || ['Tuzla Port', 'Şişli (Merkez)']) : [currentUser?.branch || 'Tuzla Port'];
    
    try {
        let checklistTotal = 0, checklistDone = 0;
        let temizlikTotal = 0, temizlikDone = 0;
        let platformTotal = 0, platformDone = 0;
        
        for (const branch of branches) {
            const branchKey = branch.replace(/[^a-zA-Z0-9]/g, '_');
            
            // Checklist
            checklistTotal++;
            try {
                const doc = await db.collection('checklistSubmissions').doc(`${branchKey}_gunluk_${todayStr}`).get();
                if (doc.exists) checklistDone++;
            } catch (e) {}
            
            // Temizlik (3 vardiya)
            for (const shift of ['acilisci', 'araci', 'kapanisci']) {
                temizlikTotal++;
                try {
                    const doc = await db.collection('checklistSubmissions').doc(`${branchKey}_temizlik_${todayStr}_${shift}`).get();
                    if (doc.exists) temizlikDone++;
                } catch (e) {}
            }
            
            // Platform
            const times = PLATFORM_CHECK_TIMES || ['10:00', '12:00', '15:00', '18:00', '21:00', '00:00'];
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            
            for (const time of times) {
                const [h] = time.split(':').map(Number);
                if (currentMinutes > h * 60 + 30) {
                    platformTotal++;
                    try {
                        const doc = await db.collection('checklistSubmissions').doc(`${branchKey}_platform_${todayStr}_${time.replace(':', '')}`).get();
                        if (doc.exists) platformDone++;
                    } catch (e) {}
                }
            }
        }
        
        // UI Güncelle
        const updateProgress = (type, done, total) => {
            const progress = total > 0 ? Math.round((done / total) * 100) : 0;
            const fill = document.getElementById(`${type}ProgressFill`);
            const doneEl = document.getElementById(`${type}DoneCount`);
            const remainingEl = document.getElementById(`${type}RemainingCount`);
            const statusEl = document.getElementById(`${type}StatusText`);
            
            if (fill) fill.style.width = progress + '%';
            if (doneEl) doneEl.textContent = done + ' tamamlandı';
            if (remainingEl) remainingEl.textContent = (total - done) + ' bekliyor';
            if (statusEl) statusEl.textContent = progress === 100 ? 'Tamamlandı ✓' : `${progress}% tamamlandı`;
        };
        
        updateProgress('checklist', checklistDone, checklistTotal);
        updateProgress('temizlik', temizlikDone, temizlikTotal);
        updateProgress('platform', platformDone, platformTotal);
        
    } catch (e) {
        console.warn('Dashboard güncelleme hatası:', e);
    }
}

console.log('✓ checklist.js yüklendi');
