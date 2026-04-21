/** 
 * Uygulamanın Merkezi Durum Yönetimi (State): 
 * Sayfa geçişleri, kullanıcı bilgileri, fiyatlandırma ve doluluk oranları 
 * gibi tüm dinamik veriler bu objede tutulur.
 */
let state = {
    currentSection: 'home', // O an ekranda aktif olan bölümün ID'si
    user: null, // Giriş yapmış üyenin detaylı bilgilerini tutar
    selectedTier: 12, // Kayıt sırasında seçilen üyelik süresi (Varsayılan 12 ay)
    selectedArea: 'fitness', // Rezervasyon için seçilen tesis alanı
    prices: { // Temel paketlerin aylık taban fiyatları
        'Fit': 500,
        'VIP': 800,
        'Pool': 400,
        'Tennis': 600
    },
    occupancy: { // Tesislerin anlık (simüle edilen) doluluk yüzdeleri
        fitness: 45,
        pool: 20,
        tennis: 10,
        football: 0
    },
    firstAttempt: true, // Rezervasyonun ilk denemesini takip eden hata simülasyon bayrağı
    guestFirstAttempt: true, // Misafir rezervasyonu için ilk deneme bayrağı
    allUsers: [] // Kayıt olan tüm kullanıcıları tutan basit veritabanı (Simüle edilmiş)
};

/** 
 * Sayfa Router/Geçiş Sistemi: 
 * SPA (Single Page Application) mantığıyla bölümler arası geçişi sağlar.
 * Kaydırma efektleri ve güvenlik kontrolleri burada yapılır.
 */
function showSection(sectionId) {
    const landingSections = ['home', 'register', 'about', 'contact', 'login', 'guest-booking']; // Dikey kayan ana sayfa bölümleri
    const memberSections = ['booking', 'panel', 'admin', 'admin-dash']; // Sadece belirli durumlarda görünen bölümler

    // Navigasyon çubuğundaki aktif linkin güncellenmesi
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const link = Array.from(document.querySelectorAll('.nav-links a')).find(a => a.innerText.toLowerCase().includes(sectionId.slice(0, 3)));
    if (link) link.classList.add('active');

    // Güvenlik Kilidi: Üye olmayanların panel veya rezervasyon sayfasına girmesini engeller
    if ((sectionId === 'booking' || sectionId === 'panel') && !state.user) {
        alert('Bu alanı görmek için üye girişi yapmanız gerekmektedir.');
        showSection('login');
        return;
    }

    if (landingSections.includes(sectionId)) {
        // Ana Sayfa Akışı: Gerekli konteynerları göster ve hedefe pürüzsüz kaydır
        memberSections.forEach(id => {
            const el = document.getElementById(`${id}-section`);
            if (el) el.style.display = 'none';
        });
        landingSections.forEach(id => {
            const el = document.getElementById(`${id}-section`);
            if (el) el.style.display = 'block';
        });

        const target = document.getElementById(`${sectionId}-section`);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    } else {
        // SPA Akışı: Tüm ekranı temizle ve sadece hedef bölümü yukarıda göster
        document.querySelectorAll('section').forEach(s => s.style.display = 'none');
        const target = document.getElementById(`${sectionId}-section`);
        if (target) target.style.display = 'block';
        window.scrollTo(0, 0);
    }

    state.currentSection = sectionId;
    updateNav(); // Navigasyon linklerinin görünürlüğünü güncelle
    updateLivePrice(); // Canlı fiyat hesaplamasını tetikle
}

/** 
 * Navigasyon Dinamikleri: 
 * Kullanıcı giriş yaptığında 'Kayıt Ol' butonunu gizler, 
 * 'Panel' ve 'Rezervasyon' linklerini gösterir.
 */
function updateNav() {
    const bookingLink = document.getElementById('nav-booking');
    const panelLink = document.getElementById('nav-panel');
    const registerLink = document.getElementById('nav-register');

    if (state.user) {
        if (bookingLink) bookingLink.classList.remove('hidden');
        if (panelLink) panelLink.classList.remove('hidden');
        if (registerLink) registerLink.classList.add('hidden');
    } else {
        if (bookingLink) bookingLink.classList.add('hidden');
        if (panelLink) panelLink.classList.add('hidden');
        if (registerLink) registerLink.classList.remove('hidden');
    }
}

