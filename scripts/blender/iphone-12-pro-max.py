# iPhone 12 Pro Max (Grafite) a partir da geometria do iPhone 13 Pro (DatSketch), que tem o mesmo desenho de bordas
# retas em aço e a mesma disposição das câmeras (duas lentes à esquerda, uma à direita, flash em cima, LiDAR embaixo).
# Ajustes para o 12 Pro Max, conferidos com o vídeo do aparelho do Daniel:
#  - medidas oficiais da Apple: 160,8 × 78,1 × 7,4 mm
#  - módulo de câmeras mantém o tamanho (não cresce com o corpo); lentes ~16 % menores que as do 13 Pro
#  - notch ~22 % mais largo (padrão da linha 12)
#  - acabamento Grafite (traseira fosca, moldura de aço polido escuro)
#  - calibrado com o vídeo do 12 Pro Max do Daniel: módulo ~32 mm de largura e anéis das lentes ~11 mm
# Uso: python3 scripts/blender/iphone-12-pro-max.py -- <iPhone13Pro.blend> <saida.glb> [promax|pro]
import sys, os, bpy, bmesh, mathutils
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum

args = sys.argv[sys.argv.index('--') + 1:]
entrada, saida = args[:2]
variante = args[2] if len(args) > 2 else 'promax'
MEDIDAS = {'promax': (78.1, 7.4, 160.8), 'pro': (71.5, 7.4, 146.7)}  # Apple: largura, espessura, altura (mm)
comum.limpar()
bpy.ops.wm.open_mainfile(filepath=entrada)
pasta = os.path.dirname(os.path.abspath(entrada))
for img in bpy.data.images:
    nome = os.path.basename(bpy.path.abspath(img.filepath)) or img.name
    alvo = os.path.join(pasta, nome)
    if os.path.exists(alvo):
        img.filepath = alvo; img.reload()
objs = comum.malhas()
comum.aplicar_transformacoes(objs)
moldura = [o for o in objs if o.name.startswith('Frame')]
mn0, mx0 = comum.caixa(moldura)
tam0 = mx0 - mn0
esc = comum.normalizar(objs, MEDIDAS[variante], moldura)
comum.renomear_materiais({
    'Frame': 'Anodized aluminum', 'Body': 'Frosted glass', 'Camera Frame': 'Frosted bump',
    'Camera Frame.001': 'finish-chamfer', 'Antenna': 'Plastic antena', 'Logo': 'Glass tint',
    'Wallpaper': 'OLED', 'Screen Glass': 'Glass',
})
# escala que o 13 Pro teria nas medidas dele (146,7 × 71,5): o módulo de câmeras volta a esse tamanho
esc13 = mathutils.Vector((0.0715 / tam0.x, esc.y, 0.1467 / tam0.z))
# módulo do 12 Pro / Pro Max: ~32 mm de largura no vídeo (o do 13 Pro tem ~33,8 mm) → 0,947
fator_modulo = mathutils.Vector((esc13.x / esc.x * 0.947, 1.0, esc13.z / esc.z * 0.947))

cams = [o for o in objs if o.name.startswith('Camera')]
mnc, mxc = comum.caixa(cams)
centro_mod = (mnc + mxc) / 2
for o in cams:
    for v in o.data.vertices:
        d = v.co - centro_mod
        v.co = centro_mod + mathutils.Vector((d.x * fator_modulo.x, d.y, d.z * fator_modulo.z))
    o.data.update()

# lentes: ilhas do material "Lens" no módulo traseiro → 3 centros; tudo que estiver a até 7 mm encolhe 16 %
cam4 = bpy.data.objects['Camera.004']
me = cam4.data
lens_i = {i for i, m in enumerate(me.materials) if m and m.name == 'Lens'}
bm = bmesh.new(); bm.from_mesh(me)
faces = [f for f in bm.faces if f.material_index in lens_i]
ilhas, vistos = [], set()
for f in faces:
    if f.index in vistos: continue
    pilha, ilha = [f], []
    while pilha:
        g = pilha.pop()
        if g.index in vistos: continue
        vistos.add(g.index); ilha.append(g)
        for e in g.edges:
            for h in e.link_faces:
                if h.material_index in lens_i and h.index not in vistos: pilha.append(h)
    ilhas.append(ilha)
