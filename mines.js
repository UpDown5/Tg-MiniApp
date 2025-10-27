export function initMines({
  gridRoot,          // контейнер для сетки 5x5 (div)
  betInput,          // <input> со ставкой
  bombsSelect,       // <select>/<input number> с числом бомб (напр. 3..15)
  newRoundBtn,       // кнопка "Новый раунд" / "Играть"
  cashoutBtn,        // кнопка "Забрать"
  infoLabel,         // div/span для текста статуса (множитель, прогресс)
  onSpend,           // function(bet): boolean | void (false — отменить)
  onWin,             // function(amount, label)
  onLose,            // function(label)
  houseEdge = 0.02   // маржа 2% → EV = 0.98
}) {
  // ---------- КОНСТАНТЫ ----------
  const SIZE = 5;                 // поле 5×5
  const CELLS = SIZE * SIZE;      // 25
  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));

  // ---------- СОСТОЯНИЕ ----------
  let B = readBombs();
  let bet = 0;
  let board = [];                 // массив длины 25: 'bomb' | 'safe'
  let revealed = new Set();       // индексы открытых safe-клеток
  let locked = false;             // блокировка до нового раунда
  let spent = false;              // ставка списана
  let currentMultiplier = 1;      // M_t (с учётом маржи)
  let t = 0;                      // открытых safe
  let S = CELLS - B;              // безопасных всего

  // ---------- ЧИСТАЯ МАТЕМАТИКА ----------
  // вероятность открыть t безопасных подряд (без взрыва)
  function probT(t, S, N) {
    if (t < 0) return 0;
    if (t === 0) return 1;
    let p = 1;
    for (let i = 0; i < t; i++) {
      p *= (S - i) / (N - i);
    }
    return p;
  }
  // справедливый множитель при t открытых safe
  function fairMul(t, S, N) {
    const p = probT(t, S, N);
    return p > 0 ? (1 / p) : Infinity;
  }
  // с маржой
  function houseMul(t, S, N, H) {
    return (1 - H) * fairMul(t, S, N);
  }
  // форматирование множителя
  function fmtMul(x) {
    if (!isFinite(x) || x > 9999) return '∞';
    return (x < 10 ? x.toFixed(2) : x.toFixed(1)).replace(/\.0+$/,'');
  }
  // формат денег
  const fmtMoney = (n) => {
    try {
      return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(n);
    } catch {
      return String(Math.round(n * 100) / 100);
    }
  };

  // ---------- УТИЛИТЫ ----------
  function readBombs() {
    const v = Number((bombsSelect?.value ?? bombsSelect?.dataset?.value) || 5);
    const b = Number.isFinite(v) ? Math.round(v) : 5;
    return clamp(b, 1, 20); // разумный диапазон
  }

  function setInfo(text) {
    if (!infoLabel) return;
    infoLabel.textContent = text;
  }

  function cellId(r, c) { return r * SIZE + c; }

  function resetState() {
    B = readBombs();
    S = CELLS - B;
    board = Array(CELLS).fill('safe');
    revealed.clear();
    locked = false;
    spent = false;
    currentMultiplier = 1;
    t = 0;
  }

  function layBombs() {
    // случайно расставляем B мин
    const idxs = Array.from({ length: CELLS }, (_, i) => i);
    for (let i = idxs.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [idxs[i], idxs[j]] = [idxs[j], idxs[i]];
    }
    for (let k = 0; k < B; k++) board[idxs[k]] = 'bomb';
  }

  function buildGrid() {
    if (!gridRoot) return;
    gridRoot.innerHTML = '';
    gridRoot.style.display = 'grid';
    gridRoot.style.gridTemplateColumns = `repeat(${SIZE}, 1fr)`;
    gridRoot.style.gap = '8px';

    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const id = cellId(r, c);
        const tile = document.createElement('button');
        tile.className = 'tile btn ghost';
        tile.style.aspectRatio = '1 / 1';
        tile.style.borderRadius = '14px';
        tile.style.fontWeight = '800';
        tile.style.letterSpacing = '.3px';
        tile.dataset.id = String(id);
        tile.textContent = ''; // скрытая плитка

        tile.addEventListener('click', () => onTileClick(id, tile));
        gridRoot.appendChild(tile);
      }
    }
  }

  function refreshUI() {
    // подсветка множителя и прогресса
    const label = locked
      ? 'Раунд завершён. Нажми «Новый раунд».'
      : `Открыто: ${t}/${S}  •  Множитель: ×${fmtMul(currentMultiplier)}  •  Бомб: ${B}`;
    setInfo(label);

    // состояние кнопки cashout
    if (cashoutBtn) {
      const can = !locked && t > 0;
      cashoutBtn.disabled = !can;
      cashoutBtn.classList.toggle('ghost', !can);
    }
  }

  // ---------- ИГРОВАЯ ЛОГИКА ----------
  function startRound() {
    if (locked) return;
    // читаем/фиксируем ставку
    bet = Math.max(0, Number(betInput?.value || 0));
    if (!bet) return;

    // списать ставку заранее
    if (typeof onSpend === 'function') {
      const ok = onSpend(bet);
      if (ok === false) return;
    }
    spent = true;

    resetState();   // сбрасываем, но возвращаем размер ставки/бомбы
    B = readBombs();
    S = CELLS - B;
    layBombs();
    buildGrid();

    // начальный множитель (t=0): ×1.00 (с учётом маржи это тоже ≈1, но мы не платим при t=0)
    currentMultiplier = houseMul(0, S, CELLS, houseEdge);
    if (!isFinite(currentMultiplier) || currentMultiplier < 1) currentMultiplier = 1;

    refreshUI();
  }

  function onTileClick(id, tileEl) {
    if (locked || !spent) return;          // нет активного раунда
    if (revealed.has(id)) return;          // уже открыта

    const isBomb = board[id] === 'bomb';
    if (isBomb) {
      // БАХ — проигрыш раунда
      locked = true;
      // визуал: показать все мины/сейфы
      revealAll(true, id);
      refreshUI();
      if (typeof onLose === 'function') onLose(`Mines: взрыв на плитке ${id+1}. Открыто сейфов ${t}/${S}.`);
      return;
    }

    // сейф — прибавляем прогресс
    revealed.add(id);
    t = revealed.size;

    // визуал текущей плитки
    decorateSafe(tileEl);

    // пересчёт множителя (после t сейфов)
    currentMultiplier = houseMul(t, S, CELLS, houseEdge);

    // если открыты все сейфы — авто-выдача выигрыша
    if (t === S) {
      const amount = bet * currentMultiplier;
      locked = true;
      revealAll(false, -1);
      refreshUI();
      if (typeof onWin === 'function') onWin(amount, `Mines: открыт весь сейф ${t}/${S}. Множитель ×${fmtMul(currentMultiplier)}.`);
      return;
    }

    refreshUI();
  }

  function cashout() {
    if (locked || !spent) return;
    if (t <= 0) return; // нечего забирать
    const amount = bet * currentMultiplier;
    locked = true;
    revealAll(false, -1);
    refreshUI();
    if (typeof onWin === 'function') onWin(amount, `Mines: забрал после ${t} сейфов из ${S}. Множитель ×${fmtMul(currentMultiplier)}.`);
  }

  // ---------- ВИЗУАЛ ПО ПЛИТКАМ ----------
  function decorateSafe(tileEl) {
    tileEl.classList.add('win'); // мягкая подсветка из темы
    tileEl.textContent = '✓';
    tileEl.style.pointerEvents = 'none';
  }

  function decorateBomb(tileEl, isHit) {
    tileEl.classList.add('lose');
    tileEl.textContent = isHit ? '✖' : '•';
    tileEl.style.pointerEvents = 'none';
  }

  function revealAll(exploded, hitId) {
    // подсветить все клетки по факту
    if (!gridRoot) return;
    const tiles = gridRoot.querySelectorAll('.tile');
    tiles.forEach((el) => {
      const id = Number(el.dataset.id);
      if (board[id] === 'bomb') {
        decorateBomb(el, exploded && id === hitId);
      } else if (revealed.has(id)) {
        // уже отмечено как safe
      } else {
        // скрытый сейф — слегка отметить
        el.classList.add('win');
        el.style.opacity = '.75';
        el.textContent = '·';
        el.style.pointerEvents = 'none';
      }
    });
  }

  // ---------- СВЯЗЬ С UI ----------
  newRoundBtn?.addEventListener('click', startRound);
  cashoutBtn?.addEventListener('click', cashout);
  bombsSelect?.addEventListener('change', () => {
    if (!locked && !spent) {
      // просто перерисуем сетку под новое число бомб, без старта
      resetState(); B = readBombs(); S = CELLS - B; buildGrid(); refreshUI();
    }
  });

  // ---------- INIT ----------
  // начальное состояние/сетка без активного раунда
  resetState();
  buildGrid();
  refreshUI();
}
