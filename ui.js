export function showView(id) {
  document.getElementById("login").classList.add("hidden");
  document.getElementById("appView").classList.add("hidden");
  document.getElementById(id).classList.remove("hidden");
}
export function bindTabs() {
  const tabs = Array.from(document.querySelectorAll(".tab"));
  const sections = ["plinko", "roulette", "mines"].map(id => document.getElementById(id));
  tabs.forEach(t => t.addEventListener("click", () => {
    tabs.forEach(x => x.classList.remove("active"));
    t.classList.add("active");
    sections.forEach(s => s.classList.add("hidden"));
    document.getElementById(t.dataset.tab).classList.remove("hidden");
  }));
  const typeSel = document.getElementById("rouletteType");
  const numInput = document.getElementById("rouletteNumber");
  typeSel.addEventListener("change", () => {
    numInput.classList.toggle("hidden", typeSel.value !== "single");
  });
}
let toastTimer = null;
export function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 1800);
}