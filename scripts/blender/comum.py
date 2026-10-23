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
