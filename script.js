const WebApp = window.Telegram.WebApp;

// Общие элементы
const userBalanceElem = document.getElementById('userBalance');
const appTitle = document.getElementById('appTitle');
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const gameCards = document.querySelectorAll('.game-card');

let userBalance = 1000.00;

// --- УПРАВЛЕНИЕ ВИДАМИ (NAVIGATOR) ---

/** Переключает видимость между разными "страницами" (view) */
function showView(targetId) {
    views.forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(targetId + 'View').classList.add('active');
    
    navButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-btn[data-target="${targetId}"]`)?.classList.add('active');
    
    if (targetId === 'menu') {
        appTitle.textContent = 'Главное Меню';
    } else if (targetId === 'profile') {
        appTitle.textContent = 'Личный Кабинет';
        updateProfileView();
    } else {
        const gameName = document.getElementById(targetId + 'View').querySelector('.game-title').textContent;
        appTitle.textContent = gameName;
    }
}

/** Обработчик кликов по карточкам игр в меню */
gameCards.forEach(card => {
    card.addEventListener('click', () => {
        const gameId = card.getAttribute('data-game');
        showView(gameId);
    });
});

/** Обработчик кликов по кнопкам навигации */
navButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        showView(target);
    });
});

// --- ОБЩАЯ ИНИЦИАЛИЗАЦИЯ И ФУНКЦИИ ---

function initTelegram() {
    if (WebApp.initDataUnsafe) {
        document.body.classList.add('tg-theme');
        WebApp.ready();
        
        // Настраиваем MainButton
        WebApp.MainButton.setText('Пополнить Баланс');
        WebApp.MainButton.onClick(showAlert);
        WebApp.MainButton.show();
        
        // Обновляем ID в кабинете
        const userId = WebApp.initDataUnsafe.user ? WebApp.initDataUnsafe.user.id : 'Тестовый ID';
        document.getElementById('profileUserId').textContent = `#${userId}`;
    } else {
        console.warn("Запустите это приложение внутри Telegram!");
    }
    updateBalanceDisplay();
    showView('menu'); // Начинаем с меню
}

function showAlert() {
    WebApp.showAlert('В реальном приложении здесь будет окно пополнения!');
}

function updateBalanceDisplay() {
    userBalanceElem.textContent = userBalance.toFixed(2);
    document.getElementById('profileUserBalance').textContent = userBalance.toFixed(2) + ' 💎';
}

function updateProfileView() {
    // В реальном приложении: здесь запрос к бэкенду за историей
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = `
        <li>Колесо Удачи: -10.00, Проигрыш</li>
        <li>Минёр: +50.00, Выигрыш (Кэшаут)</li>
        <li>Плинко: +5.00, Выигрыш</li>
        <li style="color: var(--tg-theme-hint-color);">*Это тестовая история*</li>
    `;
}

// =========================================================================
// 1. ЛОГИКА КОЛЕСА ФОРТУНЫ (WHEEL)
// =========================================================================
const wheelSvg = document.getElementById('wheel-svg-element');
const wheelBetInput = document.getElementById('wheelBetInput');
const spinButton = document.getElementById('spinButton');
const wheelGameResult = document.getElementById('wheelGameResult');
let isSpinning = false;
const wheelSectors = [
    { name: 'x2', multiplier: 2, angle: 0 },
    { name: 'x0.5', multiplier: 0.5, angle: 90 },
    { name: 'x0', multiplier: 0, angle: 180 },
    { name: 'x3', multiplier: 3, angle: 270 }
];

spinButton.addEventListener('click', () => {
    if (isSpinning) return;
    
    const bet = parseFloat(wheelBetInput.value);
    if (isNaN(bet) || bet <= 0 || userBalance < bet) {
        WebApp.showPopup({ message: "Некорректная ставка или недостаточно средств." });
        return;
    }

    userBalance -= bet;
    updateBalanceDisplay();
    spinButton.disabled = true;
    isSpinning = true;
    wheelGameResult.textContent = 'Вращаем... Удачи!';

    const winningSectorIndex = Math.floor(Math.random() * wheelSectors.length); 
    const winningSector = wheelSectors[winningSectorIndex];
    
    const fullSpins = 360 * (6 + Math.floor(Math.random() * 3)); 
    const targetSectorCenterAngle = winningSector.angle + 45; 
    const finalRotation = fullSpins + (360 - targetSectorCenterAngle) + (Math.random() * 60 - 30);

    wheelSvg.style.transition = 'transform 3s cubic-bezier(0.25, 0.1, 0.25, 1.0)';
    wheelSvg.style.transform = `rotate(${finalRotation}deg)`;

    setTimeout(() => {
        const winAmount = bet * winningSector.multiplier;
        userBalance += winAmount;
        
        let message;
        if (winningSector.multiplier > 1) {
            message = `🎉 ВЫИГРЫШ! +${(winAmount - bet).toFixed(2)} (x${winningSector.multiplier.toFixed(1)}).`;
        } else if (winningSector.multiplier === 0) {
            message = `😭 Проигрыш! Выпал 'x0'.`;
        } else {
            message = `👍 Ваш выигрыш: ${winAmount.toFixed(2)} (x${winningSector.multiplier.toFixed(1)}).`;
        }
        
        updateBalanceDisplay();
        wheelGameResult.textContent = message;
        spinButton.disabled = false;
        isSpinning = false;
        
        wheelSvg.style.transition = 'none';
        wheelSvg.style.transform = `rotate(${finalRotation % 360}deg)`;
    }, 3000);
});

