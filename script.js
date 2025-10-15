const WebApp = window.Telegram.WebApp;

// Общие элементы
const userBalanceElem = document.getElementById('userBalance');
const appTitle = document.getElementById('appTitle');
const navButtons = document.querySelectorAll('.nav-btn');
const views = document.querySelectorAll('.view');
const gameCards = document.querySelectorAll('.game-card');

let userBalance = 1000.00;

// --- УПРАВЛЕНИЕ ВИДАМИ (NAVIGATOR) ---
function showView(targetId) {
    views.forEach(view => {
        view.classList.remove('active');
    });
    document.getElementById(targetId + 'View').classList.add('active');
    
    navButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.nav-btn[data-target="${targetId}"]`)?.classList.add('active');
    
    if (targetId === 'menu') {
        appTitle.textContent = 'PUSH UP';
    } else if (targetId === 'profile') {
        appTitle.textContent = 'Личный Кабинет';
        updateProfileView();
    } else {
        const gameName = document.getElementById(targetId + 'View').querySelector('.game-title').textContent;
        appTitle.textContent = gameName;
    }
}

gameCards.forEach(card => {
    card.addEventListener('click', () => {
        const gameId = card.getAttribute('data-game');
        showView(gameId);
    });
});

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
        
        WebApp.MainButton.setText('Пополнить Баланс');
        WebApp.MainButton.onClick(showAlert);
        WebApp.MainButton.show();
        
        const userId = WebApp.initDataUnsafe.user ? WebApp.initDataUnsafe.user.id : 'Тестовый ID';
        document.getElementById('profileUserId').textContent = `#${userId}`;
    } else {
        console.warn("Запустите это приложение внутри Telegram!");
    }
    updateBalanceDisplay();
    renderPlinkoBoard(); // Рендерим доску при старте
    showView('menu');
}

function showAlert() {
    WebApp.showAlert('В реальном приложении здесь будет окно пополнения!');
}

function updateBalanceDisplay() {
    userBalanceElem.textContent = userBalance.toFixed(2);
    document.getElementById('profileUserBalance').textContent = userBalance.toFixed(2) + ' 💎';
}
function updateProfileView() { /* ... */ }

// =========================================================================
// 1. ЛОГИКА КОЛЕСА ФОРТУНЫ (WHEEL)
// =========================================================================
// ... (логика Колеса без изменений) ...

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
let minesLocation = [];
let openedCells = 0;
let currentMinesMultiplier = 1.00;
const cellCount = 25; // 5x5

