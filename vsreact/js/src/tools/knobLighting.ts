// The DirtyDelay knob shader — a hemispherical dome normal perturbed by
// procedural brushed-metal noise, lit with Blinn-Phong diffuse + anisotropic
// specular + Fresnel rim. Ported VERBATIM from the web original: pure math,
// no DOM dependency.
//
// Perf note (measured 2026-07-29 by vsreact/tests/KnobShaderBench.cpp): under
// QuickJS this costs ~6.7us/sample even allocation-free — ~217ms for a single
// 180x180 knob, against a ~16ms interactive budget. It is therefore run at
// BUILD time by bakeKnobStrip.ts, never per frame. See the spec's Risks section.

export type Vec3 = Readonly<{
  x: number
  y: number
  z: number
}>

export type ShadedSample = {
  red: number
  green: number
  blue: number
  alpha: number
  luminance: number
  specular: number
  material: 'cap' | 'indicator'
}

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

function normalize({ x, y, z }: Vec3): Vec3 {
  const length = Math.hypot(x, y, z) || 1
  return Object.freeze({ x: x / length, y: y / length, z: z / length })
}

export const FIXED_LIGHT = normalize({ x: -0.46, y: -0.62, z: 0.74 })

const VIEW = normalize({ x: 0, y: 0, z: 1 })
const HALF_VECTOR = normalize({
  x: FIXED_LIGHT.x + VIEW.x,
  y: FIXED_LIGHT.y + VIEW.y,
  z: FIXED_LIGHT.z + VIEW.z,
})

function rotate(x: number, y: number, radians: number) {
  const cosine = Math.cos(radians)
  const sine = Math.sin(radians)
  return {
    x: x * cosine - y * sine,
    y: x * sine + y * cosine,
  }
}

function roundedIndicatorDistance(x: number, y: number) {
  const closestY = clamp(y, -0.78, -0.25)
  return Math.hypot(x, y - closestY)
}

export function shadeKnobSample(rotationDegrees: number, x: number, y: number): ShadedSample | null {
  const radius = Math.hypot(x, y)
  if (radius > 1) return null

  const rotation = rotationDegrees * (Math.PI / 180)
  const objectPoint = rotate(x, y, -rotation)
  const indicatorDistance = roundedIndicatorDistance(objectPoint.x, objectPoint.y)
  const material: ShadedSample['material'] = indicatorDistance < 0.062 ? 'indicator' : 'cap'

  const domeX = x * 0.36
  const domeY = y * 0.36
  const domeZ = Math.sqrt(Math.max(0.001, 1 - domeX * domeX - domeY * domeY))

  const objectAngle = Math.atan2(objectPoint.y, objectPoint.x)
  const brushedAxis = objectPoint.x * 0.82 + objectPoint.y * 0.37
  const crossAxis = -objectPoint.x * 0.37 + objectPoint.y * 0.82
  const brush = Math.sin(brushedAxis * 126 + Math.sin(crossAxis * 19) * 1.8) * 0.052
  const scratch = Math.sin((objectPoint.x * 0.19 - objectPoint.y) * 233) * 0.018
  const flute = Math.sin(objectAngle * 17 + radius * 13) * 0.035
  const tangent = { x: -Math.sin(objectAngle), y: Math.cos(objectAngle) }

  let objectNormalX = brush * 0.82 + scratch * 0.22 + tangent.x * flute
  let objectNormalY = brush * 0.37 - scratch + tangent.y * flute

  if (material === 'indicator') {
    const ridge = clamp(objectPoint.x / 0.062, -1, 1)
    const endBevel = objectPoint.y < -0.78 ? -(objectPoint.y + 0.78) / 0.062 : 0
    objectNormalX += ridge * 0.42
    objectNormalY += endBevel * 0.24 - 0.08
  }

  const worldPerturbation = rotate(objectNormalX, objectNormalY, rotation)
  const smoothNormal = normalize({ x: domeX, y: domeY, z: domeZ })
  const normal = normalize({
    x: domeX + worldPerturbation.x,
    y: domeY + worldPerturbation.y,
    z: domeZ,
  })

  const diffuse = clamp(
    normal.x * FIXED_LIGHT.x + normal.y * FIXED_LIGHT.y + normal.z * FIXED_LIGHT.z,
  )
  const halfDot = clamp(
    normal.x * HALF_VECTOR.x + normal.y * HALF_VECTOR.y + normal.z * HALF_VECTOR.z,
  )
  const smoothHalfDot = clamp(
    smoothNormal.x * HALF_VECTOR.x + smoothNormal.y * HALF_VECTOR.y + smoothNormal.z * HALF_VECTOR.z,
  )
  const edgeOcclusion = clamp((1 - radius) / 0.18)
  const anisotropy = 0.48 + 0.52 * Math.abs(Math.cos(objectAngle * 2.1 + brushedAxis * 9))
  const indicatorSpecular = Math.pow(halfDot, 52) * 1.45 * anisotropy
  const broadAnisotropy = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.cos(objectAngle * 2 + 0.4), 2)
  const capSpecular = Math.pow(smoothHalfDot, 14) * 0.24 * broadAnisotropy
  const specular = material === 'indicator' ? indicatorSpecular : capSpecular
  const fresnel = Math.pow(1 - clamp(normal.z), 3) * 0.52
  const ambient = 0.045 + edgeOcclusion * 0.065
  const machineGrain = Math.sin(brushedAxis * 214 + Math.sin(crossAxis * 31)) * 0.018
  const illumination = ambient + diffuse * 0.42 + specular + fresnel

  const base = material === 'indicator'
    ? { red: 166, green: 139, blue: 91 }
    : { red: 22, green: 23, blue: 21 }
  const metalHighlight = material === 'indicator'
    ? { red: 255, green: 232, blue: 181 }
    : { red: 202, green: 188, blue: 154 }

  const red = clamp(base.red * (0.54 + illumination + machineGrain) + metalHighlight.red * specular, 0, 255)
  const green = clamp(base.green * (0.54 + illumination + machineGrain) + metalHighlight.green * specular, 0, 255)
  const blue = clamp(base.blue * (0.54 + illumination + machineGrain) + metalHighlight.blue * specular, 0, 255)
  const alpha = clamp((1 - radius) / 0.018)

  return {
    red,
    green,
    blue,
    alpha,
    luminance: (red * 0.2126 + green * 0.7152 + blue * 0.0722) / 255,
    specular,
    material,
  }
}
