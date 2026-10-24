# Utilitários de conversão para o padrão de modelos do Argento (Blender como módulo Python: pip install bpy).
# Convenção (igual ao iphone-17-pro.glb, em coordenadas do Blender): tela voltada para +Y, traseira para -Y,
# topo em +Z, câmeras traseiras em -X, unidades em metros, centro do aparelho na origem.
import bpy, bmesh, mathutils


def limpar():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def malhas(excluir=('Icosphere',)):
    return [o for o in bpy.context.scene.objects if o.type == 'MESH' and not o.name.startswith(excluir) and not o.hide_render]


def caixa(objs):
    dg = bpy.context.evaluated_depsgraph_get()
    mn = mathutils.Vector((1e9,) * 3); mx = -mn
    for o in objs:
        ev = o.evaluated_get(dg)
        for c in ev.bound_box:
            w = o.matrix_world @ mathutils.Vector(c)
            mn = mathutils.Vector(map(min, mn, w)); mx = mathutils.Vector(map(max, mx, w))
    return mn, mx


def aplicar_transformacoes(objs):
    """Desfaz hierarquias e aplica rotação/escala nas malhas."""
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def caixa_material(objs, nome):
    """Caixa só das faces de um material (ex.: a moldura, sem o ressalto das câmeras)."""
    mn = mathutils.Vector((1e9,) * 3); mx = -mn
    for o in objs:
        me = o.data
        idx = {i for i, m in enumerate(me.materials) if m and m.name == nome}
        for p in me.polygons:
            if p.material_index in idx:
                for vi in p.vertices:
                    w = o.matrix_world @ me.vertices[vi].co
                    mn = mathutils.Vector(map(min, mn, w)); mx = mathutils.Vector(map(max, mx, w))
    return mn, mx


def normalizar(objs, alvo_mm, ref_objs=None, ref_material=None, ref_caixa=None):
    """Escala por eixo para as medidas oficiais (largura X, espessura Y, altura Z em mm), medidas na moldura
    (ref_material ou ref_objs, sem o ressalto das câmeras), e centraliza o aparelho na origem."""
    if ref_caixa:
        mn, mx = ref_caixa
    elif ref_material:
        mn, mx = caixa_material(objs, ref_material)
    else:
        mn, mx = caixa(ref_objs or objs)
    tam = mx - mn
    esc = mathutils.Vector((alvo_mm[0] / 1000 / tam.x, alvo_mm[1] / 1000 / tam.y, alvo_mm[2] / 1000 / tam.z))
    centro = (mn + mx) / 2
    for o in objs:
        me = o.data
        for v in me.vertices:
            p = o.matrix_world @ v.co
            v.co = mathutils.Vector(((p.x - centro.x) * esc.x, (p.y - centro.y) * esc.y, (p.z - centro.z) * esc.z))
        o.matrix_world = mathutils.Matrix.Identity(4)
        me.update()
    return esc


def renomear_materiais(mapa):
    for m in bpy.data.materials:
        if m.name in mapa:
            m.name = mapa[m.name]


def uv_tela(material_nome):
    """UV planar da tela como no doador: u cresce com X, v = 0 no topo (o exportador inverte V para o glTF)."""
    alvo = []
    for o in malhas():
        for i, m in enumerate(o.data.materials):
            if m and m.name == material_nome:
                alvo.append((o, i))
    if not alvo:
        return
    pts = [o.matrix_world @ v.co for o, _ in alvo for v in o.data.vertices]
    xs = [p.x for p in pts]; zs = [p.z for p in pts]
    for o, mi in alvo:
        me = o.data
        if not me.uv_layers:
            me.uv_layers.new()
        uv = me.uv_layers.active.data
        faces = [p for p in me.polygons if p.material_index == mi]
        sel = {v for p in faces for v in p.vertices}
        x0, x1 = min(o.matrix_world @ me.vertices[v].co for v in sel).x, None
        # limites só dos vértices desta tela
        vs = [o.matrix_world @ me.vertices[v].co for v in sel]
        x0, x1 = min(p.x for p in vs), max(p.x for p in vs)
        z0, z1 = min(p.z for p in vs), max(p.z for p in vs)
        for p in faces:
            for li in p.loop_indices:
                co = o.matrix_world @ me.vertices[me.loops[li].vertex_index].co
                uv[li].uv = ((co.x - x0) / (x1 - x0), (co.z - z0) / (z1 - z0))


