/**
 * MOONBERRY İK - BELGELER MODULE
 * Tüm belge türleri için PDF oluşturma
 * @version 2.0
 */

// ==================== BELGE INIT ====================

// Belge sayfaları için ortak init
async function initBelgelerPage(belgeType) {
    console.log(`[Belgeler] ${belgeType} sayfası başlatılıyor...`);
    
    // Personel dropdown'ı doldur
    const personelSelect = document.getElementById(`${belgeType}Personel`);
    if (personelSelect) {
        await fillPersonelSelect(`${belgeType}Personel`);
    }
    
    // Şube dropdown
    const subeSelect = document.getElementById(`${belgeType}Sube`);
    if (subeSelect) {
        fillBranchSelect(`${belgeType}Sube`);
    }
    
    // Tarih bugün
    const dateInputs = document.querySelectorAll(`[id^="${belgeType}"][type="date"]`);
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = formatDateLocal(new Date());
        }
    });
    
    console.log(`[Belgeler] ${belgeType} sayfası hazır`);
}

// Spesifik sayfa init'leri
async function initSozlesmePage() { await initBelgelerPage('sozlesme'); }
async function initTutanakPage() { await initBelgelerPage('tutanak'); }
async function initSavunmaPage() { await initBelgelerPage('savunma'); }
async function initFesihPage() { await initBelgelerPage('fesih'); }
async function initIstifaPage() { await initBelgelerPage('istifa'); }
async function initIbranamePage() { await initBelgelerPage('ibraname'); }
async function initBorcPage() { await initBelgelerPage('borc'); }
async function initAvansPage() { await initBelgelerPage('avans'); }
async function initZimmetPage() { await initBelgelerPage('zimmet'); addZimmetItem(); }

// ==================== PERSONEL BİLGİ DOLDUR ====================

async function fillPersonelInfo(belgeType) {
    const personelSelect = document.getElementById(`${belgeType}Personel`);
    if (!personelSelect || !personelSelect.value) return;
    
    try {
        const doc = await db.collection('personel').doc(personelSelect.value).get();
        if (!doc.exists) return;
        
        const data = doc.data();
        
        // Ad soyad
        const adSoyadInput = document.getElementById(`${belgeType}AdSoyad`);
        if (adSoyadInput) adSoyadInput.value = data.name || '';
        
        // TC No
        const tcInput = document.getElementById(`${belgeType}TcNo`);
        if (tcInput && data.tcNo) tcInput.value = data.tcNo;
        
        // Adres
        const adresInput = document.getElementById(`${belgeType}Adres`);
        if (adresInput && data.address) adresInput.value = data.address;
        
        // Şube
        const subeSelect = document.getElementById(`${belgeType}Sube`);
        if (subeSelect && data.branch) subeSelect.value = data.branch;
        
        // Pozisyon
        const pozisyonSelect = document.getElementById(`${belgeType}Pozisyon`);
        if (pozisyonSelect && data.position) pozisyonSelect.value = data.position;
        
    } catch (error) {
        console.error('Personel bilgisi alınamadı:', error);
    }
}

// ==================== BELGE ÖNİZLEME ====================

function previewDocument(belgeType) {
    showToast('Önizleme özelliği yakında eklenecek', 'info');
}

// ==================== BELGE OLUŞTUR ====================

async function generateDocument(belgeType) {
    if (typeof pdfMake === 'undefined') {
        showToast('PDF kütüphanesi yüklenemedi', 'error');
        return;
    }
    
    showToast('PDF oluşturuluyor...', 'info');
    
    try {
        let docDefinition;
        
        switch (belgeType) {
            case 'sozlesme':
                docDefinition = generateSozlesmePDF();
                break;
            case 'tutanak':
                docDefinition = generateTutanakPDF();
                break;
            case 'savunma':
                docDefinition = generateSavunmaPDF();
                break;
            case 'fesih':
                docDefinition = generateFesihPDF();
                break;
            case 'istifa':
                docDefinition = generateIstifaPDF();
                break;
            case 'ibraname':
                docDefinition = generateIbranamePDF();
                break;
            case 'borc':
                docDefinition = generateBorcPDF();
                break;
            case 'avans':
                docDefinition = generateAvansPDF();
                break;
            case 'zimmet':
                docDefinition = generateZimmetPDF();
                break;
            default:
                showToast('Bilinmeyen belge türü', 'error');
                return;
        }
        
        if (docDefinition) {
            const fileName = `${belgeType}-${formatDateLocal(new Date())}.pdf`;
            pdfMake.createPdf(docDefinition).download(fileName);
            showToast('PDF indirildi!', 'success');
        }
        
    } catch (error) {
        console.error('PDF oluşturulamadı:', error);
        showToast('PDF oluşturulamadı: ' + error.message, 'error');
    }
}

