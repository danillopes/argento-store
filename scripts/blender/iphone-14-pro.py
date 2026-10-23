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
    'erHrUfZxAtkfXqO': 'Frosted bump',    # vidro do topo do ressalto (sem a textura dourada, segue a cor escolhida)
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
comum.normalizar(objs, MEDIDAS[variante], ref_caixa=(ref_mn, ref_mx))
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
comum.uv_tela('OLED')
comum.exportar(saida)
print('ok', variante, saida)
