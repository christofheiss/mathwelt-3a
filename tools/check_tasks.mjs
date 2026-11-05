// Prüft alle Aufgaben-Generatoren: je Gebäude und Niveau 400 Aufgaben erzeugen und die eigene Lösung prüfen.
// Aufruf: node tools/check_tasks.mjs   (Gebäude mit Canvas-Grafiken – pyramide, zeit – laufen nur im Browser)
import { BUILDINGS, checkPart } from '../js/tasks.js';
let bad = 0;
for (const b of BUILDINGS.filter(b => !['pyramide', 'zeit'].includes(b.id))) for (const s of [1, 2, 3]) for (let i = 0; i < 400; i++) {
  try {
    const t = b.gen(s); const parts = t.kind === 'multi' ? t.parts : [t];
    for (const p of parts) {
      if (p.kind === 'mc') { if (!(p.answer >= 0 && p.answer < p.options.length)) { bad++; console.log('mc', b.id, s); } }
      else if (!Number.isFinite(p.answer) || !checkPart(p, String(p.answer).replace('.', ','))) { bad++; console.log('num', b.id, s, p.answer); }
    }
    if (/NaN|undefined/.test(t.q + t.sol + t.hint)) { bad++; console.log('text', b.id, s); }
  } catch (e) { bad++; console.log('ERR', b.id, s, e.message); }
}
console.log(bad ? `${bad} Probleme gefunden` : 'Alle Generatoren ok');
process.exit(bad ? 1 : 0);
