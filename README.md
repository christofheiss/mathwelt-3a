# MathWelt 3A

Ein Lernspiel in einer 3D-Blockwelt für die 3. Sek (Niveau A), aufgebaut auf **mathbuch 3, LU 11 «Gleichungen lösen»** und **LU 10 «Alt und Jung»**.

Die Schülerinnen und Schüler laufen durch ein Dorf, betreten Gebäude und lösen dort Aufgaben. Für richtige Lösungen gibt es Coins, mit denen sie im Level-Turm ein höheres Level kaufen.

- **Spiel:** `index.html`
- **Masterview für die Lehrperson:** `lehrer.html` (nur mit Dongle-Datei und Passwort)

Es gibt zwei Welten: **Gleichungen** (LU 11) und **Alt und Jung** (LU 10). Die Lehrperson schaltet sie in der Masterview frei. Coins und Level gelten in beiden Welten.

## Gebäude

| LU | Gebäude | Lernziel | mathbuch 3 |
|---|---|---|---|
| 11 | Waage-Werkstatt | LZ1 Gleichungen mit + und − | S. 30 Lösungshilfen, S. 31 A2–A4 |
| 11 | Umkehr-Turm | LZ1 Gleichungen mit · und :, ax + b = c | S. 30 Kärtchen 3/4, S. 31 A2–A3 |
| 11 | Proben-Labor | LZ2 Probe | S. 32 A6 B, A7 |
| 11 | Klammer-Mine | LZ1/LZ4 Variable auf beiden Seiten, Klammern | S. 31 A5 |
| 11 | Rätsel-Bibliothek | LZ3 Zahlenrätsel und Textgleichungen | S. 32 A8 |
| 11 | Detektiv-Büro | LZ4 Fehler in Lösungswegen finden | S. 32 A6 A |
| 10 | Pyramiden-Museum | LZ5 Alterspyramiden lesen | S. 26 A1, S. 27 A3 |
| 10 | Prozent-Markt | LZ6 absolut und relativ | S. 28 A7, S. 29 A8 |
| 10 | Zeit-Observatorium | LZ7 Entwicklungen aus Graphen | S. 28 A6/A7, S. 29 A8 |
| 10 | Faktencheck-Redaktion | LZ8 Aussagen prüfen, kritische Fragen | S. 27 A4, S. 28 A6 |

## Binnendifferenzierung

Jedes Gebäude hat drei Niveaus: ★ Grundanspruch (5 Coins), ★★ Standard (10 Coins), ★★★ Erweiterung (20 Coins). Die Erweiterung wird nach 3 richtig gelösten Standard-Aufgaben freigeschaltet. Das Spiel empfiehlt ein Niveau: nach 3 richtigen Aufgaben eines höher, nach 2 falschen eines tiefer. Lösungshilfen und zweite Versuche geben die halbe Belohnung. Die Aufgaben werden zufällig erzeugt, es gibt also beliebig viele.

## Datenschutz und Sicherheit

- Die Schülerinnen und Schüler melden sich nur mit einer **ID** (z. B. 3A07) und einem persönlichen Code an. Namen kommen im Spiel nicht vor.
- Der Spielstand wird verschlüsselt im Browser gespeichert. Beim Klick auf «Speichern» geht er verschlüsselt über einen kleinen Cloudflare Worker in ein privates GitHub-Repo (Einrichtung: `worker/README.md`). Ohne Worker oder bei einem Fehler wird er als verschlüsselte Datei (`.mw3a`) heruntergeladen und abgegeben.
- Jede Datei ist zweimal verschlüsselt lesbar: mit dem Code der Schülerin / des Schülers (zum Weiterspielen) und mit dem öffentlichen Schlüssel der Lehrperson. Nur wer die **Dongle-Datei und das Passwort** hat, kann die Daten in der Masterview öffnen.
- In diesem Repository liegen nur der öffentliche Schlüssel und Prüfwerte (Hashes) der Codes (`js/config.js`). Die Dongle-Datei und die Codes dürfen **nicht** hochgeladen werden.

## Technik

Das Spiel ist reines HTML, CSS und JavaScript ohne externe Bibliotheken (eigene WebGL-Blockgrafik, Web Crypto API). Läuft in aktuellen Browsern (Chrome, Edge, Firefox, Safari) auf Laptops mit Tastatur und Touchpad.
