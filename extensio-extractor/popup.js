const $ = (id) => document.getElementById(id);
const CLAU = "extraccio";

// S'executa DINS de la pàgina d'Esfer@ (autocontinguda). Fa clic a cada «Modifica»,
// espera la taula de detall, l'extreu i torna a la llista. Desa el progrés a chrome.storage.
async function recorreLlista() {
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  const fins = async (cond, ms = 12000) => {
    const t = Date.now();
    while (Date.now() - t < ms) {
      try { const v = cond(); if (v) return v; } catch { /* continua esperant */ }
      await esperar(150);
    }
    return null;
  };
  const txt = (c) => (c?.textContent || "").replace(/\s+/g, " ").trim();
  const valor = (c) => {
    if (!c) return "";
    const s = c.querySelector("select");
    if (s) return (s.selectedOptions[0]?.text || "").trim();
    const i = c.querySelector("input,textarea");
    return i ? i.value.trim() : txt(c);
  };
  const SEL = 'a[data-ng-click^="toQualificacions"]';
  const enllacos = () => document.querySelectorAll(SEL);

  const estat = { estat: "executant", fet: 0, total: 0, files: [], errors: [] };
  const desa = () => chrome.storage.local.set({ extraccio: estat });
  const hashLlista = location.hash;

  estat.total = enllacos().length;
  if (!estat.total) {
    estat.estat = "error";
    estat.errors.push("No es troba cap enllaç «Modifica». Obre primer la llista de qualificacions.");
    await desa();
    return;
  }
  await chrome.storage.local.remove("aturar");
  await desa();

  for (let i = 0; i < estat.total; i++) {
    if ((await chrome.storage.local.get("aturar")).aturar) { estat.estat = "aturat"; break; }

    const a = enllacos()[i];
    if (!a) { estat.errors.push(`Fila ${i + 1}: no trobada`); continue; }
    const cel = a.closest("tr").cells;
    const codi = txt(cel[1]);
    const element = txt(cel[2]);

    a.click();
    // Espera que aparegui la taula de detall amb la capçalera d'aquest element
    const detall = await fins(() => {
      if (!location.hash.includes("EntradaDades")) return null;
      const t = [...document.querySelectorAll("table.grades-table")].pop();
      if (!t?.tHead || !t.tBodies[0]) return null;
      const cap = [...t.tHead.rows[0].cells].map(txt);
      return cap.some((h) => h.includes(codi)) ? { t, cap } : null;
    });
    if (!detall) {
      estat.errors.push(`${codi}: no s'ha carregat la taula`);
    } else {
      // Espera que el nombre de files s'estabilitzi (les dades arriben en asíncron)
      let ultim = -1, estable = 0;
      for (let k = 0; k < 40 && estable < 4; k++) {
        const n = detall.t.tBodies[0].rows.length;
        estable = n === ultim ? estable + 1 : 0;
        ultim = n;
        await esperar(200);
      }
      const { t, cap } = detall;
      const iQ = cap.findIndex((h) => h.startsWith("Qualificació"));
      // Element: "<codi>-<nom> ¬<id RA>"
      const iDash = element.indexOf("-");
      const iNeg = element.indexOf("¬");
      const modulCodi = iDash >= 0 ? element.slice(0, iDash).trim() : element;
      const modulNom = iDash >= 0
        ? element.slice(iDash + 1, iNeg >= 0 ? iNeg : undefined).trim() : "";
      // Mòdul codi separat per "_": Mòdul, Cicle i RA (si en sobren parts, van a RA)
      const [modul = "", cicle = "", ...resta] = modulCodi.split("_");
      const ra = resta.join("_");
      // Qualificació: valor numèric després del primer "-"; si no n'hi ha, es deixa el valor original
      const numero = (s) => {
        const d = s.indexOf("-");
        if (d < 0) return s;
        const m = s.slice(d + 1).match(/\d+(?:[.,]\d+)?/);
        return m ? m[0] : s;
      };
      for (const tr of t.tBodies[0].rows) {
        const c = tr.cells;
        if (c.length < 5) continue;
        estat.files.push({
          modulCodi, modul, cicle, ra, modulNom,
          idAlumne: valor(c[0]), cognom1: valor(c[1]), cognom2: valor(c[2]),
          nom: valor(c[3]), document: valor(c[4]),
          qualificacio: iQ >= 0 ? numero(valor(c[iQ])) : "",
        });
      }
    }

    estat.fet = i + 1;
    await desa();

    // Torna a la llista
    location.hash = hashLlista;
    const ok = await fins(() => enllacos().length >= estat.total);
    if (!ok) { estat.errors.push(`${codi}: no s'ha pogut tornar a la llista`); estat.estat = "error"; break; }
    await esperar(150);
  }
  if (estat.estat === "executant") estat.estat = "acabat";
  await desa();
}

const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const COLS = ["modulCodi", "modul", "cicle", "ra", "modulNom", "idAlumne", "cognom1", "cognom2", "nom", "document", "qualificacio"];
const CAPCALERA = ["Mòdul codi", "Mòdul", "Cicle", "RA", "Mòdul nom", "Id. alumne", "1r cognom", "2n cognom", "Nom", "Document", "Qualificació"];

function baixa(nom, contingut, tipus) {
  const url = URL.createObjectURL(new Blob([contingut], { type: tipus }));
  Object.assign(document.createElement("a"), { href: url, download: nom }).click();
  URL.revokeObjectURL(url);
}

