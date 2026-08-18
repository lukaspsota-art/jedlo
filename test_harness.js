// Testovací harness: spustí SKUTOČNÝ data/app.js s reálnymi dátami (recepty/*.json, data/potraviny.json)
// v node:vm s minimálnymi stubmi prehliadača. Vracia kontext, takže testy môžu volať priamo
// vyzivaReceptu, gramy, najdiPotravinu, generujJedalnicek, nakupPolozky…
//
//   const { load } = require("./test_harness");
//   const app = load({ stav: {...}, seed: 42 });
//   app.vyzivaReceptu(app.receptById("chicken-adobo"));
//
// ponytail: fake DOM je „všetko je prázdny element“ — appka pri načítaní nič nečíta z DOM-u,
// len doň zapisuje. Ak sa to zmení, doplň konkrétnu hodnotu do FAKE_HODNOTY.
const fs = require("fs"), path = require("path"), vm = require("vm");

const ROOT = __dirname;

function nacitajJsonZoznam(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => f.endsWith(".json"))
    .map(f => JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")));
}
const nacitajRecepty = () => nacitajJsonZoznam(path.join(ROOT, "recepty"));
const nacitajJedalnicky = () => nacitajJsonZoznam(path.join(ROOT, "jedalnicky"));
const nacitajPotraviny = () => JSON.parse(fs.readFileSync(path.join(ROOT, "data", "potraviny.json"), "utf8"));

// deterministický generátor (mulberry32) — nahradí Math.random, aby boli behy generátora opakovateľné
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// const/let sa v skripte nestanú vlastnosťou globalu — vyexportuj ich ručne na koniec app.js
const EXPORT_TAIL = ";globalThis.__exp={RECEPTY,POTRAVINY,JEDALNICKY,S,LS,DNI,VSETKY_SLOTY,DEFAULT_SLOTY," +
  "SLOT_KATEGORIE,KS_DEF,KS_JEDNOTKY,ML_JED,NEDELITELNE_JEDNOTKY,PRILOHY,CARB_PRILOHY,KOLEKCIE,SEZONA," +
  "HS_HI,HS_LO,PORADIE_ODDELENI,SLOT_PODIEL,TYZDNE_PAMATE,TYZDNE_PAMATE_SNACK,MIN_KCAL_HLAVNY};";

const FAKE_HODNOTY = { hladaj: "", "f-kuchyna": "", "f-cas": "", "f-diet": "", "f-sort": "" };

function fakeElement(id) {
  return {
    id, innerHTML: "", textContent: "", value: FAKE_HODNOTY[id] || "", checked: false,
    style: {}, dataset: {}, children: [], hidden: false,
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, v) { if (v === undefined) v = !this._s.has(c); if (v) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {}, remove() {}, insertBefore() {}, focus() {}, click() {}, blur() {},
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {},
    setAttribute() {}, getAttribute() { return null; }, hasAttribute() { return false; },
    querySelector() { return null; }, querySelectorAll() { return []; },
    closest() { return null; }, matches() { return false; },
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 20 }; },
    scrollIntoView() {},
  };
}

function load(opts = {}) {
  const stav = opts.stav || {};
  const rand = mulberry32(opts.seed === undefined ? 12345 : opts.seed);

  const src = fs.readFileSync(path.join(ROOT, "data", "app.js"), "utf8")
    .replace("__DATA__", () => JSON.stringify(opts.recepty || nacitajRecepty()))
    .replace("__POTRAVINY__", () => JSON.stringify(opts.potraviny || nacitajPotraviny()))
    .replace("__JEDALNICKY__", () => JSON.stringify(opts.jedalnicky || nacitajJedalnicky()))
    + "\n" + EXPORT_TAIL + "\n";

  const elementy = {};
  const doc = {
    getElementById(id) { return elementy[id] || (elementy[id] = fakeElement(id)); },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    createElement(tag) { return fakeElement(tag); },
    addEventListener() {}, removeEventListener() {},
    hidden: false,
    get body() { return this.getElementById("__body"); },
    get documentElement() { return this.getElementById("__html"); },
    get activeElement() { return null; },
  };
  let ulozene = JSON.stringify(stav);
  const box = {
    console,
    setTimeout, clearTimeout, setInterval, clearInterval,
    document: doc,
    localStorage: {
      getItem() { return ulozene; },
      setItem(k, v) { ulozene = v; },
      removeItem() { ulozene = null; },
    },
    navigator: { vibrate() {}, language: "sk" },
    location: { hash: "", protocol: "file:", href: "file:///kucharka.html", reload() {} },
    history: { pushState() {}, back() {}, replaceState() {} },
    MutationObserver: class { observe() {} disconnect() {} },
    SpeechSynthesisUtterance: class { constructor(t) { this.text = t; } },
    speechSynthesis: { cancel() {}, speak() {} },
    fetch: () => Promise.reject(new Error("offline v teste")),
    Blob: class {}, FileReader: class { readAsText() {} },
    URL: { createObjectURL: () => "", revokeObjectURL() {} },
    alert() {}, prompt() { return null; }, confirm() { return false; },
    matchMedia: () => ({ matches: false, addListener() {}, addEventListener() {} }),
    scrollTo() {}, scrollY: 0, print() {},
    addEventListener() {}, removeEventListener() {},
    requestAnimationFrame(f) { return setTimeout(f, 0); },
  };
  box.window = box;
  box.self = box;

  const ctx = vm.createContext(box);
  ctx.__rand = rand;
  vm.runInContext("Math.random = () => __rand();", ctx);
  try {
    vm.runInContext(src, ctx, { filename: "data/app.js" });
  } catch (e) {
    throw new Error("app.js padol v harnesse: " + e.message + "\n" + (e.stack || ""));
  }
  Object.assign(ctx, ctx.__exp || {});

  // renderery preč — testy počítajú, nekreslia
  ["renderPlan", "renderDash", "renderNakup", "renderVyziva", "renderGrid", "renderSpajza",
   "renderChips", "renderKolekcie", "renderStravnici", "renderGenWizard", "renderCasovace",
   "renderDashSpajza", "renderSyncStav", "naplnProfil", "toast", "zobrazView", "renderBlokEditor",
   "naplnPotravinyDatalist", "aktualizujJednotky", "naplnKuchyne", "zpristupniNav"]
    .forEach(f => { if (typeof ctx[f] === "function") ctx[f] = () => {}; });
  ctx.save = () => {};                       // bez zápisu do localStorage/sync
  ctx.confirmModal = () => Promise.resolve(true);
  ctx.promptModal = () => Promise.resolve(null);
  ctx.setSeed = s => { ctx.__rand = mulberry32(s); };

  return ctx;
}

module.exports = { load, nacitajRecepty, nacitajPotraviny, nacitajJedalnicky, mulberry32 };
