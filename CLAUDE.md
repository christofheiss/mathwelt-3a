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
| `js/engine.js` | Eigene WebGL-Voxel-Engine: Blocktypen `B`, prozeduraler Texturatlas, `World`, `Renderer` (ein Mesh, Neuaufbau via `rebuild()`, bewegliche Quader via `drawBoxes()` nach `draw()`), `Player` (Kollision, Schwerkraft, Stufen hochsteigen) |
| `js/models.js` | Figuren aus Quadern für `drawBoxes`: `golem`, `oracle` (Zustand mit Zeitwerten hitT/slamT/shieldT/deadT), Begleiter `pet` |
| `js/boss.js` | Boss-Kampf für Spiel und App: `BOSSES` (Phasen → Gebäude), `Fight` (90 LP, Schaden nach Niveau, Schild), `mountFight(root, S, w, via, hooks)` zeichnet die Oberfläche, `bossSvg` fürs Bild in der App |
| `css/extras.css` | Gemeinsame Styles für Boss, Abzeichen, Shop, Probe-Bonus (Spiel, App, Masterview) |
| `js/world.js` | Zwei Dörfer 72×26×72 (`gl` LU 11, `aj` LU 10, Definition `WORLDS` in tasks.js): Gebäude-Standorte `SPOTS`, `buildWorld(level, worldId, {top, classStage})`, `setFamePillar` (goldene Säule = Level, Spitze aus dem Shop), Boss-Arena `ARENA` (NO), `setClassTower` (Klassen-Leuchtturm SW), `buildingAt` |
| `app.html`, `css/app.css`, `js/app.js`, `app.webmanifest`, `icons/` | Lern-App: zweiter Zugang ohne 3D-Welt, Themengebiete statt Gebäude (`topic` in `BUILDINGS`), Routen `#/themen`, `#/thema/<id>`, `#/level`, `#/stand` |
| `js/core.js` | Gemeinsam für Spiel und App: Level und Titel, Spielstand (`migrate` ergänzt badges/items/equip/probes/boss), Anmeldung (`signIn`), Speichern, Freigabe (`buildingOpen`, `bossOpen`), Empfehlung, Bewertung (`gradeTask`), Probe-Bonus, Abzeichen (`BADGES`, `checkBadges`), Shop, Klassen-Leuchtturm (`classInfo`). Regeln nur hier ändern |
| `js/tasks.js` | `BUILDINGS`: 10 Gebäude mit `gen(stage)` für Niveau 1–3 → `{q (HTML), kind: 'num'|'mc'|'multi', answer|options|parts, hint, sol, tol?, unit?}`; `checkPart`, `parseAnswer` (Komma, Brüche, «x =», %), Canvas-Diagramme (Alterspyramide, Liniendiagramm), Waage-SVG |
| `js/game.js` | Spiel: 3D-Welt, Beschriftungen, HUD, Aufgaben-Panel, Level-Turm, Karte mit Schnellreise, Eingaben (Regeln aus `core.js`) |
| `js/crypto.js` | Web Crypto: Token-Format/Normalisierung, `tokenHash`, `studentKey` (PBKDF2), `sealSave`/`openSaveAsStudent`/`openSaveAsTeacher`, `makeDongle`/`openDongle`, RSA-Schlüssel |
| `js/config.js` | **öffentlich**: RSA-Public-Key der Lehrperson + SHA-256-Hashes der gültigen Codes + `saveUrl` (Worker) und `dataRepo` |
| `worker/worker.js`, `worker/README.md` | Cloudflare Worker fürs Online-Speichern: prüft den Code, schreibt nach `saves/<ID>.mw3a` im privaten Repo `mathwelt-3a-daten`, gibt den eigenen Stand über `POST /load` zurück; Einrichtung im README |
| `lehrer.html`, `css/teacher.css`, `js/teacher.js` | Masterview: Dongle + Passwort entsperren, `.mw3a` laden (neuester Stand pro ID), Klassen-Kacheln pro LZ, Tabelle pro ID × Gebäude, Detail mit Aktivitäten-Log, CSV, neue Tokens, Namen nur im Dongle, Dongle neu speichern |

### Sicherheitsmodell
- Token z. B. `3A07-K7QM-X2PD-9HTR`: die ersten 4 Zeichen = ID. Gültigkeit über Hash in `config.js`.
- Spielstand-Datei: Inhalt AES-GCM mit Zufallsschlüssel; Schlüssel einmal mit PBKDF2(Token) (SuS) und einmal RSA-OAEP mit Public Key der Lehrperson verschlüsselt.
- Dongle (`*.mw3akey`): privater RSA-Schlüssel + Token-Liste + Namen + Lese-Schlüssel fürs Daten-Repo (`cloud`), AES-GCM mit PBKDF2(Passwort), 150 000 Iterationen.
- Bekannte Grenze: Lösungen werden im Client erzeugt/geprüft (Spiel = Üben, nicht Beurteilen). Der GitHub-Schreibschlüssel liegt nur als Secret im Worker, nie im Client.

