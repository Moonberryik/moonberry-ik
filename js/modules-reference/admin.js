/**
 * MOONBERRY İK - ADMIN.JS
 * Yönetici paneli
 * @version 20
 */

// ==================== ADMIN PANEL RENDER ====================

async function renderAdminLists() {
    // Kullanıcı listesi
    loadUserList();
    
    // Puantaj kuralları
    loadPuantajRulesAdmin();
    
    // Yönetici kontrolü
    if (currentUser?.role !== 'yonetici') {
        const companyCard = document.getElementById('companySettingsCard');
        const passwordCard = document.getElementById('adminPasswordCard');
        if (companyCard) companyCard.style.display = 'none';
        if (passwordCard) passwordCard.style.display = 'none';
    }
}

// ==================== KULLANICI YÖNETİMİ ====================

async function loadUserList() {
    const tbody = document.getElementById('userTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Yükleniyor...</td></tr>';
    
    try {
        const snapshot = await db.collection('users').get();
        const users = [];
        snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));
        
        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:20px">Kullanıcı bulunamadı</td></tr>';
            return;
        }
        
        const roleNames = {
            yonetici: 'Yönetici',
            bolge_muduru: 'Bölge Müdürü',
            magaza_muduru: 'Mağaza Müdürü',
            personel: 'Personel'
        };
        
        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.name || u.email}</td>
                <td>${u.email}</td>
                <td>${roleNames[u.role] || u.role}</td>
                <td>${u.branch || 'Tüm'}</td>
                <td>
                    <button onclick="editUser('${u.id}')" class="btn btn-ghost" style="padding:4px 8px;font-size:.75rem">Düzenle</button>
                </td>
            </tr>
        `).join('');
        
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#e74c3c">Yükleme hatası</td></tr>';
    }
}

async function editUser(userId) {
    try {
        const doc = await db.collection('users').doc(userId).get();
        if (!doc.exists) {
            toast('Kullanıcı bulunamadı', 'error');
            return;
        }
        
        const user = doc.data();
        const branches = STATE.branches || DEFAULT_STATE.branches;
        
        const content = `
            <form id="editUserForm">
                <input type="hidden" id="editUserId" value="${userId}">
                <div style="display:grid;gap:16px">
                    <div>
                        <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Ad Soyad</label>
                        <input type="text" id="editUserName" class="form-input" style="width:100%" value="${user.name || ''}">
                    </div>
                    <div>
                        <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">E-posta</label>
                        <input type="email" id="editUserEmail" class="form-input" style="width:100%" value="${user.email || ''}" disabled>
                    </div>
                    <div>
                        <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Rol</label>
                        <select id="editUserRole" class="form-input" style="width:100%">
                            <option value="personel" ${user.role === 'personel' ? 'selected' : ''}>Personel</option>
                            <option value="magaza_muduru" ${user.role === 'magaza_muduru' ? 'selected' : ''}>Mağaza Müdürü</option>
                            <option value="bolge_muduru" ${user.role === 'bolge_muduru' ? 'selected' : ''}>Bölge Müdürü</option>
                            <option value="yonetici" ${user.role === 'yonetici' ? 'selected' : ''}>Yönetici</option>
                        </select>
                    </div>
                    <div>
                        <label style="display:block;font-size:.8rem;font-weight:600;color:var(--tx2);margin-bottom:6px">Şube</label>
                        <select id="editUserBranch" class="form-input" style="width:100%">
                            <option value="all" ${user.branch === 'all' ? 'selected' : ''}>Tüm Şubeler</option>
                            ${branches.map(b => `<option value="${b}" ${user.branch === b ? 'selected' : ''}>${b}</option>`).join('')}
                        </select>
                    </div>
                </div>
            </form>
        `;
        
        const buttons = `
            <button onclick="closeModal()" class="btn btn-ghost">İptal</button>
            <button onclick="saveUser()" class="btn btn-primary">Kaydet</button>
        `;
        
        showModal('Kullanıcı Düzenle', content, buttons);
        
    } catch (e) {
        toast('Kullanıcı yüklenemedi', 'error');
    }
}

async function saveUser() {
    const userId = document.getElementById('editUserId')?.value;
    const name = document.getElementById('editUserName')?.value?.trim();
    const role = document.getElementById('editUserRole')?.value;
    const branch = document.getElementById('editUserBranch')?.value;
    
    if (!name) {
        toast('Ad soyad gerekli', 'error');
        return;
    }
    
    try {
        await db.collection('users').doc(userId).update({
            name,
            role,
            branch,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        toast('Kullanıcı güncellendi', 'success');
        closeModal();
        loadUserList();
        
    } catch (e) {
        toast('Güncelleme hatası', 'error');
    }
}

// ==================== PUANTAJ KURALLARI ====================

async function loadPuantajRulesAdmin() {
    const container = document.getElementById('puantajRulesContainer');
    if (!container) return;
    
    try {
        const doc = await db.collection('config').doc('puantajRules').get();
        const rules = doc.exists ? (doc.data().rules || DEFAULT_PUANTAJ_RULES) : DEFAULT_PUANTAJ_RULES;
        
        container.innerHTML = `
            <div style="display:grid;gap:12px">
                ${rules.map((r, i) => `
                    <div style="background:var(--bg3);border-radius:8px;padding:16px;display:flex;justify-content:space-between;align-items:center">
                        <div>
                            <div style="font-weight:600;color:var(--tx)">${r.title}</div>
                            <div style="font-size:.85rem;color:var(--tx2)">${r.desc}</div>
                        </div>
                        <div style="display:flex;align-items:center;gap:12px">
                            <span style="background:${r.effect === 'prim_yok' ? '#e74c3c' : r.effect.startsWith('-') ? '#f39c12' : '#27ae60'};color:#fff;padding:4px 10px;border-radius:6px;font-size:.8rem;font-weight:600">
                                ${r.effect === 'prim_yok' ? 'Prim Yok' : r.effect}
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
    } catch (e) {
        container.innerHTML = '<p style="color:#e74c3c">Yükleme hatası</p>';
    }
}

// ==================== ŞİRKET AYARLARI ====================

async function saveCompanySettings() {
    const name = document.getElementById('companyName')?.value?.trim();
    const short = document.getElementById('companyShort')?.value?.trim();
    const address = document.getElementById('companyAddress')?.value?.trim();
    const tel = document.getElementById('companyTel')?.value?.trim();
    const email = document.getElementById('companyEmail')?.value?.trim();
    
    if (!name) {
        toast('Şirket adı gerekli', 'error');
        return;
    }
    
    try {
        STATE.company = { ...STATE.company, name, short, address, tel, email };
        await saveState();
        toast('Şirket bilgileri güncellendi', 'success');
        
    } catch (e) {
        toast('Kayıt hatası', 'error');
    }
}

// ==================== ŞUBE YÖNETİMİ ====================

async function addBranch() {
    const input = document.getElementById('newBranchName');
    const name = input?.value?.trim();
    
    if (!name) {
        toast('Şube adı girin', 'error');
        return;
    }
    
    if (STATE.branches?.includes(name)) {
        toast('Bu şube zaten var', 'error');
        return;
    }
    
    try {
        STATE.branches = STATE.branches || [];
        STATE.branches.push(name);
        await saveState();
        
        input.value = '';
        renderBranchList();
        toast('Şube eklendi', 'success');
        
    } catch (e) {
        toast('Ekleme hatası', 'error');
    }
}

function renderBranchList() {
    const container = document.getElementById('branchList');
    if (!container) return;
    
    const branches = STATE.branches || DEFAULT_STATE.branches;
    
    container.innerHTML = branches.map(b => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--bg3);border-radius:8px">
            <span style="font-weight:600;color:var(--tx)">${b}</span>
            <button onclick="removeBranch('${b}')" class="btn btn-ghost" style="padding:4px 8px;color:#e74c3c">×</button>
        </div>
    `).join('');
}

