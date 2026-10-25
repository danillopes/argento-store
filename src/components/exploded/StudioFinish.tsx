import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { HalfFloatType, WebGLRenderTarget } from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'
import type { MutableRefObject } from 'react'
import type { ExplodeState } from './state'

// Complements the existing canvas. No second renderer, scene or model instance.
function Composition({ drive }: { drive: MutableRefObject<ExplodeState> }) {
  const { gl, scene, camera, size, viewport } = useThree()
  const passes = useRef<{ composer: EffectComposer; ao: GTAOPass } | null>(null)
  useEffect(() => {
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: Math.min(4, gl.capabilities.maxSamples) })
    const composer = new EffectComposer(gl, target)
    const color = new RenderPass(scene, camera)
    const ao = new GTAOPass(scene, camera, 1, 1)
    ao.blendIntensity = .55
    ao.updateGtaoMaterial({ radius: .045, thickness: .035, distanceFallOff: .85, samples: 8, screenSpaceRadius: false })
    ao.updatePdMaterial({ radius: 3, samples: 8, rings: 2 })
    const output = new OutputPass()
    composer.addPass(color); composer.addPass(ao); composer.addPass(output)
    passes.current = { composer, ao }
    return () => {
      passes.current = null
      ao.dispose(); output.dispose(); color.dispose(); composer.dispose()
    }
  }, [gl, scene, camera])
  useEffect(() => {
    if (!passes.current) return
    const { composer, ao } = passes.current
    composer.setPixelRatio(Math.min(viewport.dpr, 1.5))
    composer.setSize(size.width, size.height)
    // AO is evaluated at half resolution and denoised, then composited at render resolution.
    ao.setSize(Math.max(1, Math.round(size.width * .5)), Math.max(1, Math.round(size.height * .5)))
  }, [size.width, size.height, viewport.dpr])
  useFrame((_, dt) => {
    if (!passes.current) { gl.render(scene, camera); return }
    // Transparent selection ghosts must not cast opaque G-buffer occlusion.
    passes.current.ao.enabled = !drive.current.selected
    passes.current.composer.render(dt)
  }, 1)
  return null
}

export default function StudioFinish({ enabled, drive }: { enabled: boolean; drive: MutableRefObject<ExplodeState> }) {
  const width = useThree(s => s.size.width)
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches
  // Development-only exercise of the desktop pass in a narrow app preview.
  // Vite removes this override from the production build.
  const qa = import.meta.env.DEV && new URLSearchParams(location.search).has('studio-qa')
  return qa || (enabled && width >= 960 && !touch) ? <Composition drive={drive} /> : null
}
