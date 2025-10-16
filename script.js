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
        // Дополнительный вызов рендера рулетки при переходе на нее
        if (gameId === 'wheel') {
            renderRouletteWheel();
        }
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
    renderRouletteWheel(); // Рендерим рулетку при старте, чтобы она была готова
    renderPlinkoBoard(); 
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
// 1. ЛОГИКА КОЛЕСА ФОРТУНЫ (WHEEL - РУЛЕТКА)
// =========================================================================
const wheelSvg = document.getElementById('wheel-svg-element');
const wheelBetInput = document.getElementById('wheelBetInput');
const wheelBetMinus = document.getElementById('wheelBetMinus');
const wheelBetPlus = document.getElementById('wheelBetPlus');
const placeBetButton = document.getElementById('placeBetButton');
const wheelGameResult = document.getElementById('wheelGameResult');

let isSpinning = false;

// 0: Green, Odd: Red, Even (non-zero): Black
const rouletteSectors = [
    { number: 0, color: 'green', multiplier: 14.5, angle: 0 },
    { number: 1, color: 'red', multiplier: 2, angle: 0 },
    { number: 2, color: 'black', multiplier: 2, angle: 0 },
    { number: 3, color: 'red', multiplier: 2, angle: 0 },
    { number: 4, color: 'black', multiplier: 2, angle: 0 },
    { number: 5, color: 'red', multiplier: 2, angle: 0 },
    { number: 6, color: 'black', multiplier: 2, angle: 0 },
    { number: 7, color: 'red', multiplier: 2, angle: 0 },
    { number: 8, color: 'black', multiplier: 2, angle: 0 },
    { number: 9, color: 'red', multiplier: 2, angle: 0 },
    { number: 10, color: 'black', multiplier: 2, angle: 0 },
    { number: 11, color: 'red', multiplier: 2, angle: 0 },
    { number: 12, color: 'black', multiplier: 2, angle: 0 },
    { number: 13, color: 'red', multiplier: 2, angle: 0 },
    { number: 14, color: 'black', multiplier: 2, angle: 0 }
];
const numSectors = rouletteSectors.length;
const sectorAngle = 360 / numSectors;

/** Рендерит SVG-колесо с 15 секторами */
function renderRouletteWheel() {
    // Удаляем старые сектора, оставляем только обод и центр
    const centerDot = wheelSvg.querySelector('.center-dot');
    let node = wheelSvg.firstChild;
    while (node !== centerDot) {
        let nextNode = node.nextSibling;
        if (node.tagName === 'path' || node.tagName === 'text') {
            wheelSvg.removeChild(node);
        }
        node = nextNode;
    }

    let html = '';
    const radius = 50; 
    const cx = 50; 
    const cy = 50; 

    rouletteSectors.forEach((sector, index) => {
        const startAngle = index * sectorAngle;
        const endAngle = startAngle + sectorAngle;
        
        // Перевод углов в радианы
        const startRad = (startAngle - 90) * (Math.PI / 180);
        const endRad = (endAngle - 90) * (Math.PI / 180);

        // Координаты дуги
        const x1 = cx + radius * Math.cos(startRad);
        const y1 = cy + radius * Math.sin(startRad);
        const x2 = cx + radius * Math.cos(endRad);
        const y2 = cy + radius * Math.sin(endRad);
        
        // Определяем цвет
        let fillColor;
        if (sector.color === 'green') fillColor = 'var(--roulette-green)';
        else if (sector.color === 'red') fillColor = 'var(--roulette-red)';
        else fillColor = 'var(--roulette-black)';
        
        // Path (сектор)
        html += `<path d="M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 0,1 ${x2},${y2} Z" fill="${fillColor}"/>`;

        // Текст (номер)
        const textAngle = startAngle + sectorAngle / 2;
        const textRadius = radius * 0.75;
        const textX = cx + textRadius * Math.cos((textAngle - 90) * (Math.PI / 180));
        const textY = cy + textRadius * Math.sin((textAngle - 90) * (Math.PI / 180));
        
        // Поворот текста для ориентации
        const rotateValue = textAngle + 90;
        
        html += `<text class="sector-roulette-label" x="${textX}" y="${textY}" transform="rotate(${rotateValue} ${textX} ${textY})">${sector.number}</text>`;
    });

    wheelSvg.querySelector('circle:first-of-type').insertAdjacentHTML('afterend', html);
}