async function removeBranch(name) {
    if (!confirm(`"${name}" şubesini silmek istediğinize emin misiniz?`)) return;
    
    try {
        STATE.branches = STATE.branches.filter(b => b !== name);
        await saveState();
        renderBranchList();
        toast('Şube silindi', 'success');
        
    } catch (e) {
        toast('Silme hatası', 'error');
    }
}

// ==================== KATALOG (İHLAL TÜRLERİ) ====================

function renderViolations() {
    const container = document.getElementById('violationList');
    if (!container) return;
    
    const violations = STATE.violations || DEFAULT_STATE.violations || [];
    
    const riskColors = {
        low: { bg: 'rgba(46,125,50,.1)', text: '#2E7D32', label: 'Düşük' },
        medium: { bg: 'rgba(245,127,23,.1)', text: '#F57F17', label: 'Orta' },
        high: { bg: 'rgba(198,40,40,.1)', text: '#C62828', label: 'Yüksek' }
    };
    
    container.innerHTML = violations.map(v => {
        const risk = riskColors[v.risk] || riskColors.low;
        return `
            <div style="background:var(--cardBg);border:1px solid var(--cardBorder);border-radius:12px;padding:20px;margin-bottom:12px">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">
                    <div>
                        <span style="font-size:.75rem;color:var(--tx3)">${v.id}</span>
                        <h4 style="font-weight:600;color:var(--tx);margin:4px 0">${v.title}</h4>
                    </div>
                    <span style="background:${risk.bg};color:${risk.text};padding:4px 10px;border-radius:6px;font-size:.75rem;font-weight:600">
                        ${risk.label} Risk
                    </span>
                </div>
                <p style="color:var(--tx2);font-size:.9rem;margin-bottom:12px">${v.desc}</p>
                <div style="font-size:.8rem;color:var(--tx3)">
                    <strong>Yasal Dayanak:</strong> ${v.legal}<br>
                    <strong>Adımlar:</strong> ${v.steps?.join(' → ') || '-'}
                </div>
            </div>
        `;
    }).join('');
}

// ==================== AYARLARI YÜKLE ====================

async function loadSettings() {
    try {
        const doc = await db.collection('systemConfig').doc('checkRules').get();
        if (doc.exists) {
            const data = doc.data();
            
            // Platform check saatleri
            if (data.platformCheckTimes) {
                const input = document.getElementById('platformCheckTimes');
                if (input) input.value = data.platformCheckTimes.join(', ');
            }
            
            // Temizlik shift kuralları
            if (data.temizlikShiftRules) {
                Object.entries(data.temizlikShiftRules).forEach(([shift, rules]) => {
                    const input = document.getElementById(`${shift}_deadline`);
                    if (input) input.value = rules.deadline || '';
                });
            }
            
            // Check sistem ayarları
            if (data.checkSystemSettings) {
                const s = data.checkSystemSettings;
                if (document.getElementById('checkTolerance')) document.getElementById('checkTolerance').value = s.tolerance || 30;
                if (document.getElementById('checkPointPlatform')) document.getElementById('checkPointPlatform').value = s.points?.platform || 10;
                if (document.getElementById('checkPointCleaning')) document.getElementById('checkPointCleaning').value = s.points?.cleaning || 5;
            }
        }
    } catch (e) {
        console.warn('Ayarlar yüklenemedi:', e);
    }
}

console.log('✓ admin.js yüklendi');
