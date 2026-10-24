# iPhone Air (modelo enviado pelo Daniel: Downloads/apple-iphone-17-air.zip → "Apple iPhone 17 Air.glb")
# O arquivo traz duas cópias do aparelho; usa a cópia ".001" (tela +Y, traseira -Y, câmera em -X).
# Uso: python3 scripts/blender/iphone-air.py -- "<Apple iPhone 17 Air.glb>" public/models/iphone-air.glb
import sys, os, bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum

entrada, saida = sys.argv[sys.argv.index('--') + 1:][:2]
comum.limpar()
bpy.ops.import_scene.gltf(filepath=entrada)
comum.manter_copia('Apple iPhone 17 Air.001')
objs = comum.malhas()
comum.aplicar_transformacoes(objs); comum.girar_180_z(objs)
# medidas oficiais da Apple: 74,7 × 156,2 × 5,64 mm (moldura, sem o ressalto das câmeras)
moldura = [o for o in objs if o.name == 'Cube.015']
comum.normalizar(objs, (74.7, 5.64, 156.2), moldura)
comum.reatribuir({
    ('Cube.015', 'Frame (White)'): 'Anodized aluminum',      # moldura de titânio
    ('Buttons.003', 'Frame (White)'): 'Anodized aluminum',
    ('Buttons.004', 'Logo'): 'Anodized aluminum',
    ('Apple logo.001', 'Logo'): 'Glass tint',
    ('Cube.010', 'Glass back'): 'Frosted glass',             # traseira
    ('Cube.012', 'Glass back'): 'Frosted bump',              # faixa de câmera na largura toda
    ('Cube.009', 'Glass screen'): 'Glass',                   # vidro da frente
    ('Cube.011', 'Glass screen'): 'Glass',                   # cobertura do flash
    ('Cube.013', 'Screen'): 'OLED',
    ('Cube.013', 'Camera frame'): 'Island black',            # Dynamic Island do modelo
    ('Camera.001', 'Frame (White)'): 'finish-chamfer',      # anel da lente, metal na cor do aparelho
    ('Camera.001', 'Camera frame'): 'Lens dark',            # interior do cano da lente
    ('Camera.001', 'Glass сamera'): 'Glass',
}, padrao={'Dark': 'Lens dark', 'Cmr': 'Lens glass', 'Flash': 'Flash', 'USB type c': 'Port dark',
           'USB type c.001': 'Port dark', 'USB type c.002': 'Lens dark'})
# cores-base do arquivo (Air branco); o visualizador pinta a cor escolhida por cima. Valores distintos evitam que o
# otimizador junte materiais que o visualizador trata de formas diferentes.
comum.pintar('Anodized aluminum', '#e4e4e2', 0.36, 0.78)
comum.pintar('finish-chamfer', '#e4e4e2', 0.14, 0.9)
comum.pintar('Frosted glass', '#f1f1ef', 0.32, 0.05)
comum.pintar('Frosted bump', '#ececea', 0.34, 0.05)
comum.pintar('Glass tint', '#d8d8d6', 0.08, 0.3)
comum.pintar('Lens dark', '#040405', 0.25, 0.0)
comum.pintar('Lens glass', '#0b0d1c', 0.05, 0.3)
comum.pintar('Island black', '#030304', 0.3, 0.0)
comum.pintar('Port dark', '#17171a', 0.5, 0.6)
comum.pintar('Flash', '#f6f2e4', 0.2, 0.0)
# Dynamic Island com profundidade (como no iPhone 17 Pro): recorte em pílula na tela, poço preto e lente frontal no fundo
comum.ilha_dinamica(0.0, 70.0, 2.62, profundidade_mm=1.0, camera_x_mm=-6.8)
comum.vidro_transparente('Glass')
comum.uv_tela('OLED')
comum.reduzir_imagens(1024)
comum.exportar(saida)
print('ok', saida)