centros = []
for ilha in sorted(ilhas, key=len, reverse=True)[:3]:
    vs = {v for f in ilha for v in f.verts}
    centros.append(sum((v.co for v in vs), mathutils.Vector()) / len(vs))
print('centros das lentes (mm):', [[round(c.x * 1000, 1), round(c.z * 1000, 1)] for c in centros])
plat_i = {i for i, m in enumerate(me.materials) if m and m.name in ('Frosted bump', 'Gray Glass', 'Black Glass', 'Camera Glass')}
for v in bm.verts:
    if all(f.material_index in plat_i for f in v.link_faces) and not any(f.material_index in lens_i for f in v.link_faces):
        continue  # plataforma do módulo fica como está
    c = min(centros, key=lambda c: (v.co - c).xz.length)
    if (v.co - c).xz.length < 0.0075:
        d = v.co - c
        v.co = c + mathutils.Vector((d.x * 0.70, d.y, d.z * 0.70))  # anéis ~11 mm, como no vídeo (13 Pro: ~15 mm)
bm.to_mesh(me); bm.free(); me.update()

# notch ~22 % mais largo: peças da frente na faixa do topo (|x| < 22 mm)
topo = max((o.matrix_world @ v.co).z for o in objs for v in o.data.vertices)
for o in objs:
    me = o.data
    pequenos = {i for i, m in enumerate(me.materials) if m and m.name in ('Lens', 'Camera Glass')}
    vs_peq = {v for p in me.polygons if p.material_index in pequenos for v in p.vertices}
    for v in me.vertices:
        w = v.co
        if w.y < 0.0015 or w.z < topo - 0.0105 or abs(w.x) > 0.022:
            continue
        if v.index in vs_peq:
            continue
        ax = abs(w.x)
        nx = ax * 1.22 if ax <= 0.015 else 0.0183 + (ax - 0.015) * (0.022 - 0.0183) / (0.022 - 0.015)
        w.x = nx if w.x >= 0 else -nx
    # câmera frontal e lente: só deslocam (sem deformar o círculo)
    if vs_peq:
        grupo = [me.vertices[i] for i in vs_peq if me.vertices[i].co.y > 0.0015 and me.vertices[i].co.z > topo - 0.0105]
        if grupo:
            cx = sum(v.co.x for v in grupo) / len(grupo)
            dx = cx * 0.22
            for v in grupo:
                v.co.x += dx
    me.update()

# acabamento Grafite (cores do aparelho no vídeo, equilibradas com a cor oficial)
srgb = lambda h: tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (1, 3, 5))
def cor(nome, h, rug=None, met=None):
    m = bpy.data.materials.get(nome)
    if not m or not m.node_tree: return
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b: return
    b.inputs['Base Color'].default_value = (*srgb(h), 1)
    if rug is not None: b.inputs['Roughness'].default_value = rug
    if met is not None: b.inputs['Metallic'].default_value = met
cor('Anodized aluminum', '#4a4845', rug=0.14, met=0.95)  # aço inoxidável grafite polido
cor('Frosted glass', '#54524f', rug=0.34, met=0.05)      # vidro traseiro fosco
cor('Frosted bump', '#57554f', rug=0.12, met=0.05)       # vidro brilhante do módulo
cor('finish-chamfer', '#4a4845', rug=0.12, met=0.95)
cor('Plastic antena', '#3d3c3a', rug=0.5, met=0.0)
cor('Glass tint', '#4f4d4a', rug=0.08, met=0.3)
cor('Port', '#1c1c1e', rug=0.12, met=0.9)        # anéis das lentes: aço escuro polido (no vídeo, bem escuros)
# miolo das lentes: vidro escuro com reflexo azulado (o ponto claro do 13 Pro não existe no 12)
m = bpy.data.materials.get('Lens')
if m and m.node_tree:
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if b:
        for l in list(b.inputs['Base Color'].links): m.node_tree.links.remove(l)
        b.inputs['Base Color'].default_value = (*srgb('#141822'), 1)
        b.inputs['Roughness'].default_value = 0.05; b.inputs['Metallic'].default_value = 0.2

comum.uv_tela('OLED')
comum.reduzir_imagens(1024)
comum.exportar(saida)
print('ok', saida)