function pinta(e) {
  if (!e) return;
  const enMarxa = e.estat === "executant";
  $("barra").max = e.total || 1;
  $("barra").value = e.fet || 0;
  $("estat").textContent = `${e.estat}: ${e.fet}/${e.total} elements · ${e.files.length} files extretes`;
  $("errors").textContent = e.errors.join("\n");
  $("inicia").disabled = enMarxa;
  $("atura").disabled = !enMarxa;
  $("csv").disabled = $("json").disabled = $("taula").disabled = !e.files.length;
  $("neteja").disabled = enMarxa;
}

async function actual() { return (await chrome.storage.local.get(CLAU))[CLAU]; }

chrome.storage.onChanged.addListener((c) => { if (c[CLAU]) pinta(c[CLAU].newValue); });
actual().then(pinta);

$("inicia").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith("https://bfgh.aplicacions.ensenyament.gencat.cat/")) {
    $("estat").textContent = "Obre la pestanya d'Esfer@ i torna a provar.";
    return;
  }
  chrome.scripting.executeScript({ target: { tabId: tab.id }, func: recorreLlista })
    .catch((e) => { $("estat").textContent = "Error: " + e.message; });
});

let baixarAlAturar = false;
$("atura").addEventListener("click", () => {
  baixarAlAturar = true;
  $("atura").disabled = true;
  $("estat").textContent = "Aturant… acabant l'element actual";
  chrome.storage.local.set({ aturar: true });
});

// Quan l'extracció passa a «aturat», baixa el CSV amb el que s'ha fet fins ara
chrome.storage.onChanged.addListener((c) => {
  const e = c[CLAU]?.newValue;
  if (baixarAlAturar && e && e.estat !== "executant") {
    baixarAlAturar = false;
    if (e.files.length) baixaCsv(e);
  }
});

$("neteja").addEventListener("click", async () => {
  await chrome.storage.local.remove([CLAU, "aturar"]);
  pinta({ estat: "preparat", fet: 0, total: 0, files: [], errors: [] });
});

function baixaCsv(e) {
  const csv = [CAPCALERA.join(";"), ...e.files.map((f) => COLS.map((c) => esc(f[c])).join(";"))].join("\r\n");
  baixa("qualificacions.csv", "﻿" + csv, "text/csv;charset=utf-8");
}

$("csv").addEventListener("click", async () => baixaCsv(await actual()));

// Taula creuada: una fila per alumne, columnes agrupades per mòdul i, dins de cada mòdul, els seus RA.
// Mòdul = codi fins al segment del cicle (p. ex. 0156_IC10, M_OP_02_IC10); la resta és el RA.
function clauModul(codi) {
  const p = codi.split("_");
  let i = p.findIndex((s, k) => k > 0 && /^[A-Z]+\d+$/.test(s));
  if (i < 0) i = Math.min(1, p.length - 1);
  return { modul: p.slice(0, i + 1).join("_"), ra: p.slice(i + 1).join("_") };
}

function baixaTaula(e) {
  const moduls = new Map(); // modul -> { nom, ras: Map(ra -> etiqueta) }
  const alumnes = new Map(); // idAlumne -> { dades, notes: Map("modul|ra" -> valor) }
  for (const f of e.files) {
    const { modul, ra } = clauModul(f.modulCodi);
    if (!moduls.has(modul)) moduls.set(modul, { nom: "", ras: new Map() });
    const m = moduls.get(modul);
    if (!ra) m.nom = f.modulNom;
    if (!m.ras.has(ra)) m.ras.set(ra, ra || "Global");
    if (!alumnes.has(f.idAlumne)) {
      alumnes.set(f.idAlumne, { dades: [f.idAlumne, f.cognom1, f.cognom2, f.nom, f.document], notes: new Map() });
    }
    alumnes.get(f.idAlumne).notes.set(modul + "|" + ra, f.qualificacio);
  }
  // Els mòduls sense fila pròpia agafen el nom del primer RA
  for (const [modul, m] of moduls) {
    if (!m.nom) m.nom = e.files.find((f) => clauModul(f.modulCodi).modul === modul)?.modulNom || "";
  }
  const fix = ["", "", "", "", ""];
  const cap1 = [...fix], cap2 = ["Id. alumne", "1r cognom", "2n cognom", "Nom", "Document"];
  for (const [modul, m] of moduls) {
    let primer = true;
    for (const [, etiqueta] of m.ras) {
      cap1.push(primer ? `${modul} ${m.nom}`.trim() : "");
      cap2.push(etiqueta);
      primer = false;
    }
  }
  const files = [...alumnes.values()].map(({ dades, notes }) => {
    const fila = [...dades];
    for (const [modul, m] of moduls) for (const [ra] of m.ras) fila.push(notes.get(modul + "|" + ra) ?? "");
    return fila;
  });
  const csv = [cap1, cap2, ...files].map((r) => r.map(esc).join(";")).join("\r\n");
  baixa("qualificacions-taula.csv", "﻿" + csv, "text/csv;charset=utf-8");
}

$("taula").addEventListener("click", async () => baixaTaula(await actual()));

$("json").addEventListener("click", async () => {
  const e = await actual();
  baixa("qualificacions.json", JSON.stringify(e.files, null, 2), "application/json");
});
