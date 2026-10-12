# Genera los dos archivos de instrumentos (navegador y funciones) a partir de fuente/instrumentos.json
import json
d = json.load(open('fuente/instrumentos.json', encoding='utf-8'))
s = json.dumps(d, ensure_ascii=False)
open('public/assets/instrumentos.js', 'w', encoding='utf-8').write('window.INS = ' + s + ';\n')
open('netlify/lib/instrumentos.mjs', 'w', encoding='utf-8').write('export default ' + s + ';\n')
print('ok', list(d))
