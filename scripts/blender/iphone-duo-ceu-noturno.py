# iPhone Duo — Céu noturno, a partir do modelo conceito enviado pelo Daniel (dist/iphone-duo-concept.zip → iPhone Ultra9.glb).
# - altura oficial de 117,8 mm (escala uniforme, a animação de abrir/fechar é preservada)
# - câmera da tela externa movida do centro para o canto superior direito (mesma posição relativa do modelo Star White:
#   ~8 mm da borda direita e ~8 mm do topo da tela externa, visto de frente com o aparelho fechado)
# - acabamento Céu noturno e texturas reduzidas (normais de 2048 px → 1024 px, WebP)
# Uso: python3 scripts/blender/iphone-duo-ceu-noturno.py -- "<iPhone Ultra9.glb>" public/models/iphone-duo-ceu-noturno.glb
import sys, os, bpy, mathutils
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum

entrada, saida = sys.argv[sys.argv.index('--') + 1:][:2]
comum.limpar()
bpy.ops.import_scene.gltf(filepath=entrada)
sc = bpy.context.scene
for o in list(sc.objects):
    if o.name.startswith('Icosphere'):
        bpy.data.objects.remove(o)

FECHADO = 120  # último quadro da animação = aparelho fechado
sc.frame_set(FECHADO); bpy.context.view_layer.update()

# 1) câmera da tela externa: no conceito ela é um furo no centro do topo (tela OLED + vidro) com um cilindro escuro
#    por baixo. Fecha o furo (com UV contínuo, para o papel de parede não quebrar) e cria a câmera no canto
#    superior direito como um disco escuro entre a tela e o vidro — mesma construção do modelo Star White.
import bmesh
tela = bpy.data.objects['Out Display']
me = tela.data
M = tela.matrix_world.copy(); Mi = M.inverted()
if 'Camera Lens' not in [m.name for m in me.materials if m]:
    me.materials.append(bpy.data.materials['Camera Lens'])  # lente do disco novo
mat_idx = {m.name: i for i, m in enumerate(me.materials) if m}
bm = bmesh.new(); bm.from_mesh(me)
uvl = bm.loops.layers.uv.active
cam_faces = [f for f in bm.faces if f.material_index == mat_idx['Camera filter']]
cam_c = sum((M @ v.co for f in cam_faces for v in f.verts), mathutils.Vector()) / sum(len(f.verts) for f in cam_faces)
perto = lambda e: ((M @ ((e.verts[0].co + e.verts[1].co) / 2)) - cam_c).xz.length < 0.006
oled_i, vidro_i = mat_idx['OLED'], mat_idx['Glass']
# vidro: dentro do furo há uma pequena lente curva (~1150 triângulos, raio ≤ 2,5 mm) que cobria a câmera antiga;
# ela sai daqui (a câmera nova tem disco próprio) e o furo do vidro principal é fechado com tampas planas
raio_furo = 0.00255
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index == vidro_i and ((M @ f.calc_center_median()) - cam_c).xz.length < raio_furo], context='FACES')
perto = lambda e: ((M @ ((e.verts[0].co + e.verts[1].co) / 2)) - cam_c).xz.length < 0.0065
for mi in (oled_i, vidro_i):
    borda = [e for e in bm.edges if e.is_valid and e.is_boundary and perto(e) and e.link_faces and e.link_faces[0].material_index == mi]
    novos = bmesh.ops.holes_fill(bm, edges=borda, sides=0)['faces']
    for f in novos:
        f.material_index = mi
        f.normal_update()
        ref = borda[0].link_faces[0]
        if f.normal.dot(ref.normal) < 0:
            f.normal_flip()
        f.smooth = False  # preenchimento plano: sem sombra no lugar do furo antigo
    if mi == oled_i and uvl is not None:
        # UV por ajuste afim (u, v) = A·(x, z) + b a partir dos vértices da borda do furo
        amostras = [((M @ l.vert.co).x, (M @ l.vert.co).z, l[uvl].uv.copy()) for e in borda for l in e.link_faces[0].loops if l.vert in e.verts]
        n = len(amostras); sx = sum(a[0] for a in amostras) / n; sz = sum(a[1] for a in amostras) / n
        su = sum(a[2].x for a in amostras) / n; sv = sum(a[2].y for a in amostras) / n
        cxx = sum((a[0] - sx) ** 2 for a in amostras); czz = sum((a[1] - sz) ** 2 for a in amostras); cxz = sum((a[0] - sx) * (a[1] - sz) for a in amostras)
        det = cxx * czz - cxz * cxz
        def fit(k, m):
            cxk = sum((a[0] - sx) * (a[2][k] - m) for a in amostras); czk = sum((a[1] - sz) * (a[2][k] - m) for a in amostras)
            return ((czz * cxk - cxz * czk) / det, (cxx * czk - cxz * cxk) / det)
        au, av = fit(0, su), fit(1, sv)
        for f in novos:
            for l in f.loops:
                w = M @ l.vert.co
                l[uvl].uv = (su + au[0] * (w.x - sx) + au[1] * (w.z - sz), sv + av[0] * (w.x - sx) + av[1] * (w.z - sz))
    print('furo fechado:', me.materials[mi].name, len(borda), 'arestas')