// ==================== PDF ŞABLONLARİ ====================

// Şirket bilgileri
const COMPANY = {
    name: 'TAMASLAN KAFE RESTORAN VE GIDA HİZMETLERİ',
    title: 'Moonberry Coffee',
    address: 'İstanbul',
    taxId: '1234567890',
    vergiDairesi: 'Şişli'
};

// PDF başlığı
function getPdfHeader(title) {
    return [
        { text: COMPANY.name, style: 'companyName', alignment: 'center' },
        { text: title, style: 'docTitle', alignment: 'center', margin: [0, 10, 0, 20] }
    ];
}

// PDF stilleri
const PDF_STYLES = {
    companyName: { fontSize: 12, bold: true },
    docTitle: { fontSize: 16, bold: true },
    sectionTitle: { fontSize: 12, bold: true, margin: [0, 15, 0, 5] },
    normal: { fontSize: 10 },
    bold: { fontSize: 10, bold: true },
    small: { fontSize: 9, color: '#666' }
};

// İş Sözleşmesi PDF
function generateSozlesmePDF() {
    const adSoyad = document.getElementById('sozlesmeAdSoyad')?.value || '';
    const tcNo = document.getElementById('sozlesmeTcNo')?.value || '';
    const baslama = document.getElementById('sozlesmeBaslama')?.value || '';
    const pozisyon = document.getElementById('sozlesmePozisyon')?.value || '';
    const sube = document.getElementById('sozlesmeSube')?.value || '';
    const maas = document.getElementById('sozlesmeMaas')?.value || '';
    
    return {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            ...getPdfHeader('İŞ SÖZLEŞMESİ'),
            { text: 'İŞVEREN BİLGİLERİ', style: 'sectionTitle' },
            { text: `Unvan: ${COMPANY.name}`, style: 'normal' },
            { text: `Adres: ${COMPANY.address}`, style: 'normal' },
            { text: 'İŞÇİ BİLGİLERİ', style: 'sectionTitle' },
            { text: `Ad Soyad: ${adSoyad}`, style: 'normal' },
            { text: `TC Kimlik No: ${tcNo}`, style: 'normal' },
            { text: `Pozisyon: ${getRoleName(pozisyon)}`, style: 'normal' },
            { text: `Şube: ${sube}`, style: 'normal' },
            { text: 'SÖZLEŞME ŞARTLARI', style: 'sectionTitle' },
            { text: `İşe Başlama Tarihi: ${baslama ? formatDateTR(baslama) : '-'}`, style: 'normal' },
            { text: `Brüt Ücret: ${maas ? formatCurrency(parseFloat(maas)) : '-'}`, style: 'normal' },
            { text: 'Haftalık Çalışma Süresi: 45 saat', style: 'normal' },
            { text: '\n\nİşbu sözleşme taraflarca okunmuş ve kabul edilmiştir.', style: 'normal' },
            { text: `\n\nTarih: ${formatDateTR(new Date())}`, style: 'normal' },
            {
                columns: [
                    { text: '\n\n\nİŞVEREN\n\n_____________________', alignment: 'center' },
                    { text: '\n\n\nİŞÇİ\n\n_____________________', alignment: 'center' }
                ],
                margin: [0, 40, 0, 0]
            }
        ],
        styles: PDF_STYLES
    };
}

// Tutanak PDF
function generateTutanakPDF() {
    const tarih = document.getElementById('tutanakTarih')?.value || '';
    const saat = document.getElementById('tutanakSaat')?.value || '';
    const sube = document.getElementById('tutanakSube')?.value || '';
    const turu = document.getElementById('tutanakTuru')?.value || '';
    const aciklama = document.getElementById('tutanakAciklama')?.value || '';
    const taniklar = document.getElementById('tutanakTaniklar')?.value || '';
    
    return {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            ...getPdfHeader('TUTANAK'),
            { text: `Tarih: ${tarih ? formatDateTR(tarih) : '-'} Saat: ${saat || '-'}`, style: 'normal' },
            { text: `Şube: ${sube}`, style: 'normal' },
            { text: `Tutanak Türü: ${turu}`, style: 'normal' },
            { text: 'OLAY AÇIKLAMASI', style: 'sectionTitle' },
            { text: aciklama || '-', style: 'normal' },
            { text: taniklar ? `\nTanıklar: ${taniklar}` : '', style: 'normal' },
            {
                columns: [
                    { text: '\n\n\nTutanak Düzenleyen\n\n_____________________', alignment: 'center' },
                    { text: '\n\n\nİlgili Personel\n\n_____________________', alignment: 'center' }
                ],
                margin: [0, 40, 0, 0]
            }
        ],
        styles: PDF_STYLES
    };
}

