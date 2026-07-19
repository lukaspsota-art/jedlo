import { useState, useEffect, useRef } from "react";

/* ============ DÁTA ============ */

const PLAN = {
  week: "KW27 · 5.7. – 9.7.2026",
  persons: "2 osoby · 4 porcie na jedlo",
  blocks: [
    {
      id: "A",
      label: "Blok A",
      range: "Ne večera → Ut snack",
      meals: [
        {
          type: "Večera",
          days: "Ne + Po",
          title: "Hit 'n' run pečené kura",
          subtitle: "traybake s paradajkami a paprikou + ryža",
          source: "Jamie Oliver",
          url: "https://www.jamieoliver.com/recipes/chicken/hit-n-run-traybaked-chicken/",
          kcal: 424, macros: "P 28 · F 16 · C 45", time: "1 h 15 min",
          note: "Recept chce stehná bez kože a kosti — akciové vykosti doma. 2 porcie odlož na pondelok.",
          ingredients: [
            "4 veľké zrelé paradajky",
            "2 červené cibule",
            "1 červená paprika",
            "1 žltá paprika",
            "6 kuracích horných stehien (bez kože a kosti)",
            "4 strúčiky cesnaku (neolúpané)",
            "½ zväzku čerstvého tymianu",
            "1 ČL údenej papriky",
            "olivový olej",
            "2 PL balzamikového octu",
            "morská soľ, čierne korenie",
            "Príloha: 140 g ryže (35 g na osobu)",
          ],
          steps: [
            { t: "Predhrej rúru na 180 °C. Vykosti 6 kuracích stehien a stiahni kožu." },
            { t: "4 paradajky rozštvrti, 2 červené cibule olúpaj a nakrájaj na hrubé kolieska, 2 papriky zbav semien a nakrájaj na väčšie kusy." },
            { t: "Všetko vlož do pekáča (cca 25×30 cm) spolu s kuraťom, 4 pritlačenými neolúpanými strúčikmi cesnaku, lístkami z ½ zväzku tymianu a 1 ČL údenej papriky. Zakvapkaj olivovým olejom a 2 PL balzamika, osoľ, okoreň a rukami premiešaj. Kura ulož navrch." },
            { t: "Peč 30 min.", timer: 1800 },
            { t: "Kura obráť a podlej šťavou z pekáča. Peč ďalších 30 min, kým je kura zlaté a mäkké.", timer: 1800 },
            { t: "Medzitým uvar 140 g ryže podľa návodu na obale.", timer: 720 },
            { t: "Servíruj štvrtinu plechu + ryžu na osobu. 2 porcie nechaj vychladnúť a odlož do chladničky na pondelkovú večeru." },
          ],
        },
        {
          type: "Obed",
          days: "Po + Ut",
          title: "Pikantné kura s ryžou z plechu",
          subtitle: "spiced chicken & rice traybake s kukuricou",
          source: "Jamie Oliver",
          url: "https://www.jamieoliver.com/recipes/chicken/spiced-chicken-rice-traybake/",
          kcal: 520, macros: "P 37 · F 21 · C 47", time: "1 h 5 min",
          note: "Najväčšie jedlo dňa. Varí sa v nedeľu večer súčasne s Hit 'n' run — jedna rúra, dva plechy.",
          ingredients: [
            "2 červené cibule",
            "3 papriky (mix farieb)",
            "1 PL olivového oleja",
            "8 kuracích stehien (s kosťou a kožou)",
            "3 PL kajunského korenia (24 g)",
            "300 g dlhozrnnej ryže",
            "4 kukuričné klásky (2 klasy prekrojené na polovice)",
            "2 PL peri-peri omáčky",
            "2 PL bieleho jogurtu",
            "600 ml vriacej vody",
          ],
          steps: [
            { t: "Rúra na 180 °C. 2 červené cibule olúpaj a nakrájaj na osminky, 3 papriky zbav semien a natrhaj na veľké kusy." },
            { t: "Do veľkého pekáča daj 8 kuracích stehien, zeleninu, 3 PL kajunského korenia a 1 PL oleja. Premiešaj a kura otoč kožou nahor." },
            { t: "Peč 40 min.", timer: 2400 },
            { t: "Zovri vodu v kanvici. Pekáč vyber, okolo kuraťa rozsyp 300 g ryže, prilej 600 ml vriacej vody, medzi kura vlož 4 kukuričné klásky a tesne prikry alobalom." },
            { t: "Vráť do rúry na 20 min, kým ryža nasiakne vodu a je nadýchaná.", timer: 1200 },
            { t: "Dochuť soľou a korením. Podávaj s 2 PL peri-peri omáčky a 2 PL jogurtu. 2 porcie = pondelok, 2 porcie = utorok." },
          ],
        },
        {
          type: "Raňajky",
          days: "Po + Ut · základ tortilla",
          title: "Tuniakový wrap",
          subtitle: "studený wrap s chrumkavou tuniakovou zmesou",
          source: "Budget Bytes",
          url: "https://www.budgetbytes.com/tuna-wrap/",
          kcal: 385, macros: "P 31 · F 21 · C 20", time: "15 min · večer vopred",
          note: "Recept prepočítaný z 3 na 4 porcie (×4⁄3). Tuniak: 2×185 g plechovky — najbližšia celá varianta k receptu. Z balenia 6 tortíl 2 ks zamraziť.",
          ingredients: [
            "370 g tuniaka vo vlastnej šťave (2 plechovky á 185 g)",
            "67 g stopkového zeleru",
            "20 g vlašských orechov",
            "2 jarné cibuľky",
            "74 g majonézy",
            "10 ml citrónovej šťavy",
            "štipka soli a čierneho korenia",
            "2 slivkové paradajky",
            "8 listov rímskeho šalátu",
            "4 veľké pšeničné tortilly",
          ],
          steps: [
            { t: "2 plechovky tuniaka dôkladne sceď — čím suchší, tým lepšie bude wrap držať." },
            { t: "Nadrobno nakrájaj 67 g zeleru, nasekaj 20 g vlašských orechov a nakrájaj 2 jarné cibuľky." },
            { t: "V mise zmiešaj tuniak, zeler, orechy, cibuľku, 74 g majonézy, 10 ml citrónovej šťavy, štipku soli a korenia." },
            { t: "Natrhaj 8 listov šalátu na menšie kusy a 2 paradajky nakrájaj na tenké plátky." },
            { t: "Tortillu prihrej 5–10 s v mikrovlnke, aby sa dobre rolovala a netrhala." },
            { t: "Na tortillu ulož vrstvu šalátu, vejárik paradajok a ¼ tuniakovej zmesi — šalát chráni tortillu pred rozmočením." },
            { t: "Pevne zroluj, boky priebežne zahýbaj dovnútra a wrap polož švom nadol. Zopakuj — spolu 4 wrapy." },
            { t: "Zabal a ulož do chladničky. Nedeľa večer = 2 wrapy na pondelok, pondelok večer = 2 wrapy na utorok (zmes vydrží 4 dni)." },
          ],
        },
        {
          type: "Snack",
          days: "Po + Ut",
          title: "Skyr 130 g",
          subtitle: "kupovaný · Kaufland XTRA 0,49 €",
          source: null, url: null,
          kcal: 85, macros: "P 14 · F 0 · C 7", time: "—",
          note: "1 téglik na osobu a deň — spolu 4 ks.",
          ingredients: null, steps: null,
        },
      ],
    },
    {
      id: "B",
      label: "Blok B",
      range: "Ut večera → Št snack",
      meals: [
        {
          type: "Večera",
          days: "Ut + St",
          title: "Bravčová panenka na paprike",
          subtitle: "paprika pork s kyslou smotanou + ryža",
          source: "BBC Good Food",
          url: "https://www.bbcgoodfoodme.com/recipes/paprika-pork/",
          kcal: 417, macros: "P 30 · F 13 · C 44", time: "35 min",
          note: "Oficiálne 257 kcal + príloha ryža podľa receptu (45 g na osobu). 2 porcie utorok, 2 porcie streda.",
          ingredients: [
            "1 PL olivového oleja",
            "2 cibule",
            "400 g bravčovej panenky (očistenej)",
            "250 g šampiňónov",
            "1½ PL údenej papriky",
            "1 PL paradajkového pretlaku",
            "200 ml kuracieho vývaru",
            "100 ml kyslej smotany",
            "Príloha: 180 g ryže (45 g na osobu)",
          ],
          steps: [
            { t: "2 cibule najemno nakrájaj, 400 g panenky nakrájaj na hrubšie pásiky, 250 g šampiňónov na plátky." },
            { t: "Vo veľkej panvici rozohrej 1 PL oleja, pridaj cibuľu a restuj 10 min do mäkka a zlatista.", timer: 600 },
            { t: "Pridaj panenku a šampiňóny, opekaj na vysokom ohni 3–4 min do zhnednutia.", timer: 240 },
            { t: "Pridaj 1½ PL údenej papriky a miešaj ešte 1 min.", timer: 60 },
            { t: "Vmiešaj 1 PL pretlaku, prilej 200 ml vývaru a nechaj mierne prebublávať 5–8 min, kým je mäso prepečené.", timer: 480 },
            { t: "Medzitým uvar 180 g ryže podľa obalu.", timer: 720 },
            { t: "Odstav z ohňa, vmiešaj 100 ml kyslej smotany, dochuť. Podávaj s ryžou a prípadne kopčekom smotany navyše." },
          ],
        },
        {
          type: "Obed",
          days: "St + Št",
          title: "Bravčový wok s rezancami",
          subtitle: "pork noodle stir-fry so sladkou chilli",
          source: "BBC Good Food",
          url: "https://www.bbcgoodfoodme.com/recipes/pork-noodle-stir-fry/",
          kcal: 605, macros: "P 31 · F 19 · C 75", time: "25 min",
          note: "Zo 500 g balenia mletého ide 350 g do woku, 150 g zamraziť. Zelenina: celé 400 g balenie (dohodnuté, recept 320 g).",
          ingredients: [
            "3 PL sezamového oleja (45 ml)",
            "350 g chudého mletého bravčového",
            "350 g vaječných rezancov",
            "20 g zázvoru (nastrúhaný)",
            "3 strúčiky cesnaku (prelisované)",
            "400 g wok zeleninovej zmesi",
            "4 PL sójovej omáčky (60 ml)",
            "2 ČL kukuričného škrobu",
            "4 PL sladkej chilli omáčky (60 ml)",
            "2 PL vody",
          ],
          steps: [
            { t: "Vo woku rozohrej 3 PL sezamového oleja na vysokom ohni. Pridaj 350 g mletého, rozbíjaj lyžicou a opekaj cca 8 min dozlata.", timer: 480 },
            { t: "Medzitým zalej 350 g rezancov v mise vriacou vodou a nechaj 5–10 min zmäknúť.", timer: 480 },
            { t: "K mäsu pridaj 20 g zázvoru, 3 strúčiky cesnaku a 400 g zeleniny. Restuj 2–3 min.", timer: 180 },
            { t: "Zmiešaj 1 PL sójovky s 2 ČL škrobu na hladkú pastu. Pridaj zvyšné 3 PL sójovky, 4 PL sladkej chilli omáčky a 2 PL vody." },
            { t: "Rezance sceď, pridaj do woku spolu s omáčkou a miešaj, kým omáčka neobalí rezance — podľa potreby prilej trochu vody. 2 porcie streda, 2 porcie štvrtok." },
          ],
        },
        {
          type: "Raňajky",
          days: "St + Št · základ toastový chlieb",
          title: "Vajíčkové sendviče",
          subtitle: "just-egg sandwiches so žeruchou",
          source: "BBC Good Food",
          url: "https://www.bbcgoodfoodme.com/recipes/justegg-sandwiches/",
          kcal: 232, macros: "P 8 · F 16 · C 16", time: "20 min · náplň deň vopred",
          note: "Celý recept (8 mini porcií) = presne 4 raňajkové porcie — 3 prsty na osobu a deň. Náplň sprav v utorok večer na oba dni.",
          ingredients: [
            "3 vajcia",
            "1–2 PL majonézy (30 g)",
            "6 krajcov toastového chleba",
            "2 PL zmäknutého masla (30 g)",
            "žerucha na podávanie",
          ],
          steps: [
            { t: "3 vajcia uvar natvrdo — 10 min vo vriacej vode, potom schlaď v studenej.", timer: 600 },
            { t: "Vajcia olúpaj a najemno nasekaj. Zmiešaj s 30 g majonézy, osoľ a okoreň. Náplň vydrží v chladničke do ďalšieho dňa." },
            { t: "6 krajcov chleba natri 30 g masla, naplň vajíčkovou zmesou a zlož 3 sendviče." },
            { t: "Nakrájaj na úhľadné prsty (12 ks) a posyp žeruchou. 6 prstov = streda, 6 prstov = štvrtok (skladaj vždy večer vopred)." },
          ],
        },
        {
          type: "Snack",
          days: "St + Št",
          title: "Miša tvarohový krém 130 g",
          subtitle: "kupovaný · Kaufland 0,79 €",
          source: null, url: null,
          kcal: 195, macros: "P 9 · F 9 · C 18", time: "—",
          note: "1 ks na osobu a deň — spolu 4 ks.",
          ingredients: null, steps: null,
        },
      ],
    },
  ],
};

