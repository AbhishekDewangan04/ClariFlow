/** True only when WebGL is available and the user hasn't asked to save data. */
export function canRender3D() {
  if (typeof window === 'undefined') return false
  try {
    if (navigator.connection?.saveData) return false
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    const ok = Boolean(gl)
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return ok
  } catch {
    return false
  }
}
