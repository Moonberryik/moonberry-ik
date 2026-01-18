/**
 * MOONBERRY İK - AUTH.JS
 * Kimlik doğrulama ve oturum yönetimi
 * @version 20
 */

// Oturum değişkenleri
let sessionTimeoutId = null;
let sessionWarningId = null;
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 saat
const SESSION_WARNING = 7.5 * 60 * 60 * 1000; // 7.5 saat

// Çıkış yap
async function logout() {
    try {
        await logActivity('logout', { reason: 'user_initiated' });
        
        if (currentUser?.sessionId) {
            try {
                await db.collection('sessions').doc(currentUser.sessionId).update({
                    status: 'ended',
                    endedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (e) {}
        }
        
        localStorage.removeItem('mb_session_id');
        if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
        if (sessionWarningId) clearTimeout(sessionWarningId);
        
        await firebase.auth().signOut();
        currentUser = null;
        window.location.replace('login.html');
    } catch (error) {
        console.error('Logout error:', error);
        toast('Çıkış hatası', 'error');
    }
}

// Oturum başlat
async function startSession(user) {
    try {
        const sessionData = {
            userId: user.uid,
            email: user.email,
            startedAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: 'active',
            userAgent: navigator.userAgent?.substring(0, 200),
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        const sessionRef = await db.collection('sessions').add(sessionData);
        localStorage.setItem('mb_session_id', sessionRef.id);
        
        // Timeout ayarla
        resetSessionTimeout();
        
        return sessionRef.id;
    } catch (e) {
        console.warn('Session start error:', e);
        return null;
    }
}

// Oturum timeout sıfırla
function resetSessionTimeout() {
    if (sessionTimeoutId) clearTimeout(sessionTimeoutId);
    if (sessionWarningId) clearTimeout(sessionWarningId);
    
    sessionWarningId = setTimeout(() => {
        toast('Oturumunuz 30 dakika içinde sonlanacak', 'warning');
    }, SESSION_WARNING);
    
    sessionTimeoutId = setTimeout(() => {
        toast('Oturum süresi doldu', 'error');
        logout();
    }, SESSION_TIMEOUT);
}

// Aktivite güncelle
function updateActivity() {
    resetSessionTimeout();
    
    const sessionId = localStorage.getItem('mb_session_id');
    if (sessionId && db) {
        db.collection('sessions').doc(sessionId).update({
            lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    }
}

// Aktivite dinleyicileri
['click', 'keypress', 'scroll', 'mousemove'].forEach(event => {
    document.addEventListener(event, () => {
        if (currentUser) updateActivity();
    }, { passive: true, once: false });
});

// Throttle activity updates
let lastActivityUpdate = 0;
const originalUpdateActivity = updateActivity;
updateActivity = function() {
    const now = Date.now();
    if (now - lastActivityUpdate > 60000) { // 1 dakikada bir
        lastActivityUpdate = now;
        originalUpdateActivity();
    }
};

console.log('✓ auth.js yüklendi');
