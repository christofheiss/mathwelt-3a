// Erzeugt ein NEUES Schlüsselpaar, neue Codes und einen neuen Dongle.
// ACHTUNG: Danach sind alle bisherigen Spielstände für die Masterview nicht mehr lesbar.
// Aufruf:  node tools/keygen.mjs [AnzahlSuS=18] [Passwort]
// Schreibt: js/config.js (öffentlich) und private/ (Dongle + tokens.json, gitignored)
import * as K from '../js/crypto.js';
import fs from 'fs';
const n = Number(process.argv[2] || 18);
const pw = process.argv[3] || 'Waage-Pyramide-' + (1000 + Math.floor(Math.random() * 9000));
const { publicJwk, privateJwk } = await K.generateTeacherKeys();
const ids = Array.from({ length: n }, (_, i) => '3A' + String(i + 1).padStart(2, '0')).concat(['3A99']);
const tokens = ids.map(id => ({ id, token: K.newToken(id) }));
const hashes = [];
for (const t of tokens) hashes.push(`    '${await K.tokenHash(t.token)}', // ${t.id}${t.id === '3A99' ? ' (Test Lehrperson)' : ''}`);
const names = Object.fromEntries(ids.map(id => [id, id === '3A99' ? 'Test Lehrperson' : '']));
const dongle = await K.makeDongle({ privateKey: privateJwk, tokens, names, created: Date.now() }, pw);
const pub = { kty: publicJwk.kty, n: publicJwk.n, e: publicJwk.e, alg: publicJwk.alg, ext: true, key_ops: ['encrypt'] };
fs.writeFileSync(new URL('../js/config.js', import.meta.url), `// MathWelt 3A – öffentliche Einstellungen (darf auf GitHub liegen)
// Enthält KEINE Geheimnisse: nur den öffentlichen Schlüssel der Lehrperson und Prüfwerte (Hashes) der gültigen Codes.
export const CONFIG = {
  className: '3A',
  // Online-Speichern: Adresse des Cloudflare Workers (leer = nur Datei-Download) und privates Daten-Repo
  saveUrl: '',
  dataRepo: '',
  teacherPublicKey: ${JSON.stringify(pub)},
  // Freigabe, solange der Worker nichts anderes meldet (gl = Gleichungen, aj = Alt und Jung)
  worlds: { gl: true, aj: false },
  tokenHashes: [
${hashes.join('\n')}
  ]
};
`);
fs.mkdirSync(new URL('../private/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../private/MathWelt3A_Lehrer.dongle.mw3akey', import.meta.url), JSON.stringify(dongle));
fs.writeFileSync(new URL('../private/tokens.json', import.meta.url), JSON.stringify({ pw, tokens }, null, 1));
console.log('Fertig. Passwort:', pw, '· Codes:', tokens.length, '→ private/');