const DAY_STRIP = [
  { d: "Ne", items: ["V·A"] },
  { d: "Po", items: ["R·A", "O·A", "S·A", "V·A"], kcal: 1414 },
  { d: "Ut", items: ["R·A", "O·A", "S·A", "V·B"], kcal: 1407 },
  { d: "St", items: ["R·B", "O·B", "S·B", "V·B"], kcal: 1449 },
  { d: "Št", items: ["R·B", "O·B", "S·B"], kcal: "1032*" },
];

/* ============ POMOCNÉ ============ */

const AMOUNT_RE = /(\d[\d,.–×⁄]*\s?(?:g|ml|ks|PL|ČL|min|s|°C|kraj\w*|strúčik\w*|list\w*|plechov\w*|cibu\w*|paradaj\w*|papriky|vajcia|klásky|wrapy|prstov|sendviče)\b|štipk\w+)/g;

function Amounts({ text }) {
  const parts = text.split(AMOUNT_RE);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <strong key={i} className="amt">{p}</strong> : <span key={i}>{p}</span>
      )}
    </>
  );
}

function fmt(sec) {
  const m = Math.floor(sec / 60), s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.35, 0.7].forEach((off) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; o.type = "sine";
      g.gain.setValueAtTime(0.001, ctx.currentTime + off);
      g.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + off + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + off + 0.3);
      o.start(ctx.currentTime + off); o.stop(ctx.currentTime + off + 0.32);
    });
  } catch (e) {}
}