// Savunma İstem PDF
function generateSavunmaPDF() {
    const tarih = document.getElementById('savunmaTarih')?.value || '';
    const konu = document.getElementById('savunmaKonu')?.value || '';
    const sure = document.getElementById('savunmaSure')?.value || '3';
    
    return {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            ...getPdfHeader('SAVUNMA İSTEM YAZISI'),
            { text: `Tarih: ${tarih ? formatDateTR(tarih) : formatDateTR(new Date())}`, style: 'normal' },
            { text: 'KONU', style: 'sectionTitle' },
            { text: konu || '-', style: 'normal' },
            { text: `\nYukarıda belirtilen konu hakkında ${sure} gün içinde yazılı savunmanızı vermeniz gerekmektedir.`, style: 'normal' },
            { text: '\n\nİşveren Yetkili\n\n_____________________', alignment: 'right', margin: [0, 40, 0, 0] }
        ],
        styles: PDF_STYLES
    };
}

// Fesih Bildirimi PDF
function generateFesihPDF() {
    const tarih = document.getElementById('fesihTarih')?.value || '';
    const turu = document.getElementById('fesihTuru')?.value || '';
    const gerekce = document.getElementById('fesihGerekce')?.value || '';
    
    return {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            ...getPdfHeader('İŞ SÖZLEŞMESİ FESİH BİLDİRİMİ'),
            { text: `Tarih: ${tarih ? formatDateTR(tarih) : formatDateTR(new Date())}`, style: 'normal' },
            { text: `Fesih Türü: ${turu}`, style: 'normal' },
            { text: 'FESİH GEREKÇESİ', style: 'sectionTitle' },
            { text: gerekce || '-', style: 'normal' },
            { text: '\n\nİşveren Yetkili\n\n_____________________', alignment: 'right', margin: [0, 40, 0, 0] }
        ],
        styles: PDF_STYLES
    };
}

// İstifa Dilekçesi PDF
function generateIstifaPDF() {
    const tarih = document.getElementById('istifaTarih')?.value || '';
    const sonTarih = document.getElementById('istifaSonTarih')?.value || '';
    const gerekce = document.getElementById('istifaGerekce')?.value || '';
    
    return {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            ...getPdfHeader('İSTİFA DİLEKÇESİ'),
            { text: `Tarih: ${tarih ? formatDateTR(tarih) : formatDateTR(new Date())}`, style: 'normal' },
            { text: `Son Çalışma Tarihi: ${sonTarih ? formatDateTR(sonTarih) : '-'}`, style: 'normal' },
            { text: gerekce ? `Gerekçe: ${gerekce}` : '', style: 'normal' },
            { text: '\n\nİstifa eden\n\n_____________________', alignment: 'right', margin: [0, 40, 0, 0] }
        ],
        styles: PDF_STYLES
    };
}

// İbraname PDF
function generateIbranamePDF() {
    const tarih = document.getElementById('ibranameTarih')?.value || '';
    const ucret = document.getElementById('ibranameUcret')?.value || '0';
    const fazlaMesai = document.getElementById('ibranameFazlaMesai')?.value || '0';
    const izin = document.getElementById('ibranameIzin')?.value || '0';
    const kidem = document.getElementById('ibranameKidem')?.value || '0';
    const ihbar = document.getElementById('ibranameIhbar')?.value || '0';
    
    const toplam = parseFloat(ucret) + parseFloat(fazlaMesai) + parseFloat(izin) + parseFloat(kidem) + parseFloat(ihbar);
    
    return {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            ...getPdfHeader('İBRANAME'),
            { text: `Tarih: ${tarih ? formatDateTR(tarih) : formatDateTR(new Date())}`, style: 'normal' },
            { text: 'ÖDEME DETAYLARI', style: 'sectionTitle' },
            { text: `Ücret Alacağı: ${formatCurrency(parseFloat(ucret))}`, style: 'normal' },
            { text: `Fazla Mesai: ${formatCurrency(parseFloat(fazlaMesai))}`, style: 'normal' },
            { text: `Yıllık İzin Ücreti: ${formatCurrency(parseFloat(izin))}`, style: 'normal' },
            { text: `Kıdem Tazminatı: ${formatCurrency(parseFloat(kidem))}`, style: 'normal' },
            { text: `İhbar Tazminatı: ${formatCurrency(parseFloat(ihbar))}`, style: 'normal' },
            { text: `TOPLAM: ${formatCurrency(toplam)}`, style: 'bold', margin: [0, 10, 0, 0] },
            { text: '\n\nYukarıdaki tutarları eksiksiz aldım, işverenden hiçbir alacağım kalmamıştır.', style: 'normal' },
            { text: '\n\nİşçi\n\n_____________________', alignment: 'right', margin: [0, 40, 0, 0] }
        ],
        styles: PDF_STYLES
    };
}

