// Sound Synthesizer via Web Audio API
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playFx(type) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;
    if (type === 'click') {
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.05, now);
        osc.start(now); osc.stop(now + 0.05);
    } else if (type === 'brew') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        gain.gain.setValueAtTime(0.08, now);
        osc.start(now); osc.stop(now + 0.15);
    } else if (type === 'success') {
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.exponentialRampToValueAtTime(659, now + 0.15);
        gain.gain.setValueAtTime(0.1, now);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'error') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(180, now);
        gain.gain.setValueAtTime(0.1, now);
        osc.start(now); osc.stop(now + 0.25);
    }
}

// Database Story & Pelanggan Relate Indonesia
const CUSTOMER_DB = [
    {
        id: 'anton',
        name: 'Mas Anton',
        tag: 'ASN Lembur',
        avatar: '👨‍💼',
        story: [
            "Deadline laporan Coretax & Excel numpuk nih bro. Butuh Americano panas tanpa gula biar mata tetap melek!",
            "Sistem baru kantor makin canggih tapi entah napa spreadsheet-ku tetep 10.000 baris. Kasih Americano ekstra pekat!",
            "Akhirnya laporan kelar disetujui atasan! Hari ini aku mau ngerasain Es Latte dingin dulu buat ngerayain."
        ],
        recipe: ['espresso', 'water'],
        price: 22000
    },
    {
        id: 'rara',
        name: 'Mbak Rara',
        tag: 'Mahasiswi Skripsi',
        avatar: '👩‍🎓',
        story: [
            "Dosen pembimbing barusan nyoret Bab 4-ku full tinta merah... Butuh Es Kopi Susu Aren manis banget buat pendorong semangat!",
            "H-2 jadwal sidang kompre. Kepala mau pecah. Bikin Kopi Susu Aren yang esnya banyak ya mas barista!",
            "LULUS REVISI!! Makasih ya mas, kopi sudut rukomu ini saksi bisu perjuanganku."
        ],
        recipe: ['espresso', 'milk', 'aren', 'ice'],
        price: 28000
    },
    {
        id: 'doni',
        name: 'Bang Doni',
        tag: 'Driver Ojol',
        avatar: '🛵',
        story: [
            "Jakarta terik banget hari ini mas! Es Kopi Hitam dingin satu ya, racik cepet mau ngejar poin tutup bonus.",
            "Sepi orderan dari siang... Tapi ngeteh/ngopi di kedaimu selalu bikin adem. Bikinin Kopi Hitam Es ya.",
            "Dapat tip lumayan dari penumpang tadi! Bikinin Kopi Susu Aren plus es ya mas."
        ],
        recipe: ['espresso', 'water', 'ice'],
        price: 20000
    },
    {
        id: 'melly',
        name: 'Tante Melly',
        tag: 'Ibu Kompleks',
        avatar: '👩‍🦱',
        story: [
            "Dengar-dengar ruko sebelah mau dijual ya? Ah anyway, bikinkan Matcha Latte dingin favorit saya ya!",
            "Arisan kompleks hari ini heboh banget jeng. Saya butuh Matcha Latte biar pikiran tenang."
        ],
        recipe: ['matcha', 'milk', 'ice'],
        price: 32000,
        reqUpgrade: 'matcha'
    }
];

// Game State
let state = {
    baristaName: 'Barista',
    shopName: 'CornerBrew',
    cash: 100000,
    day: 1,
    timeMinutes: 420, // 07:00
    isShiftActive: false,
    inventory: { beans: 500, milk: 1000, aren: 500, cups: 50 },
    upgrades: { machine: false, matcha: false, wifi: false },
    currentCustomer: null,
    storyStep: { anton: 0, rara: 0, doni: 0, melly: 0 },
    cupRecipe: [],
    extractedQuality: 1.0,
    patienceTimer: null,
    patienceVal: 100,
    dayIncome: 0,
    dayReviews: []
};

// Extractor Gauge Hold Logic
let holdInterval = null;
let gaugePos = 0;
let gaugeDir = 1;