# posição nova: ~8 mm da borda direita (vista de frente a direita é -X) e ~8 mm do topo da tela
oled_w = [M @ v.co for f in bm.faces if f.material_index == oled_i for v in f.verts]
ox0 = min(p.x for p in oled_w); oz1 = max(p.z for p in oled_w); oy = max(p.y for p in oled_w)
alvo = mathutils.Vector((ox0 + 0.00795, oy, oz1 - 0.0079))
# cilindro antigo vai junto (fica escondido sob a tela)
dl = Mi.to_3x3() @ (mathutils.Vector((alvo.x, cam_c.y, alvo.z)) - cam_c)
for v in {v for f in cam_faces for v in f.verts}:
    v.co += dl
# disco da câmera (anel escuro + lente) logo acima da tela, abaixo do vidro
def disco(raio, dy, mat):
    centro = Mi @ mathutils.Vector((alvo.x, oy + dy, alvo.z))
    normal = (Mi.to_3x3() @ mathutils.Vector((0, 1, 0))).normalized()
    eixo1 = (Mi.to_3x3() @ mathutils.Vector((1, 0, 0))).normalized() * raio
    eixo2 = (Mi.to_3x3() @ mathutils.Vector((0, 0, 1))).normalized() * raio
    import math
    c0 = bm.verts.new(centro)
    anel = [bm.verts.new(centro + eixo1 * math.cos(2 * math.pi * i / 48) + eixo2 * math.sin(2 * math.pi * i / 48)) for i in range(48)]
    for i in range(48):
        f = bm.faces.new((c0, anel[i], anel[(i + 1) % 48]))
        f.material_index = mat
        f.normal_update()
        if f.normal.dot(normal) < 0:
            f.normal_flip()
disco(0.00285, 0.00004, mat_idx['Camera filter'])
disco(0.0011, 0.00008, mat_idx['Camera Lens'])
bm.to_mesh(me); bm.free(); me.update()
print('câmera externa: de', [round(c * 1000, 1) for c in cam_c], 'para', [round(c * 1000, 1) for c in alvo], 'mm')

# 1b) o conceito traz a palavra "ULTRA" gravada na dobradiça (material "Metal tint" do objeto "Hinge"): remove
dob = bpy.data.objects['Hinge']
bmd = bmesh.new(); bmd.from_mesh(dob.data)
mt = {i for i, m in enumerate(dob.data.materials) if m and m.name == 'Metal tint'}
bmesh.ops.delete(bmd, geom=[f for f in bmd.faces if f.material_index in mt], context='FACES')
bmd.to_mesh(dob.data); bmd.free(); dob.data.update()

# 2) acabamento Céu noturno (azul quase preto, moldura acetinada e traseira fosca)
def cor(nome, rgb, rug=None, met=None):
    m = bpy.data.materials.get(nome)
    if not m or not m.node_tree:
        return
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b:
        return
    b.inputs['Base Color'].default_value = (*rgb, 1)
    if rug is not None: b.inputs['Roughness'].default_value = rug
    if met is not None: b.inputs['Metallic'].default_value = met
srgb = lambda h: tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (1, 3, 5))
cor('Titanium', srgb('#2b3142'), rug=0.3, met=0.85)
cor('Frosted glass', srgb('#262b3a'))
cor('Plastic antena', srgb('#1c202b'))

# 3) as telas do Duo mantêm a imagem própria (o visualizador só desenha a tela iOS em materiais "OLED")
for nome, novo in (('OLED', 'Duo screen outer'), ('OLED IN', 'Duo screen inner')):
    m = bpy.data.materials.get(nome)
    if m: m.name = novo

# 4) altura oficial (117,8 mm): escala uniforme na raiz
sc.frame_set(0); bpy.context.view_layer.update()
mn, mx = comum.caixa(comum.malhas())
altura = (mx - mn).z
# a raiz "iPhone Ultra" é animada (translação/rotação): escala e giro ficam num nó-pai novo.
# Giro de 180° em Z: tela externa voltada para -Y (como no modelo Star White) e dobradiça à esquerda vista de frente.
import math
raiz = bpy.data.objects['iPhone Ultra']
pai = bpy.data.objects.new('iPhone Duo', None)
sc.collection.objects.link(pai)
raiz.parent = pai
pai.scale = (0.1178 / altura,) * 3
pai.rotation_euler = (0, 0, math.pi)
print('altura original', round(altura * 1000, 1), 'mm → 117,8 mm')

# 5) texturas: normais 1024 px, imagem da tela até 1536 px
for img in bpy.data.images:
    lim = 1536 if img.name.startswith('478431') else 1024
    if max(img.size) > lim:
        f = lim / max(img.size)
        img.scale(int(img.size[0] * f), int(img.size[1] * f))

bpy.ops.export_scene.gltf(filepath=saida, export_format='GLB', export_image_format='WEBP', export_image_quality=85,
                          export_animations=True, export_yup=True, export_apply=False, export_cameras=False, export_lights=False)
print('ok', saida)
