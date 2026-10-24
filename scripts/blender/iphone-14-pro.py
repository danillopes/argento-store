# iPhone 14 Pro Max (modelo enviado pelo Daniel: dist/iphone-14-pro-max-gold.zip → USDZ) e iPhone 14 Pro (mesmo modelo,
# medidas do 14 Pro). Uso: python3 scripts/blender/iphone-14-pro.py -- <arquivo.usdz> <saida.glb> <promax|pro>
import sys, os, bpy, mathutils
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import comum

entrada, saida, variante = sys.argv[sys.argv.index('--') + 1:][:3]
MEDIDAS = {'promax': (77.6, 7.85, 160.7), 'pro': (71.5, 7.85, 147.5)}  # Apple: largura, espessura, altura (mm)

comum.limpar()
bpy.ops.wm.usd_import(filepath=entrada)
# remove peças soltas fora do aparelho (o arquivo traz uma caixa auxiliar de 17 cm)
for o in list(bpy.context.scene.objects):
    if o.type != 'MESH':
        continue
    mn, mx = comum.caixa([o])
    c = (mn + mx) / 2
    if abs(c.x) > 0.045 or (mx - mn).x > 0.1:
        bpy.data.objects.remove(o)
objs = comum.malhas()
comum.aplicar_transformacoes(objs)

# materiais do arquivo têm nomes aleatórios: identificados por cor, acabamento e posição
MOLDURA = {'uApvtlLvHnjNKSG', 'yuFXHUhPQDoVApU', 'WeYJTXtSqeWejVb', 'nLgTjJkjjIwxPzH', 'WSDoIreTMPBuTxz'}  # aço dourado
MAPA = {
    'TrnkWAfGduLgqLM': 'Frosted glass',   # vidro traseiro fosco
    'IfqLTOjymCZMuVu': 'Frosted bump',    # ressalto das câmeras
    # vidros transparentes do módulo: a tampa do platô (deixa ver flash e LiDAR) e as tampas de safira das lentes
    'qzKHApwituZTUxC': 'Glass',
    'erHrUfZxAtkfXqO': 'Glass',
    'MeiGPKHwBMVqGNQ': 'Glass',           # tampa frontal das lentes (aparecia como disco cinza)
    # tampas do flash (eram opacas e bege): transparentes para aparecer o anel Fresnel do flash
    'EnwhLiFdMDwiUyz': 'Glass',
    'ZyKhfPnbNOCYIny': 'Glass',
    'hgmDQvqtKSacBdB': 'Glass',           # disco sobre o flash (no original, anel com centro transparente)
    'bliqaGpTvCuZHuk': 'Frosted bump',    # base do ressalto (vidro na cor do aparelho, como no real)
    'loFcbeOTkLALGur': 'Glass tint',      # logotipo
    'qTzpZGPXrrlpDsm': 'Plastic antena',  # faixas de antena
    'jUggraQHQxDJpnM': 'OLED',            # tela
}
mats = {m.name: m for m in bpy.data.materials}
# referência de medida: só a faixa lateral principal (uApvtlLvHnjNKSG), antes de unir botões e peças de aço
ref_mn, ref_mx = comum.caixa_material(objs, 'uApvtlLvHnjNKSG')
alu = mats['uApvtlLvHnjNKSG']
for o in objs:
    for slot in o.material_slots:
        if slot.material and slot.material.name in MOLDURA:
            slot.material = alu
alu.name = 'Anodized aluminum'
# materiais que viram o mesmo nome são unidos num só (senão o Blender cria "Frosted bump.001" e o site não reconhece)
destino = {}
for orig, novo in MAPA.items():
    if orig in mats:
        destino.setdefault(novo, mats[orig])
for o in objs:
    for slot in o.material_slots:
        if slot.material and slot.material.name in MAPA:
            slot.material = destino[MAPA[slot.material.name]]
for novo, m in destino.items():
    m.name = novo
# o vidro do ressalto tinha textura dourada fixa: tira a textura para a cor escolhida valer
m = bpy.data.materials.get('Frosted bump')
for m in [mm for mm in bpy.data.materials if mm.name.startswith('Frosted bump')]:
    if m.node_tree:
        b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if b:
            for l in list(b.inputs['Base Color'].links):
                m.node_tree.links.remove(l)
            b.inputs['Base Color'].default_value = (0.8, 0.8, 0.8, 1)
# o USD liga emissão branca em quase todos os materiais: só a tela emite luz
for m in bpy.data.materials:
    if not m.node_tree:
        continue
    for n in m.node_tree.nodes:
        if n.type == 'BSDF_PRINCIPLED' and m.name != 'OLED':
            n.inputs['Emission Strength'].default_value = 0.0