/** 
 * Kayıt Formu Dinamik Mantığı: 
 * Seçilen cinsiyete göre hanımlara özel saat tercihlerini açar/kapatır.
 */
function handleGenderChange() {
    const gender = document.getElementById('reg-gender').value;
    const femaleGroup = document.getElementById('female-hours-group');
    if (gender === 'female') {
        femaleGroup.classList.remove('hidden');
    } else {
        femaleGroup.classList.add('hidden');
        document.getElementById('female-slots-list').classList.add('hidden');
    }
}

/** Belirlenen saat dilimi tercihlerinin listesini gösterir. */
function handleFemalePref() {
    const pref = document.getElementById('reg-female-pref').value;
    const slots = document.getElementById('female-slots-list');
    if (pref === 'yes') {
        slots.classList.remove('hidden');
    } else {
        slots.classList.add('hidden');
    }
}

/** Üyelik süresi (3, 6, 12 ay) seçildiğinde durumu günceller ve arayüzü işaretler. */
function selectTier(element, months) {
    document.querySelectorAll('.pricing-card').forEach(c => c.classList.remove('selected'));
    element.classList.add('selected');
    state.selectedTier = months;
    updateLivePrice();
}

/** 
 * Canlı Fiyat Hesaplaması: 
 * Seçilen paket tipi ve süreye göre indirim oranlarını (12 aya %30, 6 aya %20) 
 * anlık olarak ekrana yansıtır ve animasyonla vurgular.
 */
function updateLivePrice() {
    const tierKey = document.getElementById('reg-tier')?.value;
    if (!tierKey) return;

    const duration = state.selectedTier;
    const basePrice = state.prices[tierKey];
    const discount = duration === 12 ? 0.7 : (duration === 6 ? 0.8 : (duration === 3 ? 0.9 : 1));

    // Antrenör eklemesi (Aylık +₺300)
    const trainerSurcharge = document.getElementById('reg-trainer')?.value === 'yes' ? (300 * duration) : 0;

    const finalPrice = Math.floor((basePrice * duration * discount) + trainerSurcharge);

    const priceDisplay = document.getElementById('live-price');
    if (priceDisplay) {
        priceDisplay.innerText = `₺${finalPrice}`;
        // Değişikliği vurgulamak için küçük bir büyüme animasyonu
        priceDisplay.style.transform = 'scale(1.1)';
        priceDisplay.style.transition = 'transform 0.2s ease';
        setTimeout(() => { priceDisplay.style.transform = 'scale(1)'; }, 200);
    }
    return finalPrice;
}

/** Uygulama yüklendiğinde temel tetikleyicileri (event listeners) ayarlar. */
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('reg-tier')?.addEventListener('change', updateLivePrice);
    updateLivePrice(); // İlk açılış fiyatı
});

/** 
 * Kayıt Formu Gönderimi: 
 * Kart doğrulaması, kullanıcı objesinin oluşturulması ve 
 * başarılı kayıt sonrası QR kod üretimini yönetir.
 */
