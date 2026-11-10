# MathWelt 3A

Ein Lernspiel in einer 3D-Blockwelt für die 3. Sek (Niveau A), aufgebaut auf **mathbuch 3, LU 11 «Gleichungen lösen»** und **LU 10 «Alt und Jung»**.

Die Schülerinnen und Schüler laufen durch ein Dorf, betreten Gebäude und lösen dort Aufgaben. Für richtige Lösungen gibt es Coins, mit denen sie im Level-Turm ein höheres Level kaufen.

- **Spiel:** `index.html`
- **Lern-App ohne 3D-Welt:** `app.html` (gleiche Aufgaben, nach Themengebieten geordnet)
- **Masterview für die Lehrperson:** `lehrer.html` (nur mit Dongle-Datei und Passwort)

Neu (November 2026): Freigabe pro Gebäude, Abzeichen, Probe-Bonus, Shop, Klassen-Leuchtturm und ein Boss pro Welt. Dafür muss der Worker-Code bei Cloudflare neu eingesetzt werden (`worker/README.md`, «Worker-Code aktualisieren»). Mit dem alten Worker funktionieren Spiel und App weiter, nur die neuen Schalter in der Masterview werden nicht gespeichert.

Es gibt zwei Welten: **Gleichungen** (LU 11) und **Alt und Jung** (LU 10). Die Lehrperson schaltet sie in der Masterview frei. Coins und Level gelten in beiden Welten.

## Zwei Zugänge

Spiel und Lern-App sind zwei Oberflächen für dasselbe Konto: gleicher Code, gleiche Aufgaben, gleiche Regeln, gleicher verschlüsselter Spielstand. Coins und Level gelten in beiden. Die Masterview zeigt alles zusammen und weist pro Aufgabe aus, ob sie im Spiel oder in der App gelöst wurde. Die Freigabe der Welten gilt auch für die Themengebiete der App.

Beim Anmelden wird der neuste Stand geholt: lokal oder online, je nachdem, wo zuletzt eine Aufgabe gelöst wurde. Damit es auf einem anderen Gerät weitergeht, muss vorher auf dem ersten Gerät gespeichert worden sein. Die App lässt sich im Browser als Web-App installieren («Zum Home-Bildschirm»); sie steht nicht im App Store.

## Gebäude

| LU | Gebäude | Lernziel | mathbuch 3 |
|---|---|---|---|
| 11 | Waage-Werkstatt | LZ1 Gleichungen mit + und − | S. 30 Lösungshilfen, S. 31 A2–A4 |
| 11 | Umkehr-Turm | LZ1 Gleichungen mit · und :, ax + b = c | S. 30 Kärtchen 3/4, S. 31 A2–A3 |
| 11 | Proben-Labor | LZ2 Probe | S. 32 A6 B, A7 |
| 11 | Klammer-Mine | LZ1/LZ4 Variable auf beiden Seiten, Klammern, unlösbar/allgemeingültig | S. 31 A5, S. 33 A10 |
| 11 | Rätsel-Bibliothek | LZ3 Zaubertrick, Zahlenrätsel, Textgleichungen, Abo- und Tarifvergleich | S. 31 A2 I, S. 32 A8 |
| 11 | Detektiv-Büro | LZ4 Fehler in Lösungswegen finden | S. 32 A6 A |
| 10 | Pyramiden-Museum | LZ5 Alterspyramiden lesen | S. 26 A1, S. 27 A3 |
| 10 | Prozent-Markt | LZ6 absolut und relativ | S. 28 A7, S. 29 A8 |
| 10 | Zeit-Observatorium | LZ7 Entwicklungen aus Graphen | S. 28 A6/A7, S. 29 A8 |
| 10 | Faktencheck-Redaktion | LZ8 Aussagen prüfen, kritische Fragen | S. 27 A4, S. 28 A6 |

## Binnendifferenzierung

Jedes Gebäude hat drei Niveaus: ★ Grundanspruch (5 Coins), ★★ Standard (10 Coins), ★★★ Erweiterung (20 Coins). Die Erweiterung wird nach 3 richtig gelösten Standard-Aufgaben freigeschaltet. Das Spiel empfiehlt ein Niveau: nach 3 richtigen Aufgaben eines höher, nach 2 falschen eines tiefer. Lösungshilfen und zweite Versuche geben die halbe Belohnung. Die Aufgaben werden zufällig erzeugt, es gibt also beliebig viele.

## Belohnungen

- **Coins** wie oben. Wer auf ★ bleibt, obwohl das Spiel schon ★★ empfiehlt, bekommt nur 40 % (2 statt 5 Coins). So lohnt sich «Farmen» nicht.
- **Probe-Bonus:** Nach einer richtig gelösten Gleichung mit x auf beiden Seiten (Klammer-Mine ★ und ★★) setzt man die Lösung ein und gibt den Wert beider Seiten an: +2 Coins.
- **Abzeichen pro Lernziel (LZ1–LZ8):** 5 Aufgaben ab ★★ im ersten Versuch ohne Lösungshilfe (+15 Coins). Gold: 3 davon auf ★★★ (+25 Coins). Die Abzeichen passen zum Kriterienraster und zur Selbsteinschätzung in L10.
- **Shop:** nur fürs Aussehen (Begleiter, Spitze der goldenen Säule). Wer kauft, steigt später auf.
- **Klassen-Leuchtturm:** Alle verdienten Coins der Klasse bauen gemeinsam an einem Leuchtturm (10 Stufen à 800 Coins). Die Lehrperson überträgt die Summe in der Masterview. Online steht nur diese eine Zahl, keine Daten einzelner Kinder. Eine Rangliste für die Schülerinnen und Schüler gibt es bewusst nicht.

