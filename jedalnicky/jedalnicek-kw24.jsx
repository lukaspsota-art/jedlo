import React, { useState, useEffect, useRef } from "react";

/* ============================================================
   Týždenný jedálniček — Blok B + Blok C (raňajky/obed)
   2 osoby · zľavy Kaufland KW24 (11.–17. 6. 2026)
   ============================================================ */

const COL = {
  paper: "#F7F4EC",
  ink: "#1C1B17",
  leaf: "#2F6B3E",
  leafSoft: "#E3EEE2",
  amber: "#E8A317",
  tomato: "#C23B22",
  line: "#DAD4C4",
  mut: "#6E6A5C",
};

const plan = {
  B: {
    label: "Blok B",
    sub: "utorok večer → piatok snack",
    day: { kcal: 1403, p: 92, f: 44, c: 153 },
    meals: [
      {
        key: "ranajky",
        slot: "Raňajky",
        name: "Bageta s údenou šunkou a goudou",
        source: "Allrecipes · pripraviť večer vopred",
        kcal: 378, p: 23, f: 12, c: 41,
        ingredients: [
          { item: "Bageta", amt: "150 g" },
          { item: "Údená šunka výberová", amt: "100 g" },
          { item: "Gouda 48 %", amt: "60 g" },
          { item: "Soľ, čierne korenie", amt: "podľa chuti" },
        ],
        steps: [
          { title: "Nakrojiť", text: "Bagetu (150 g) prekroj pozdĺžne." },
          { title: "Syr", text: "Goudu 48 % (60 g) nakrájaj na plátky." },
          { title: "Naskladať", text: "Vlož údenú šunku (100 g) a goudu (60 g), prisoľ a okoreň." },
          { title: "Vychladiť", text: "Zabaľ a daj do chladničky do rána." },
        ],
      },
      {
        key: "obed",
        slot: "Obed",
        name: "Medovo-cesnakové kuracie prsia s ryžou",
        source: "RecipeTin Eats",
        kcal: 480, p: 36, f: 6, c: 69,
        ingredients: [
          { item: "Kuracie rezne prsné", amt: "260 g (2 ks)" },
          { item: "Ryža (suchá)", amt: "110 g" },
          { item: "Med", amt: "50 g" },
          { item: "Hladká múka", amt: "16 g" },
          { item: "Maslo", amt: "10 g" },
          { item: "Sójová omáčka", amt: "8 ml" },
          { item: "Jablčný ocot", amt: "8 ml" },
          { item: "Cesnak", amt: "2 strúčiky" },
          { item: "Soľ, čierne korenie", amt: "podľa chuti" },
        ],
        steps: [
          { title: "Ryža", text: "Ryžu (110 g) daj variť podľa návodu.", timer: 720 },
          { title: "Príprava mäsa", text: "Kuracie prsia (260 g) prekroj horizontálne na tenšie rezne, osoľ a okoreň." },
          { title: "Obaliť", text: "Rezne obaľ v múke (16 g), prebytok straste." },
          { title: "Opiecť", text: "V panvici rozpáľ väčšinu masla (10 g), rezne opekaj do zlatista.", timer: 180 },
          { title: "Otočiť", text: "Otoč a opekaj druhú stranu.", timer: 60 },
          { title: "Cesnak", text: "Odsuň mäso, pridaj nasekaný cesnak (2 strúčiky) a zvyšok masla, krátko opraž." },
          { title: "Omáčka", text: "Prilej med (50 g), sójovú omáčku (8 ml) a jablčný ocot (8 ml), nechaj prebublať do zhustnutia.", timer: 120 },
          { title: "Dokončiť", text: "Polej rezne omáčkou a podávaj s ryžou (110 g)." },
        ],
      },
      {
        key: "snack",
        slot: "Snack",
        name: "Proteínový ochutený tvaroh",
        source: "kúpené · Kaufland −25 %",
        kcal: 120, p: 18, f: 2, c: 8,
        ingredients: [{ item: "Proteínový ochutený tvaroh", amt: "150 g (1 ks)" }],
        steps: [{ title: "Servírovať", text: "Vychlaď a zjedz." }],
      },
      {
        key: "vecera",
        slot: "Večera",
        name: "Klobásky na gril s pečenou kapiou a zemiakmi",
        source: "Jamie Oliver",
        kcal: 425, p: 15, f: 24, c: 35,
        ingredients: [
          { item: "Klobásky na gril", amt: "166 g" },
          { item: "Paprika kapia", amt: "250 g" },
          { item: "Zemiaky", amt: "330 g" },
          { item: "Olivový olej", amt: "8 ml" },
          { item: "Soľ, čierne korenie", amt: "podľa chuti" },
        ],
        steps: [
          { title: "Rúra", text: "Predhrej rúru na 200 °C." },
          { title: "Nakrájať", text: "Zemiaky (330 g) a kapiu (250 g) nakrájaj, pomiešaj s olejom (8 ml), osoľ a okoreň." },
          { title: "Na plech", text: "Rozlož na plech, navrch polož klobásky (166 g)." },
          { title: "Pečenie 1", text: "Peč do polovice, potom premiešaj a klobásky otoč.", timer: 1320 },
          { title: "Pečenie 2", text: "Dopeč do zlatista a mäkkých zemiakov.", timer: 1380 },
        ],
      },
    ],
  },
  C: {
    label: "Blok C",
    sub: "piatok večer → nedeľa snack · iba raňajky + obed",
    day: { kcal: 743, p: 45, f: 28, c: 65, partial: true },
    meals: [
      {
        key: "ranajky",
        slot: "Raňajky",
        name: "Tuňakový wrap s uhorkou",
        source: "RecipeTin Eats · báza: tortilla",
        kcal: 252, p: 19, f: 5, c: 30,
        ingredients: [
          { item: "Tortilla gril", amt: "2 ks" },
          { item: "Tuniak (odkvapkaný)", amt: "120 g (1 konzerva)" },
          { item: "Uhorka šalátová", amt: "100 g" },
          { item: "Soľ, čierne korenie", amt: "podľa chuti" },
        ],
        steps: [
          { title: "Tuniak", text: "Tuniak (120 g) odkvapkaj a rozmrv vidličkou." },
          { title: "Uhorka", text: "Uhorku (100 g) nakrájaj na tenké plátky." },
          { title: "Zabaliť", text: "Na tortilly (2 ks) rozlož tuniak a uhorku, osoľ/okoreň a pevne zabaľ." },
        ],
      },
      {
        key: "obed",
        slot: "Obed",
        name: "Domáce hovädzie burgery",
        source: "Allrecipes — Juiciest Hamburgers",
        kcal: 491, p: 26, f: 23, c: 35,
        ingredients: [
          { item: "Mleté mäso (hovädzie+bravčové)", amt: "227 g" },
          { item: "Strúhanka", amt: "20 g" },
          { item: "Vajce", amt: "1/2 ks" },
          { item: "Kondenzované mlieko", amt: "10 ml" },
          { item: "Worcesterská omáčka", amt: "8 ml" },
          { item: "Kaizerka (na bulku)", amt: "2 ks" },
          { item: "Cesnak", amt: "1/2 strúčika" },
          { item: "Cayenne, soľ", amt: "štipka" },
        ],
        steps: [
          { title: "Zmiešať", text: "Zmiešaj mleté mäso (227 g), strúhanku (20 g), vajce (1/2), kondenzované mlieko (10 ml), worcester (8 ml), cesnak (1/2 strúčika), štipku cayenne a soľ." },
          { title: "Vytvarovať", text: "Vytvaruj 2 rovnaké placky." },
          { title: "Grilovať", text: "Gril/panvica — opekaj z každej strany do prepečenia.", timer: 240 },
          { title: "Zložiť", text: "Kaizerky (2 ks) prekroj, vlož burger a podávaj." },
        ],
      },
    ],
  },
};

