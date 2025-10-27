export function initPlinko({
  canvas,
  rowsSelect,        // <select> или <input number> с количеством рядов (например 8..16)
  betInput,          // <input> со ставкой
  dropBtn,           // кнопка "Бросить"
  multipliersWrap,   // контейнер под сетку множителей (div)
  onSpend,           // function(bet): boolean | void (false = не списывать)
  onWin,             // function(amount, label)
  onLose,            // function(label)
  houseEdge = 0.02   // маржа 2% по умолчанию (EV = 1 - houseEdge)
}) {
  // ---------- ВИЗУАЛ ----------
  const ctx = canvas.getContext('2d');
  const THEME = {
    bg:        '#1a1526',
    peg:       '#7b66ff',
    pegGlow:   'rgba(124,104,238,0.35)',
    ball:      '#ffffff',
    track:     'rgba(255,255,255,0.12)',
    tray:      '#31284b',
    trayGlow:  'rgba(124,104,238,0.35)',
  };

  // ---------- МАТЕМАТИКА ----------
  // Комбинаторика: биномиальные коэффициенты
  function binom(n, k) {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    k = Math.min(k, n - k);
    let res = 1;
    for (let i = 1; i <= k; i++) {
      res = (res * (n - (k - i))) / i;
    }
    return res;
  }

  // Вероятности слотов для R рядов: P(k) = C(R,k) / 2^R, k∈[0..R]
  function slotProbabilities(R) {
    const denom = Math.pow(2, R);
    const p = [];
    for (let k = 0; k <= R; k++) p.push(binom(R, k) / denom);
    return p;
  }

  // Формируем множители под целевой EV: sum(Pk * Mk) = 1 - H
  // Берём "сырой" профиль и масштабируем.
  function scaledMultipliers(probs, rawProfile, targetEV) {
    // если профиль не задан или неправильной длины — создадим «равномерный скелет»
    const R = probs.length - 1;
    let base = rawProfile && rawProfile.length === probs.length
      ? rawProfile.slice()
      : Array.from({ length: probs.length }, (_, k) => 1 + Math.max(0, Math.abs(k - R / 2)) * 0.1);

    // чтобы исключить нули/супермалые значения
    base = base.map(x => Math.max(0.01, x));

    const currentEV = probs.reduce((s, p, i) => s + p * base[i], 0);
    const scale = (currentEV === 0) ? targetEV : (targetEV / currentEV);
    return base.map(x => x * scale);
  }

  // Красивое округление множителя
  const fmtMul = (x) => (x < 10 ? x.toFixed(2) : x.toFixed(1)).replace(/\.0+$/,'');

  // ---------- СОСТОЯНИЕ / ПАРАМЕТРЫ ----------
  let R = clampRows(readRows());
  let W = 0, H = 0, DPR = 1;

  // геометрия пинов/дорожки
  const geo = {
    pegR: 4.2,       // радиус пина
    pegGapX: 28,     // горизонтальный шаг между пинами
    rowGapY: 34,     // вертикальный шаг между рядами
    topPad: 40,
    bottomPad: 80,
    sidePad: 20,
    ballR: 6.0
  };

  // предрасчёт вероятностей и множителей
  let probs = slotProbabilities(R);
  // "сырой" профиль можно задать для красоты (чуть приподнять края/центр). Оставим нейтральный:
  let rawProfile = Array.from({ length: probs.length }, (_, k) => 1 + Math.abs(k - R / 2) * 0.08);
  let multipliers = scaledMultipliers(probs, rawProfile, 1 - houseEdge);

  // ---------- УТИЛИТЫ ----------
  function readRows() {
    const v = Number((rowsSelect?.value ?? rowsSelect?.dataset?.value) || 12);
    return Number.isFinite(v) ? Math.round(v) : 12;
  }
  function clampRows(r) { return Math.max(6, Math.min(20, r)); }

  function fitCanvas() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    const widthCSS = Math.min(canvas.clientWidth || 360, 640);
    const heightCSS = geo.topPad + (R * geo.rowGapY) + geo.bottomPad;
    canvas.width = Math.round(widthCSS * DPR);
    canvas.height = Math.round(heightCSS * DPR);
    canvas.style.width = widthCSS + 'px';
    canvas.style.height = heightCSS + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    W = widthCSS; H = heightCSS;
  }

  function centerX() {
    // ширина самой длинной строки пинов ~ R*gapX
    const pinsWidth = (R - 1) * geo.pegGapX;
    return Math.max(geo.sidePad + geo.pegGapX, W / 2);
  }

  // координаты пинов на i-й строке
  function pinPositions(row) {
    // row ∈ [0..R-1], в строке (row+1) пинов
    const cx = centerX();
    const count = row + 1;
    const totalWidth = (count - 1) * geo.pegGapX;
    const y = geo.topPad + row * geo.rowGapY;
    const xs = [];
    for (let j = 0; j < count; j++) {
      const x = cx - totalWidth / 2 + j * geo.pegGapX;
      xs.push({ x, y });
    }
    return xs;
  }

  // нижние лотки (слоты)
  function traySlots() {
    // слотов R+1, центрируются под последней строкой пинов
    const cx = centerX();
    const count = R + 1;
    const totalWidth = (count - 1) * geo.pegGapX;
    const y = geo.topPad + R * geo.rowGapY + 18;
    const xs = [];
    for (let j = 0; j < count; j++) {
      const x = cx - totalWidth / 2 + j * geo.pegGapX;
      xs.push({ x, y });
    }
    return xs;
  }

  // ---------- РЕНДЕР ----------
  function drawBackground() {
    ctx.clearRect(0,0,W,H);
    // фон
    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0,0,W,H);

    // вертикальные направляющие (легкие)
    ctx.strokeStyle = THEME.track;
    ctx.lineWidth = 1;
    const cx = centerX();
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, H);
    ctx.stroke();

    // лотки
    const slots = traySlots();
    slots.forEach(({x,y}, k) => {
      const w = geo.pegGapX * 0.9, h = 18;
      ctx.fillStyle = THEME.tray;
      roundRect(ctx, x - w/2, y, w, h, 8);
      ctx.fill();
      ctx.strokeStyle = THEME.trayGlow;
      ctx.lineWidth = 1;
      ctx.stroke();
    });
  }

  function drawPins() {
    ctx.save();
    // свечение по кругу
    ctx.shadowColor = THEME.pegGlow;
    ctx.shadowBlur = 10;
    for (let r = 0; r < R; r++) {
      const pos = pinPositions(r);
      pos.forEach(({x,y}) => {
        ctx.beginPath();
        ctx.fillStyle = THEME.peg;
        ctx.arc(x, y, geo.pegR, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    ctx.restore();
  }

  function drawBall(x, y) {
    // тень
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.ellipse(x, y + geo.ballR + 2, geo.ballR * 0.9, geo.ballR * 0.5, 0, 0, Math.PI*2);
    ctx.fill();

    // шар
    const grad = ctx.createRadialGradient(x - geo.ballR*0.4, y - geo.ballR*0.4, 1, x, y, geo.ballR);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#cfcff6');
    ctx.beginPath();
    ctx.fillStyle = grad;
    ctx.arc(x, y, geo.ballR, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMultipliers() {
    if (!multipliersWrap) return;
    multipliersWrap.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'multipliers';
    multipliers.forEach((m, i) => {
      const cell = document.createElement('div');
      cell.className = 'mult';
      cell.textContent = fmtMul(m) + '×';
      grid.appendChild(cell);
    });
    multipliersWrap.appendChild(grid);
  }

  // ---------- ИГРОВАЯ ЛОГИКА ----------
  let animRun = false;

  function drop() {
    if (animRun) return;
    const bet = Math.max(0, Number(betInput?.value || 0));
    if (!bet) return;

    // списать ставку
    if (typeof onSpend === 'function') {
      const ok = onSpend(bet);
      if (ok === false) return;
    }

    animRun = true;

    // траектория: R шагов, каждый шаг влево/вправо с p=0.5
    let k = 0; // количество "вправо" (или "налево" — не важно, главное последовательно)
    const cx = centerX();
    const slots = traySlots();

    // старт сверху по центру
    let x = cx, y = geo.topPad - 24;

    const steps = [];
    for (let r = 0; r < R; r++) {
      // позиция пина на этой строке, рядом с ним шар «решает» влево/вправо
      const pins = pinPositions(r);
      const decision = Math.random() < 0.5 ? 0 : 1; // 0=лево, 1=право
      if (decision === 1) k += 1;
      steps.push({ pins, decision });
    }

    // целевой слот = k (0..R)
    const targetSlot = k;

    // анимация падения
    const duration = Math.min(2600, 900 + R * 120);
    const start = performance.now();

    function pathY(r) {
      // линейно от верхнего края к низу (под последней строкой)
      return geo.topPad + r * geo.rowGapY;
    }

    function frame(t) {
      const p = Math.min(1, (t - start) / duration);
      // вычисляем "индекс" текущего шага в зависимости от времени
      const rp = p * (R + 1);
      const rIdx = Math.min(R, Math.floor(rp));
      const frac = Math.min(1, rp - rIdx); // локальная доля внутри шага

      drawBackground();
      drawPins();

      // вычислить x,y для шара
      if (rIdx === 0) {
        // до первой столкновки: просто спускаемся на уровень 0-й строки
        const y0 = y, y1 = pathY(0) - geo.ballR - 2;
        const yy = y0 + (y1 - y0) * Math.min(1, p * (R+1) / 1.1);
        drawBall(x, yy);
      } else {
        // пройдено rIdx столкновений
        let curX = cx;
        let curY = geo.topPad - 24;
        let rights = 0;

        for (let r = 0; r < rIdx; r++) {
          const pins = pinPositions(r);
          const hitIndex = rights; // индекс пина примерно соответствует количеству "вправо"
          const pin = pins[Math.min(hitIndex, pins.length - 1)];
          // до пина
          curY = pathY(r);
          curX = pin.x;
          // отскок вправо/влево
          const goRight = steps[r].decision === 1;
          const nextPins = (r + 1 < R) ? pinPositions(r + 1) : null;
          if (goRight) {
            rights += 1;
          }
          // промежуточная интерполяция от пина к следующему "каналу"
          if (r === rIdx - 1) {
            const nextIndex = rights;
            const nx = nextPins ? nextPins[Math.min(nextIndex, (nextPins.length - 1))].x : curX;
            const ny = nextPins ? pathY(r + 1) : (traySlots()[rights]?.y || (H - 40));
            curX = curX + (nx - curX) * frac;
            curY = curY + (ny - curY) * frac;
          }
        }
        drawBall(curX, curY);
      }

      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        // приземление в targetSlot
        const m = multipliers[targetSlot] || 0;
        const winAmount = bet * m;
        const label = `Plinko: рядов ${R}, слот ${targetSlot}/${R}, множитель ×${fmtMul(m)}.`;
        if (winAmount > 0) onWin(winAmount, label);
        else onLose(label);
        animRun = false;
      }
    }

    requestAnimationFrame(frame);
  }

  // ---------- ХЭНДЛЕРЫ UI ----------
  function handleRowsChange() {
    R = clampRows(readRows());
    probs = slotProbabilities(R);
    multipliers = scaledMultipliers(probs, rawProfileFor(R), 1 - houseEdge);
    fitCanvas();
    drawBackground(); drawPins();
    drawMultipliers();
  }

  function rawProfileFor(R) {
    // лёгкий «дизайн» профиля: центр слегка ниже краёв (играется аккуратно)
    return Array.from({ length: R + 1 }, (_, k) => 1 + Math.abs(k - R / 2) * 0.08);
  }

  // ---------- INIT ----------
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
  }

  function resize() {
    fitCanvas();
    drawBackground();
    drawPins();
  }

  window.addEventListener('resize', resize);
  dropBtn?.addEventListener('click', drop);
  rowsSelect?.addEventListener('change', handleRowsChange);
  rowsSelect?.addEventListener('input', handleRowsChange);

  // стартовый рендер
  resize();
  drawMultipliers();
}
