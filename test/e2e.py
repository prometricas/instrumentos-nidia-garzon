import asyncio, random
from playwright.async_api import async_playwright
U = "http://localhost:8888"
CLAVE = open("../.env").read().split("APP_CLAVE=")[1].strip() if __import__("os").path.exists("../.env") else open(".env").read().split("APP_CLAVE=")[1].strip()
errs = []
ALUMNOS = [("Débora", "Plata", "Piloto", "Femenino", 7), ("Aquiles", "Estudio", "Experimental", "Masculino", 8), ("Elsa", "Pato", "Experimental", "Femenino", 8),
           ("Elena", "Nito", "Control", "Femenino", 7), ("Alan", "Brito", "Control", "Masculino", 8)]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={"width":1920,"height":1000}, permissions=["clipboard-read","clipboard-write"])
        pg = await ctx.new_page(); pg.on("pageerror", lambda e: errs.append("admin: "+str(e)))
        PT = {"t": ""}
        async def dlg(d):
            await (d.accept(PT["t"]) if d.type == "prompt" else d.accept())
        pg.on("dialog", lambda d: asyncio.ensure_future(dlg(d)))
        await pg.goto(U)
        await pg.fill("#clave", "mala"); await pg.click("#btnEntrar"); await pg.wait_for_timeout(400); print("clave mala:", await pg.text_content("#entradaMsg"))
        await pg.fill("#clave", CLAVE); await pg.click("#btnEntrar"); await pg.wait_for_selector("#app:not(.oculto)"); await pg.wait_for_timeout(300)
        print("vacio:", (await pg.text_content("#tablaP")).strip()[:60])
        await pg.fill("#pNombre", "Paco"); await pg.click("#btnAddP"); await pg.wait_for_timeout(300)
        print("faltan campos:", await pg.text_content("#pMsg"), "| resaltados:", len(await pg.query_selector_all("#v-estudiantes .campo.falta")))
        await pg.fill("#pNombre", "")
        for n, a, g, sx, ed in ALUMNOS:
            await pg.fill("#pNombre", n); await pg.fill("#pApellido", a); await pg.select_option("#pGrupo", g); await pg.select_option("#pSexo", sx); await pg.fill("#pEdad", str(ed))
            await pg.click("#btnAddP"); await pg.wait_for_timeout(900)
        print("add:", await pg.text_content("#pMsg"), "| grupos:", [await g.text_content() for g in await pg.query_selector_all("#tablaP tr.grupo td")])
        await pg.screenshot(path="test/w3_estudiantes.png")
        await pg.click("nav.tabs button[data-v=aplicar]"); await pg.click("#opIns button[data-k=ESMS]"); await pg.select_option("#aCod", "E03"); await pg.fill("#aApl", "Nidia Garzón")
        await pg.click("#btnStart"); await pg.wait_for_selector("#kid:not(.oculto)"); await pg.click(".opt[data-v='4']"); await pg.screenshot(path="test/w5_kid_esms.png")
        while True:
            await pg.keyboard.press(str(random.randint(1,5))); t = await pg.text_content("#kNext"); await pg.keyboard.press("Enter")
            if t.strip()=="Terminar": break
        await pg.wait_for_selector("#kSave"); await pg.click("#kSave"); await pg.wait_for_timeout(1500)
        await pg.click("#opIns button[data-k=EQI]"); await pg.select_option("#aCod", "E04"); await pg.click("#aMom button[data-m=Postest]"); await pg.click("#btnStart"); await pg.wait_for_selector("#kid:not(.oculto)")
        await pg.click(".opt[data-v='2']"); await pg.screenshot(path="test/w7_kid_eqi.png")
        while True:
            await pg.keyboard.press(str(random.randint(1,4))); t = await pg.text_content("#kNext"); await pg.keyboard.press("Enter")
            if t.strip()=="Terminar": break
        await pg.wait_for_selector("#kSave"); await pg.click("#kSave"); await pg.wait_for_timeout(1500)
        await pg.click("nav.tabs button[data-v=familias]"); await pg.wait_for_selector("#tablaF table"); await pg.screenshot(path="test/w8_familias.png")
        link = await pg.get_attribute("#tablaF [data-copy]", "data-copy"); print("enlace:", link)
        mov = await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        fp = await mov.new_page(); fp.on("pageerror", lambda e: errs.append("familia: "+str(e)))
        await fp.goto(link); await fp.wait_for_selector("#comenzar"); await fp.screenshot(path="test/w9_familia_movil.png")
        await fp.select_option("#quien", "Padre"); await fp.click("#comenzar"); await fp.wait_for_selector("#sig")
        await fp.click("#sig"); await fp.wait_for_timeout(300); print("faltan:", await fp.text_content("#msg"))
        for paso in range(3):
            for it in await fp.query_selector_all(".item"):
                await random.choice(await it.query_selector_all(".ops button")).click()
            await fp.click("#sig"); await fp.wait_for_timeout(1200)
        print("gracias:", (await fp.text_content("#main"))[:60])
        await fp.goto(link[:-3] + "abc"); await fp.wait_for_timeout(500); print("alterado:", (await fp.text_content("#main"))[:40])
        await pg.click("nav.tabs button[data-v=familias]"); await pg.wait_for_timeout(800); print("estado E01:", await pg.text_content("#tablaF tbody tr:nth-child(2) td:nth-child(3)"), "| resumen:", await pg.text_content("#resumenF"))
        await pg.click("nav.tabs button[data-v=estudiantes]"); await pg.wait_for_timeout(300)
        print("chips verdes:", len(await pg.query_selector_all("#tablaP .estado.si")))
        await pg.click("#tablaP .estado.si[data-s=esms][data-c=E03]"); await pg.wait_for_timeout(1200)
        print("chips tras borrar ESMS E03:", len(await pg.query_selector_all("#tablaP .estado.si")))
        await pg.click("#tablaP [data-del=E05]"); await pg.wait_for_timeout(1000)
        PT["t"] = "E04"; await pg.click("#tablaP [data-del=E04]"); await pg.wait_for_timeout(1200)
        print("papelera:", await pg.text_content("#tablaP .papelera summary"))
        await pg.click("#tablaP .papelera summary"); await pg.click("#tablaP [data-rest=E04]"); await pg.wait_for_timeout(1200)
        print("E04 chips tras recuperar:", len(await pg.query_selector_all("#tablaP .estado.si[data-c=E04]")), "| papelera:", len(await pg.query_selector_all("#tablaP .papelera")))
        await pg.screenshot(path="test/w12_estudiantes_final.png")
        async with pg.expect_download() as dl: await pg.click("#btnExcel")
        d = await dl.value; await d.save_as("test/descarga.xlsx"); print("excel:", d.suggested_filename)
        print("errores:", errs)
        await b.close()
asyncio.run(main())