// =========================================================================
// 2. ЛОГИКА МИНЁРА (MINES)
// =========================================================================
const minesGrid = document.getElementById('minesGrid');
const minesStartButton = document.getElementById('minesStartButton');
const minesCashoutButton = document.getElementById('minesCashoutButton');
const minesBetInput = document.getElementById('minesBetInput');
const minesCountInput = document.getElementById('minesCount');
const minesOpenedCountSpan = document.getElementById('minesOpenedCount');
const minesMultiplierSpan = document.getElementById('minesMultiplier');
const minesGameResult = document.getElementById('minesGameResult');

let isMinesActive = false;
let minesLocation = []; // Индексы мин
let openedCells = 0;
let currentMinesMultiplier = 1.00;
const cellCount = 25; // 5x5

// Таблица множителей (просто пример, неточная математика)
const multipliersTable = {
    '1': [1.03, 1.06, 1.10, 1.15, 1.25, 1.4, 1.6, 1.8, 2.1, 2.5],
    '3': [1.01, 1.04, 1.06, 1.08, 1.10, 1.15, 1.20, 1.30, 1.40, 1.6],
    '5': [1.01, 1.02, 1.03, 1.04, 1.05, 1.06, 1.08, 1.10, 1.15, 1.2]
};

function generateMines() {
    const minesNum = parseInt(minesCountInput.value);
    minesLocation = [];
    while (minesLocation.length < minesNum) {
        const randomCell = Math.floor(Math.random() * cellCount);
        if (!minesLocation.includes(randomCell)) {
            minesLocation.push(randomCell);
        }
    }
}

function renderMinesGrid() {
    minesGrid.innerHTML = '';
    for (let i = 0; i < cellCount; i++) {
        const cell = document.createElement('div');
        cell.className = 'mine-cell';
        cell.dataset.index = i;
        cell.addEventListener('click', handleMinesClick);
        minesGrid.appendChild(cell);
    }
}

function handleMinesClick(e) {
    if (!isMinesActive || e.target.classList.contains('revealed')) return;

    const index = parseInt(e.target.dataset.index);
    e.target.classList.add('revealed');
    e.target.classList.add('disabled'); // Открытые ячейки неактивны

    if (minesLocation.includes(index)) {
        // Мина найдена!
        e.target.classList.add('mine');
        e.target.innerHTML = '💣';
        endMinesGame(false);
    } else {
        // Безопасная ячейка
        e.target.classList.add('safe');
        openedCells++;
        
        const minesNum = minesCountInput.value;
        const multiplierArr = multipliersTable[minesNum];

        // Множитель обновляется
        currentMinesMultiplier = multiplierArr[openedCells - 1] || currentMinesMultiplier;
        minesOpenedCountSpan.textContent = openedCells;
        minesMultiplierSpan.textContent = currentMinesMultiplier.toFixed(2);
        
        e.target.textContent = `x${currentMinesMultiplier.toFixed(2)}`;

        // Кэшаут доступен
        minesCashoutButton.disabled = false;
        minesCashoutButton.textContent = `Забрать ${(parseFloat(minesBetInput.value) * currentMinesMultiplier).toFixed(2)}`;

        if (openedCells >= cellCount - parseInt(minesCountInput.value)) {
            // Игрок открыл все безопасные ячейки
            endMinesGame(true);
        }
    }
}

