# iPhone 13 Pro (modelo de DatSketch enviado pelo Daniel: dist/iphone-13-pro.zip → iPhone13Pro.blend)
# Uso: python3 scripts/blender/iphone-13-pro.py -- <iPhone13Pro.blend> public/models/iphone-13-pro.glb
import sys, os, bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum

entrada, saida = sys.argv[sys.argv.index('--') + 1:][:2]
comum.limpar()
bpy.ops.wm.open_mainfile(filepath=entrada)
# as imagens do .blend apontam para pastas do autor: religa às que vêm junto no zip (mesma pasta do .blend)
pasta = os.path.dirname(os.path.abspath(entrada))
for img in bpy.data.images:
    nome = os.path.basename(bpy.path.abspath(img.filepath)) or img.name
    for cand in (nome, img.name.rsplit('.', 1)[0] if img.name.count('.') > 1 else img.name):
        alvo = os.path.join(pasta, cand)
        if os.path.exists(alvo):
            img.filepath = alvo
            img.reload()
            break
    print('imagem', img.name, img.size[:])
objs = comum.malhas()
comum.aplicar_transformacoes(objs)
# medidas oficiais da Apple: 146,7 × 71,5 × 7,65 mm (moldura sem botões e sem o ressalto das câmeras)
moldura = [o for o in objs if o.name.startswith('Frame')]
comum.normalizar(objs, (71.5, 7.65, 146.7), moldura)
# nomes de material que o visualizador entende (cor escolhida, aço, vidro fosco, tela iOS desenhada)
comum.renomear_materiais({
    'Frame': 'Anodized aluminum',      # moldura de aço inoxidável (o visualizador aplica o acabamento de aço)
    'Body': 'Frosted glass',           # traseira de vidro fosco texturizado
    'Camera Frame': 'Frosted bump',    # ressalto das câmeras na cor do aparelho
    'Camera Frame.001': 'finish-chamfer',  # anéis das lentes, metal na cor do aparelho
    'Antenna': 'Plastic antena',
    'Logo': 'Glass tint',
    'Wallpaper': 'OLED',
    'Screen Glass': 'Glass',
})
comum.uv_tela('OLED')
comum.reduzir_imagens(1024)
comum.exportar(saida)
print('ok', saida)
