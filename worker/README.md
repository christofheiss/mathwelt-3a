# Online-Speichern einrichten

Beim Klick auf «Speichern» schickt das Spiel den verschlüsselten Spielstand an einen Cloudflare Worker. Der Worker prüft den Code und legt die Datei im privaten Repo `christofheiss/mathwelt-3a-daten` unter `saves/<ID>.mw3a` ab. Ohne `saveUrl` in `js/config.js` oder bei einem Fehler lädt das Spiel die Datei wie bisher herunter.

Vor dem Einsatz: Datenschutz mit der Schule klären. Cloudflare sieht IP-Adresse, ID und kurz den Code, aber nie den Inhalt der Spielstände.

## 1. Zwei GitHub-Schlüssel erstellen

Auf github.com: Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate new token. Beide Male: Repository access → *Only select repositories* → `mathwelt-3a-daten`; Ablaufdatum nach dem Praktikum.

| Schlüssel | Permissions → Contents | Kommt in |
|---|---|---|
| Schreiben | Read and write | Cloudflare (Schritt 2) |
| Lesen | Read-only | Masterview (Schritt 4) |

Die Schlüssel nie in Dateien im Repo, in `js/config.js` oder in einen Chat kopieren.

## 2. Worker bei Cloudflare anlegen

1. Auf dash.cloudflare.com ein Gratis-Konto erstellen und anmelden.
2. Compute (Workers) → Workers & Pages → Create → **Start with Hello World** → Name `mathwelt-3a-save` → Deploy.
3. **Edit code**: alles ersetzen durch den Inhalt von `worker/worker.js` → Deploy.
4. Settings → Variables and Secrets → Add:

| Typ | Name | Wert |
|---|---|---|
| Text | `DATA_REPO` | `christofheiss/mathwelt-3a-daten` |
| Text | `CONFIG_URL` | `https://christofheiss.github.io/mathwelt-3a/js/config.js` |
| Text | `ALLOWED_ORIGINS` | `https://christofheiss.github.io` |
| Secret | `GITHUB_TOKEN` | der Schreib-Schlüssel |

5. Die Adresse des Workers notieren, z. B. `https://mathwelt-3a-save.NAME.workers.dev`.

## 3. Spiel verbinden

In `js/config.js` bei `saveUrl` die Adresse des Workers eintragen und auf GitHub hochladen. Die Adresse ist nicht geheim. Prüfwerte und Schlüssel in der Datei nicht verändern.

## 4. Masterview verbinden

1. `lehrer.html` öffnen und mit dem Dongle entsperren.
2. **Online-Spielstände laden** → den Lese-Schlüssel eingeben.
3. **Dongle speichern / Passwort ändern**, damit der Schlüssel verschlüsselt im Dongle liegt. Den alten Dongle löschen.

## 5. Testen

Mit der Karte 3A99 spielen und «Speichern» klicken. Es muss «Spielstand online gespeichert» erscheinen, und im Daten-Repo liegt `saves/3A99.mw3a`. In der Masterview erscheint 3A99 nach «Online-Spielstände laden».

## Gut zu wissen

- Jeder Klick auf «Speichern» ergibt einen Commit im Daten-Repo. Frühere Stände bleiben in der Git-Historie.
- Klicken viele gleichzeitig, wiederholt der Worker den Schreibversuch. Klappt es trotzdem nicht, bekommt die Schülerin oder der Schüler die Datei als Download.
- Läuft der Schreib-Schlüssel ab, schlägt das Hochladen fehl und das Spiel lädt nur noch Dateien herunter. Dann in Cloudflare einen neuen Schlüssel eintragen.
- Neue Codes in `js/config.js` kennt der Worker automatisch, nach spätestens etwa 15 Minuten.
