// main.js — инициализация UI, баланса и трёх игр

import { initTabs, toast, fmtMoney, bindSteppers } from './ui.js';
import { initRoulette } from './roulette.js';
import { initPlinko } from './plinko.js';
import { initMines } from './mines.js';
import * as State from './state.js'; // мягко используем, если API отличается — есть фолбэки ниже

/* =========================
   Поиск элементов (с фолбэком)
   ========================= */
function q(selArr) {
  if (!Array.isArray(selArr)) selArr = [selArr];
  for (const sel of selArr) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  return null;
}

/* =========================
   Безопасный доступ к балансу/нику (через state.js или фолбэк)
   ========================= */
const Balance = (() => {
  // попытка найти элементы
  const balanceEl = q(['[data-balance]','#balance','.js-balance']);
  const nameEl    = q(['[data-name]','#nickname','.js-nickname']);

  // адаптер к возможному API state.js
  const api = {
    getBalance: State?.getBalance || State?.get || State?.balance || (() => {
      const raw = (balanceEl?.dataset.value ?? balanceEl?.textContent ?? '0').replace(/\s+/g,'').replace(',', '.');
      const n = Number(raw) || 0;
      return n;
    }),
    setBalance: State?.setBalance || State?.set || ((n) => {
      if (typeof State?.save === 'function') State.save('balance', n);
      if (balanceEl) {
        balanceEl.dataset.value = String(n);
        balanceEl.textContent = fmtMoney(n);
      }
      try { localStorage.setItem('balance', String(n)); } catch {}
    }),
    addBalance: State?.addBalance || State?.add || ((delta) => {
      const cur = api.getBalance();
      const next = Math.max(0, cur + Number(delta || 0));
      api.setBalance(next);
      return next;
    }),
    spend: State?.spend || ((amount) => {
      amount = Number(amount || 0);
      const cur = api.getBalance();
      if (amount <= 0) return true;
      if (cur < amount) {
        toast('Недостаточно средств');
        return false;
      }
      api.setBalance(cur - amount);
      return true;
    }),
    getName: State?.getName || State?.name || (() => {
      const v = nameEl?.value || nameEl?.textContent || localStorage.getItem('nickname') || 'Player';
      return v;
    }),
    setName: State?.setName || ((v) => {
      if (nameEl) {
        if ('value' in nameEl) nameEl.value = v;
        else nameEl.textContent = v;
      }
      try { localStorage.setItem('nickname', v); } catch {}
    }),
  };

  // первичная инициализация из localStorage, если state.js это не сделал
  (function initDefaults(){
    try {
      if (!('getBalance' in State) && balanceEl) {
        const saved = Number(localStorage.getItem('balance') || 0);
        api.setBalance(Number.isFinite(saved) ? saved : 1000);
      }
      if (!('getName' in State) && nameEl) {
        const savedName = localStorage.getItem('nickname') || nameEl?.value || nameEl?.textContent || 'Player';
        api.setName(savedName);
      }
    } catch {}
  })();

  // обновить DOM, если нужно
  if (balanceEl) balanceEl.textContent = fmtMoney(api.getBalance());

  return api;
})();

/* =========================
   Общие коллбеки win/lose/spend
   ========================= */
function onSpend(amount) {
  // списание ставки
  return Balance.spend(amount);
}
function onWin(amount, label = '') {
  Balance.addBalance(amount);
  toast(`Выигрыш +${fmtMoney(amount)} ₽${label ? ' • ' + label : ''}`);
}
function onLose(label = '') {
  toast(`Проигрыш${label ? ' • ' + label : ''}`);
}

/* =========================
   Инициализация вкладок и степперов
   ========================= */
initTabs();
bindSteppers();

/* =========================
   ROULETTE
   ========================= */
