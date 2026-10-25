import { Box3, Group, Mesh, Vector3, type Object3D, type Material } from 'three'

// Keep soldered packages with their board. Covers remain independently selectable.
export function inspectionNodesFor(node: string): string[] {
  if (node === 'MainBoard') return ['MainBoard','A19Pro','RAM','NAND','PMIC','IMU','Compass','Barometer','BatteryCharger','USBController','AudioCodec','AudioAmplifiers']
  if (node === 'RFBoard') return ['RFBoard','UWB','Wireless','Modem','ESIM','RFTransceiver','RFFrontEnd']
  return [node]
}

/** Clone transforms/materials, share immutable geometry/textures with the loader cache. */
export function makeInspectionGroup(source: Object3D, names: string[], aspect: number) {
  source.updateWorldMatrix(true, true)
  const holder = new Group(), materials: Material[] = []
  for (const name of names) {
    const original = source.getObjectByName(name)
    if (!original) continue
    const clone = original.clone(true)
    if (original.parent) clone.applyMatrix4(original.parent.matrixWorld)
    clone.traverse(o => {
      if (!(o instanceof Mesh)) return
      const copy = (m: Material) => { const c=m.clone(); materials.push(c); return c }
      o.material = Array.isArray(o.material) ? o.material.map(copy) : copy(o.material)
      o.castShadow=true; o.receiveShadow=true
    })
    holder.add(clone)
  }
  if (!holder.children.length) return null
  const bounds = new Box3().setFromObject(holder), size=bounds.getSize(new Vector3())
  const center=bounds.getCenter(new Vector3())
  holder.position.sub(center)
  const group=new Group().add(holder)
  // Aspect-aware framing prevents wide PCBs being cropped on portrait screens.
  const scale=Math.min(2.65/Math.max(size.y,.000001),2.65*Math.max(.25,aspect)/Math.max(size.x,.000001),2.65/Math.max(size.z,.000001))
  group.scale.setScalar(scale)
  return {group,materials}
}
