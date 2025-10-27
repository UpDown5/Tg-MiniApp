export function initRoulette({ betInput, typeSelect, numberInput, spinBtn, canvas, onWin, onLose, onSpend }) {
  // ====== БАЗА ======
  const ctx = canvas.getContext("2d");
  const COUNT = 37;                        // европейская рулетка (0..36)
  const nums  = Array.from({ length: COUNT }, (_, i) => i);
  const reds  = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]); // "красные" -> у нас будут ярко-фиолетовые
  let spinning = false;
  let angle = 0;                           // текущий угол (рад)

  // ====== ВИЗУАЛ (фиолет/белый) ======
  const COL_ZERO     = "#2a1f48";          // 0 — тёмный фиолетовый
  const COL_RED      = "#7b66ff";          // "красные" — яркий фиолетовый
  const COL_BLACK    = "#31284b";          // "чёрные" — графит/тёмно-фиолетовый
  const COL_CENTER   = "#14101d";          // центр
  const COL_MARKER   = "#ffffff";          // белый маркер
  const GLOW         = "rgba(124,104,238,0.35)";

  // Размеры
  function drawWheel(a = 0) {
    const r = canvas.width / 2;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(r, r);
    ctx.rotate(a);

    // Сегменты
    nums.forEach((n, i) => {
      const start = (i / COUNT) * Math.PI * 2;
      const end   = ((i + 1) / COUNT) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, start, end);
      ctx.closePath();
      ctx.fillStyle = (n === 0) ? COL_ZERO : (reds.has(n) ? COL_RED : COL_BLACK);
      ctx.fill();
    });

    // Лёгкое свечение по краю
    ctx.beginPath();
    ctx.arc(0, 0, r - 1, 0, Math.PI * 2);
    ctx.strokeStyle = GLOW;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Центр
    ctx.beginPath();
    ctx.fillStyle = COL_CENTER;
    ctx.arc(0, 0, r * 0.60, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Белый маркер (указатель)
    ctx.save();
    ctx.fillStyle = COL_MARKER;
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 6);
    ctx.lineTo(canvas.width / 2 - 9, 22);
    ctx.lineTo(canvas.width / 2 + 9, 22);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Получить индекс сектора по текущему углу
  function angleToIndex(a) {
    // Ноль вверху у маркера: "0" будет в секторе при a ≈ 0
    // Нормируем угол в [0, 2π)
    const tau = Math.PI * 2;
    let norm = a % tau;
    if (norm < 0) norm += tau;
    // Сектор нумеруем по кругу, 0..36, начиная сверху по часовой
    const sector = Math.floor((norm / tau) * COUNT) % COUNT;
    // Чтобы соответствовало направлению вращения и рисованию, разворачиваем индекс:
    return (COUNT - sector) % COUNT;
  }

  // Выплата по типу ставки
  function settle(bet, t, picked, rolled) {
    let win = 0;
    let label = "";
    const n = rolled;

    if (t === "number") {
      label = `Ставка: номер ${picked}, выпало ${n}`;
      if (n === picked) win = bet * 36; // ставка списана заранее → возврат 36x = 35:1 нетто
    } else if (t === "red") {
      label = `Ставка: фиолетовые (red), выпало ${n}`;
      if (reds.has(n)) win = bet * 2;
    } else if (t === "black") {
      label = `Ставка: тёмные (black), выпало ${n}`;
      if (n !== 0 && !reds.has(n)) win = bet * 2;
    } else if (t === "even") {
      label = `Ставка: чётные, выпало ${n}`;
      if (n !== 0 && n % 2 === 0) win = bet * 2;
    } else if (t === "odd") {
      label = `Ставка: нечётные, выпало ${n}`;
      if (n % 2 === 1) win = bet * 2;
    } else {
      label = `Ставка: неизвестный тип, выпало ${n}`;
    }

    if (win > 0) onWin(win, label);
    else onLose(label);
  }

  // Анимация спина (ease-out)
  function spin() {
    if (spinning) return;

    const bet = Math.max(0, Number(betInput.value || 0));
    const type = (typeSelect.value || "number");
    const pickedNumber = Number(numberInput.value || 0);

    if (!bet) return; // пустая ставка
    // Списываем — если не удалось (недостаточно средств), выходим
    if (typeof onSpend === "function") {
      const ok = onSpend(bet);
      if (ok === false) return;
    }

    spinning = true;

    // Случайный целевой сектор (честный равновероятный выбор)
    const targetIndex = Math.floor(Math.random() * COUNT) | 0;

    // Целевая ориентация колеса: делаем несколько оборотов + попадаем в нужный сектор
    const tau = Math.PI * 2;
    const sectorAngle = tau / COUNT;
    const currentNorm = angle % tau;

    // Вершина сектора i в мировых координатах
    const targetAngleRaw = (COUNT - targetIndex) % COUNT * sectorAngle;
    // ближайшее положительное приращение от текущего угла с запасом оборотов
    let delta = (targetAngleRaw - currentNorm);
    while (delta <= 0) delta += tau;
    // добавим 2–4 полных оборота для красоты
    const extraTurns = (2 + Math.random() * 2) * tau;
    const targetAngle = angle + delta + extraTurns;

    const duration = 2200 + Math.random() * 800;  // 2.2–3.0s
    const start = performance.now();
    const startAngle = angle;

    function easeOutCubic(x){ return 1 - Math.pow(1 - x, 3); }

    function frame(t) {
      const p = Math.min(1, (t - start) / duration);
      const eased = easeOutCubic(p);
      angle = startAngle + (targetAngle - startAngle) * eased;
      drawWheel(angle);
      if (p < 1) {
        requestAnimationFrame(frame);
      } else {
        // Определяем выпавший сектор
        const idx = angleToIndex(angle);
        const rolled = idx; // 0..36
        settle(bet, type, pickedNumber, rolled);
        spinning = false;
      }
    }
    requestAnimationFrame(frame);
  }

  // Ресайз канваса под плотность пикселя
  function fitCanvas() {
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const size = Math.min(canvas.clientWidth || 320, 480);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(dpr, dpr);
    canvas.style.width = size + "px";
    canvas.style.height = size + "px";
    drawWheel(angle);
  }

  window.addEventListener("resize", fitCanvas);
  spinBtn.addEventListener("click", spin);

  // Первый рендер
  fitCanvas();
}