(function initRouletteSection(){
  const betInput   = q(['#rouletteBet','[data-roulette-bet]']);
  const typeSelect = q(['#rouletteType','[data-roulette-type]','select[name="roulette-type"]']);
  const numberInput= q(['#rouletteNumber','[data-roulette-number]','input[name="roulette-number"]']);
  const spinBtn    = q(['#rouletteSpin','[data-roulette-spin]','.js-roulette-spin']);
  const canvas     = q(['#rouletteCanvas','[data-roulette-canvas]','canvas.roulette']);

  if (!canvas || !spinBtn || !betInput) return; // секции может не быть на странице

  initRoulette({
    betInput,
    typeSelect,
    numberInput,
    spinBtn,
    canvas,
    onWin,
    onLose,
    onSpend
  });
})();

/* =========================
   PLINKO
   ========================= */
(function initPlinkoSection(){
  const canvas   = q(['#plinkoCanvas','[data-plinko-canvas]','canvas.plinko']);
  const rowsSel  = q(['#plinkoRows','[data-plinko-rows]','input[name="plinko-rows"]','select[name="plinko-rows"]']);
  const betInput = q(['#plinkoBet','[data-plinko-bet]']);
  const dropBtn  = q(['#plinkoDrop','[data-plinko-drop]','.js-plinko-drop']);
  const multWrap = q(['#plinkoMults','[data-plinko-mults]','.js-plinko-mults']);

  if (!canvas || !dropBtn || !betInput) return;

  // можно задать домаржу через data-атрибут
  const houseEdge = Number(canvas?.dataset?.houseEdge || 0.02) || 0.02;

  initPlinko({
    canvas,
    rowsSelect: rowsSel,
    betInput,
    dropBtn,
    multipliersWrap: multWrap,
    onSpend,
    onWin,
    onLose,
    houseEdge
  });
})();

/* =========================
   MINES
   ========================= */
(function initMinesSection(){
  const gridRoot   = q(['#minesGrid','[data-mines-grid]','.js-mines-grid']);
  const betInput   = q(['#minesBet','[data-mines-bet]']);
  const bombsSel   = q(['#minesBombs','[data-mines-bombs]','input[name="mines-bombs"]','select[name="mines-bombs"]']);
  const newBtn     = q(['#minesNew','[data-mines-new]','.js-mines-new']);
  const cashoutBtn = q(['#minesCashout','[data-mines-cashout]','.js-mines-cashout']);
  const infoLabel  = q(['#minesInfo','[data-mines-info]','.js-mines-info']);

  if (!gridRoot || !newBtn || !betInput) return;

  const houseEdge = Number(gridRoot?.dataset?.houseEdge || 0.02) || 0.02;

  // обёртки с тостами (по желанию можно удалить)
  const spendWrap = (amt) => {
    const ok = onSpend(amt);
    if (ok) toast(`Ставка −${fmtMoney(amt)} ₽`);
    return ok;
  };
  const winWrap = (amt, label) => {
    onWin(amt, label);
  };
  const loseWrap = (label) => {
    onLose(label);
  };

  initMines({
    gridRoot,
    betInput,
    bombsSelect: bombsSel,
    newRoundBtn: newBtn,
    cashoutBtn,
    infoLabel,
    onSpend: spendWrap,
    onWin: winWrap,
    onLose: loseWrap,
    houseEdge
  });
})();

/* =========================
   Привязка никнейма и начального пополнения (опционально)
   ========================= */
(function initProfile(){
  const nameInput = q(['#nickname','[data-name-input]','.js-name-input']);
  const saveBtn   = q(['#saveName','[data-name-save]','.js-name-save']);
  if (nameInput && saveBtn) {
    nameInput.value = Balance.getName();
    saveBtn.addEventListener('click', () => {
      const v = String(nameInput.value || '').trim() || 'Player';
      Balance.setName(v);
      toast('Имя сохранено');
    });
  }

  // быстрая кнопка пополнить демо-баланс (если есть)
  const demoBtn = q(['[data-demo-topup]','.js-topup']);
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      Balance.addBalance(1000);
      toast('Баланс +1 000 ₽');
    });
  }
})();