function fmt(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function Timer({ seconds }) {
  const [left, setLeft] = useState(seconds);
  const [run, setRun] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (run && left > 0) {
      ref.current = setTimeout(() => setLeft((l) => l - 1), 1000);
    }
    return () => clearTimeout(ref.current);
  }, [run, left]);
  const done = left === 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
      <button
        onClick={() => { if (done) { setLeft(seconds); setRun(false); } else setRun((r) => !r); }}
        style={{
          border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14,
          padding: "8px 14px", borderRadius: 999, letterSpacing: 0.3,
          color: COL.paper,
          background: done ? COL.leaf : run ? COL.tomato : COL.amber,
          fontFamily: "Inter, sans-serif",
        }}
      >
        {done ? "Hotovo ↺" : run ? "Pauza" : "Štart"}
      </button>
      <span style={{
        fontFamily: "'Space Grotesk', monospace", fontSize: 26, fontWeight: 700,
        color: done ? COL.leaf : COL.ink, fontVariantNumeric: "tabular-nums",
      }}>
        {fmt(left)}
      </span>
      <span style={{ fontSize: 12, color: COL.mut }}>časovač</span>
    </div>
  );
}

function Macro({ kcal, p, f, c, big }) {
  const cell = (v, lab, col) => (
    <div style={{ textAlign: "center", minWidth: 44 }}>
      <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: big ? 20 : 15, color: col }}>{v}</div>
      <div style={{ fontSize: 10, color: COL.mut, letterSpacing: 0.5, textTransform: "uppercase" }}>{lab}</div>
    </div>
  );
  return (
    <div style={{ display: "flex", gap: big ? 18 : 12, alignItems: "center" }}>
      {cell(kcal, "kcal", COL.ink)}
      {cell(p + "g", "B", COL.leaf)}
      {cell(f + "g", "T", COL.amber)}
      {cell(c + "g", "S", COL.tomato)}
    </div>
  );
}

