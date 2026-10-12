import asyncio
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width":1150,"height":330})
        await pg.goto("http://localhost:8888/index.html"); await pg.wait_for_timeout(300)
        html = await pg.evaluate("() => [1,2,3,4,5].map(iconFace).join('') + '<br>' + [1,2,3,4].map(iconSure).join('')")
        await pg.set_content('<body style="margin:10px;background:#fff;zoom:2">'+html+'</body>'); await pg.screenshot(path="faces2.png"); await b.close()
asyncio.run(main())
