/**
 * Utility functions for space theme calculations and effects
 */

export interface Star {
  x: number
  y: number
  radius: number
  opacity: number
  speed: number
  layer: number
}

export interface PlanetStyle {
  color: string
  secondaryColor: string
  size: number
  type: 'gas-giant' | 'rocky' | 'dwarf'
  hasRings: boolean
}

/**
 * Generate random stars for a starfield
 */
export function generateStars(
  count: number,
  width: number,
  height: number,
  layer: number
): Star[] {
  const stars: Star[] = []

  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * (layer === 0 ? 0.5 : layer === 1 ? 1 : 1.5),
      opacity: 0.3 + Math.random() * 0.7,
      speed: layer === 0 ? 0.1 : layer === 1 ? 0.3 : 0.6,
      layer,
    })
  }

  return stars
}

/**
 * Calculate planet style based on document metadata
 */
export function getPlanetStyle(
  score: number,
  type: string,
  metadata?: Record<string, unknown>
): PlanetStyle {
  // Determine planet type based on score (importance/size)
  let planetType: 'gas-giant' | 'rocky' | 'dwarf'
  let size: number

  if (score > 0.8) {
    planetType = 'gas-giant'
    size = 180 + score * 120 // 180-300px
  } else if (score > 0.5) {
    planetType = 'rocky'
    size = 120 + score * 100 // 120-220px
  } else {
    planetType = 'dwarf'
    size = 80 + score * 80 // 80-160px
  }

  // Color scheme based on document type
  let color: string
  let secondaryColor: string

  switch (type.toLowerCase()) {
    case 'article':
    case 'text':
      color = '#0077b6' // Blue (Earth-like)
      secondaryColor = '#00b4d8'
      break
    case 'research':
    case 'paper':
      color = '#c1121f' // Red (Mars-like)
      secondaryColor = '#e63946'
      break
    case 'data':
    case 'dataset':
      color = '#6b2d5c' // Purple (Gas giant)
      secondaryColor = '#9d4edd'
      break
    case 'code':
      color = '#f77f00' // Orange (Jupiter-like)
      secondaryColor = '#ffd60a'
      break
    default:
      color = '#4cc9f0' // Cyan (Neptune-like)
      secondaryColor = '#06ffa5'
  }

  return {
    color,
    secondaryColor,
    size,
    type: planetType,
    hasRings: planetType === 'gas-giant' && Math.random() > 0.5,
  }
}

/**
 * Calculate orbital path between two points
 */
export function calculateOrbitPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature = 0.3
): string {
  const dx = x2 - x1
  const dy = y2 - y1
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Control point for curved path
  const cpX = (x1 + x2) / 2 + dy * curvature
  const cpY = (y1 + y2) / 2 - dx * curvature

  return `M ${x1} ${y1} Q ${cpX} ${cpY} ${x2} ${y2}`
}

/**
 * Get color for star based on temperature
 */
export function getStarColor(): string {
  const colors = [
    '#ffffff', // White (most common)
    '#ffffff',
    '#ffffff',
    '#f8f9fa', // Slightly warm
    '#caf0f8', // Blue
    '#ffdd00', // Yellow
    '#ff6b6b', // Red
  ]

  return colors[Math.floor(Math.random() * colors.length)]
}

/**
 * Linear interpolation
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor
}

/**
 * Ease in-out function
 */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
}

/**
 * Map value from one range to another
 */
export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin
}