function startMinesGame() {
    const bet = parseFloat(minesBetInput.value);
    if (isNaN(bet) || bet <= 0 || userBalance < bet) {
        WebApp.showPopup({ message: "Некорректная ставка или недостаточно средств." });
        return;
    }
    
    // В реальном казино: здесь запрос к бэкенду на старт игры и списание средств
    isMinesActive = true;
    openedCells = 0;
    currentMinesMultiplier = 1.00;
    minesOpenedCountSpan.textContent = openedCells;
    minesMultiplierSpan.textContent = currentMinesMultiplier.toFixed(2);
    minesGameResult.textContent = 'Игра активна. Открывайте клетки!';
    
    minesStartButton.disabled = true;
    minesBetInput.disabled = true;
    minesCountInput.disabled = true;
    minesCashoutButton.classList.add('hidden');
    minesCashoutButton.disabled = true;

    generateMines();
    renderMinesGrid();
}

function endMinesGame(isWin) {
    isMinesActive = false;
    minesStartButton.disabled = false;
    minesBetInput.disabled = false;
    minesCountInput.disabled = false;
    minesCashoutButton.classList.add('hidden');

    const bet = parseFloat(minesBetInput.value);

    // Раскрываем все ячейки
    minesGrid.querySelectorAll('.mine-cell').forEach(cell => {
        cell.classList.add('revealed');
        cell.classList.add('disabled');
        const index = parseInt(cell.dataset.index);
        if (minesLocation.includes(index) && !cell.classList.contains('mine')) {
             cell.classList.add('mine');
             cell.innerHTML = '💣';
        }
    });

    if (isWin) {
        const winAmount = bet * currentMinesMultiplier;
        userBalance += winAmount;
        minesGameResult.textContent = `✅ Выигрыш! Вы забрали ${winAmount.toFixed(2)} (x${currentMinesMultiplier.toFixed(2)}).`;
    } else {
        // Мина. Баланс уже списан при старте.
        minesGameResult.textContent = `💥 Вы проиграли ${bet.toFixed(2)}. Баланс сгорел.`;
    }
    updateBalanceDisplay();
}

minesStartButton.addEventListener('click', startMinesGame);
minesCashoutButton.addEventListener('click', () => {
    endMinesGame(true);
});

// Инициализируем сетку при загрузке
document.addEventListener('DOMContentLoaded', renderMinesGrid);


// =========================================================================
// 3. ЛОГИКА ПЛИНКО (PLINKO)
// =========================================================================
const plinkoDropButton = document.getElementById('plinkoDropButton');
const plinkoBetInput = document.getElementById('plinkoBetInput');
const plinkoRiskInput = document.getElementById('plinkoRisk');
const plinkoGameResult = document.getElementById('plinkoGameResult');

// Множители для разных уровней риска
const plinkoMultipliers = {
    'low': [0.5, 1, 1.2, 1.5, 1.8, 1.5, 1.2, 1, 0.5],
    'medium': [0.2, 0.5, 1, 1.5, 2, 5, 2, 1.5, 1, 0.5, 0.2],
    'high': [0.1, 0.2, 0.5, 1, 2, 5, 10, 5, 2, 1, 0.5, 0.2, 0.1]
};

function dropPlinkoBall() {
    const bet = parseFloat(plinkoBetInput.value);
    if (isNaN(bet) || bet <= 0 || userBalance < bet) {
        WebApp.showPopup({ message: "Некорректная ставка или недостаточно средств." });
        return;
    }

    // 1. Снимаем ставку
    userBalance -= bet;
    updateBalanceDisplay();
    plinkoDropButton.disabled = true;
    plinkoGameResult.textContent = 'Шарик в пути...';

    // 2. Определяем результат
    const risk = plinkoRiskInput.value;
    const multipliers = plinkoMultipliers[risk];
    
    // Выбираем случайный множитель
    const winMultiplier = multipliers[Math.floor(Math.random() * multipliers.length)];
    const winAmount = bet * winMultiplier;

    // Имитация задержки падения шарика
    setTimeout(() => {
        userBalance += winAmount;
        
        let message;
        if (winMultiplier >= 1) {
            message = `✨ Удача! Выпал x${winMultiplier.toFixed(1)}. Выигрыш: +${(winAmount - bet).toFixed(2)}.`;
        } else {
            message = `😞 Не повезло. Выпал x${winMultiplier.toFixed(1)}. Потеря: ${(bet - winAmount).toFixed(2)}.`;
        }

        updateBalanceDisplay();
        plinkoGameResult.textContent = message;
        plinkoDropButton.disabled = false;
    }, 1500); // 1.5 секунды на "падение"
}

plinkoDropButton.addEventListener('click', dropPlinkoBall);


// Запуск основного приложения
initTelegram();