document.getElementById('reg-form').addEventListener('submit', (e) => {
    e.preventDefault();

    // Güvenlik: Sadece belirlenen test kartı ile işlem yapılmasına izin verir
    const cardInput = document.getElementById('reg-card-no');
    const fixedCard = "4242 4242 4242 4242";
    if (cardInput.value.replace(/\s/g, '') !== fixedCard.replace(/\s/g, '')) {
        alert(`Geçersiz Kart Bilgisi! Lütfen test kartını kullanın: ${fixedCard}`);
        return;
    }

    const tierKey = document.getElementById('reg-tier').value;
    const duration = state.selectedTier;
    const finalPrice = updateLivePrice();

    // Kullanıcı verisini merkezi duruma ve "allUsers" listesine kaydet
    const newUser = {
        name: document.getElementById('reg-name').value,
        surname: document.getElementById('reg-surname').value,
        cardNo: cardInput.value.replace(/\s/g, ''),
        gender: document.getElementById('reg-gender').value,
        tierKey: tierKey,
        duration: duration,
        price: finalPrice,
        payments: [{
            date: new Date().toLocaleDateString('tr-TR'),
            amount: finalPrice,
            desc: 'İlk Üyelik Ödemesi'
        }],
        expires: new Date(Date.now() + state.selectedTier * 30 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')
    };

    state.user = newUser;
    state.allUsers.push(newUser); // Login için listeye ekle

    updatePanel(); // Üye panelini yeni bilgilerle doldur

    // Başarı mesajı ve QR kodun ekrana eklenmesi
    const section = document.getElementById('register-section');
    const msg = document.createElement('div');
    msg.id = 'success-qr-msg';
    msg.innerHTML = `
        <div class="card" style="border-color: var(--success); background: rgba(16, 185, 129, 0.1); margin-top: 1rem; text-align: center;">
            <h3 style="color: var(--success);">✓ Hoş Geldiniz! Ödeme Onaylandı</h3>
            <p style="font-size: 0.85rem;">Üyeliğiniz aktifleşti. QR kodunuzu aşağıdan görebilirsiniz.</p>
            <div style="margin-top: 1rem; background: #fff; padding: 1rem; display: inline-block; border-radius: 8px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ActiveLife-Welcome" alt="QR Code" style="width: 120px;">
            </div>
        </div>`;
    section.prepend(msg);

    setTimeout(() => showSection('panel'), 2000);
});

function loginUser() {
    const name = document.getElementById('login-name').value;
    const pass = document.getElementById('login-pass').value;
    const errorMsg = document.getElementById('login-error');

    if (pass === '1923' && name.length > 1) {
        // Eğer bu isimle biri zaten kayıtlıysa onu getir
        let foundUser = state.allUsers.find(u => u.name.toLowerCase() === name.toLowerCase());

        // Eğer kayıtlı değilse, anlık bir "Misafir Üye" profili oluştur (Test kolaylığı için)
        if (!foundUser) {
            foundUser = {
                name: name,
                surname: "User",
                tierKey: "VIP",
                duration: 12,
                price: 5600,
                payments: [{ date: new Date().toLocaleDateString('tr-TR'), amount: 5600, desc: 'Hızlı Üyelik Paneli' }],
                expires: "29.10.2024"
            };
            state.allUsers.push(foundUser);
        }

        state.user = foundUser;
        errorMsg.classList.add('hidden');
        updateNav();
        updatePanel();
        showSection('panel');
    } else {
        errorMsg.classList.remove('hidden');
    }
}

/** 
 * Misafir Rezervasyon Süreci: 
 * Üyeliksiz, tek seferlik ödeme ile rezervasyon oluşturur.
 * İlk denemede 'Dolu' simülasyonu yapar.
 */
function processGuestBooking() {
    const name = document.getElementById('guest-name').value;
    const dateInput = document.getElementById('guest-date').value;
    const area = document.getElementById('guest-area').value;
    const alertBox = document.getElementById('guest-booking-alert');
    const suggestBox = document.getElementById('guest-booking-suggestions');
    const cardInput = document.getElementById('guest-card').value.replace(/\s/g, '');

    if (!name || !dateInput) {
        alert('Lütfen Ad Soyad ve Tarih bilgilerini doldurun.');
        return;
    }

    if (cardInput !== "4242424242424242") {
        alert('Lütfen geçerli bir test kartı numarası giriniz: 4242 4242 4242 4242');
        return;
    }

    const dateParts = dateInput.split('T');
    const date = dateParts[0];

    if (state.guestFirstAttempt) {
        alertBox.classList.remove('hidden');
        state.guestFirstAttempt = false;
        const hours = ["09:00", "13:00", "16:00", "19:00", "21:00"];
        const randomHours = hours.sort(() => 0.5 - Math.random()).slice(0, 4);
        suggestBox.innerHTML = randomHours.map(h => `
            <div onclick="selectGuestSuggested('${date}', '${h}')" 
                 style="padding: 10px; border: 1px solid var(--secondary); border-radius:8px; cursor:pointer; font-size: 0.75rem; text-align: center; background: rgba(255,255,255,0.05); color: #fff;">
                ${h} (Mevcut)
            </div>
        `).join('');
        alertBox.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    alertBox.classList.add('hidden');
    const section = document.getElementById('guest-booking-section');
    const msg = document.createElement('div');
    msg.id = 'success-qr-msg';
    msg.innerHTML = `
        <div class="card" style="border-color: var(--secondary); background: rgba(255, 72, 0, 0.1); margin-top: 1rem; text-align: center; animation: slideUp 0.4s ease;">
            <h3 style="color: var(--secondary);">✓ Misafir Girişi Onaylandı</h3>
            <p style="font-size: 0.8rem;">${dateInput.replace('T', ' ')} - ${area.toUpperCase()}</p>
            <div style="margin-top: 1rem; background: #fff; padding: 1rem; display: inline-block; border-radius: 8px;">
                <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ActiveLife-Guest-${name}-${area}" alt="QR Code" style="width: 120px;">
            </div>
            <p style="font-size: 0.75rem; margin-top: 1rem; opacity: 0.8;">Bu kodu girişteki turnikeye okutun.</p>
        </div>`;
    const oldMsg = document.getElementById('success-qr-msg');
    if (oldMsg) oldMsg.remove();
    section.prepend(msg);
    msg.scrollIntoView({ behavior: 'smooth' });
}

/** Misafir önerilen saat seçimi */
function selectGuestSuggested(date, time) {
    document.getElementById('guest-date').value = `${date}T${time}`;
    state.guestFirstAttempt = false;
    processGuestBooking();
}

/** Rezervasyon yapılacak alanı (Fitness, Havuz vb.) seçer. */
function selectArea(element, area) {
    document.querySelectorAll('.area-btn').forEach(b => b.classList.remove('selected'));
    element.classList.add('selected');
    state.selectedArea = area;

    // Halı saha seçildiyse grup sayısı gibi özel alanları açar
    const footballGroup = document.getElementById('football-group');
    if (area === 'football') {
        footballGroup.classList.remove('hidden');
    } else {
        footballGroup.classList.add('hidden');
    }
}

/** 
 * Rezervasyon Süreci: 
 * İlk denemede 'Dolu' uyarısı ve 4 alternatif öneri gösterir. 
 * İkinci denemede veya öneri tıklandığında onay verir.
 */
function processBooking() {
    const date = document.getElementById('book-date').value;
    const time = document.getElementById('book-time').value;
    const alertBox = document.getElementById('booking-alert');
    const suggestBox = document.getElementById('booking-suggestions');

    if (!date) { alert('Lütfen tarih seçin.'); return; }

    // Stratejik Mantık: İlk tıklamada her zaman 'Dolu' simülasyonu yap
    if (state.firstAttempt) {
        alertBox.classList.remove('hidden');
        state.firstAttempt = false; // Bir sonraki tıklama başarılı olacak

        // 4 farklı rastgele saat önerisi oluştur
        const hours = ["10:00", "11:00", "14:00", "15:00", "18:00", "20:00"];
        const randomHours = hours.sort(() => 0.5 - Math.random()).slice(0, 4);

        suggestBox.innerHTML = randomHours.map(h => `
            <div onclick="selectSuggested('${date}', '${h}')" 
                 style="padding: 8px; border: 1px solid var(--border); border-radius:6px; cursor:pointer; font-size: 0.75rem; text-align: center; background: rgba(255,255,255,0.03);">
                ${h} (Uygun)
            </div>
        `).join('');

        return;
    }

    // İkinci deneme veya doğrudan onay
    alertBox.classList.add('hidden');
    confirmBooking(date, time);
}

/** Önerilen saatlerden birine tıklandığında otomatik seçim yapar ve sistemi ilerletir. */
function selectSuggested(date, time) {
    document.getElementById('book-time').value = time;
    state.firstAttempt = false;
    processBooking();
}

/** Rezervasyonu onaylar, geçmişe ekler ve kullanıcı panelini günceller. */
function confirmBooking(date, time) {
    const areaName = state.selectedArea.charAt(0).toUpperCase() + state.selectedArea.slice(1);
    const currentSectionId = `${state.currentSection}-section`;
    const section = document.getElementById(currentSectionId);

    // İşlemi ödeme geçmişine kaydet
    if (state.user) {
        state.user.payments.push({
            date: date,
            amount: 0,
            desc: `${areaName} Rezervasyonu (${time})`
        });
        updatePanel();
    }

    if (section) {
        const msg = document.createElement('div');
        msg.id = 'success-qr-msg';
        msg.innerHTML = `
            <div class="card" style="border-color: var(--success); background: rgba(16, 185, 129, 0.1); margin-top: 1rem; text-align: center; animation: slideUp 0.4s ease;">
                <h3 style="color: var(--success);">✓ Rezervasyon Onaylandı</h3>
                <p style="font-size: 0.85rem;">${date} günü saat ${time} için yeriniz ayrıldı.</p>
                <div style="margin-top: 1rem; background: #fff; padding: 1rem; display: inline-block; border-radius: 8px;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ActiveLife-Book-${date}" alt="QR Code" style="width: 100px;">
                </div>
            </div>`;
        const oldMsg = document.getElementById('success-qr-msg');
        if (oldMsg) oldMsg.remove();
        section.prepend(msg);
        setTimeout(() => showSection('panel'), 2500);
    }
}

/** 
 * Ödeme Tamamlama Modülü: 
 * Kredi kartı kontrolü ve başarılı ödeme sonrası QR kod üretimi.
 */
function completePayment() {
    const cardInput = document.getElementById('card-inner-input');
    const fixedCard = "4242 4242 4242 4242";

    if (cardInput.value.replace(/\s/g, '') !== fixedCard.replace(/\s/g, '')) {
        alert(`Geçersiz Kart! Lütfen test kartını kullanın: ${fixedCard}`);
        return;
    }

    document.getElementById('payment-modal').classList.add('hidden');

    if (state.user) {
        state.user.payments.push({
            date: new Date().toLocaleDateString('tr-TR'),
            amount: state.user.price || 150,
            desc: state.user.price ? 'Üyelik Ödemesi' : 'Rezervasyon Ödemesi'
        });
        updatePanel();
    }

    const currentSectionId = `${state.currentSection}-section`;
    const section = document.getElementById(currentSectionId);
    if (section) {
        const msg = document.createElement('div');
        msg.id = 'success-qr-msg';
        msg.innerHTML = `
            <div class="card" style="border-color: var(--success); background: rgba(16, 185, 129, 0.1); margin-top: 1rem; text-align: center; animation: slideUp 0.4s ease;">
                <button onclick="this.parentElement.parentElement.remove()" style="float: right; background: none; border: none; color: var(--text-low); cursor: pointer;">×</button>
                <h3 style="color: var(--success);">✓ İşlem Onaylandı</h3>
                <p style="font-size: 0.85rem;">Bu QR kodu salona girişte kullanabilirsiniz.</p>
                <div style="margin-top: 1rem; background: #fff; padding: 1rem; display: inline-block; border-radius: 8px;">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ActiveLife-Booking-Safe" alt="QR Code" style="width: 120px;">
                </div>
            </div>`;
        const oldMsg = document.getElementById('success-qr-msg');
        if (oldMsg) oldMsg.remove();
        section.prepend(msg);
    }
}

/** Kredi kartı numarası ve SKT (Son Kullanma Tarihi) alanlarını otomatik formatlar. */
function initInputFormats() {
    const dateInput = document.getElementById('reg-card-expiry');
    // Kart formatlama (Heceler arası boşluk)
    const cardElements = [
        document.getElementById('reg-card-no'),
        document.getElementById('guest-card'),
        document.getElementById('card-inner-input')
    ];

    cardElements.forEach(el => {
        if (el) {
            el.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
                let matches = v.match(/\d{4,16}/g);
                let match = matches && matches[0] || '';
                let parts = [];
                for (let i = 0, len = match.length; i < len; i += 4) {
                    parts.push(match.substring(i, i + 4));
                }
                if (parts.length) e.target.value = parts.join(' ');
                else e.target.value = v;
            });
        }
    });

    // Son Kullanma Tarihi Formatlama (MM/YY)
    const expiryElements = [
        document.getElementById('reg-card-expiry'),
        document.getElementById('guest-card-expiry')
    ];

    expiryElements.forEach(el => {
        if (el) {
            el.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length > 4) v = v.substring(0, 4);
                if (v.length >= 2) {
                    e.target.value = v.substring(0, 2) + '/' + v.substring(2, 4);
                } else {
                    e.target.value = v;
                }
            });
        }
    });

    // CVV Formatlama (Maksimum 3 Haneli Rakam)
    const cvvElements = [
        document.getElementById('reg-card-cvv'),
        document.getElementById('guest-card-cvv')
    ];

    cvvElements.forEach(el => {
        if (el) {
            el.addEventListener('input', (e) => {
                let v = e.target.value.replace(/\D/g, '');
                if (v.length > 3) v = v.substring(0, 3);
                e.target.value = v;
            });
        }
    });
}
setTimeout(initInputFormats, 500);