export default function App() {
  const [block, setBlock] = useState("B");
  const [mealIdx, setMealIdx] = useState(0);
  const [cook, setCook] = useState(false);
  const [step, setStep] = useState(0);

  const b = plan[block];
  const meal = b.meals[mealIdx];

  const pickBlock = (k) => { setBlock(k); setMealIdx(0); setCook(false); setStep(0); };
  const pickMeal = (i) => { setMealIdx(i); setCook(false); setStep(0); };

  return (
    <div style={{
      fontFamily: "Inter, system-ui, sans-serif", background: COL.paper, color: COL.ink,
      minHeight: "100vh", padding: "0 0 40px",
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;700&display=swap');
        * { box-sizing: border-box; }
        button:focus-visible { outline: 3px solid ${COL.amber}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce){ *{ transition:none!important } }
      `}</style>

      {/* Hlavička */}
      <header style={{ background: COL.ink, color: COL.paper, padding: "22px 18px 18px" }}>
        <div style={{ fontSize: 11, letterSpacing: 2, color: COL.amber, fontWeight: 700, textTransform: "uppercase" }}>
          Týždenný jedálniček · 2 osoby
        </div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 30, lineHeight: 1, letterSpacing: -0.5 }}>
          Kaufland KW24
        </h1>
        <div style={{ fontSize: 12, color: "#B9B4A4" }}>zľavy platné 11.–17. 6. 2026</div>
      </header>

      {/* Bloky */}
      <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${COL.line}` }}>
        {Object.keys(plan).map((k) => (
          <button key={k} onClick={() => pickBlock(k)} style={{
            flex: 1, border: "none", cursor: "pointer", padding: "14px 8px",
            background: block === k ? COL.leaf : "transparent",
            color: block === k ? COL.paper : COL.ink,
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16,
          }}>
            {plan[k].label}
            <div style={{ fontSize: 10, fontWeight: 500, opacity: 0.85, marginTop: 2, fontFamily: "Inter" }}>
              {plan[k].sub}
            </div>
          </button>
        ))}
      </div>

      {/* Denné súčty */}
      <div style={{
        background: COL.leafSoft, padding: "10px 18px", display: "flex",
        justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: COL.leaf }}>
          {b.day.partial ? "Spolu (čiastočný deň)" : "Denný súčet / osoba"}
        </span>
        <Macro {...b.day} />
      </div>

      {/* Jedlá */}
      <div style={{ display: "flex", gap: 6, padding: "12px 14px", overflowX: "auto" }}>
        {b.meals.map((m, i) => (
          <button key={m.key} onClick={() => pickMeal(i)} style={{
            border: `1px solid ${mealIdx === i ? COL.ink : COL.line}`, cursor: "pointer",
            background: mealIdx === i ? COL.ink : COL.paper,
            color: mealIdx === i ? COL.paper : COL.ink,
            borderRadius: 10, padding: "7px 13px", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
          }}>
            {m.slot}
          </button>
        ))}
      </div>

      {/* Karta jedla */}
      <div style={{ padding: "4px 18px" }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: COL.mut, textTransform: "uppercase", fontWeight: 600 }}>
          {meal.source}
        </div>
        <h2 style={{ margin: "4px 0 10px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 23, lineHeight: 1.1 }}>
          {meal.name}
        </h2>
        <div style={{
          display: "inline-flex", padding: "7px 12px", borderRadius: 10,
          background: COL.paper, border: `1px solid ${COL.line}`, marginBottom: 14,
        }}>
          <Macro kcal={meal.kcal} p={meal.p} f={meal.f} c={meal.c} big />
        </div>
        <div style={{ fontSize: 11, color: COL.mut, marginTop: -6, marginBottom: 14 }}>hodnoty na 1 osobu</div>

        {/* Prepínač režimu */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {["Prehľad", "Varenie"].map((t, i) => {
            const active = (i === 1) === cook;
            return (
              <button key={t} onClick={() => { setCook(i === 1); setStep(0); }} style={{
                flex: 1, border: "none", cursor: "pointer", padding: "10px",
                borderRadius: 10, fontWeight: 700, fontSize: 14,
                background: active ? COL.amber : "#EDE8DB", color: active ? COL.ink : COL.mut,
              }}>{t}</button>
            );
          })}
        </div>

        {!cook ? (
          /* PREHĽAD */
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: COL.leaf, marginBottom: 8 }}>
              Ingrediencie · 2 porcie
            </div>
            <div style={{ border: `1px solid ${COL.line}`, borderRadius: 12, overflow: "hidden" }}>
              {meal.ingredients.map((g, i) => (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", padding: "10px 13px",
                  background: i % 2 ? COL.paper : "#FBF9F3", fontSize: 14,
                }}>
                  <span>{g.item}</span>
                  <span style={{ fontWeight: 700, color: COL.ink }}>{g.amt}</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: COL.leaf, margin: "18px 0 8px" }}>
              Postup
            </div>
            <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
              {meal.steps.map((s, i) => (
                <li key={i} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <span style={{
                    flex: "0 0 26px", height: 26, borderRadius: 999, background: COL.ink, color: COL.paper,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13,
                  }}>{i + 1}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.45 }}>
                    {s.text}
                    {s.timer ? <span style={{ color: COL.amber, fontWeight: 700 }}> · {fmt(s.timer)}</span> : null}
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : (
          /* VARENIE krok-po-kroku */
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <span style={{ fontSize: 12, color: COL.mut, fontWeight: 600 }}>
                Krok {step + 1} / {meal.steps.length}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {meal.steps.map((_, i) => (
                  <span key={i} style={{
                    width: 22, height: 5, borderRadius: 3,
                    background: i <= step ? COL.leaf : COL.line,
                  }} />
                ))}
              </div>
            </div>
            <div style={{
              border: `1px solid ${COL.line}`, borderRadius: 14, padding: 18, minHeight: 150, background: "#FBF9F3",
            }}>
              <div style={{
                fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13,
                letterSpacing: 1, textTransform: "uppercase", color: COL.tomato, marginBottom: 8,
              }}>
                {meal.steps[step].title}
              </div>
              <div style={{ fontSize: 18, lineHeight: 1.5 }}>{meal.steps[step].text}</div>
              {meal.steps[step].timer ? <Timer seconds={meal.steps[step].timer} key={meal.key + step} /> : null}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{
                flex: 1, border: `1px solid ${COL.line}`, borderRadius: 10, padding: "13px",
                background: COL.paper, color: step === 0 ? COL.line : COL.ink, fontWeight: 700,
                cursor: step === 0 ? "default" : "pointer", fontSize: 15,
              }}>← Späť</button>
              <button onClick={() => setStep((s) => Math.min(meal.steps.length - 1, s + 1))}
                disabled={step === meal.steps.length - 1} style={{
                flex: 2, border: "none", borderRadius: 10, padding: "13px",
                background: step === meal.steps.length - 1 ? COL.leafSoft : COL.leaf,
                color: step === meal.steps.length - 1 ? COL.leaf : COL.paper, fontWeight: 700,
                cursor: step === meal.steps.length - 1 ? "default" : "pointer", fontSize: 15,
              }}>{step === meal.steps.length - 1 ? "Hotové ✓" : "Ďalej →"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