/** Инициализация кнопок управления ставкой */
wheelBetMinus.addEventListener('click', () => {
    let bet = parseFloat(wheelBetInput.value);
    bet = Math.max(1, bet - 10);
    wheelBetInput.value = bet;
});

wheelBetPlus.addEventListener('click', () => {
    let bet = parseFloat(wheelBetInput.value);
    bet = Math.min(10000, bet + 10);
    wheelBetInput.value = bet;
});


placeBetButton.addEventListener('click', () => {
    if (isSpinning) return;
    
    // В реальном приложении здесь нужно выбрать, на что ставит игрок (цвет, число и т.д.)
    const bet = parseFloat(wheelBetInput.value);
    if (isNaN(bet) || bet <= 0 || userBalance < bet) {
        WebApp.showPopup({ message: "Некорректная ставка или недостаточно средств." });
        return;
    }

    userBalance -= bet;
    updateBalanceDisplay();
    placeBetButton.disabled = true;
    wheelGameResult.textContent = 'Ставка принята! Идет игра...';
    
    const winningIndex = Math.floor(Math.random() * numSectors); 
    const winningSector = rouletteSectors[winningIndex];
    
    // Целевой угол
    const targetAngle = winningIndex * sectorAngle + sectorAngle / 2;
    
    // Угол, на который нужно повернуть, чтобы указатель оказался в центре сектора
    // Сектора в SVG идут против часовой стрелки, поэтому нужно инвертировать
    const fullSpins = 360 * (10 + Math.floor(Math.random() * 5)); 
    // Вычисление конечного угла для указателя вверху
    const finalRotation = fullSpins + (360 - targetAngle) + (Math.random() * sectorAngle * 0.6 - sectorAngle * 0.3);
    
    wheelSvg.style.transition = 'transform 6s cubic-bezier(0.25, 0.1, 0.25, 1.0)';
    wheelSvg.style.transform = `rotate(${finalRotation}deg)`;

    isSpinning = true;
    
    // Результат
    setTimeout(() => {
        isSpinning = false;
        placeBetButton.disabled = false;
        
        // ВАЖНО: Поскольку мы не знаем, на что ставил игрок, мы просто показываем результат.
        // Для демонстрации представим, что игрок поставил на "Красное" (Odd numbers 1-13)
        const isOdd = winningSector.number !== 0 && winningSector.number % 2 !== 0;
        const winMultiplier = isOdd ? 2 : 0; 
        
        let message;
        if (isOdd) {
            // Условный выигрыш
            const winAmount = bet * 2;
            userBalance += winAmount;
            message = `🎉 Выпало ${winningSector.number} (${winningSector.color.toUpperCase()})! Вы выиграли ${(winAmount - bet).toFixed(2)} (x2).`;
        } else {
             // Условный проигрыш
             message = `🎲 Выпало ${winningSector.number} (${winningSector.color.toUpperCase()}). Ставка на Красное проиграна.`;
        }
        
        updateBalanceDisplay();
        wheelGameResult.textContent = message;
        
        // Сброс трансформации, чтобы подготовить колесо к следующему вращению
        wheelSvg.style.transition = 'none';
        wheelSvg.style.transform = `rotate(${finalRotation % 360}deg)`;
        
    }, 6000);
});


// =========================================================================
// 2. ЛОГИКА МИНЁРА (MINES) - ВОЗВРАЩЕНИЕ К СТАНДАРТНЫМ КОЭФФИЦИЕНТАМ
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

// ВОЗВРАЩЕНИЕ К СТАНДАРТНЫМ (ОРИГИНАЛЬНЫМ) КОЭФФИЦИЕНТАМ
const multipliersTable = {
    // Оригинальные множители, которые были до последнего изменения
    '3': [1.32, 1.76, 2.34, 3.12, 4.16, 5.55, 7.40, 9.87, 13.16, 17.55, 23.40, 31.20, 41.60, 55.47, 73.96, 98.61, 131.48, 175.31, 233.75, 311.67, 415.56, 554.08],
    '5': [1.65, 2.47, 3.71, 5.57, 8.35, 12.52, 18.78, 28.17, 42.26, 63.39, 95.09, 142.63, 213.95, 320.93, 481.40, 722.10, 1083.15, 1624.73, 2437.10, 3655.65],
    '10': [3.30, 6.61, 13.22, 26.45, 52.89, 105.79, 211.58, 423.15, 846.31, 1692.62, 3385.24, 6770.47, 13540.94, 27081.88, 54163.76],
    '24': [25.00] 
};

