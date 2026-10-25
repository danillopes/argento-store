import test from 'node:test'
import assert from 'node:assert/strict'
import {Box3,BoxGeometry,Group,Mesh,MeshStandardMaterial,Vector3} from 'three'
import {makeInspectionGroup,inspectionNodesFor} from '../src/lib/part-inspection.ts'

test('inspeção centraliza peças com transformações aninhadas sem alterar o modelo compartilhado',()=>{
  const source=new Group(), parent=new Group()
  parent.rotation.x=Math.PI/2;parent.position.set(.01,.02,-.04);source.add(parent)
  const mesh=new Mesh(new BoxGeometry(.06,.001,.024),new MeshStandardMaterial({color:'#222222'}))
  mesh.name='MainBoard';mesh.position.set(.02,-.004,-.03);parent.add(mesh)
  source.updateMatrixWorld(true)
  const before=mesh.matrixWorld.toArray(), material=mesh.material, geometry=mesh.geometry
  for(const aspect of [.45,1,1.8]){
    const result=makeInspectionGroup(source,inspectionNodesFor('MainBoard'),aspect)
    const box=new Box3().setFromObject(result.group),center=box.getCenter(new Vector3()),size=box.getSize(new Vector3())
    assert.ok(center.length()<1e-8,'peça fora do centro')
    assert.ok(size.x<=2.65*aspect+1e-8,'recorte horizontal em retrato')
    assert.ok(size.y<=2.65+1e-8,'recorte vertical')
    assert.deepEqual(mesh.matrixWorld.toArray(),before,'posição original modificada')
    const clone=result.group.getObjectByName('MainBoard')
    assert.equal(clone.geometry,geometry,'geometria deveria aproveitar o cache')
    assert.notEqual(clone.material,material,'material compartilhado com a montagem')
    clone.material.opacity=.1
    assert.equal(material.opacity,1,'inspeção contaminou o material original')
    result.materials.forEach(m=>m.dispose())
  }
  assert.equal(makeInspectionGroup(source,['missing'],1),null)
  assert.ok(inspectionNodesFor('MainBoard').includes('RAM'))
  assert.ok(!inspectionNodesFor('MainBoard').includes('BoardShields'),'blindagem impede inspecionar os pacotes')
  geometry.dispose();material.dispose()
})