// Init & Storage
window.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem('cornerbrew_save');
    if (saved) {
        state = JSON.parse(saved);
        document.getElementById('modal-setup').classList.add('hidden');
        updateUI();
    }
    setupEventListeners();
});

function saveGame() {
    localStorage.setItem('cornerbrew_save', JSON.stringify(state));
}

function updateUI() {
    document.getElementById('hud-barista').innerText = state.baristaName;
    document.getElementById('hud-shop-name').innerText = state.shopName;
    document.getElementById('hud-cash').innerText = `Rp ${state.cash.toLocaleString('id-ID')}`;
    document.getElementById('hud-day').innerText = state.day;
    
    const hrs = Math.floor(state.timeMinutes / 60).toString().padStart(2, '0');
    const mins = (state.timeMinutes % 60).toString().padStart(2, '0');
    document.getElementById('hud-time').innerText = `${hrs}:${mins}`;

    document.getElementById('inv-beans').innerText = `${state.inventory.beans}g`;
    document.getElementById('inv-milk').innerText = `${state.inventory.milk}ml`;
    document.getElementById('inv-aren').innerText = `${state.inventory.aren}ml`;
    document.getElementById('inv-cups').innerText = `${state.inventory.cups} pcs`;

    document.getElementById('stk-espresso').innerText = state.inventory.beans;
    document.getElementById('stk-milk').innerText = state.inventory.milk;
    document.getElementById('stk-aren').innerText = state.inventory.aren;

    if (state.upgrades.matcha) {
        document.getElementById('btn-ing-matcha').style.display = 'block';
    }
}

function setupEventListeners() {
    document.getElementById('btn-start-game').addEventListener('click', () => {
        state.baristaName = document.getElementById('input-barista').value || 'Barista';
        state.shopName = document.getElementById('input-shop').value || 'CornerBrew';
        document.getElementById('modal-setup').classList.add('hidden');
        saveGame();
        updateUI();
    });

    document.getElementById('nav-toggle-shift').addEventListener('click', toggleShift);
    document.getElementById('nav-restock').addEventListener('click', () => openModal('modal-restock'));
    document.getElementById('nav-shop').addEventListener('click', () => openModal('modal-shop'));
    document.getElementById('nav-minigame').addEventListener('click', () => openModal('modal-minigame'));

    // Hold Button Extractor
    const holdBtn = document.getElementById('btn-extract-hold');
    holdBtn.addEventListener('touchstart', startExtractHold);
    holdBtn.addEventListener('mousedown', startExtractHold);
    holdBtn.addEventListener('touchend', stopExtractHold);
    holdBtn.addEventListener('mouseup', stopExtractHold);

    // Ingredient Taps
    document.querySelectorAll('.ing-btn').forEach(btn => {
        btn.addEventListener('click', () => addIngredient(btn.dataset.ing));
    });

    document.getElementById('btn-discard').addEventListener('click', discardCup);
    document.getElementById('btn-serve').addEventListener('click', serveOrder);
    document.getElementById('btn-next-day').addEventListener('click', startNextDay);
    document.getElementById('btn-start-mg').addEventListener('click', startBeansMinigame);
}

