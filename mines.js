export function initMines({ betInput, countInput, startBtn, cashBtn, gridEl, resultEl, onSpend, onCash }) {
  let tiles = [], bombs = new Set(), playing = false, bet=0, safeRevealed=0;

  function buildGrid() {
    gridEl.innerHTML = "";
    tiles = Array.from({length:25}, (_,i)=>{
      const el = document.createElement("button");
      el.className = "tile";
      el.textContent = "";
      el.disabled = true;
      el.addEventListener("click", () => onTile(i));
      gridEl.appendChild(el);
      return el;
    });
  }

  function start() {
    bet = Math.max(1, betInput.value|0);
    const count = Math.min(15, Math.max(3, countInput.value|0));
    if (!onSpend(bet)) return;
    bombs.clear(); safeRevealed = 0;
    while (bombs.size < count) bombs.add(Math.floor(Math.random()*25));
    tiles.forEach(t => { t.className="tile"; t.textContent=""; t.disabled=false; });
    playing = true;
    cashBtn.disabled = false;
    resultEl.textContent = "Игра началась";
  }

  function onTile(i) {
    if (!playing) return;
    if (bombs.has(i)) {
      revealAll(false);
      resultEl.textContent = "Бум! Проигрыш";
      playing = false; cashBtn.disabled = true;
      return;
    }
    const t = tiles[i];
    if (t.classList.contains("revealed")) return;
    t.classList.add("revealed");
    safeRevealed++;
    const multiplier = calcMultiplier(safeRevealed, bombs.size);
    t.textContent = "✓";
    resultEl.textContent = `Коэф: ×${multiplier.toFixed(2)} | Потяните 'Забрать'`;
  }

  function calcMultiplier(safe, bombsCount) {
    // simple rising multiplier based on risk and revealed safe tiles
    const base = 1 + bombsCount*0.05;
    return base * Math.pow(1.12, safe);
  }

  function cashout() {
    if (!playing) return;
    const mult = calcMultiplier(safeRevealed, bombs.size);
    const win = Math.round(bet * mult);
    onCash(win);
    resultEl.textContent = `Забрано: +${win}`;
    revealAll(true);
    playing = false;
    cashBtn.disabled = true;
  }

  function revealAll(won) {
    tiles.forEach((t, i) => {
      t.disabled = true;
      if (bombs.has(i)) { t.classList.add("bomb"); t.textContent = "✖"; }
      else if (!t.classList.contains("revealed")) { t.classList.add("revealed"); }
    });
  }

  startBtn.addEventListener("click", start);
  cashBtn.addEventListener("click", cashout);
  buildGrid();
}