/** 
 * Gizli Bölüm Tetikleyici: 
 * Footer logosuna 1.5 saniye içinde 3 kez tıklanırsa admin giriş paneli açılır.
 */
let clickCount = 0;
document.addEventListener('click', (e) => {
    if (e.target.closest('#secret-trigger')) {
        clickCount++;
        if (clickCount === 3) {
            showSection('admin');
            clickCount = 0;
        }
        setTimeout(() => { clickCount = 0; }, 1500);
    }
});

/** Yönetici girişi kontrolü: Şifre '1234' olarak sabitlenmiştir. */
function adminLogin() {
    const name = document.getElementById('admin-name').value;
    const surname = document.getElementById('admin-surname').value;
    const pass = document.getElementById('admin-pass').value;

    if (name && surname && pass === '1234') {
        showSection('admin-dash');
    } else {
        document.getElementById('admin-error').classList.remove('hidden');
    }
}

/** Rezervasyon takviminde geçmiş tarihlerin seçilmesini engeller. */
document.getElementById('book-date').min = new Date().toISOString().split('T')[0];

/** Üye Paneli Veri Güncelleme: Giriş yapan kullanıcının tüm bilgilerini ekrana basar. */
function updatePanel() {
    if (state.user) {
        document.getElementById('panel-user-name').innerText = `${state.user.name} ${state.user.surname}`;
        const tierName = document.getElementById('reg-tier').options[document.getElementById('reg-tier').selectedIndex].text;
        document.querySelector('.sidebar p').innerText = `${tierName} (${state.user.duration} Ay)`;
        document.querySelector('.content .card div').innerText = `${state.user.duration * 30} Gün`;

        // Ödeme geçmişi listesini doldur
        const list = document.getElementById('payment-history-list');
        if (list) {
            list.innerHTML = '';
            state.user.payments.forEach(p => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div style="display: flex; justify-content: space-between;">
                        <span>${p.desc}</span>
                        <span style="color: var(--success); font-weight:600;">₺${p.amount}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-low);">${p.date}</div>
                `;
                list.appendChild(item);
            });
        }
    }
}

/** 
 * Tesis Doluluk Simülasyonu: 
 * her 5 saniyede bir rastgele doluluk oranlarını günceller 
 * ve %80 üzerini kritik uyarı (kırmızı) olarak işaretler.
 */
function simulateDensity() {
    Object.keys(state.occupancy).forEach(key => {
        state.occupancy[key] = Math.min(100, Math.max(5, state.occupancy[key] + (Math.random() * 10 - 5)));
        const element = document.getElementById(`den-${key}`);
        if (element) {
            element.style.width = `${state.occupancy[key]}%`;
            if (state.occupancy[key] > 80) element.classList.add('warning');
            else element.classList.remove('warning');
        }
    });
}
setInterval(simulateDensity, 5000);
