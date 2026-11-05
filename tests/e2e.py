# Browser-Test mit Playwright: Login, Aufgaben in allen Gebäuden, Level-Up, Speichern, Masterview.
# Vorher: python3 -m http.server 8765  (im Projektordner) und node tools/keygen.mjs
# Aufruf: python3 tests/e2e.py
import json, asyncio, glob, os
from playwright.async_api import async_playwright
tok = json.load(open('private/tokens.json'))
T = [t['token'] for t in tok['tokens'] if t['id'] == '3A99'][0]
URL = 'http://localhost:8765/'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
async def main():
    os.makedirs('private/test', exist_ok=True)
    async with async_playwright() as p:
        b = await p.chromium.launch(args=ARGS)
        ctx = await b.new_context(viewport={'width': 1280, 'height': 860}, accept_downloads=True)
        pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + 'index.html')
        await pg.fill('#tokenInput', T); await pg.click('#loginBtn'); await pg.wait_for_timeout(1500)
        if await pg.is_visible('#newGameBtn'): await pg.click('#newGameBtn')
        await pg.wait_for_timeout(500)
        await pg.click('#worldCards button[data-w="gl"]'); await pg.wait_for_timeout(1000)
        if await pg.is_visible('#helpClose'): await pg.click('#helpClose')
        for bid in ['waage', 'umkehr', 'level']:
            await pg.keyboard.press('KeyM'); await pg.wait_for_timeout(300)
            await pg.click(f'#mapLegend button[data-id="{bid}"]')
            await pg.keyboard.down('KeyW'); await pg.wait_for_timeout(1500); await pg.keyboard.up('KeyW')
            await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(400)
            await pg.screenshot(path=f'private/test/{bid}.png')
            await pg.keyboard.press('Escape')
        async with pg.expect_download() as dl: await pg.click('#saveBtn', force=True)
        d = await dl.value; await d.save_as('private/test/' + d.suggested_filename)
        t = await ctx.new_page(); t.on('pageerror', lambda e: errs.append(str(e)))
        await t.goto(URL + 'lehrer.html')
        await t.set_input_files('#dongleFile', 'private/MathWelt3A_Lehrer.dongle.mw3akey')
        await t.fill('#pw', tok['pw']); await t.click('#unlockBtn'); await t.wait_for_timeout(2000)
        await t.set_input_files('#saves', glob.glob('private/test/*.mw3a')); await t.wait_for_timeout(1500)
        print(await t.inner_text('#status'))
        await t.screenshot(path='private/test/masterview.png', full_page=True)
        print('Fehler:', errs or 'keine'); await b.close()
asyncio.run(main())