def reduzir_imagens(maximo=1024):
    for img in bpy.data.images:
        if img.size[0] > maximo or img.size[1] > maximo:
            f = maximo / max(img.size)
            img.scale(max(1, int(img.size[0] * f)), max(1, int(img.size[1] * f)))


def exportar(caminho, animacoes=False, objetos=None):
    bpy.ops.object.select_all(action='DESELECT')
    for o in (objetos or malhas()):
        o.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=caminho, export_format='GLB', use_selection=objetos is not None,
        export_image_format='WEBP', export_image_quality=85, export_apply=True,
        export_animations=animacoes, export_yup=True, export_texcoords=True, export_normals=True,
        export_extras=False, export_cameras=False, export_lights=False,
    )


def vidro_transparente(nome='Glass', alfa=0.12):
    """Vidros de cobertura (tampa do módulo, safira das lentes, vidro da tela) exportados como transparentes (BLEND)."""
    for m in bpy.data.materials:
        if m.name != nome or not m.node_tree:
            continue
        b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
        if not b:
            continue
        for k in ('Base Color', 'Alpha'):
            for l in list(b.inputs[k].links):
                m.node_tree.links.remove(l)
        b.inputs['Base Color'].default_value = (0.02, 0.02, 0.025, 1)
        b.inputs['Alpha'].default_value = alfa
        b.inputs['Roughness'].default_value = 0.02
        b.inputs['Metallic'].default_value = 0.0
        for k in ('Transmission Weight', 'Transmission'):
            if k in b.inputs:
                b.inputs[k].default_value = 0.0  # sem transmissão (no navegador renderiza a cena duas vezes)
        try:
            m.surface_render_method = 'BLENDED'
        except Exception:
            m.blend_method = 'BLEND'


def _img(caminho, cor=True):
    img = bpy.data.images.load(caminho, check_existing=True)
    img.colorspace_settings.name = 'sRGB' if cor else 'Non-Color'
    return img


def textura_superficie(nome_material, rugosidade=None, normal=None, forca_normal=1.0):
    """Liga mapa de rugosidade (valores absolutos) e mapa normal a um material."""
    m = bpy.data.materials.get(nome_material)
    if not m or not m.node_tree:
        return False
    nt = m.node_tree
    b = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b:
        return False
    if rugosidade:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = _img(rugosidade, False)
        for l in list(b.inputs['Roughness'].links): nt.links.remove(l)
        nt.links.new(t.outputs['Color'], b.inputs['Roughness'])
    if normal:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = _img(normal, False)
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = forca_normal
        nt.links.new(t.outputs['Color'], nm.inputs['Color'])
        for l in list(b.inputs['Normal'].links): nt.links.remove(l)
        nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return True


def interior_lentes(objs, material_origem, centros, imagens, diametro):
    """Cria materiais de interior de lente (textura frontal dos elementos ópticos) e UV radial por lente."""
    mats = []
    for i, caminho in enumerate(imagens):
        nome = 'Lens interior' if i else 'Lens interior main'
        m = bpy.data.materials.get(nome) or bpy.data.materials.new(nome)
        m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
        o = nt.nodes.new('ShaderNodeOutputMaterial'); b = nt.nodes.new('ShaderNodeBsdfPrincipled')
        nt.links.new(b.outputs['BSDF'], o.inputs['Surface'])
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = _img(caminho, True)
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        b.inputs['Roughness'].default_value = 0.08; b.inputs['Metallic'].default_value = 0.0
        mats.append(m)
    trocadas = 0
    for ob in objs:
        me = ob.data
        idx = [i for i, m in enumerate(me.materials) if m and m.name == material_origem]
        if not idx:
            continue
        slots = []
        for m in mats:
            if m.name not in [x.name for x in me.materials if x]:
                me.materials.append(m)
            slots.append([i for i, x in enumerate(me.materials) if x and x.name == m.name][0])
        if not me.uv_layers:
            me.uv_layers.new()
        uv = me.uv_layers.active.data
        for p in me.polygons:
            if p.material_index not in idx:
                continue
            c = ob.matrix_world @ p.center
            k = min(range(len(centros)), key=lambda j: (c - centros[j]).xz.length)
            p.material_index = slots[0] if k == 0 else slots[1]
            for li in p.loop_indices:
                w = ob.matrix_world @ me.vertices[me.loops[li].vertex_index].co
                # vista de trás: a direita é +X; v cresce para cima (Z)
                uv[li].uv = (0.5 + (w.x - centros[k].x) / diametro, 0.5 + (w.z - centros[k].z) / diametro)
            trocadas += 1
    return trocadas


