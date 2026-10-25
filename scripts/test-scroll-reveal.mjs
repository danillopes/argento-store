import test from 'node:test'
import assert from 'node:assert/strict'
import { modelScrollReveal } from '../src/lib/scroll-reveal.ts'
test('modelo surge e desaparece gradualmente nos dois limites, com reversao pelo mesmo percurso',()=>{
 const pose=(y)=>modelScrollReveal(y,1000,4000,800,800)
 assert.equal(pose(200).opacity,0)
 assert.equal(pose(1200).opacity,1)
 assert.equal(pose(4000).opacity,1)
 assert.equal(pose(4800).opacity,0)
 assert.ok(pose(600).opacity>0 && pose(600).opacity<1)
 assert.ok(pose(4600).opacity>0 && pose(4600).opacity<1)
 const forward=Array.from({length:49},(_,i)=>pose(i*100))
 for(let i=48;i>=0;i--)assert.deepEqual(pose(i*100),forward[i])
 assert.ok(pose(600).y>0)
 assert.ok(pose(4600).y<0)
})
