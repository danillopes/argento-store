import test from 'node:test'
import assert from 'node:assert/strict'
import {insideScrollPose} from '../src/lib/inside-scroll.ts'

test('rolagem descendente só desmonta, mantém o conjunto aberto e reverte pelo mesmo caminho',()=>{
  assert.equal(insideScrollPose(0).progress,0)
  assert.equal(insideScrollPose(1).progress,1)
  let previous=0
  const forward=[]
  for(let i=0;i<=100;i++){
    const pose=insideScrollPose(i/100)
    assert.ok(pose.progress>=previous,'remontagem indevida ao descer')
    assert.equal(pose.focus,0,'zoom automático deveria estar desativado')
    forward.push(pose);previous=pose.progress
  }
  for(let i=100;i>=0;i--)assert.deepEqual(insideScrollPose(i/100),forward[i])
  assert.equal(insideScrollPose(-1).progress,0)
  assert.equal(insideScrollPose(2).progress,1)
})