### Welten freischalten
- Freigabe liegt als `worlds.json` im Daten-Repo; `CONFIG.worlds` ist der Standard (Gleichungen offen, Alt und Jung gesperrt), das Spiel merkt sich den letzten Stand lokal.
- Weitere Schlüssel in `worlds.json`: Gebäude-IDs (`false` = gesperrt, fehlt = offen), `boss_gl`/`boss_aj` (`true` = für alle wach), `klasse` (Coin-Summe der Klasse, ganze Zahl). Erlaubte Schlüssel stehen in `SWITCH_IDS` im Worker: bei neuen Gebäuden dort ergänzen.
- Spiel und App fragen die Freigabe alle 20 s (Weltauswahl) bzw. 60 s (im Spiel) ab.
- Reset: `POST /reset` (Dongle-Challenge) ersetzt den Branch des Daten-Repos durch einen Commit ohne Vorgänger mit nur `worlds.json` (`reset` = Zeitpunkt, `klasse` = 0). Spielstand-Dateien tragen `born` (= `S.created`); der Worker lehnt `born < reset` mit 409 ab, `core.isStale` verwirft solche Stände im Client. Neue Stände beginnen nach `reset` (auch bei falscher Geräteuhr).
- Masterview ändert sie über den Worker: Der Worker verschlüsselt eine Zufallszahl mit dem Public Key, nur der Dongle kann sie lösen. Kein zusätzliches Secret nötig.
- Sperre wird im Browser durchgesetzt, ist also ein Unterrichtsablauf und kein Schutz gegen versierte SuS.

### Spielregeln
- Niveaus: ★ Grund 5 Coins, ★★ Standard 10, ★★★ Erweiterung 20 (frei nach 3 richtigen Standard-Aufgaben). Lösungshilfe oder 2. Versuch = halbe Coins. Max. 2 Versuche.
- Empfehlung: 3 richtige auf einem Niveau → eins höher; 2 falsche → eins tiefer.
- Level-Kosten: `40 + 30·(Level−1)`. Titel in `TITLES` (core.js).
- Unter der Empfehlung: Auf ★, wenn ★★ empfohlen ist, gibt es nur 40 % der Coins (`UNDER_FACTOR`).
- Probe-Bonus +2 Coins für Aufgaben mit `probe` (Wert beider Seiten bei der Lösung); nur sinnvoll, wenn x auf beiden Seiten steht.
- Abzeichen pro LZ: 5 Aufgaben ab ★★ im 1. Versuch ohne Hilfe (+15), Gold: 3 auf ★★★ (+25). Berechnet aus dem Log (`badgeProgress`).
- Boss: 90 LP in 3 Phasen à 30, Schaden ★10/★★15/★★★20 (halb mit Hilfe/2. Versuch), falsch → Schild +5; Sieg 50 Coins, danach 10. Wach, wenn `boss_<welt>` oder 3 Abzeichen der Welt.
- Log-Einträge tragen `via: 'spiel'|'app'`; ältere Einträge ohne `via` stammen aus dem Spiel. Sondereinträge: `b: 'level'|'badge'|'shop'|'boss'`. Aufgaben im Boss-Kampf haben zusätzlich `boss` und `ph` (Phase 1–3).
- Beim Anmelden gewinnt der Stand mit der jüngsten gelösten Aufgabe (nicht `lastSave`, das ändert schon beim Öffnen). Kein Zusammenführen: Ungespeichertes auf einem anderen Gerät wird nicht übernommen.

### Gebäude ↔ Lernziele
LU 11: Waage-Werkstatt LZ1 · Umkehr-Turm LZ1 · Proben-Labor LZ2 · Klammer-Mine LZ1/LZ4 · Rätsel-Bibliothek LZ3 · Detektiv-Büro LZ4
LU 10: Pyramiden-Museum LZ5 · Prozent-Markt LZ6 · Zeit-Observatorium LZ7 · Faktencheck-Redaktion LZ8
Lernziele: LZ1 Äquivalenzumformungen, LZ2 Probe, LZ3 Sachsituation → Gleichung, LZ4 Schritte dokumentieren/Fehler finden, LZ5 Alterspyramiden lesen, LZ6 absolut/relativ, LZ7 Entwicklungen aus Graphen, LZ8 Aussagen prüfen/kritische Fragen. Alle Gemeinde-Daten sind fiktiv und so beschriftet.

## Lokal starten und testen
```bash
python3 -m http.server 8765          # dann http://localhost:8765/index.html, /app.html bzw. /lehrer.html
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
- Mehr Aufgabentypen (z. B. Ungleichungen S. 33 als Bonus-Gebäude), Sound.
- Boss für die ganze Klasse mit gemeinsamen Lebenspunkten (bräuchte einen Zähler im Worker).
- Node fehlt auf Christofs Mac: `check_tasks.mjs` lässt sich auch im Browser prüfen (Modul `js/tasks.js` importieren).
- Online-Speichern: Worker einrichten (`worker/README.md`), Datenschutz mit Schule klären.
