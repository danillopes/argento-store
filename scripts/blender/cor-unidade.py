# Aplica o acabamento de uma unidade real (cores conferidas em vídeo) a um GLB já no padrão do site.
# Uso: python3 scripts/blender/cor-unidade.py -- <entrada.glb> <saida.glb> <preset>
import sys, os, bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum

PRESETS = {
    # iPhone 14 Pro Preto-espacial: aço inoxidável escuro polido, traseira fosca grafite-arroxeada (vídeo do Daniel)
    '14pro-preto-espacial': {
        'Anodized aluminum': ('#353437', 0.13, 0.95), 'Frosted glass': ('#403e41', 0.34, 0.05),
        'Frosted bump': ('#424043', 0.12, 0.05), 'finish-chamfer': ('#353437', 0.12, 0.95),
        'Plastic antena': ('#2f2e30', 0.5, 0.0), 'Glass tint': ('#3a383b', 0.08, 0.3),
        # anéis e bases das lentes (no arquivo original eram dourados/claros com textura): aço escuro, como no vídeo
        'GCTfChbRIgBmWbe': ('#2a292b', 0.25, 0.9), 'GoEESZWjCZpqeOD': ('#2a292b', 0.2, 1.0),
        'hgmDQvqtKSacBdB': ('#2a292b', 0.25, 1.0), 'EnwhLiFdMDwiUyz': ('#4a4848', 0.6, 0.0), 'ZyKhfPnbNOCYIny': ('#4a4848', 0.6, 0.0),
    },
}
entrada, saida, preset = sys.argv[sys.argv.index('--') + 1:][:3]
comum.limpar()
bpy.ops.import_scene.gltf(filepath=entrada)
srgb = lambda h: tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (1, 3, 5))
for nome, (h, rug, met) in PRESETS[preset].items():
    m = bpy.data.materials.get(nome)
    if not m or not m.node_tree:
        continue
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b:
        continue
    for l in list(b.inputs['Base Color'].links):
        m.node_tree.links.remove(l)
    b.inputs['Base Color'].default_value = (*srgb(h), 1)
    b.inputs['Roughness'].default_value = rug
    b.inputs['Metallic'].default_value = met
comum.exportar(saida)
print('ok', preset, saida)
