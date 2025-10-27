import { initState, getBalance, addBalance, spendBalance } from "state";
import { showView, bindTabs, toast } from "ui";
import { initPlinko } from "games/plinko";
import { initRoulette } from "games/roulette";
import { initMines } from "games/mines";

document.getElementById("startBtn").addEventListener("click", () => {
  const nick = document.getElementById("nickname").value.trim();
  if (!nick) return toast("Введите ник");
  initState(nick);
  document.getElementById("balance").textContent = getBalance();
  showView("appView");
});

document.getElementById("addDemo").addEventListener("click", () => {
  addBalance(1000);
  document.getElementById("balance").textContent = getBalance();
  toast("+1000 демо средств");
});

bindTabs();

initPlinko({
  betInput: document.getElementById("plinkoBet"),
  rowsInput: document.getElementById("plinkoRows"),
  playBtn: document.getElementById("plinkoPlay"),
  canvas: document.getElementById("plinkoCanvas"),
  onWin: (amount, mult) => {
    addBalance(amount);
    document.getElementById("balance").textContent = getBalance();
    document.getElementById("plinkoResult").textContent = `×${mult.toFixed(2)} | +${amount}`;
  },
  onSpend: (amt) => {
    if (!spendBalance(amt)) {
      toast("Недостаточно средств");
      return false;
    }
    document.getElementById("balance").textContent = getBalance();
    document.getElementById("plinkoResult").textContent = "";
    return true;
  },
});

initRoulette({
  betInput: document.getElementById("rouletteBet"),
  typeSelect: document.getElementById("rouletteType"),
  numberInput: document.getElementById("rouletteNumber"),
  spinBtn: document.getElementById("rouletteSpin"),
  canvas: document.getElementById("rouletteCanvas"),
  onWin: (amount, label) => {
    addBalance(amount);
    document.getElementById("balance").textContent = getBalance();
    document.getElementById("rouletteResult").textContent = `WIN ${label}: +${amount}`;
  },
  onLose: (label) => {
    document.getElementById("rouletteResult").textContent = `LOSE ${label}`;
  },
  onSpend: (amt) => {
    if (!spendBalance(amt)) { toast("Недостаточно средств"); return false; }
    document.getElementById("balance").textContent = getBalance();
    document.getElementById("rouletteResult").textContent = "";
    return true;
  },
});

initMines({
  betInput: document.getElementById("minesBet"),
  countInput: document.getElementById("minesCount"),
  startBtn: document.getElementById("minesStart"),
  cashBtn: document.getElementById("minesCashout"),
  gridEl: document.getElementById("minesGrid"),
  resultEl: document.getElementById("minesResult"),
  onSpend: (amt) => {
    if (!spendBalance(amt)) { toast("Недостаточно средств"); return false; }
    document.getElementById("balance").textContent = getBalance();
    return true;
  },
  onCash: (amt) => {
    addBalance(amt);
    document.getElementById("balance").textContent = getBalance();
  },
});