// Borç Senedi PDF
function generateBorcPDF() {
    const tarih = document.getElementById('borcTarih')?.value || '';
    const tutar = document.getElementById('borcTutar')?.value || '0';
    const taksit = document.getElementById('borcTaksit')?.value || '1';
    const sebep = document.getElementById('borcSebep')?.value || '';
    
    return {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            ...getPdfHeader('BORÇ SENEDİ'),
            { text: `Tarih: ${tarih ? formatDateTR(tarih) : formatDateTR(new Date())}`, style: 'normal' },
            { text: `Borç Tutarı: ${formatCurrency(parseFloat(tutar))}`, style: 'bold' },
            { text: `Taksit Sayısı: ${taksit}`, style: 'normal' },
            { text: sebep ? `Borç Sebebi: ${sebep}` : '', style: 'normal' },
            { text: '\n\nBorçlu\n\n_____________________', alignment: 'right', margin: [0, 40, 0, 0] }
        ],
        styles: PDF_STYLES
    };
}

// Avans Talebi PDF
function generateAvansPDF() {
    const tarih = document.getElementById('avansTarih')?.value || '';
    const tutar = document.getElementById('avansTutar')?.value || '0';
    const sebep = document.getElementById('avansSebep')?.value || '';
    
    return {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            ...getPdfHeader('AVANS TALEBİ'),
            { text: `Tarih: ${tarih ? formatDateTR(tarih) : formatDateTR(new Date())}`, style: 'normal' },
            { text: `Talep Edilen Tutar: ${formatCurrency(parseFloat(tutar))}`, style: 'bold' },
            { text: sebep ? `Talep Sebebi: ${sebep}` : '', style: 'normal' },
            { text: '\n\nTalep Eden\n\n_____________________', alignment: 'right', margin: [0, 40, 0, 0] }
        ],
        styles: PDF_STYLES
    };
}

// Zimmet Tutanağı PDF
function generateZimmetPDF() {
    const tarih = document.getElementById('zimmetTarih')?.value || '';
    
    // Zimmet kalemlerini topla
    const zimmetItems = [];
    document.querySelectorAll('.zimmet-item').forEach(item => {
        const ad = item.querySelector('.zimmet-ad')?.value || '';
        const adet = item.querySelector('.zimmet-adet')?.value || '1';
        if (ad) {
            zimmetItems.push([ad, adet]);
        }
    });
    
    return {
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 40],
        content: [
            ...getPdfHeader('ZİMMET TUTANAĞI'),
            { text: `Tarih: ${tarih ? formatDateTR(tarih) : formatDateTR(new Date())}`, style: 'normal' },
            { text: 'ZİMMET LİSTESİ', style: 'sectionTitle' },
            {
                table: {
                    headerRows: 1,
                    widths: ['*', 60],
                    body: [
                        ['Malzeme', 'Adet'],
                        ...zimmetItems
                    ]
                }
            },
            { text: '\n\nYukarıdaki malzemeleri teslim aldım.', style: 'normal' },
            { text: '\n\nTeslim Alan\n\n_____________________', alignment: 'right', margin: [0, 40, 0, 0] }
        ],
        styles: PDF_STYLES
    };
}

// ==================== ZİMMET YARDIMCI ====================

function addZimmetItem() {
    const container = document.getElementById('zimmetListesi');
    if (!container) return;
    
    const itemHtml = `
        <div class="zimmet-item">
            <input type="text" class="zimmet-ad" placeholder="Malzeme adı">
            <input type="number" class="zimmet-adet" value="1" min="1" style="width:80px">
            <button type="button" class="zimmet-remove" onclick="this.parentElement.remove()">✕</button>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', itemHtml);
}

// ==================== FORM TEMİZLE ====================

function clearForm(belgeType) {
    const inputs = document.querySelectorAll(`[id^="${belgeType}"]`);
    inputs.forEach(input => {
        if (input.type === 'date') {
            input.value = formatDateLocal(new Date());
        } else if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        } else if (input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
    });
    
    showToast('Form temizlendi', 'info');
}

// ==================== EXPORT ====================

window.initSozlesmePage = initSozlesmePage;
window.initTutanakPage = initTutanakPage;
window.initSavunmaPage = initSavunmaPage;
window.initFesihPage = initFesihPage;
window.initIstifaPage = initIstifaPage;
window.initIbranamePage = initIbranamePage;
window.initBorcPage = initBorcPage;
window.initAvansPage = initAvansPage;
window.initZimmetPage = initZimmetPage;
window.fillPersonelInfo = fillPersonelInfo;
window.previewDocument = previewDocument;
window.generateDocument = generateDocument;
window.addZimmetItem = addZimmetItem;
window.clearForm = clearForm;

console.log('✓ belgeler.js yüklendi');
