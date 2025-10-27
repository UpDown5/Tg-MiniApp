// state.js — простой хранилище профиля и баланса с localStorage + событиями

const LS_KEYS = {
  balance: 'balance',
  nickname: 'nickname'
};

// ------- утилиты -------
function toNumber(x, def = 0) {
  const n = Number(x);
  return Number.isFinite(n) ? n : def;
}
function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
function safeGet(key, def = null) {
  try {
    const v = localStorage.getItem(key);
    return v === null ? def : v;
  } catch {
    return def;
  }
}
function safeSet(key, val) {
  try {
    localStorage.setItem(key, String(val));
    return true;
  } catch {
    return false;
  }
}
function dispatch(name, detail) {
  try {
    document.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {}
}

// ------- начальные значения -------
let _balance = toNumber(safeGet(LS_KEYS.balance, '1000'), 1000); // демо-старт, если пусто
_balance = clamp(_balance, 0, 1e12);

let _name = (safeGet(LS_KEYS.nickname, '') || '').trim() || 'Player';

// ------- публичное API -------
export function getBalance() { return _balance; }

export function setBalance(value) {
  _balance = clamp(toNumber(value, 0), 0, 1e12);
  safeSet(LS_KEYS.balance, _balance);
  dispatch('state:balance', { balance: _balance });
  // Обновим видимый DOM, если есть элемент [data-balance]
  const el = document.querySelector('[data-balance]');
  if (el) {
    try {
      const n = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(_balance);
      el.dataset.value = String(_balance);
      el.textContent = n;
    } catch {
      el.dataset.value = String(_balance);
      el.textContent = String(_balance);
    }
  }
  return _balance;
}

export function addBalance(delta) {
  const next = clamp(_balance + toNumber(delta, 0), 0, 1e12);
  return setBalance(next);
}

/** списать amount, вернуть true/false */
export function spend(amount) {
  amount = toNumber(amount, 0);
  if (amount <= 0) return true;
  if (_balance < amount) return false;
  return setBalance(_balance - amount), true;
}

export function getName() { return _name; }

export function setName(v) {
  _name = String(v || '').trim() || 'Player';
  safeSet(LS_KEYS.nickname, _name);
  dispatch('state:nickname', { nickname: _name });
  // Обновим DOM, если есть элементы
  const input = document.querySelector('#nickname,[data-name-input],.js-name-input');
  if (input && 'value' in input) input.value = _name;
  const label = document.querySelector('[data-name],#playerName,.js-nickname');
  if (label) label.textContent = _name;
  return _name;
}

// ------- универсальные get/set для совместимости, если где-то вызываются -------
export const get = getBalance;
export const set = setBalance;
export const add = addBalance;
export const name = getName;
export const save = safeSet;
export const load = safeGet;

// ------- удобные хелперы -------
export function resetDemo(balance = 1000) {
  setBalance(balance);
  setName('Player');
}

export function onBalance(cb) {
  document.addEventListener('state:balance', (e) => cb?.(e.detail?.balance));
}

export function onNickname(cb) {
  document.addEventListener('state:nickname', (e) => cb?.(e.detail?.nickname));
}

// Авто-поднятие в DOM при загрузке (если элементы уже на странице)
document.addEventListener('DOMContentLoaded', () => {
  setBalance(_balance);
  setName(_name);
});
