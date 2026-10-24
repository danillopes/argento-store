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
        # lentes: revestimento azul-arroxeado e anel interno azulado, como os reflexos do vídeo; o vidro escuro das
        # lentes (textura original) é mantido. Anel do flash em aço escuro.
        # interior das lentes: preto profundo e brilhante; elemento central azul-violeta (fotos oficiais da Apple)
        'GCTfChbRIgBmWbe': ('#1b2140', 0.04, 0.35), 'GoEESZWjCZpqeOD': ('#050608', 0.05, 0.0),
        'VlnkJNnmZmryUEK': ('#030304', 0.35, 0.0), 'XioMmaZGUXvxXPb': ('#030304', 0.2, 0.0),
    },
}
# demais cores oficiais do 14 Pro (fotos da Apple): moldura de aço polido na cor, traseira fosca e módulo no mesmo vidro
_LENTES = {k: v for k, v in PRESETS['14pro-preto-espacial'].items() if k in ('GCTfChbRIgBmWbe', 'GoEESZWjCZpqeOD', 'VlnkJNnmZmryUEK', 'XioMmaZGUXvxXPb')}
def _cor14(moldura, traseira, modulo, antena, logo):
    return {'Anodized aluminum': (moldura, 0.12, 0.95), 'Frosted glass': (traseira, 0.36, 0.05), 'Frosted bump': (modulo, 0.12, 0.05),
            'finish-chamfer': (moldura, 0.12, 0.95), 'Plastic antena': (antena, 0.5, 0.0), 'Glass tint': (logo, 0.08, 0.3), **_LENTES}
# cores calibradas pelas fotos oficiais da Apple (o Preto-espacial foi conferido no aparelho do Daniel):
# Prateado = moldura de aço cromado claro e traseira branca; Dourado = moldura amarelo-ouro e traseira champanhe;
# Roxo-profundo = moldura e traseira roxo-acinzentado (mais claro e menos saturado que a amostra do site)
PRESETS['14pro-prateado'] = _cor14('#e3e4e6', '#f1f1ee', '#ecece9', '#cfd0d2', '#f7f7f5')
PRESETS['14pro-dourado'] = _cor14('#e5c88f', '#f3e1bd', '#efdcb6', '#d9c29a', '#f8ebcf')
PRESETS['14pro-roxo-profundo'] = _cor14('#625868', '#6b6075', '#625870', '#5a5161', '#7a7083')
args = sys.argv[sys.argv.index('--') + 1:]
entrada, saida, preset = args[:3]
fundo = args[3] if len(args) > 3 else None  # imagem da tela (papel de parede da unidade)
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
if fundo:
    m = bpy.data.materials.get('OLED')
    if m and m.node_tree:
        b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(fundo)
        for l in list(b.inputs['Base Color'].links): m.node_tree.links.remove(l)
        m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
comum.exportar(saida)
print('ok', preset, saida)
