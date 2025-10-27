let state = { nick: null, balance: 0 };

export function initState(nick) {
  const saved = JSON.parse(localStorage.getItem("pushup_state") || "{}");
  state.nick = nick || saved.nick || "Guest";
  state.balance = saved.balance ?? 1000;
  save();
}
function save() { localStorage.setItem("pushup_state", JSON.stringify(state)); }
export function getBalance() { return state.balance; }
export function addBalance(amt) { state.balance += Math.max(0, amt|0); save(); }
export function spendBalance(amt) {
  amt = Math.max(0, amt|0);
  if (state.balance < amt) return false;
  state.balance -= amt; save(); return true;
}