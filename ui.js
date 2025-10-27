// ui.js — базовые UI-хелперы: вкладки, тосты, формат денег и пр.

/** Формат денег с фикс. разделителями */
export function fmtMoney(n) {
  const num = Number(n || 0);
  try {
    return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(num);
  } catch {
    return String(Math.round(num * 100) / 100);
  }
}

/** Покажи тост по центру снизу (см. .toast в CSS) */
export function toast(message, ms = 2200) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');

  const close = () => {
    el.classList.remove('show');
    clearTimeout(timer);
  };

  const timer = setTimeout(close, ms);
  el.onclick = close;
}

/** Инициализация вкладок.
 *  Кнопки: элементы с [data-tab="имя"], панели: [data-panel="имя"].
 *  Активной вкладке добавляется .active.
 */
export function initTabs() {
  const tabButtons = Array.from(document.querySelectorAll('[data-tab]'));
  const panels = Array.from(document.querySelectorAll('[data-panel]'));
  if (!tabButtons.length || !panels.length) return;

  function activate(name) {
    tabButtons.forEach(btn => {
      const active = btn.getAttribute('data-tab') === name;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    panels.forEach(p => {
      const show = p.getAttribute('data-panel') === name;
      p.style.display = show ? '' : 'none';
    });
    // сохранить в hash, чтобы при перезагрузке оставаться на вкладке
    try { history.replaceState(null, '', `#${encodeURIComponent(name)}`); } catch {}
  }

  // начальная вкладка — по hash или первая
  const fromHash = decodeURIComponent((location.hash || '').slice(1) || '');
  const initial = tabButtons.find(b => b.getAttribute('data-tab') === fromHash)
    ? fromHash
    : tabButtons[0].getAttribute('data-tab');

  // биндим клики
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => activate(btn.getAttribute('data-tab')));
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        activate(btn.getAttribute('data-tab'));
      }
    });
  });

  activate(initial);
}

/** Привязка инкремента/декремента к input'ам с атрибутами data-inc / data-dec */
export function bindSteppers() {
  document.querySelectorAll('[data-inc], [data-dec]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetSel = btn.getAttribute('data-inc') || btn.getAttribute('data-dec');
      if (!targetSel) return;
      const input = document.querySelector(targetSel);
      if (!input) return;
      const step = Number(input.step || 1) || 1;
      const min = input.min !== '' ? Number(input.min) : -Infinity;
      const max = input.max !== '' ? Number(input.max) : Infinity;
      let val = Number(input.value || 0) || 0;
      if (btn.hasAttribute('data-inc')) val += step; else val -= step;
      val = Math.max(min, Math.min(max, val));
      input.value = String(val);
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
    });
  });
}

/** Простой переключатель классов на активном элементе (например, чипы ставок) */
export function makeSelectable(containerSelector, itemSelector, activeClass = 'active', onChange) {
  const root = typeof containerSelector === 'string'
    ? document.querySelector(containerSelector)
    : containerSelector;
  if (!root) return;

  root.addEventListener('click', (e) => {
    const item = e.target.closest(itemSelector);
    if (!item || !root.contains(item)) return;
    root.querySelectorAll(itemSelector).forEach(el => el.classList.remove(activeClass));
    item.classList.add(activeClass);
    if (typeof onChange === 'function') onChange(item);
  });
}

/** Утилита безопасного чтения числа из input */
export function readNumber(input, fallback = 0) {
  if (!input) return fallback;
  const v = Number(input.value);
  return Number.isFinite(v) ? v : fallback;
}

/** Короткий спиннер-класс на кнопке (добавляет disabled на время) */
export function withSpinner(btn, fn, label = null) {
  return async (...args) => {
    if (!btn) return fn?.(...args);
    const oldHTML = btn.innerHTML;
    const oldDisabled = btn.disabled;
    btn.disabled = true;
    if (label) btn.innerHTML = label;
    try {
      const res = await fn?.(...args);
      return res;
    } finally {
      btn.disabled = oldDisabled;
      btn.innerHTML = oldHTML;
    }
  };
}
