const clamp=(v:number)=>Math.min(1,Math.max(0,v))
export function insideScrollPose(progress:number){
  const p=clamp(progress)
  // Direct scroll mapping: no time-driven tween, no automatic closing on descent.
  return {progress:clamp((p-.08)/.78),lens:0,focus:0,spin:.2-p*.3}
}
