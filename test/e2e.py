import asyncio, random, sys, json, openpyxl
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
        pg.on("dialog", lambda d: errs.append("diálogo nativo inesperado: " + d.message))
        async def confirmar(texto=None):  # responde el diálogo propio de la app
            await pg.wait_for_selector("#dialogo:not(.oculto)")
            if texto: await pg.fill("#dInput", texto)
            await pg.click("#dOk"); await pg.wait_for_selector("#dialogo.oculto", state="attached")
        await pg.goto(U)
        await pg.fill("#clave", "mala"); await pg.click("#btnEntrar"); await pg.wait_for_selector("#entradaMsg .aviso"); print("clave mala (con espera de 1,5 s):", await pg.text_content("#entradaMsg"))
        await pg.fill("#clave", CLAVE); await pg.click("#btnEntrar"); await pg.wait_for_selector("#app:not(.oculto)"); await pg.wait_for_timeout(300)
        print("vacio:", (await pg.text_content("#tablaP")).strip()[:60])
        await pg.fill("#pNombre", "Paco"); await pg.click("#btnAddP"); await pg.wait_for_timeout(300)
        print("faltan campos:", await pg.text_content("#pMsg"), "| resaltados:", len(await pg.query_selector_all("#v-estudiantes .campo.falta")))
        await pg.fill("#pNombre", "")
        for n, a, g, sx, ed in ALUMNOS:
            await pg.fill("#pNombre", n); await pg.fill("#pApellido", a); await pg.select_option("#pGrupo", g); await pg.select_option("#pSexo", sx); await pg.fill("#pEdad", str(ed))
            await pg.click("#btnAddP"); await pg.wait_for_timeout(900)
        print("add:", await pg.text_content("#pMsg"), "| pestañas:", [await g.text_content() for g in await pg.query_selector_all("#tablaP .gtabs button")])
        await pg.click("#tablaP .gtabs button[data-g=Experimental]"); await pg.wait_for_timeout(200)
        await pg.screenshot(path="test/w3_estudiantes.png")
        async def consentir(codigo):  # el acudiente responde su enlace y acepta el consentimiento (por la API)
            r = await pg.evaluate("""async (c) => { const H = { 'content-type': 'application/json', 'x-clave': sessionStorage.getItem('clave') };
              const e = (await fetch('/api/enlaces', { headers: H }).then(r => r.json())).enlaces.find(x => x.codigo === c);
              const items = Object.fromEntries(INS.CFF.items.map(it => [it.codigo, 3]));
              return fetch('/api/familia', { method: 'POST', headers: H, body: JSON.stringify({ e: c, t: e.t, acepta: true, informante: 'Madre', items, observaciones: '' }) }).then(r => r.status); }""", codigo)
            return r
        print("acudiente de E04 acepta por la API:", await consentir("E04"))
        await pg.click("nav.menu button[data-v=aplicar]"); await pg.wait_for_timeout(600); await pg.click("#opIns button[data-k=ESMS]"); await pg.select_option("#aCod", "E03"); await pg.fill("#aApl", "Nidia Garzón")
        await pg.click("#btnStart"); await pg.wait_for_selector("#kid:not(.oculto)"); await pg.click(".opt[data-v='4']"); await pg.screenshot(path="test/w5_kid_esms.png")  # E03 sin consentimiento del acudiente: se aplica igual
        while True:
            await pg.keyboard.press(str(random.randint(1,5))); t = await pg.text_content("#kNext"); await pg.keyboard.press("Enter")
            if t.strip()=="Terminar": break
        await pg.wait_for_selector("#kSave"); await pg.click("#kSave"); await pg.wait_for_timeout(1500)
        await pg.click("#opIns button[data-k=EQI]"); await pg.select_option("#aCod", "E04"); await pg.click("#aMom button[data-m=Postest]"); await pg.click("#btnStart"); await pg.wait_for_selector("#kid:not(.oculto)")
        await pg.click(".opt[data-v='2']"); await pg.screenshot(path="test/w7_kid_eqi.png")
        orig = await pg.evaluate("INS.EQI.items.map(it => it.codigo)"); orden = await pg.evaluate("K.orden"); seq = await pg.evaluate("K.seq.filter(x => !x.prac).map(x => x.codigo)")
        print("postest barajado:", sorted(orden) == sorted(orig) and orden != orig, "| práctica primero:", await pg.evaluate("K.seq[0].prac && K.seq[1].prac"), "| pantalla sigue el orden:", seq == orden)
        if not (sorted(orden) == sorted(orig) and orden != orig and seq == orden): errs.append("el postest no baraja las frases")
        await pg.keyboard.press("Enter"); await pg.keyboard.press("3"); await pg.keyboard.press("Enter"); await pg.keyboard.press("1"); await pg.keyboard.press("Enter")  # tres frases y salir: el avance debe conservar el mismo orden
        await pg.click("#kExit"); await confirmar(); await pg.wait_for_selector("#btnContinuar"); await pg.click("#btnContinuar"); await pg.wait_for_selector("#kid:not(.oculto)")
        print("retoma con el mismo orden:", await pg.evaluate("K.orden") == orden, "| frase actual:", await pg.evaluate("K.seq[K.i].codigo") == orden[1])
        if await pg.evaluate("K.orden") != orden: errs.append("al retomar cambió el orden del postest")
        while True:
            await pg.keyboard.press(str(random.randint(1,4))); t = await pg.text_content("#kNext"); await pg.keyboard.press("Enter")
            if t.strip()=="Terminar": break
        await pg.wait_for_selector("#kSave"); await pg.click("#kSave"); await pg.wait_for_timeout(1500)
        fila = await pg.evaluate("""async () => { const H = { 'x-clave': sessionStorage.getItem('clave') }; const d = await fetch('/api/datos', { headers: H }).then(r => r.json());
            return { post: d.eqi.find(r => r.codigo === 'E04' && r.momento === 'Postest').orden, pre: d.esms.find(r => r.codigo === 'E03' && r.momento === 'Pretest').orden }; }""")
        print("orden guardado en el postest:", fila["post"] == orden, "| el pretest no lleva orden:", fila["pre"] is None)
        if fila["post"] != orden or fila["pre"] is not None: errs.append("el orden del postest no quedó guardado como se presentó")
        await pg.click("nav.menu button[data-v=familias]"); await pg.wait_for_selector("#tablaF table"); await pg.click("#tablaF .gtabs button[data-g=Piloto]"); await pg.wait_for_selector("#tablaF table"); await pg.wait_for_timeout(300); await pg.screenshot(path="test/w8_familias.png")
        await pg.click("#tablaF a[data-ficha]"); await pg.wait_for_selector("#ficha:not(.oculto)"); print("ficha desde Acudientes:", (await pg.text_content("#ficha h2")).strip()[:30]); await pg.keyboard.press("Escape")
        link = await pg.get_attribute("#tablaF [data-copy]", "data-copy"); print("enlace:", link, "| WhatsApp:", await pg.text_content("#tablaF a.wa"), "| botones de copiar en bloque:", len(await pg.query_selector_all("#btnCopiarTodos, #btnCopiarPend")))
        mov = await b.new_context(viewport={"width":390,"height":844}, device_scale_factor=2, is_mobile=True, has_touch=True)
        fp = await mov.new_page(); fp.on("pageerror", lambda e: errs.append("familia: "+str(e)))
        await fp.goto(link); await fp.wait_for_selector("#comenzar"); await fp.screenshot(path="test/w9_familia_movil.png")
        print("comenzar deshabilitado al inicio:", await fp.is_disabled("#comenzar"), "| quién responde sin valor:", await fp.input_value("#quien") == "")
        await fp.check("#acepto"); print("solo con consentimiento sigue deshabilitado:", await fp.is_disabled("#comenzar"))
        await fp.select_option("#quien", "Padre"); print("con los dos, habilitado:", not await fp.is_disabled("#comenzar")); await fp.click("#comenzar"); await fp.wait_for_selector("#sig")
        await fp.click("#sig"); await fp.wait_for_timeout(300); print("faltan:", await fp.text_content("#msg"))
        for paso in range(3):
            for it in await fp.query_selector_all(".item"):
                await random.choice(await it.query_selector_all(".ops button")).click()
            await fp.click("#sig"); await fp.wait_for_timeout(1200)
        print("gracias:", (await fp.text_content("#main"))[:60])
        await fp.goto(link[:-3] + "abc"); await fp.wait_for_timeout(500); print("alterado:", (await fp.text_content("#main"))[:40])
        await pg.click("nav.menu button[data-v=familias]"); await pg.wait_for_timeout(800); await pg.click("#tablaF .gtabs button[data-g=Piloto]"); await pg.wait_for_timeout(300); print("estado E01:", await pg.text_content("#tablaF tbody tr:first-child td:nth-child(3)"), "| resumen:", await pg.text_content("#resumenF"))
        await pg.click("nav.menu button[data-v=estudiantes]"); await pg.wait_for_timeout(300); await pg.click("#tablaP .gtabs button[data-g=Experimental]"); await pg.wait_for_timeout(200)
        print("chips verdes (Experimental):", len(await pg.query_selector_all("#tablaP .estado.si")))  # E03 y E04 tienen Fam ✓ y una aplicación cada uno
        await pg.click("#tablaP .estado.si[data-s=esms][data-c=E03]"); await pg.wait_for_selector("#ficha:not(.oculto)"); await pg.screenshot(path="test/w13_ficha.png")
        print("ficha:", (await pg.text_content("#ficha h2")).strip(), "| pruebas:", len(await pg.query_selector_all("#ficha .prueba")), "| tablas de dimensiones:", len(await pg.query_selector_all("#ficha table.dims")), "| filas de ítems:", len(await pg.query_selector_all("#ficha table.resp")))
        print("consentimiento E03 (pendiente, con aplicación guardada):", (await pg.text_content("#ficha .consent")).strip()[:70])
        await pg.click("#ficha h2 a[data-editar]"); await pg.wait_for_selector("#fichaEdit:not(.oculto)"); await pg.fill("#eApellido", "Pato Lucas"); await pg.fill("#eObs", "usa gafas"); await pg.click("#eGuardar"); await pg.wait_for_timeout(1200)
        print("editado:", (await pg.text_content("#ficha h2")).strip(), "|", (await pg.text_content("#ficha p.guia")).strip()[-30:], "| en tabla:", await pg.text_content("#tablaP tbody tr:first-child td:nth-child(2)"))
        await pg.screenshot(path="test/w13_ficha.png")
        await pg.click("#ficha [data-borrar][data-s=esms]"); await confirmar(); await pg.wait_for_timeout(1200)
        print("chips tras borrar ESMS E03 desde la ficha:", len(await pg.query_selector_all("#tablaP .estado.si")), "| ficha abierta:", not await pg.evaluate("document.querySelector('#ficha').classList.contains('oculto')"))
        await pg.keyboard.press("Escape"); await pg.click("#tablaP .gtabs button[data-g=Control]"); await pg.wait_for_timeout(200); await pg.click("#tablaP a[data-ficha=E04]"); await pg.wait_for_selector("#ficha:not(.oculto)"); print("consentimiento E04 (aceptado):", (await pg.text_content("#ficha .consent")).strip()[:70]); await pg.keyboard.press("Escape"); await pg.click("#tablaP .gtabs button[data-g=Experimental]"); await pg.wait_for_timeout(200); await pg.click("#tablaP a[data-ficha=E03]"); await pg.wait_for_selector("#ficha:not(.oculto)")
        await pg.click("#ficha [data-aplicar][data-m=Postest][data-k=ESMS]"); await pg.wait_for_timeout(300)
        print("aplicar ahora desde la ficha:", await pg.evaluate("[document.querySelector('#v-aplicar').classList.contains('oculto'), document.querySelector('#opIns .activo').dataset.k, document.querySelector('#aCod').value, document.querySelector('#aMom .activo').dataset.m]"), "| volver visible:", await pg.evaluate("!document.querySelector('#v-aplicar [data-volver]').classList.contains('oculto')"), "| hash:", await pg.evaluate("location.hash"))
        await pg.click("#v-aplicar [data-volver]"); await pg.wait_for_timeout(200); print("volver:", await pg.evaluate("[location.hash, !document.querySelector('#v-estudiantes').classList.contains('oculto'), document.querySelector('#v-aplicar [data-volver]').classList.contains('oculto')]"))
        await pg.click("#tablaP .estado.pend[data-fam]"); await pg.wait_for_timeout(600); print("chip familia pendiente:", await pg.evaluate("[location.hash, !document.querySelector('#v-familias [data-volver]').classList.contains('oculto')]")); await pg.go_back(); await pg.wait_for_timeout(300); print("atrás del navegador:", await pg.evaluate("location.hash"))
        await pg.click("#tablaP .estado.pend[data-apl=eqi][data-c=E02][data-m=Pretest]"); await pg.wait_for_timeout(300)
        print("aplicar ahora desde el chip:", await pg.evaluate("[document.querySelector('#opIns .activo').dataset.k, document.querySelector('#aCod').value, document.querySelector('#aMom .activo').dataset.m]"))
        await pg.click("nav.menu button[data-v=estudiantes]"); await pg.wait_for_timeout(300)
        await pg.click("#tablaP .gtabs button[data-g=Control]"); await pg.wait_for_timeout(200)
        await pg.click("#tablaP [data-del=E05]"); await confirmar(); await pg.wait_for_timeout(1000)
        await pg.click("#tablaP [data-del=E04]"); await confirmar("E04"); await pg.wait_for_timeout(1200)
        print("papelera:", await pg.text_content("#tablaP .papelera summary"))
        await pg.click("#tablaP .papelera summary"); await pg.click("#tablaP [data-rest=E04]"); await pg.wait_for_timeout(1200); await pg.click("#tablaP .gtabs button[data-g=Control]"); await pg.wait_for_timeout(200)
        print("E04 chips tras recuperar:", len(await pg.query_selector_all("#tablaP .estado.si[data-c=E04]")), "| papelera:", len(await pg.query_selector_all("#tablaP .papelera")))
        await pg.screenshot(path="test/w12_estudiantes_final.png")
        await pg.click("nav.menu button[data-v=respuestas]"); await pg.click("#tablaR .gtabs button[data-g=Control]"); await pg.wait_for_selector("#tablaR table")
        print("tabla respuestas Control:", len(await pg.query_selector_all("#tablaR tbody tr")), "filas (2 por estudiante),", len(await pg.query_selector_all("#tablaR thead tr:nth-child(2) th")), "columnas de respuesta | momentos:", [ (await c.text_content()) for c in await pg.query_selector_all("#tablaR td.mom")], "|", await pg.text_content("#resumenR"))
        print("fijas:", await pg.evaluate("getComputedStyle(document.querySelector('#tablaR td.r-mom')).position + ' ' + getComputedStyle(document.querySelector('#tablaR td.r-mom')).left"))
        await pg.screenshot(path="test/w14_respuestas.png")
        await pg.click("#rVer button[data-m=dim]"); await pg.wait_for_timeout(200); print("solo dimensiones:", len(await pg.query_selector_all("#tablaR thead tr:nth-child(2) th")), "columnas"); await pg.screenshot(path="test/w15_dimensiones.png")
        async with pg.expect_download() as dl: await pg.click("#btnExcel")
        d = await dl.value; await d.save_as("test/descarga.xlsx"); print("excel:", d.suggested_filename)
        await pg.check("#rMeta")
        async with pg.expect_download() as dl: await pg.click("#btnExcel")
        d = await dl.value; await d.save_as("test/descarga_meta.xlsx"); wbm = openpyxl.load_workbook("test/descarga_meta.xlsx"); print("excel con metadatos:", [c.value for c in wbm["Experimental"][1] if c.value and ("FechaHora" in c.value or "Duracion" in c.value or "Aplicador" in c.value)])
        async with pg.expect_download() as dl: await pg.click("#btnCopia")
        d = await dl.value; await d.save_as("test/copia.json"); copia = json.load(open("test/copia.json")); print("copia:", d.suggested_filename, "|", {k: len(v) for k, v in copia.items() if isinstance(v, list)})
        await pg.click("#btnBitacora"); await pg.wait_for_selector("#bitacora:not(.oculto)"); print("bitácora:", len(await pg.query_selector_all("#bitacora tbody tr")), "eventos | último:", await pg.text_content("#bitacora tbody tr:first-child td:nth-child(2)")); await pg.keyboard.press("Escape")
        await pg.click("nav.menu button[data-v=estudiantes]"); await pg.wait_for_timeout(200)
        await pg.fill("#pCodigo", "E05"); await pg.fill("#pNombre", "Otro"); await pg.fill("#pApellido", "Más"); await pg.select_option("#pGrupo", "Control"); await pg.select_option("#pSexo", "Femenino"); await pg.fill("#pEdad", "8"); await pg.click("#btnAddP"); await pg.wait_for_timeout(300)
        print("código repetido (E05 en papelera):", await pg.text_content("#pMsg"))
        await pg.hover("#tablaP .estado.si"); await pg.wait_for_timeout(150); print("chip al pasar el cursor:", repr(await pg.evaluate("(() => { const e = document.querySelector('#tablaP .estado.si'); return e.textContent + ' | ' + getComputedStyle(e, '::after').content + ' | ' + getComputedStyle(e).color })()")))
        wb = openpyxl.load_workbook("test/descarga.xlsx")
        for ws in wb: print("  hoja", ws.title, ws.max_row - 1, "filas,", ws.max_column, "columnas:", [c.value for c in ws[1]][:9], "...", [c.value for c in ws[1]][-2:], "| momentos:", [r[4] for r in ws.iter_rows(min_row=2, values_only=True)][:4])
        # --- aplicación interrumpida: se retoma donde iba
        await pg.click("nav.menu button[data-v=aplicar]"); await pg.click("#opIns button[data-k=EQI]"); await pg.fill("#aBuscar", "elsa"); print("buscador en aplicar:", [ (await o.text_content()) for o in await pg.query_selector_all("#aCod option")])
        await pg.select_option("#aCod", "E03"); await pg.click("#aMom button[data-m=Pretest]"); await pg.click("#btnStart"); await pg.wait_for_selector("#kid:not(.oculto)")
        for _ in range(5): await pg.keyboard.press("3"); await pg.keyboard.press("Enter")
        await pg.reload(); await pg.wait_for_selector("#app:not(.oculto)"); await pg.click("nav.menu button[data-v=aplicar]"); await pg.wait_for_selector("#aAvance:not(.oculto)"); print("aviso de avance:", (await pg.text_content("#aAvance")).strip()[:90])
        await pg.click("#btnContinuar"); await pg.wait_for_selector("#kid:not(.oculto)"); print("retoma en:", await pg.text_content("#kCount"))
        while True:
            await pg.keyboard.press(str(random.randint(1,4))); t = await pg.text_content("#kNext"); await pg.keyboard.press("Enter")
            if t.strip()=="Terminar": break
        await pg.wait_for_selector("#kSave")
        # --- sin conexión al guardar: queda en cola y se envía al volver la conexión
        await ctx.set_offline(True); await pg.click("#kSave"); await pg.wait_for_selector("#pendientes:not(.oculto)"); print("cola sin conexión:", (await pg.text_content("#pendientes")).strip()[:80])
        await ctx.set_offline(False)  # al volver la conexión se envía sola; si no, con el botón
        try: await pg.wait_for_selector("#pendientes.oculto", state="attached", timeout=8000); print("enviada sola al volver la conexión")
        except Exception: await pg.click("#btnEnviarCola"); await pg.wait_for_selector("#pendientes.oculto", state="attached", timeout=15000); print("enviada con el botón")
        await pg.wait_for_timeout(800)
        await pg.click("nav.menu button[data-v=estudiantes]"); await pg.wait_for_timeout(300); await pg.click("#tablaP .gtabs button[data-g=Experimental]"); await pg.wait_for_timeout(200)
        print("E03 EQI Pretest guardado tras reconectar:", len(await pg.query_selector_all("#tablaP .estado.si[data-s=eqi][data-c=E03][data-m=Pretest]")) == 1, "| avance limpio:", await pg.evaluate("localStorage.getItem('avance')"))
        # --- buscador en estudiantes (aparece con más de 5 en el grupo)
        for i in range(6):
            await pg.fill("#pNombre", f"Niño{i}"); await pg.fill("#pApellido", "Prueba"); await pg.select_option("#pGrupo", "Experimental"); await pg.select_option("#pSexo", "Masculino"); await pg.fill("#pEdad", "8"); await pg.click("#btnAddP"); await pg.wait_for_timeout(700)
        await pg.fill("#pBuscar", "niño3"); await pg.wait_for_timeout(200); print("buscador en estudiantes:", await pg.text_content("#pBuscarN"), "| filas visibles:", len(await pg.query_selector_all("#tablaP tbody tr:not(.oculto)")))
        print("errores:", errs)
        await b.close()
        sys.exit(1 if errs else 0)
asyncio.run(main())