function generateMines() {
    // ... (логика генерации мин - без изменений) ...
}

function renderMinesGrid() {
    // ... (логика рендеринга сетки - без изменений) ...
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
    // ... (логика начала игры - без изменений) ...
    const bet = parseFloat(minesBetInput.value);
    if (isNaN(bet) || bet <= 0 || userBalance < bet) {
        WebApp.showPopup({ message: "Некорректная ставка или недостаточно средств." });
        return;
    }
    
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
    // ... (логика окончания игры - без изменений) ...
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
// ... (Вся логика Плинко - без изменений) ...

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
    'low': [0.5, 1, 1.2, 1.5, 1.8, 1.5, 1.2, 1, 0.5], 
    'medium': [0.2, 0.5, 1, 1.5, 2, 5, 2, 1.5, 1, 0.5, 0.2], 
    'high': [0.1, 0.2, 0.5, 1, 2, 5, 10, 5, 2, 1, 0.5, 0.2, 0.1] 
};

function renderPlinkoBoard() {
    const width = 400;
    const height = 300;
    const numRows = 7;
    const pegSpacingX = 30;
    const pegSpacingY = 30;
    const numOutcomes = 13; 

    // Очистка
    plinkoPegsGroup.innerHTML = '';
    plinkoOutcomesGroup.innerHTML = '';
    plinkoDividersGroup.innerHTML = '';
    
    // 1. Рисуем колышки
    for (let r = 0; r < numRows; r++) {
        const numPegsInRow = 4 + r; 
        const startX = width / 2 - (numPegsInRow - 1) * pegSpacingX / 2;
        
        for (let i = 0; i < numPegsInRow; i++) {
            const cx = startX + i * pegSpacingX;
            const cy = 50 + r * pegSpacingY;
            const peg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            peg.setAttribute('cx', cx);
            peg.setAttribute('cy', cy);
            peg.setAttribute('r', 3);
            peg.classList.add('plinko-peg');
            plinkoPegsGroup.appendChild(peg);
        }
    }
    
    // 2. Рисуем разделители
    const outcomesY = height - 20;
    const slotWidth = width / numOutcomes;
    
    for (let i = 0; i <= numOutcomes; i++) {
        const x = i * slotWidth;
        const divider = document.createElementNS("http://www.w3.org/2000/svg", "line");
        divider.setAttribute('x1', x);
        divider.setAttribute('y1', outcomesY - 20);
        divider.setAttribute('x2', x);
        divider.setAttribute('y2', outcomesY + 10);
        divider.classList.add('plinko-divider');
        plinkoDividersGroup.appendChild(divider);
    }
    
    // 3. Рисуем текст множителей (для среднего риска)
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
    
    const winningSlotIndex = Math.floor(Math.random() * multipliers.length);
    const winMultiplier = multipliers[winningSlotIndex];
    
    const totalSlots = multipliers.length;
    const slotWidth = 400 / totalSlots;
    const targetX = winningSlotIndex * slotWidth + slotWidth / 2;
    
    // 1. Сброс и подготовка шарика
    plinkoBall.classList.remove('ball-active');
    plinkoBall.classList.remove('ball-hidden');
    plinkoBall.style.transform = `translate(0, 0)`; 
    plinkoBall.style.opacity = '1';
    
    // 2. Установка начальной позиции и запуск анимации
    requestAnimationFrame(() => {
        const animationDuration = 3000; 
        
        const keyframes = [
            { transform: `translate(0px, 0px)` },
            { transform: `translate(${(targetX - 200) * 0.2}px, 50px)`, offset: 0.1 },
            { transform: `translate(${(targetX - 200) * 0.5}px, 150px)`, offset: 0.4 },
            { transform: `translate(${(targetX - 200) * 0.8}px, 250px)`, offset: 0.8 },
            { transform: `translate(${targetX - 200}px, 280px)`, offset: 1 }
        ];

        plinkoBall.animate(keyframes, {
            duration: animationDuration,
            easing: 'linear', 
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
        plinkoBall.style.transform = `translate(${targetX - 200}px, 280px)`; 

        updateBalanceDisplay();
        plinkoGameResult.textContent = message;
        plinkoDropButton.disabled = false;
    }, 3000);
}

plinkoDropButton.addEventListener('click', dropPlinkoBall);

// Запуск основного приложения
initTelegram();