// Обновленная таблица множителей
const multipliersTable = {
    '3': [1.07, 1.23, 1.41, 1.64, 1.94, 2.29, 2.76, 3.42, 4.38, 5.84, 8.24, 12.6, 21.8, 48.7, 187.6, 1200, 15000, 300000, 10000000, 500000000, 5000000000, 50000000000, 500000000000],
    '5': [1.18, 1.50, 1.94, 2.44, 3.25, 4.41, 6.29, 9.54, 15.6, 28.5, 59.9, 179, 898, 9000, 100000, 2000000, 70000000, 4000000000, 400000000000, 40000000000000],
    '10': [1.51, 2.71, 4.80, 8.44, 16.25, 32.29, 71.9, 182, 575, 2300, 12600, 91000, 1000000, 20000000, 700000000, 40000000000, 4000000000000],
    '24': [27.21] // Только одно значение, т.к. можно открыть только 1 безопасную клетку
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
    e.target.classList.add('disabled');

    if (minesLocation.includes(index)) {
        e.target.classList.add('mine');
        e.target.innerHTML = '💣';
        endMinesGame(false);
    } else {
        // Безопасная ячейка
        e.target.classList.add('safe');
        openedCells++;
        
        const minesNum = minesCountInput.value;
        const multiplierArr = multipliersTable[minesNum];

        // Получаем множитель из таблицы
        currentMinesMultiplier = multiplierArr[openedCells - 1] || currentMinesMultiplier;
        minesOpenedCountSpan.textContent = openedCells;
        minesMultiplierSpan.textContent = currentMinesMultiplier.toFixed(2);
        
        e.target.textContent = `x${currentMinesMultiplier.toFixed(2)}`;

        // Кэшаут доступен
        minesCashoutButton.disabled = false;
        minesCashoutButton.classList.remove('hidden');
        minesCashoutButton.textContent = `Забрать ${(parseFloat(minesBetInput.value) * currentMinesMultiplier).toFixed(2)}`;

        if (openedCells >= cellCount - parseInt(minesCountInput.value)) {
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
    
    // Снимаем ставку (условно)
    userBalance -= bet;
    updateBalanceDisplay();

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
        minesGameResult.textContent = `💥 Вы проиграли ${bet.toFixed(2)}. Баланс сгорел.`;
    }
    updateBalanceDisplay();
}

minesStartButton.addEventListener('click', startMinesGame);
minesCashoutButton.addEventListener('click', () => {
    endMinesGame(true);
});

document.addEventListener('DOMContentLoaded', renderMinesGrid);


// =========================================================================
// 3. ЛОГИКА ПЛИНКО (PLINKO)
// =========================================================================
const plinkoDropButton = document.getElementById('plinkoDropButton');
const plinkoBetInput = document.getElementById('plinkoBetInput');
const plinkoRiskInput = document.getElementById('plinkoRisk');
const plinkoGameResult = document.getElementById('plinkoGameResult');
const plinkoSvg = document.getElementById('plinkoSvg');
const plinkoBall = document.getElementById('plinkoBall');
const plinkoPegsGroup = document.getElementById('plinkoPegs');
const plinkoOutcomesGroup = document.getElementById('plinkoOutcomes');
const plinkoDividersGroup = document.getElementById('plinkoDividers');

// Множители для разных уровней риска (для определения выигрыша)
const plinkoMultipliers = {
    'low': [0.5, 1, 1.2, 1.5, 1.8, 1.5, 1.2, 1, 0.5], // 9 слотов
    'medium': [0.2, 0.5, 1, 1.5, 2, 5, 2, 1.5, 1, 0.5, 0.2], // 11 слотов
    'high': [0.1, 0.2, 0.5, 1, 2, 5, 10, 5, 2, 1, 0.5, 0.2, 0.1] // 13 слотов
};

function renderPlinkoBoard() {
    // Параметры SVG
    const width = 400;
    const height = 300;
    const numRows = 7;
    const pegRadius = 3;
    const pegSpacingX = 30;
    const pegSpacingY = 30;
    const numOutcomes = 13; // Максимальное количество слотов

    // Очистка
    plinkoPegsGroup.innerHTML = '';
    plinkoOutcomesGroup.innerHTML = '';
    plinkoDividersGroup.innerHTML = '';
    
    // 1. Рисуем колышки
    for (let r = 0; r < numRows; r++) {
        const numPegsInRow = 4 + r; // Например, 4, 5, 6, 7...
        const startX = width / 2 - (numPegsInRow - 1) * pegSpacingX / 2;
        
        for (let i = 0; i < numPegsInRow; i++) {
            const cx = startX + i * pegSpacingX;
            const cy = 50 + r * pegSpacingY;
            const peg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            peg.setAttribute('cx', cx);
            peg.setAttribute('cy', cy);
            peg.setAttribute('r', pegRadius);
            peg.classList.add('plinko-peg');
            plinkoPegsGroup.appendChild(peg);
        }
    }
    
    // 2. Рисуем разделители и слоты результатов (используем максимальное число слотов)
    const outcomesY = height - 20;
    const slotWidth = width / numOutcomes;
    
    for (let i = 0; i <= numOutcomes; i++) {
        // Разделители
        const x = i * slotWidth;
        const divider = document.createElementNS("http://www.w3.org/2000/svg", "line");
        divider.setAttribute('x1', x);
        divider.setAttribute('y1', outcomesY - 20);
        divider.setAttribute('x2', x);
        divider.setAttribute('y2', outcomesY + 10);
        divider.classList.add('plinko-divider');
        plinkoDividersGroup.appendChild(divider);
    }
    
    // 3. Рисуем текст множителей (только для среднего риска для примера)
    const mediumMultipliers = plinkoMultipliers['medium'];
    const mediumSlots = mediumMultipliers.length;
    const mediumSlotWidth = width / mediumSlots;
    
    for (let i = 0; i < mediumSlots; i++) {
        const textX = i * mediumSlotWidth + mediumSlotWidth / 2;
        const textY = outcomesY + 5;
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute('x', textX);
        text.setAttribute('y', textY);
        text.classList.add('plinko-outcome-text');
        text.textContent = `x${mediumMultipliers[i].toFixed(1)}`;
        
        // Визуальное выделение (пример)
        if (mediumMultipliers[i] >= 5) {
             text.style.fill = 'var(--plinko-high-color)';
        } else if (mediumMultipliers[i] < 1) {
             text.style.fill = 'var(--plinko-low-color)';
        } else {
             text.style.fill = 'var(--plinko-medium-color)';
        }
        
        plinkoOutcomesGroup.appendChild(text);
    }
}

function dropPlinkoBall() {
    const bet = parseFloat(plinkoBetInput.value);
    if (isNaN(bet) || bet <= 0 || userBalance < bet) {
        WebApp.showPopup({ message: "Некорректная ставка или недостаточно средств." });
        return;
    }

    userBalance -= bet;
    updateBalanceDisplay();
    plinkoDropButton.disabled = true;
    plinkoGameResult.textContent = 'Шарик в пути...';

    const risk = plinkoRiskInput.value;
    const multipliers = plinkoMultipliers[risk];
    
    // Определяем случайный слот и множитель
    const winningSlotIndex = Math.floor(Math.random() * multipliers.length);
    const winMultiplier = multipliers[winningSlotIndex];
    
    // Определяем конечную X-координату для анимации (в центре выигрышного слота)
    const totalSlots = multipliers.length;
    const slotWidth = 400 / totalSlots;
    const targetX = winningSlotIndex * slotWidth + slotWidth / 2;
    
    // 1. Сброс и подготовка шарика
    plinkoBall.classList.remove('ball-active');
    plinkoBall.classList.remove('ball-hidden');
    plinkoBall.style.transform = `translate(0, 0)`; // Сброс трансформации
    plinkoBall.style.opacity = '1';
    
    // 2. Установка начальной позиции и запуск анимации
    requestAnimationFrame(() => {
        // Задаем анимацию падения (Y) и горизонтального сдвига (X)
        const animationDuration = 3000; // 3 секунды
        
        // Создаем ключевые кадры анимации в JS для имитации зигзага
        const keyframes = [
            { transform: `translate(0px, 0px)` },
            { transform: `translate(${(targetX - 200) * 0.2}px, 50px)`, offset: 0.1 },
            { transform: `translate(${(targetX - 200) * 0.5}px, 150px)`, offset: 0.4 },
            { transform: `translate(${(targetX - 200) * 0.8}px, 250px)`, offset: 0.8 },
            { transform: `translate(${targetX - 200}px, 280px)`, offset: 1 }
        ];

        plinkoBall.animate(keyframes, {
            duration: animationDuration,
            easing: 'linear', // упрощенный стиль падения
            fill: 'forwards'
        });
        
    });

    // 3. Обработка результата после анимации
    setTimeout(() => {
        const winAmount = bet * winMultiplier;
        userBalance += winAmount;
        
        let message;
        if (winMultiplier >= 1) {
            message = `✨ Удача! Выпал x${winMultiplier.toFixed(1)}. Выигрыш: +${(winAmount - bet).toFixed(2)}.`;
        } else {
            message = `😞 Не повезло. Выпал x${winMultiplier.toFixed(1)}. Потеря: ${(bet - winAmount).toFixed(2)}.`;
        }
        
        // Скрываем шарик
        plinkoBall.classList.add('ball-hidden');
        plinkoBall.style.transform = `translate(${targetX - 200}px, 280px)`; // Фиксируем в конце

        updateBalanceDisplay();
        plinkoGameResult.textContent = message;
        plinkoDropButton.disabled = false;
    }, 3000);
}

plinkoDropButton.addEventListener('click', dropPlinkoBall);

// Запуск основного приложения
initTelegram();