## Boss-Kampf

Jede Welt hat in der Arena (Karte: B) einen Boss: den **Gleichungs-Golem** (LU 11) und das **Nebel-Orakel** (LU 10). Gekämpft wird nur mit Aufgaben, in drei Phasen:

| Boss | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| Gleichungs-Golem | Waage-Fäuste: Waage-Werkstatt, Umkehr-Turm | Klammer-Panzer: Klammer-Mine, Proben-Labor | Trick-Spiegel: Detektiv-Büro, Rätsel-Bibliothek |
| Nebel-Orakel | Pyramiden-Maske: Pyramiden-Museum | Prozent-Nebel: Prozent-Markt, Zeit-Observatorium | Falschmeldungen: Faktencheck-Redaktion |

- Der Boss hat 90 Lebenspunkte. Eine richtige Antwort trifft mit ★ 10, ★★ 15 oder ★★★ 20 (mit Lösungshilfe oder im 2. Versuch die Hälfte). Bei einer falschen Antwort baut er einen Schild auf (+5, nur innerhalb der Phase). Niemand verliert etwas, das Niveau richtet sich nach der Empfehlung.
- Jede Aufgabe zählt wie im Gebäude (Coins, Statistik, Abzeichen). Sieg: 50 Coins beim ersten Mal, danach 10.
- Gesperrte Gebäude kommen im Kampf nicht vor.
- Der Boss erwacht, wenn die Lehrperson ihn in der Masterview weckt, oder für ein einzelnes Kind ab 3 Abzeichen der Welt.
- Die Masterview zeigt pro Kind richtig/falsch pro Phase. So sieht man vor der Postenarbeit in L18, wer wo hängen bleibt.
- In der Lern-App gibt es denselben Kampf mit einem Bild statt der 3D-Figur.

## Einsatz nach Feinplanung

Alle Gebäude sind offen, bis die Lehrperson sie in der Masterview sperrt. Vorschlag, um die Gebäude im Takt der Lektionen zu öffnen (vor L1 alles ausser Waage-Werkstatt und Rätsel-Bibliothek sperren):

| Lektion | Unterricht | in der Masterview öffnen |
|---|---|---|
| W1 Mo L1–L2 | Zaubertrick, Zahlenrätsel, Waagemodell | Waage-Werkstatt, Rätsel-Bibliothek (★ Zaubertrick und Zahlenrätsel) |
| W1 Mi L3 | ax + b = c | Umkehr-Turm (MathWelt als Zusatz für schnelle SuS) |
| W1 Fr L4–L5 | Probe, x auf beiden Seiten (Lernbüro) | Proben-Labor, Klammer-Mine (★) |
| W2 Mo L6–L7 | Klammern, Fehlerdetektiv | Detektiv-Büro (Klammer-Mine ★★ ist schon offen) |
| W2 Mi L8 | Sachsituationen → Gleichung | Rätsel-Bibliothek ★★ (schon offen) |
| W2 Fr L9–L10 | Sachaufgaben, S. 33 A10, Repetition | ★★★ Abo-Vergleich und A10 · in L10 den **Golem wecken** |
| W3 Mo L11–L12 | Einstieg Alt und Jung, Alterspyramiden | Welt **Alt und Jung**, nur Pyramiden-Museum offen |
| W3 Mi L13 | absolut und relativ | Prozent-Markt |
| W3 Fr L14–L15 | Daten darstellen, Entwicklungen | Zeit-Observatorium |
| W4 Mo L16–L17 | Aussagen prüfen, Schlagzeilen | Faktencheck-Redaktion |
| W4 Mi L18 | Repetition (Posten) | **Orakel wecken**, Posten «MathWelt» nach Boss-Statistik zuteilen |
| W4 Fr L19–L20 | Prüfung, Reflexion | Rückmeldung zu MathWelt einholen; Klassen-Coins ein letztes Mal übertragen |

Nach jeder Lektion mit MathWelt: Spielstände laden und «Klassen-Coins übertragen», damit der Leuchtturm wächst.

## Datenschutz und Sicherheit

- Die Schülerinnen und Schüler melden sich nur mit einer **ID** (z. B. 3A07) und einem persönlichen Code an. Namen kommen im Spiel nicht vor.
- Der Spielstand wird verschlüsselt im Browser gespeichert. Beim Klick auf «Speichern» geht er verschlüsselt über einen kleinen Cloudflare Worker in ein privates GitHub-Repo (Einrichtung: `worker/README.md`). Ohne Worker oder bei einem Fehler wird er als verschlüsselte Datei (`.mw3a`) heruntergeladen und abgegeben.
- Jede Datei ist zweimal verschlüsselt lesbar: mit dem Code der Schülerin / des Schülers (zum Weiterspielen) und mit dem öffentlichen Schlüssel der Lehrperson. Nur wer die **Dongle-Datei und das Passwort** hat, kann die Daten in der Masterview öffnen.
- In diesem Repository liegen nur der öffentliche Schlüssel und Prüfwerte (Hashes) der Codes (`js/config.js`). Die Dongle-Datei und die Codes dürfen **nicht** hochgeladen werden.

## Technik

Das Spiel ist reines HTML, CSS und JavaScript ohne externe Bibliotheken (eigene WebGL-Blockgrafik, Web Crypto API). Läuft in aktuellen Browsern (Chrome, Edge, Firefox, Safari) auf Laptops mit Tastatur und Touchpad.
