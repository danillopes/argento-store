import bpy, sys, os
a = sys.argv[sys.argv.index('--')+1:]
src, out, wallpaper = a[0], a[1], a[2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
tmp = os.path.join(os.path.dirname(out), 'tex_' + os.path.basename(out).split('.')[0]); os.makedirs(tmp, exist_ok=True)

def upstream_image(sock, depth=0):
    if depth > 6 or not sock.is_linked: return None
    n = sock.links[0].from_node
    if n.type == 'TEX_IMAGE': return n.image
    for i in n.inputs:
        img = upstream_image(i, depth + 1)
        if img: return img
    return None

def value(sock, fallback, depth=0):
    """valor efetivo: direto, ou o fator constante dentro da cadeia Mix/Math que o importador glTF cria"""
    if not sock.is_linked: return sock.default_value
    if depth > 6: return fallback
    n = sock.links[0].from_node
    if n.type == 'TEX_IMAGE': return fallback
    for i in n.inputs:
        if i.type in ('RGBA', 'VALUE') and i.type == sock.type and not i.is_linked and i.name not in ('Fac', 'Factor'):
            return i.default_value
    for i in n.inputs:
        if i.is_linked:
            v = value(i, None, depth + 1)
            if v is not None: return v
    return fallback

def salvar(img, nome):
    path = os.path.join(tmp, nome + '.jpg')
    img.filepath_raw = path; img.file_format = 'JPEG'; img.save()
    return bpy.data.images.load(path, check_existing=False)

wp = bpy.data.images.load(wallpaper)
TX = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'texturas')
ACABAMENTO = {'Anodized aluminum': ('aco-rugosidade.png', None, 0), 'Frosted glass': (None, 'vidro-fosco-normal.png', 0.35)}
for m in bpy.data.materials:
    if not m.node_tree: continue
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b: continue
    cor = tuple(value(b.inputs['Base Color'], (0.8, 0.8, 0.8, 1)))
    img = upstream_image(b.inputs['Base Color'])
    met = value(b.inputs['Metallic'], 0.0); rug = value(b.inputs['Roughness'], 0.5)
    alfa = value(b.inputs['Alpha'], 1.0)
    nt = m.node_tree; nt.nodes.clear()
    outn = nt.nodes.new('ShaderNodeOutputMaterial'); p = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(p.outputs['BSDF'], outn.inputs['Surface'])
    p.inputs['Metallic'].default_value = met; p.inputs['Roughness'].default_value = rug; p.inputs['Alpha'].default_value = alfa
    if m.name == 'Glass':
        # vidro de safira/cobertura: transparente e liso (deixa ver flash, LiDAR e o interior das lentes)
        p.inputs['Base Color'].default_value = (0.02, 0.02, 0.025, 1); p.inputs['Roughness'].default_value = 0.02
        p.inputs['Metallic'].default_value = 0.0; p.inputs['Alpha'].default_value = 0.12
        try: m.surface_render_method = 'BLENDED'
        except Exception: pass
        continue
    if m.name == 'OLED':
        # tela acesa: papel de parede como emissão (o iPhone mostra a tela "ligada")
        p.inputs['Base Color'].default_value = (0, 0, 0, 1); p.inputs['Roughness'].default_value = 0.08
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = wp
        nt.links.new(t.outputs['Color'], p.inputs['Emission Color']); p.inputs['Emission Strength'].default_value = 1.0
        continue
    if img and (img.has_data or img.packed_file):
        _ = img.pixels[0] if len(img.pixels) else None  # carrega a imagem embutida no GLB
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = salvar(img, ''.join(c for c in m.name if c.isalnum()))
        nt.links.new(t.outputs['Color'], p.inputs['Base Color'])
    else:
        p.inputs['Base Color'].default_value = cor
    # acabamento real (mapas originais em alta resolução): aço inoxidável e vidro traseiro fosco
    mapas = ACABAMENTO.get(m.name)
    if mapas:
        rmap, nmap, forca = mapas
        if rmap:
            t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(f'{TX}/{rmap}'); t.image.colorspace_settings.name = 'Non-Color'
            nt.links.new(t.outputs['Color'], p.inputs['Roughness'])
        if not nmap: continue
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(f'{TX}/{nmap}'); t.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = forca
        nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], p.inputs['Normal'])
# vista de frente a direita da tela é -X: inverte U da tela para a imagem não ficar espelhada
for o in [o for o in bpy.context.scene.objects if o.type == 'MESH']:
    me = o.data
    idx = {i for i, m in enumerate(me.materials) if m and m.name == 'OLED'}
    if not idx or not me.uv_layers: continue
    uv = me.uv_layers.active.data
    for poly in me.polygons:
        if poly.material_index in idx:
            for li in poly.loop_indices:
                uv[li].uv.x = 1 - uv[li].uv.x
# exporta .usdc + texturas, ajusta a opacidade dos vidros com a biblioteca USD e empacota o .usdz para o iPhone (ARKit)
import shutil, tempfile
pasta = tempfile.mkdtemp(prefix='usdz_')
usdc = os.path.join(pasta, os.path.splitext(os.path.basename(out))[0] + '.usdc')
bpy.ops.wm.usd_export(filepath=usdc, export_materials=True, generate_preview_surface=True, export_textures_mode='NEW', overwrite_textures=True,
                      export_animation=False, selected_objects_only=False, convert_orientation=True,
                      export_global_forward_selection='NEGATIVE_Z', export_global_up_selection='Y', convert_scene_units='METERS')
from pxr import Usd, UsdShade, Sdf, UsdUtils
st = Usd.Stage.Open(usdc)
for prim in st.Traverse():
    if prim.GetTypeName() == 'Shader' and UsdShade.Shader(prim).GetIdAttr().Get() == 'UsdPreviewSurface' and prim.GetParent().GetName() == 'Glass':
        sh = UsdShade.Shader(prim)
        (sh.GetInput('opacity') or sh.CreateInput('opacity', Sdf.ValueTypeNames.Float)).Set(0.12)
        (sh.GetInput('roughness') or sh.CreateInput('roughness', Sdf.ValueTypeNames.Float)).Set(0.02)
st.GetRootLayer().Save()
if os.path.exists(out): os.remove(out)
ok = UsdUtils.CreateNewARKitUsdzPackage(Sdf.AssetPath(usdc), out)
shutil.rmtree(pasta, ignore_errors=True)
print('ok', out, os.path.getsize(out), ok)