def manter_copia(pai):
    """Os arquivos do Daniel trazem duas cópias do aparelho lado a lado (traseira e frente). Mantém só a cópia
    cujo objeto-raiz se chama `pai` (já na convenção do site: tela +Y, traseira -Y, câmeras -X) e apaga o resto."""
    for o in list(bpy.context.scene.objects):
        if o.type == 'MESH' and (o.parent is None or o.parent.name != pai):
            bpy.data.objects.remove(o, do_unlink=True)
    for o in list(bpy.context.scene.objects):
        if o.type != 'MESH':
            bpy.data.objects.remove(o, do_unlink=True)


def reatribuir(por_objeto, padrao=None):
    """Troca materiais pelos nomes que o visualizador entende. `por_objeto`: {(objeto, material_antigo): novo};
    `padrao`: {material_antigo: novo} para o que não estiver listado. O material novo nasce como cópia do antigo
    (mantém texturas) e é reaproveitado nos demais usos."""
    for o in malhas():
        me = o.data
        for i, m in enumerate(me.materials):
            if not m:
                continue
            novo = por_objeto.get((o.name, m.name)) or (padrao or {}).get(m.name)
            if not novo or novo == m.name:
                continue
            alvo = bpy.data.materials.get(novo)
            if alvo is None:
                alvo = m.copy(); alvo.name = novo
            me.materials[i] = alvo


def pintar(nome, hexa, rugosidade, metalico, emissao=False):
    """Cor sólida (sem texturas) para um material."""
    m = bpy.data.materials.get(nome)
    if not m or not m.node_tree:
        return
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b:
        return
    for k in ('Base Color', 'Roughness', 'Metallic', 'Alpha'):
        for l in list(b.inputs[k].links):
            m.node_tree.links.remove(l)
    srgb = lambda h: tuple(((int(h[i:i + 2], 16) / 255) ** 2.2) for i in (1, 3, 5))
    b.inputs['Base Color'].default_value = (*srgb(hexa), 1)
    b.inputs['Roughness'].default_value = rugosidade
    b.inputs['Metallic'].default_value = metalico
    b.inputs['Alpha'].default_value = 1.0
    for k in ('Emission Strength',):
        if k in b.inputs:
            b.inputs[k].default_value = 0.0


def girar_180_z(objs):
    """Gira o aparelho 180° em torno do eixo vertical (X e Y trocam de sinal; rotação própria, sem espelhar).
    Usado quando o doador traz a tela virada para -Y: o visualizador espera tela em +Y e câmeras em -X."""
    for o in objs:
        me = o.data
        for v in me.vertices:
            v.co.x, v.co.y = -v.co.x, -v.co.y
        me.update()


def _contorno_ilha(x_centro_mm, z_centro_mm, largura_mm, altura_mm, segmentos=24):
    import math
    r = altura_mm / 2
    cx = largura_mm / 2 - r
    pts = []
    for k in range(segmentos + 1):          # tampa direita, de -90° a +90°
        a = -math.pi / 2 + math.pi * k / segmentos
        pts.append((x_centro_mm + cx + r * math.cos(a), z_centro_mm + r * math.sin(a)))
    for k in range(segmentos + 1):          # tampa esquerda, de 90° a 270°
        a = math.pi / 2 + math.pi * k / segmentos
        pts.append((x_centro_mm - cx + r * math.cos(a), z_centro_mm + r * math.sin(a)))
    return pts


