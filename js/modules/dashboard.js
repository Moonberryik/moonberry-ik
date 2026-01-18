/**
 * MOONBERRY İK - DASHBOARD MODULE
 * Ana sayfa fonksiyonları
 * @version 2.0
 */

// ==================== DASHBOARD INIT ====================

async function initDashboardPage() {
    console.log('[Dashboard] Sayfa başlatılıyor...');
    
    // Kullanıcı adını güncelle
    const nameEl = document.getElementById('dashboardUserName');
    if (nameEl && STATE.currentUser) {
        nameEl.textContent = STATE.currentUser.name || STATE.currentUser.email?.split('@')[0] || 'Kullanıcı';
    }
    
    // Tarihi güncelle
    const dateEl = document.getElementById('dashboardDate');
    if (dateEl) {
        dateEl.textContent = formatDateLongTR(new Date());
    }
    
    // Rol bazlı görünürlük
    applyDashboardRoleVisibility();
    
    // Check kartlarını güncelle
    await updateDashboardCheckCards();
    
    // Yöneticiler için istatistikleri göster
    if (isManager(STATE.currentUser?.role)) {
        await loadDashboardStats();
    }
    
    console.log('[Dashboard] Sayfa hazır');
}

// ==================== ROL BAZLI GÖRÜNÜRLÜK ====================

function applyDashboardRoleVisibility() {
    if (!STATE.currentUser) return;
    
    const isManagerRole = isManager(STATE.currentUser.role);
    
    // .manager-only elementlerini gizle/göster
    document.querySelectorAll('.manager-only').forEach(el => {
        el.style.display = isManagerRole ? '' : 'none';
    });
}

// ==================== CHECK KARTLARI ====================

async function updateDashboardCheckCards() {
    // Bugünün tarihi (02:00 öncesi önceki gün sayılır)
    const now = new Date();
    let today = new Date(now);
    if (now.getHours() < 2) {
        today.setDate(today.getDate() - 1);
    }
    const todayStr = formatDateLocal(today);
    
    // Kullanıcının şubesi
    const isAdminUser = isRegionalOrAdmin(STATE.currentUser?.role);
    const branches = isAdminUser 
        ? (STATE.branches || ['Tuzla Port', 'Şişli (Merkez)']) 
        : [STATE.currentUser?.branch || 'Tuzla Port'];
    
    try {
        let checklistTotal = 0, checklistDone = 0;
        let temizlikTotal = 0, temizlikDone = 0;
        let platformTotal = 0, platformDone = 0;
        
        // Her şube için kontrol et
        for (const branch of branches) {
            const branchKey = getBranchKey(branch);
            
            // 1. Checklist (günlük + açılış/kapanış)
            const checkTypes = ['gunluk', 'acilis_hazirliklari', 'kapanis_hazirliklari'];
            for (const type of checkTypes) {
                checklistTotal++;
                const docId = `${branchKey}_${type}_${todayStr}`;
                try {
                    const doc = await db.collection('checklistSubmissions').doc(docId).get();
                    if (doc.exists) checklistDone++;
                } catch (e) {}
            }
            
            // 2. Temizlik (3 vardiya)
            const shifts = ['acilisci', 'araci', 'kapanisci'];
            for (const shift of shifts) {
                temizlikTotal++;
                const docId = `${branchKey}_temizlik_${shift}_${todayStr}`;
                try {
                    const doc = await db.collection('checklistSubmissions').doc(docId).get();
                    if (doc.exists) temizlikDone++;
                } catch (e) {}
            }
            
            // 3. Platform check (saatlik)
            const platformTimes = ['10:00', '12:00', '15:00', '18:00', '21:00', '00:00'];
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            
            for (const time of platformTimes) {
                const [h, m] = time.split(':').map(Number);
                const timeMinutes = h * 60 + (m || 0);
                
                // Sadece geçmiş saatleri say
                if (timeMinutes <= currentMinutes || (h === 0 && now.getHours() >= 22)) {
                    platformTotal++;
                    const docId = `${branchKey}_platform_${todayStr}_${time.replace(':', '')}`;
                    try {
                        const doc = await db.collection('checklistSubmissions').doc(docId).get();
                        if (doc.exists) platformDone++;
                    } catch (e) {}
                }
            }
        }
        
        // UI Güncelle
        updateCheckCard('checklist', checklistDone, checklistTotal);
        updateCheckCard('temizlik', temizlikDone, temizlikTotal);
        updateCheckCard('platform', platformDone, platformTotal);
        
    } catch (e) {
        console.warn('[Dashboard] Check kartları yüklenemedi:', e);
    }
}

function updateCheckCard(type, done, total) {
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    
    const progressEl = document.getElementById(`${type}Progress`);
    const statusEl = document.getElementById(`${type}Status`);
    const doneEl = document.getElementById(`${type}Done`);
    const totalEl = document.getElementById(`${type}Total`);
    
    if (progressEl) progressEl.style.width = progress + '%';
    if (statusEl) statusEl.textContent = progress === 100 ? 'Tamamlandı ✓' : `${progress}% tamamlandı`;
    if (doneEl) doneEl.textContent = done;
    if (totalEl) totalEl.textContent = total;
}

// ==================== İSTATİSTİKLER ====================

async function loadDashboardStats() {
    const statsSection = document.getElementById('statsSection');
    if (!statsSection) return;
    
    statsSection.style.display = 'block';
    
    try {
        // Bu ay başı
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthStartStr = formatDateLocal(monthStart);
        
        // Tamamlanan checkler
        try {
            const checksSnap = await db.collection('checklistSubmissions')
                .where('date', '>=', monthStartStr)
                .get();
            
            const checkCount = document.getElementById('statChecks');
            if (checkCount) checkCount.textContent = checksSnap.size;
        } catch (e) {
            console.warn('Check sayısı alınamadı');
        }
        
        // Planlanan shiftler
        try {
            const shiftsSnap = await db.collection('shifts').get();
            const shiftCount = document.getElementById('statShifts');
            if (shiftCount) shiftCount.textContent = shiftsSnap.size;
        } catch (e) {
            console.warn('Shift sayısı alınamadı');
        }
        
        // Aktif personel
        try {
            const personelSnap = await db.collection('personel')
                .where('status', '==', 'active')
                .get();
            
            const personelCount = document.getElementById('statPersonel');
            if (personelCount) personelCount.textContent = personelSnap.size || Object.keys(STATE.personelCache || {}).length;
        } catch (e) {
            console.warn('Personel sayısı alınamadı');
        }
        
        // Belgeler (placeholder)
        const docCountEl = document.getElementById('statDocs');
        if (docCountEl) docCountEl.textContent = '-';
        
    } catch (e) {
        console.warn('[Dashboard] İstatistikler yüklenemedi:', e);
    }
}

// ==================== EXPORT ====================

window.initDashboardPage = initDashboardPage;

console.log('✓ dashboard.js yüklendi');
