# MathWelt 3A – Kontext für Claude Code

Lernspiel für die Klasse 3A (Sek 1, Niveau A, 14 SuS), Schule Neuenkirch, Profilpraktikum PH Luzern im Januar 2027.
Autor/Lehrperson: Christof Heiss. Inhalt: **mathbuch 3 (Klett), LU 11 «Gleichungen lösen» (S. 30–33) und LU 10 «Alt und Jung» (S. 26–29)**.
Sprache der Oberfläche: **Deutsch (Schweiz, kein ß)**. Zielgeräte: Laptops mit Tastatur und Touchpad.

## Anforderungen der Lehrperson
- 3D-Blockwelt (Stil Minecraft, aber eigene Grafik, keine Marken/Figuren), SuS gehen in Gebäude und lösen Aufgaben.
- Coins als Belohnung, damit ein höheres Level erarbeiten.
- Binnendifferenzierung.
- SuS speichern Lernstand und Lernaktivitäten; Lehrperson sieht alles in einer passwortgeschützten Masterview.
- Zugang Lehrperson über einen «digitalen Dongle» (Datei hochladen + Passwort).
- SuS haben einen Token (QR-Code) zur Aktivierung/Anmeldung; nur pseudonyme IDs, keine Namen online.
- Hosting auf **GitHub Pages** (statisch, kein Server). Daten nur in verschlüsselten Dateien.

## Architektur (reines HTML/CSS/ES-Module, keine Abhängigkeiten, kein Build-Schritt)
| Datei | Inhalt |
|---|---|
| `index.html`, `css/style.css` | Spiel: Login, Willkommen, HUD, Aufgaben-Panel, Level-Turm, Karte, Hilfe |
| `js/engine.js` | Eigene WebGL-Voxel-Engine: Blocktypen `B`, prozeduraler Texturatlas, `World`, `Renderer` (ein Mesh, Neuaufbau via `rebuild()`), `Player` (Kollision, Schwerkraft, Stufen hochsteigen) |
| `js/world.js` | Dorf 72×26×72: Gebäude-Standorte `SPOTS`, `buildWorld(level)`, `setFamePillar` (goldene Säule = Level), `buildingAt` |
| `js/tasks.js` | `BUILDINGS`: 10 Gebäude mit `gen(stage)` für Niveau 1–3 → `{q (HTML), kind: 'num'|'mc'|'multi', answer|options|parts, hint, sol, tol?, unit?}`; `checkPart`, `parseAnswer` (Komma, Brüche, «x =», %), Canvas-Diagramme (Alterspyramide, Liniendiagramm), Waage-SVG |
| `js/game.js` | Spiellogik: Login (Token-Hash in `CONFIG.tokenHashes`), Spielstand `S`, Speichern lokal (localStorage, verschlüsselt) + Datei-Download `.mw3a`, Niveau-Empfehlung, Coins, Level-Turm, Karte mit Schnellreise, Eingaben |
| `js/crypto.js` | Web Crypto: Token-Format/Normalisierung, `tokenHash`, `studentKey` (PBKDF2), `sealSave`/`openSaveAsStudent`/`openSaveAsTeacher`, `makeDongle`/`openDongle`, RSA-Schlüssel |
| `js/config.js` | **öffentlich**: RSA-Public-Key der Lehrperson + SHA-256-Hashes der gültigen Codes |
| `lehrer.html`, `css/teacher.css`, `js/teacher.js` | Masterview: Dongle + Passwort entsperren, `.mw3a` laden (neuester Stand pro ID), Klassen-Kacheln pro LZ, Tabelle pro ID × Gebäude, Detail mit Aktivitäten-Log, CSV, neue Tokens, Namen nur im Dongle, Dongle neu speichern |