def recortar_tela(pts, material_tela='OLED'):
    """Abre na tela (material OLED) um furo com o contorno convexo `pts` (mm, em X,Z): divide as faces da tela pelos planos
    de cada aresta do contorno e apaga as que ficam dentro."""
    import bmesh
    n = len(pts)

    def dentro(x, z):
        for k in range(n):
            x0, z0 = pts[k]; x1, z1 = pts[(k + 1) % n]
            if (x1 - x0) * (z - z0) - (z1 - z0) * (x - x0) < -1e-9:
                return False
        return True

    for o in malhas():
        idx = [i for i, m in enumerate(o.data.materials) if m and m.name == material_tela]
        if not idx:
            continue
        bm = bmesh.new(); bm.from_mesh(o.data)
        for k in range(n):
            x0, z0 = pts[k]; x1, z1 = pts[(k + 1) % n]
            tela = [f for f in bm.faces if f.material_index in idx]
            geom = list(tela) + list({e for f in tela for e in f.edges}) + list({v for f in tela for v in f.verts})
            bmesh.ops.bisect_plane(bm, geom=geom, dist=1e-7, plane_co=(x0 / 1000, 0, z0 / 1000),
                                   plane_no=((z1 - z0), 0, -(x1 - x0)), clear_inner=False, clear_outer=False)
        apagar = [f for f in bm.faces if f.material_index in idx and dentro(f.calc_center_median().x * 1000, f.calc_center_median().z * 1000)]
        bmesh.ops.delete(bm, geom=apagar, context='FACES')
        bm.to_mesh(o.data); bm.free(); o.data.update()


def topo_da_tela(material_tela='OLED'):
    """(z máximo, y da superfície) da tela, em mm."""
    pts = [o.matrix_world @ v.co for o in malhas() for i, m in enumerate(o.data.materials) if m and m.name == material_tela
           for p in o.data.polygons if p.material_index == i for v in (o.data.vertices[k] for k in p.vertices)]
    return max(p.z for p in pts) * 1000, max(p.y for p in pts) * 1000


def ilha_do_17_pro(glb_17_pro, recuo_topo_mm=5.46, material_tela='OLED'):
    """Dynamic Island de verdade: copia do modelo do iPhone 17 Pro do site a geometria real da ilha (poço de 2 mm sob o
    vidro, módulo de sensores e câmera frontal com a lente detalhada), com as medidas e os materiais originais, e a
    assenta na tela deste aparelho. A ilha do 17 Pro fica a 5,46 mm do topo da tela até o centro; como no 17 Pro, 16, 17
    e Air têm a mesma ilha (21 x 6 mm) à mesma distância do topo da tela. Abre o furo na tela (OLED) antes de assentar."""
    import bmesh
    z_topo, y_sup = topo_da_tela(material_tela)
    zc = z_topo - recuo_topo_mm
    dy = y_sup - 3.43 + 0.01               # superfície da tela do 17 Pro: y = 3.43 mm
    dz = zc - 67.0                         # centro da ilha do 17 Pro: z = 67,0 mm
    recortar_tela(_contorno_ilha(0.0, zc, 20.95, 5.92, 32), material_tela)  # um fio menor que o aro da ilha: a borda da tela fica por baixo do aro, sem frestas
    antes = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=glb_17_pro)
    novos = [o for o in bpy.data.objects if o not in antes]
    manter = ('Camera filter', 'Camera Lens', 'Display Frame', 'OLED off')
    for o in [o for o in novos if o.type == 'MESH']:
        bm = bmesh.new(); bm.from_mesh(o.data)
        apagar = []
        for f in bm.faces:
            vs = [(o.matrix_world @ v.co) * 1000 for v in f.verts]
            c = sum((v for v in vs), vs[0] * 0) / len(vs)
            nome = o.data.materials[f.material_index].name if o.data.materials else ''
            ok = nome in manter and -11.0 < c.x < 11.0 and 63.7 < c.z < 70.3 and c.y > 1.3 and \
                all(-11.05 <= v.x <= 11.05 and 63.65 <= v.z <= 70.35 for v in vs)
            if not ok:
                apagar.append(f)
        bmesh.ops.delete(bm, geom=apagar, context='FACES')
        if not bm.faces:
            bm.free(); continue
        for v in bm.verts:
            w = o.matrix_world @ v.co
            v.co = mathutils.Vector((w.x, w.y + dy / 1000, w.z + dz / 1000))
        me = bpy.data.meshes.new('Dynamic Island')
        bm.to_mesh(me); bm.free()
        for m in o.data.materials:
            me.materials.append(m)
        ob = bpy.data.objects.new('Dynamic Island', me); bpy.context.scene.collection.objects.link(ob)
        for p in me.polygons:
            p.use_smooth = True
    for o in novos:
        bpy.data.objects.remove(o, do_unlink=True)