function openModal(id) { playFx('click'); document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { playFx('click'); document.getElementById(id).classList.add('hidden'); }

// Shift & Customer Loop
function toggleShift() {
    playFx('click');
    state.isShiftActive = !state.isShiftActive;
    const btn = document.getElementById('nav-toggle-shift');
    
    if (state.isShiftActive) {
        btn.innerText = '⏸️ Istirahat';
        spawnCustomer();
        runTimeLoop();
    } else {
        btn.innerText = '▶️ Buka Kedai';
        clearInterval(state.patienceTimer);
    }
}

function runTimeLoop() {
    if (!state.isShiftActive) return;
    state.timeMinutes += 5;
    updateUI();

    if (state.timeMinutes >= 1260) { // 21:00 Closing
        endShift();
    } else {
        setTimeout(runTimeLoop, 1000);
    }
}

function spawnCustomer() {
    if (!state.isShiftActive) return;

    // Filter available customers
    const available = CUSTOMER_DB.filter(c => !c.reqUpgrade || state.upgrades[c.reqUpgrade]);
    const cust = available[Math.floor(Math.random() * available.length)];
    state.currentCustomer = cust;

    const step = state.storyStep[cust.id] % cust.story.length;
    
    document.getElementById('cust-avatar').innerText = cust.avatar;
    document.getElementById('cust-name').innerText = cust.name;
    document.getElementById('cust-tag').innerText = cust.tag;
    document.getElementById('cust-dialog-text').innerText = `"${cust.story[step]}"`;

    // Reset Patience
    state.patienceVal = 100;
    const pBar = document.getElementById('cust-patience');
    pBar.style.width = '100%';
    pBar.style.backgroundColor = '#2a9d8f';

    clearInterval(state.patienceTimer);
    const speed = state.upgrades.wifi ? 300 : 220;

    state.patienceTimer = setInterval(() => {
        state.patienceVal -= 2;
        pBar.style.width = `${state.patienceVal}%`;
        if (state.patienceVal < 35) pBar.style.backgroundColor = '#e63946';

        if (state.patienceVal <= 0) {
            clearInterval(state.patienceTimer);
            playFx('error');
            document.getElementById('cust-dialog-text').innerText = "Kelamaan mas! Saya batal beli deh.";
            state.dayReviews.push({ name: cust.name, rating: 1, comment: "Layanan sangat lambat." });
            setTimeout(spawnCustomer, 2500);
        }
    }, speed);
}

// Extractor Gauge Hold
function startExtractHold(e) {
    e.preventDefault();
    if (state.inventory.beans < 15) {
        alert("Biji kopi habis! Belanja stok dulu.");
        return;
    }
    playFx('brew');
    gaugePos = 0;
    gaugeDir = state.upgrades.machine ? 4 : 3;
    
    holdInterval = setInterval(() => {
        gaugePos += gaugeDir;
        if (gaugePos >= 100 || gaugePos <= 0) gaugeDir *= -1;
        document.getElementById('gauge-needle').style.left = `${gaugePos}%`;
    }, 20);
}

function stopExtractHold() {
    if (!holdInterval) return;
    clearInterval(holdInterval);
    holdInterval = null;

    // Green zone 65% - 85%
    if (gaugePos >= 65 && gaugePos <= 85) {
        state.extractedQuality = 1.3;
        playFx('success');
    } else {
        state.extractedQuality = 0.9;
    }

    state.inventory.beans -= 15;
    addIngredient('espresso');
    updateUI();
}

// Cup Recipe Handling
function addIngredient(ing) {
    if (ing === 'milk' && state.inventory.milk < 50) return alert("Susu UHT habis!");
    if (ing === 'aren' && state.inventory.aren < 20) return alert("Gula Aren habis!");

    if (ing === 'milk') state.inventory.milk -= 50;
    if (ing === 'aren') state.inventory.aren -= 20;

    playFx('click');
    state.cupRecipe.push(ing);
    updateCupVisual();
    updateUI();
}

function updateCupVisual() {
    document.getElementById('layer-espresso').style.height = state.cupRecipe.includes('espresso') ? '30%' : '0%';
    document.getElementById('layer-water').style.height = state.cupRecipe.includes('water') ? '60%' : '0%';
    document.getElementById('layer-milk').style.height = state.cupRecipe.includes('milk') ? '50%' : '0%';
    document.getElementById('layer-aren').style.height = state.cupRecipe.includes('aren') ? '20%' : '0%';

    document.getElementById('cup-contents-text').innerText = state.cupRecipe.length > 0 ? state.cupRecipe.join('+') : 'Gelas Kosong';
}

function discardCup() {
    playFx('error');
    state.cupRecipe = [];
    updateCupVisual();
}

function serveOrder() {
    if (!state.currentCustomer || state.cupRecipe.length === 0) return;

    if (state.inventory.cups < 1) return alert("Cup habis! Belanja dulu.");
    state.inventory.cups -= 1;

    const target = [...state.currentCustomer.recipe].sort().join(',');
    const actual = [...state.cupRecipe].sort().join(',');

    if (target === actual) {
        clearInterval(state.patienceTimer);
        playFx('success');

        const earned = Math.round(state.currentCustomer.price * state.extractedQuality);
        state.cash += earned;
        state.dayIncome += earned;

        state.storyStep[state.currentCustomer.id] += 1;
        document.getElementById('cust-dialog-text').innerText = `Mantap mas! Rasanya pas banget. (+Rp ${earned.toLocaleString('id-ID')})`;
        state.dayReviews.push({ name: state.currentCustomer.name, rating: 5, comment: "Kopi mantap, rasanya otentik!" });

        discardCup();
        saveGame();
        updateUI();
        setTimeout(spawnCustomer, 2000);
    } else {
        playFx('error');
        document.getElementById('cust-dialog-text').innerText = "Kok rasanya beda sama yang saya pesan ya mas?";
    }
}

// Buying Stock & Upgrades
function buyStock(item, qty, price) {
    if (state.cash < price) return alert("Uang kas tidak cukup!");
    playFx('success');
    state.cash -= price;
    state.inventory[item] += qty;
    saveGame();
    updateUI();
}

function buyUpgrade(type, price) {
    if (state.cash < price) return alert("Uang kas tidak cukup!");
    playFx('success');
    state.cash -= price;
    state.upgrades[type] = true;
    document.getElementById(`upg-${type}`).innerText = 'Aktif';
    document.getElementById(`upg-${type}`).disabled = true;
    saveGame();
    updateUI();
}

// Mini Game: Beans Sorting
let mgScore = 0;
let mgTime = 7;
let mgTimerInterval = null;

function startBeansMinigame() {
    mgScore = 0;
    mgTime = 7;
    document.getElementById('mg-score').innerText = mgScore;
    document.getElementById('mg-timer').innerText = mgTime;

    renderBeansGrid();

    mgTimerInterval = setInterval(() => {
        mgTime -= 1;
        document.getElementById('mg-timer').innerText = mgTime;
        if (mgTime <= 0) {
            clearInterval(mgTimerInterval);
            playFx('success');
            alert(`Selesai! Kamu menyortir ${mgScore} biji kopi bersih. Bonus +100g Biji Kopi!`);
            state.inventory.beans += 100;
            saveGame();
            updateUI();
            closeModal('modal-minigame');
        }
    }, 1000);
}

function renderBeansGrid() {
    const grid = document.getElementById('beans-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        const isBad = Math.random() < 0.4;
        const tile = document.createElement('div');
        tile.className = `bean-tile ${isBad ? 'bad' : ''}`;
        tile.innerText = isBad ? '🫘' : '☕';
        tile.addEventListener('click', () => {
            if (isBad) {
                playFx('click');
                mgScore += 1;
                document.getElementById('mg-score').innerText = mgScore;
                tile.style.visibility = 'hidden';
            }
        });
        grid.appendChild(tile);
    }
}

// End Shift Recap
function endShift() {
    state.isShiftActive = false;
    clearInterval(state.patienceTimer);
    document.getElementById('nav-toggle-shift').innerText = '▶️ Buka Kedai';

    const rent = 40000;
    state.cash -= rent;

    document.getElementById('rc-income').innerText = `Rp ${state.dayIncome.toLocaleString('id-ID')}`;
    document.getElementById('rc-net').innerText = `Rp ${state.cash.toLocaleString('id-ID')}`;

    const revContainer = document.getElementById('recap-reviews');
    revContainer.innerHTML = '';
    state.dayReviews.forEach(r => {
        const div = document.createElement('div');
        div.className = 'review-card';
        div.innerHTML = `<strong>${r.name}</strong> (${'⭐'.repeat(r.rating)})<br><small>"${r.comment}"</small>`;
        revContainer.appendChild(div);
    });

    openModal('modal-recap');
}

function startNextDay() {
    state.day += 1;
    state.timeMinutes = 420;
    state.dayIncome = 0;
    state.dayReviews = [];
    closeModal('modal-recap');
    saveGame();
    updateUI();
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
}