print('moldura original (mm):', [round(v * 1000, 2) for v in (ref_mx - ref_mn)])
esc = comum.normalizar(objs, MEDIDAS[variante], ref_caixa=(ref_mn, ref_mx))
if variante == 'pro':
    # o módulo de câmeras do 14 Pro tem praticamente o tamanho do Pro Max: desfaz a redução que veio junto com o corpo
    esc_pm = mathutils.Vector((MEDIDAS['promax'][0] / 1000 / (ref_mx - ref_mn).x, 1, MEDIDAS['promax'][2] / 1000 / (ref_mx - ref_mn).z))
    fx, fz = esc_pm.x / esc.x, esc_pm.z / esc.z
    mods = {'Frosted bump', 'finish-chamfer'}
    pts = [o.matrix_world @ v.co for o in objs for p in o.data.polygons if o.data.materials[p.material_index] and o.data.materials[p.material_index].name == 'Frosted bump' for v in [o.data.vertices[i] for i in p.vertices]]
    mn = mathutils.Vector((min(p.x for p in pts), 0, min(p.z for p in pts))); mx = mathutils.Vector((max(p.x for p in pts), 0, max(p.z for p in pts)))
    c = (mn + mx) / 2; hx, hz = (mx.x - mn.x) / 2 + 0.0005, (mx.z - mn.z) / 2 + 0.0005
    for o in objs:
        me = o.data
        nomes = {i: (m.name if m else '') for i, m in enumerate(me.materials)}
        alvo = set()
        for p in me.polygons:
            if nomes.get(p.material_index) in ('Anodized aluminum', 'Plastic antena', 'Frosted glass'):
                continue
            for vi in p.vertices:
                w = me.vertices[vi].co
                if w.y < -0.0035 and abs(w.x - c.x) <= hx and abs(w.z - c.z) <= hz:
                    alvo.add(vi)
        for vi in alvo:
            w = me.vertices[vi].co
            w.x = c.x + (w.x - c.x) * fx
            w.z = c.z + (w.z - c.z) * fz
        me.update()
    print('módulo de câmeras ampliado', round(fx, 3), round(fz, 3), 'em torno de', [round(c.x * 1000, 1), round(c.z * 1000, 1)], 'mm')
# a tela e o painel preto de baixo estavam no mesmo plano (y = 3,9 mm): a GPU alternava entre os dois e a tela
# "apagava" conforme o ângulo. A tela sobe 0,04 mm; Dynamic Island, câmera frontal e grade do alto-falante, 0,08 mm.
FRENTE = {'OLED': 0.00004, 'FjQZkOEFcAMgVKb': 0.00008, 'pAavhFVnCAgSnSH': 0.00008, 'fexrCBexEqONlzJ': 0.00008, 'XvdlxyjrKESiFay': 0.00008}
for o in objs:
    me = o.data
    desloc = {i: FRENTE[m.name] for i, m in enumerate(me.materials) if m and m.name in FRENTE}
    if not desloc:
        continue
    feito = set()
    for poly in me.polygons:
        dy = desloc.get(poly.material_index)
        if dy is None:
            continue
        for vi in poly.vertices:
            if vi not in feito:
                me.vertices[vi].co.y += dy
                feito.add(vi)
    me.update()
# uma peça do material do ressalto fica por cima do flash e o escurecia: vira vidro (o anel Fresnel aparece)
def centro_material(nome):
    pts = [o.matrix_world @ o.data.vertices[vi].co for o in objs for p in o.data.polygons
           if p.material_index < len(o.data.materials) and o.data.materials[p.material_index] and o.data.materials[p.material_index].name == nome for vi in p.vertices]
    return sum(pts, mathutils.Vector()) / len(pts) if pts else None
flash = centro_material('EcHAJKlkagvhESV')
vidro = bpy.data.materials.get('Glass')
if flash is not None and vidro is not None:
    trocadas = 0
    for o in objs:
        me = o.data
        if 'Glass' not in [m.name for m in me.materials if m]:
            me.materials.append(vidro)
        gi = [i for i, m in enumerate(me.materials) if m and m.name == 'Glass'][0]
        for poly in me.polygons:
            m = me.materials[poly.material_index] if poly.material_index < len(me.materials) else None
            if m and m.name == 'Frosted bump':
                c = o.matrix_world @ poly.center
                if ((c - flash).xz.length < 0.0034) and c.y < flash.y + 0.0002:
                    poly.material_index = gi; trocadas += 1
    print('faces sobre o flash viraram vidro:', trocadas)
comum.vidro_transparente('Glass')

# acabamento real: aço inoxidável polido, vidro traseiro texturizado fosco e interior das lentes
TX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'texturas')
comum.textura_superficie('Anodized aluminum', rugosidade=f'{TX}/aco-rugosidade.png', normal=f'{TX}/aco-normal.png', forca_normal=0.6)
comum.textura_superficie('Frosted glass', normal=f'{TX}/vidro-fosco-normal.png', forca_normal=0.35)
# centros das 3 lentes pelo elemento central (GCTf): a de cima à esquerda é a principal (48 MP, 7 elementos)
pts = [ob.matrix_world @ p.center for ob in objs for p in ob.data.polygons
       if p.material_index < len(ob.data.materials) and ob.data.materials[p.material_index] and ob.data.materials[p.material_index].name == 'GCTfChbRIgBmWbe']
grupos = []
for c in pts:
    for g in grupos:
        if (g[0] - c).xz.length < 0.004:
            g.append(c); break
    else:
        grupos.append([c])
centros = [sum(g, mathutils.Vector()) / len(g) for g in sorted(grupos, key=len, reverse=True)[:3]]
centros.sort(key=lambda c: (-c.z + (0.02 if c.x > -0.012 else 0)))  # principal: mais alta da coluna esquerda
print('lentes (mm):', [[round(c.x * 1000, 1), round(c.z * 1000, 1)] for c in centros])
n = comum.interior_lentes(objs, 'VlnkJNnmZmryUEK', centros, [f'{TX}/lente-principal.png', f'{TX}/lente-secundaria.png'], 0.0128)
print('faces do interior das lentes texturizadas:', n)
comum.uv_tela('OLED')
comum.exportar(saida)
print('ok', variante, saida)