### Sicherheitsmodell
- Token z. B. `3A07-K7QM-X2PD-9HTR`: die ersten 4 Zeichen = ID. Gültigkeit über Hash in `config.js`.
- Spielstand-Datei: Inhalt AES-GCM mit Zufallsschlüssel; Schlüssel einmal mit PBKDF2(Token) (SuS) und einmal RSA-OAEP mit Public Key der Lehrperson verschlüsselt.
- Dongle (`*.mw3akey`): privater RSA-Schlüssel + Token-Liste + Namen, AES-GCM mit PBKDF2(Passwort), 150 000 Iterationen.
- Bekannte Grenze: Lösungen werden im Client erzeugt/geprüft (Spiel = Üben, nicht Beurteilen). Kein Live-Stand ohne Server.

### Spielregeln
- Niveaus: ★ Grund 5 Coins, ★★ Standard 10, ★★★ Erweiterung 20 (frei nach 3 richtigen Standard-Aufgaben). Lösungshilfe oder 2. Versuch = halbe Coins. Max. 2 Versuche.
- Empfehlung: 3 richtige auf einem Niveau → eins höher; 2 falsche → eins tiefer.
- Level-Kosten: `40 + 30·(Level−1)`. Titel in `TITLES` (game.js und teacher.js, doppelt gepflegt!).

### Gebäude ↔ Lernziele
LU 11: Waage-Werkstatt LZ1 · Umkehr-Turm LZ1 · Proben-Labor LZ2 · Klammer-Mine LZ1/LZ4 · Rätsel-Bibliothek LZ3 · Detektiv-Büro LZ4
LU 10: Pyramiden-Museum LZ5 · Prozent-Markt LZ6 · Zeit-Observatorium LZ7 · Faktencheck-Redaktion LZ8
Lernziele: LZ1 Äquivalenzumformungen, LZ2 Probe, LZ3 Sachsituation → Gleichung, LZ4 Schritte dokumentieren/Fehler finden, LZ5 Alterspyramiden lesen, LZ6 absolut/relativ, LZ7 Entwicklungen aus Graphen, LZ8 Aussagen prüfen/kritische Fragen. Alle Gemeinde-Daten sind fiktiv und so beschriftet.

## Lokal starten und testen
```bash
python3 -m http.server 8765          # dann http://localhost:8765/index.html bzw. /lehrer.html
node tools/check_tasks.mjs           # Generatoren prüfen (ohne Canvas-Gebäude)
python3 tests/e2e.py                 # Playwright-Browsertest (braucht private/tokens.json + Dongle)
```
ES-Module brauchen einen Webserver (nicht per file:// öffnen).

## Schlüssel und Codes
- Die produktiven Schlüssel liegen **nicht** in diesem Repo. Christof hat Dongle, Passwort und Token-Karten in OneDrive (`Mathe_Mt3A/MathWelt3A/2_PRIVAT_nicht_hochladen`). Die aktuelle `js/config.js` passt zu diesem Dongle – **nicht überschreiben**, sonst funktionieren die verteilten Karten nicht mehr.
- Für Tests ein eigenes Set erzeugen: `node tools/keygen.mjs 18` schreibt `js/config.js` neu und `private/` (gitignored). Danach `git checkout js/config.js`, um zur produktiven Konfiguration zurückzukehren.
- Token-Karten: `python3 tools/cards.py` (reportlab).
- Weitere Codes ohne neuen Schlüssel: in der Masterview «Neue Tokens» und Hashes in `config.js` ergänzen.
- `private/`, `*.mw3akey`, `*.mw3a` niemals committen (siehe `.gitignore`). Repo ist öffentlich.

## Offene Ideen / nächste Schritte
- Auf GitHub veröffentlichen (Repo `mathwelt-3a`, Pages aus `main` / root) und URL auf Token-Karten bzw. in LearningView.
- QR-Scan nutzt `BarcodeDetector` (nicht in allen Browsern) – optional eine kleine QR-Lese-Bibliothek lokal einbinden.
- QR-Inhalt könnte die Spiel-URL mit `#t=CODE` enthalten (Login liest das schon aus).
- `TITLES` und Level-Logik in ein gemeinsames Modul auslagern.
- Mehr Aufgabentypen (z. B. Ungleichungen S. 33 als Bonus-Gebäude), Sound, Erfolge/Abzeichen, Klassenrangliste in der Masterview.
- Optional Online-Datenbank für Live-Daten (Datenschutz mit Schule klären).