/* ============ ČASOVAČ ============ */

function Timer({ seconds }) {
  const [left, setLeft] = useState(seconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef(null);

  useEffect(() => { setLeft(seconds); setRunning(false); setDone(false); }, [seconds]);

  useEffect(() => {
    if (!running) return;
    ref.current = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(ref.current);
          setRunning(false); setDone(true); beep();
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(ref.current);
  }, [running]);

  const pct = 1 - left / seconds;

  return (
    <div className={`timer ${done ? "timer-done" : ""}`}>
      <div className="timer-bar"><div className="timer-fill" style={{ width: `${pct * 100}%` }} /></div>
      <div className="timer-row">
        <span className="timer-num">{done ? "HOTOVO" : fmt(left)}</span>
        <div className="timer-btns">
          {!done && (
            <button className="tbtn tbtn-main" onClick={() => setRunning((r) => !r)}>
              {running ? "Pauza" : left === seconds ? "Spustiť" : "Pokračovať"}
            </button>
          )}
          <button className="tbtn" onClick={() => { setLeft(seconds); setRunning(false); setDone(false); }}>
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============ REŽIM VARENIA ============ */

function CookMode({ meal, onExit }) {
  const [i, setI] = useState(0);
  const steps = meal.steps;
  const step = steps[i];

  return (
    <div className="cook">
      <div className="cook-head">
        <button className="exit" onClick={onExit}>✕ Ukončiť</button>
        <div className="cook-title">{meal.title}</div>
        <div className="cook-count">Krok {i + 1} / {steps.length}</div>
      </div>
      <div className="cook-progress">
        {steps.map((_, k) => (
          <div key={k} className={`seg ${k < i ? "seg-past" : k === i ? "seg-now" : ""}`} onClick={() => setI(k)} />
        ))}
      </div>
      <div className="cook-body">
        <p className="cook-step"><Amounts text={step.t} /></p>
        {step.timer && <Timer seconds={step.timer} />}
      </div>
      <div className="cook-nav">
        <button className="nav-btn" disabled={i === 0} onClick={() => setI(i - 1)}>← Späť</button>
        {i < steps.length - 1 ? (
          <button className="nav-btn nav-next" onClick={() => setI(i + 1)}>Ďalší krok →</button>
        ) : (
          <button className="nav-btn nav-next" onClick={onExit}>Dovarené ✓</button>
        )}
      </div>
    </div>
  );
}

/* ============ KARTA JEDLA ============ */

function MealCard({ meal }) {
  const [cooking, setCooking] = useState(false);
  if (cooking) return <CookMode meal={meal} onExit={() => setCooking(false)} />;

  return (
    <div className="card">
      <div className="card-top">
        <div>
          <div className="days">{meal.days}</div>
          <h2 className="title">{meal.title}</h2>
          <div className="subtitle">{meal.subtitle}</div>
        </div>
        <div className="kcal-badge">
          <span className="kcal-num">{meal.kcal}</span>
          <span className="kcal-lbl">kcal/porcia</span>
        </div>
      </div>

      <div className="meta">
        <span className="chip">{meal.macros}</span>
        <span className="chip">{meal.time}</span>
        {meal.source && (
          <a className="chip chip-link" href={meal.url} target="_blank" rel="noreferrer">
            {meal.source} ↗
          </a>
        )}
      </div>

      {meal.note && <p className="note">{meal.note}</p>}

      {meal.ingredients && (
        <>
          <div className="sec-label">Ingrediencie · 4 porcie</div>
          <ul className="ing">
            {meal.ingredients.map((x, k) => (
              <li key={k}><Amounts text={x} /></li>
            ))}
          </ul>
          <div className="sec-label">Postup</div>
          <ol className="steps">
            {meal.steps.map((s, k) => (
              <li key={k}>
                <span className="step-num">{k + 1}</span>
                <span className="step-text">
                  <Amounts text={s.t} />
                  {s.timer && <span className="step-timer">⏱ {Math.round(s.timer / 60)} min</span>}
                </span>
              </li>
            ))}
          </ol>
          <button className="cook-btn" onClick={() => setCooking(true)}>
            ▶ Režim varenia s časovačmi · {meal.steps.length} krokov
          </button>
        </>
      )}
    </div>
  );
}

/* ============ APP ============ */

export default function App() {
  const [blockId, setBlockId] = useState("A");
  const [mealIdx, setMealIdx] = useState(0);
  const block = PLAN.blocks.find((b) => b.id === blockId);
  const meal = block.meals[mealIdx];

  return (
    <div className="app">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=Inter:wght@400;500;600;700&display=swap');

        .app { --ink:#20241c; --muted:#6e7263; --bone:#f1f0ea; --card:#ffffff; --line:#dcdbd0;
               --paprika:#bd3a1f; --olive:#4c5c38; --gold:#b98a2e;
               font-family:'Inter',system-ui,sans-serif; color:var(--ink);
               background:var(--bone); min-height:100vh; max-width:680px; margin:0 auto;
               padding:20px 14px 48px; box-sizing:border-box; }
        .app * { box-sizing:border-box; }

        .head { margin-bottom:16px; }
        .kicker { font-size:11px; letter-spacing:.14em; text-transform:uppercase; color:var(--paprika); font-weight:700; }
        .h1 { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:30px; line-height:1.05; margin:6px 0 4px; }
        .sub { font-size:13px; color:var(--muted); }

        .strip { display:flex; gap:6px; margin:16px 0 20px; }
        .day { flex:1; background:var(--card); border:1px solid var(--line); border-radius:10px; padding:7px 4px 6px; text-align:center; }
        .day-name { font-weight:700; font-size:12px; }
        .day-items { font-size:9.5px; color:var(--muted); line-height:1.5; margin-top:2px; letter-spacing:.02em; }
        .day-kcal { font-size:10px; font-weight:700; color:var(--olive); margin-top:3px; }

        .tabs { display:flex; gap:8px; margin-bottom:10px; }
        .tab { flex:1; padding:12px 8px; border-radius:12px; border:1px solid var(--line); background:var(--card);
               font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:16px; cursor:pointer; color:var(--ink); }
        .tab small { display:block; font-family:'Inter'; font-weight:500; font-size:10.5px; color:var(--muted); margin-top:2px; }
        .tab-on { background:var(--ink); color:#fff; border-color:var(--ink); }
        .tab-on small { color:#c9cdbf; }

        .mtabs { display:flex; gap:6px; margin-bottom:14px; }
        .mtab { flex:1; padding:9px 4px; border-radius:999px; border:1px solid var(--line); background:transparent;
                font-size:12.5px; font-weight:600; cursor:pointer; color:var(--muted); }
        .mtab-on { background:var(--paprika); border-color:var(--paprika); color:#fff; }

        .card { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:18px 16px; }
        .card-top { display:flex; justify-content:space-between; gap:12px; align-items:flex-start; }
        .days { font-size:11px; letter-spacing:.1em; text-transform:uppercase; font-weight:700; color:var(--gold); }
        .title { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:23px; line-height:1.1; margin:4px 0 3px; }
        .subtitle { font-size:13px; color:var(--muted); }
        .kcal-badge { text-align:center; background:var(--bone); border-radius:12px; padding:8px 10px; min-width:74px; }
        .kcal-num { display:block; font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:22px; color:var(--paprika); }
        .kcal-lbl { font-size:9px; color:var(--muted); letter-spacing:.05em; }

        .meta { display:flex; flex-wrap:wrap; gap:6px; margin:12px 0; }
        .chip { font-size:11.5px; font-weight:600; padding:5px 10px; border-radius:999px; background:var(--bone); color:var(--ink); }
        .chip-link { color:var(--paprika); text-decoration:none; border:1px solid var(--paprika); background:transparent; }

        .note { font-size:12.5px; line-height:1.5; background:#f7f2e2; border-left:3px solid var(--gold); padding:9px 11px; border-radius:0 8px 8px 0; margin:0 0 6px; }

        .sec-label { font-size:11px; letter-spacing:.12em; text-transform:uppercase; font-weight:700; color:var(--muted); margin:14px 0 8px; }
        .ing { list-style:none; margin:0 0 16px; padding:0; }
        .ing li { padding:7px 0; border-bottom:1px dashed var(--line); font-size:14px; line-height:1.45; }
        .ing li:last-child { border-bottom:none; }
        .amt { color:var(--paprika); font-weight:700; }

        .cook-btn { width:100%; padding:15px; border:none; border-radius:12px; background:var(--olive); color:#fff;
                    font-size:15px; font-weight:700; cursor:pointer; font-family:'Inter'; }

        .steps { list-style:none; margin:0 0 16px; padding:0; }
        .steps li { display:flex; gap:10px; padding:9px 0; border-bottom:1px dashed var(--line); font-size:13.5px; line-height:1.5; }
        .steps li:last-child { border-bottom:none; }
        .step-num { flex:none; width:22px; height:22px; border-radius:50%; background:var(--bone); color:var(--paprika);
                    font-weight:800; font-size:11.5px; display:flex; align-items:center; justify-content:center; margin-top:1px; }
        .step-text { flex:1; }
        .step-timer { display:inline-block; margin-left:6px; font-size:11px; font-weight:700; color:var(--olive);
                      background:#e8f0dc; border-radius:999px; padding:2px 8px; white-space:nowrap; }

        .cook { background:var(--card); border:1px solid var(--line); border-radius:16px; padding:16px; min-height:420px; display:flex; flex-direction:column; }
        .cook-head { display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .exit { border:1px solid var(--line); background:transparent; border-radius:999px; padding:6px 12px; font-size:12px; font-weight:600; cursor:pointer; color:var(--muted); }
        .cook-title { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:14px; flex:1; text-align:center; }
        .cook-count { font-size:11px; font-weight:700; color:var(--gold); white-space:nowrap; }
        .cook-progress { display:flex; gap:4px; margin:14px 0; }
        .seg { flex:1; height:5px; border-radius:3px; background:var(--line); cursor:pointer; }
        .seg-past { background:var(--olive); }
        .seg-now { background:var(--paprika); }
        .cook-body { flex:1; display:flex; flex-direction:column; justify-content:center; gap:18px; padding:8px 2px; }
        .cook-step { font-size:19px; line-height:1.55; margin:0; }
        .cook-nav { display:flex; gap:8px; margin-top:16px; }
        .nav-btn { flex:1; padding:14px; border-radius:12px; border:1px solid var(--line); background:transparent; font-size:14.5px; font-weight:700; cursor:pointer; color:var(--ink); }
        .nav-btn:disabled { opacity:.35; cursor:default; }
        .nav-next { background:var(--paprika); border-color:var(--paprika); color:#fff; }

        .timer { background:var(--bone); border-radius:14px; padding:14px; }
        .timer-done { background:#e8f0dc; }
        .timer-bar { height:6px; border-radius:3px; background:var(--line); overflow:hidden; margin-bottom:10px; }
        .timer-fill { height:100%; background:var(--paprika); transition:width .5s linear; }
        .timer-row { display:flex; align-items:center; justify-content:space-between; gap:10px; }
        .timer-num { font-family:'Bricolage Grotesque',sans-serif; font-weight:800; font-size:34px; letter-spacing:.02em; }
        .timer-btns { display:flex; gap:6px; }
        .tbtn { padding:10px 14px; border-radius:10px; border:1px solid var(--line); background:#fff; font-weight:700; font-size:13px; cursor:pointer; color:var(--ink); }
        .tbtn-main { background:var(--olive); border-color:var(--olive); color:#fff; }

        .foot { margin-top:14px; font-size:11px; color:var(--muted); line-height:1.6; }
      `}</style>

      <div className="head">
        <div className="kicker">Jedálniček · {PLAN.week}</div>
        <h1 className="h1">Blok A + Blok B</h1>
        <div className="sub">{PLAN.persons} · cieľ 1 400 – 1 450 kcal/deň · obed &gt; večera &gt; raňajky &gt; snack</div>
      </div>

      <div className="strip">
        {DAY_STRIP.map((d) => (
          <div className="day" key={d.d}>
            <div className="day-name">{d.d}</div>
            <div className="day-items">{d.items.map((x) => <div key={x}>{x}</div>)}</div>
            {d.kcal && <div className="day-kcal">{d.kcal}</div>}
          </div>
        ))}
      </div>

      <div className="tabs">
        {PLAN.blocks.map((b) => (
          <button
            key={b.id}
            className={`tab ${b.id === blockId ? "tab-on" : ""}`}
            onClick={() => { setBlockId(b.id); setMealIdx(0); }}
          >
            {b.label}
            <small>{b.range}</small>
          </button>
        ))}
      </div>

      <div className="mtabs">
        {block.meals.map((m, k) => (
          <button
            key={m.type}
            className={`mtab ${k === mealIdx ? "mtab-on" : ""}`}
            onClick={() => setMealIdx(k)}
          >
            {m.type}
          </button>
        ))}
      </div>

      <MealCard meal={meal} key={blockId + mealIdx} />

      <div className="foot">
        * Št bez večere — mimo plánu. Ryža spolu 620 g zo zásob. Zamraziť: 150 g mletého bravčového + 2 tortilly.
        Skratky: R raňajky · O obed · S snack · V večera · A/B blok.
      </div>
    </div>
  );
}
