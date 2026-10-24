# iPhone 17 (modelo enviado pelo Daniel: Downloads/apple-iphone-17-63.zip → "Apple iPhone 17 6_3''.glb")
# O arquivo traz duas cópias do aparelho; usa a cópia ".001" (tela +Y, traseira -Y, câmeras em -X).
# Uso: python3 scripts/blender/iphone-17.py -- "<Apple iPhone 17 6_3''.glb>" public/models/iphone-17.glb
import sys, os, bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum

entrada, saida = sys.argv[sys.argv.index('--') + 1:][:2]
comum.limpar()
bpy.ops.import_scene.gltf(filepath=entrada)
comum.manter_copia('Apple iPhone 17 6.3".001')
objs = comum.malhas()
comum.aplicar_transformacoes(objs); comum.girar_180_z(objs)
# grade do alto-falante (plano com a imagem pngwing): coincide com o vidro, é só detalhe; removida
for o in [o for o in objs if o.name == 'png.001']:
    bpy.data.objects.remove(o, do_unlink=True)
objs = comum.malhas()
# medidas oficiais da Apple: 71,5 × 149,6 × 7,95 mm (moldura, sem o ressalto das câmeras)
moldura = [o for o in objs if o.name == 'Cube.008']
comum.normalizar(objs, (71.5, 7.95, 149.6), moldura)
comum.reatribuir({
    ('Cube.008', 'Frame (Green)'): 'Anodized aluminum',
    ('Cube.008', 'Frame (Green).002'): 'Plastic antena',        # faixas de antena da moldura
    ('Buttons.003', 'Frame (Green)'): 'Anodized aluminum',
    ('Buttons.004', 'Frame (Green).001'): 'Anodized aluminum',
    ('Apple logo.001', 'Logo'): 'Glass tint',
    ('Cube.010', 'Glass back'): 'Frosted glass',
    ('Cube.014', 'Glass back'): 'Frosted glass',
    ('Cube.012', 'Glass camera block'): 'Frosted bump',     # ressalto das câmeras na cor do aparelho
    ('Cube.009', 'Glass screen'): 'Glass',
    ('Cube.013', 'Glass screen'): 'Glass',                  # cobertura do flash
    ('Cube.011', 'Screen'): 'OLED',
    ('Glass_Screen.001', 'Screen.001'): 'Island black',     # Dynamic Island do modelo
    ('Screen.002', 'Camera frame'): 'Island black',
    ('Camera.001', 'Frame (Green).002'): 'finish-chamfer',  # anel da lente, metal na cor do aparelho
    ('Camera.001', 'Camera frame'): 'Lens dark',            # interior do cano da lente
    ('Camera.001', 'Glass сamera'): 'Glass',
}, padrao={'Dark': 'Lens dark', 'Cmr': 'Lens glass', 'Flash': 'Flash', 'USB type c': 'Port dark',
           'USB type c.001': 'Port dark', 'USB type c.002': 'Lens dark'})
# cores-base do arquivo (17 verde); o visualizador pinta a cor escolhida por cima. Valores distintos evitam que o
# otimizador junte materiais que o visualizador trata de formas diferentes.
comum.pintar('Anodized aluminum', '#b7cdb1', 0.36, 0.78)
comum.pintar('finish-chamfer', '#b7cdb1', 0.14, 0.9)
comum.pintar('Plastic antena', '#9fb39a', 0.5, 0.0)
comum.pintar('Frosted glass', '#c9dcc4', 0.32, 0.05)
comum.pintar('Frosted bump', '#c4d8bf', 0.34, 0.05)
comum.pintar('Glass tint', '#aebfa9', 0.08, 0.3)
comum.pintar('Lens dark', '#040405', 0.25, 0.0)
comum.pintar('Lens glass', '#0b0d1c', 0.05, 0.3)
comum.pintar('Island black', '#030304', 0.3, 0.0)
comum.pintar('Port dark', '#17171a', 0.5, 0.6)
comum.pintar('Flash', '#f6f2e4', 0.2, 0.0)
comum.vidro_transparente('Glass')
comum.uv_tela('OLED')
comum.reduzir_imagens(1024)
comum.exportar(saida)
print('ok', saida)
