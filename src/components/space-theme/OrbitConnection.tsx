import { useEffect, useRef } from 'react'
import { calculateOrbitPath } from '@/lib/space-utils'
import '@/styles/space-theme.css'

interface OrbitConnectionProps {
  x1: number
  y1: number
  x2: number
  y2: number
  weight: number // Connection strength (0-1)
  color?: string
  animated?: boolean
}

/**
 * Renders an orbital connection between two planets
 */
export function OrbitConnection({
  x1,
  y1,
  x2,
  y2,
  weight,
  color = '#4cc9f0',
  animated = true,
}: OrbitConnectionProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  // Calculate bounding box for SVG
  const minX = Math.min(x1, x2) - 50
  const minY = Math.min(y1, y2) - 50
  const width = Math.abs(x2 - x1) + 100
  const height = Math.abs(y2 - y1) + 100

  // Adjust coordinates relative to SVG viewport
  const relX1 = x1 - minX
  const relY1 = y1 - minY
  const relX2 = x2 - minX
  const relY2 = y2 - minY

  // Calculate curved path
  const pathData = calculateOrbitPath(relX1, relY1, relX2, relY2, 0.3)

  // Opacity based on weight
  const opacity = 0.3 + weight * 0.5

  // Stroke width based on weight
  const strokeWidth = 1 + weight * 3

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        left: minX,
        top: minY,
        width,
        height,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      <defs>
        {/* Gradient for orbital path */}
        <linearGradient id={`orbit-gradient-${x1}-${y1}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity={opacity * 0.5} />
          <stop offset="50%" stopColor={color} stopOpacity={opacity} />
          <stop offset="100%" stopColor={color} stopOpacity={opacity * 0.5} />
        </linearGradient>

        {/* Glow filter */}
        <filter id={`glow-${x1}-${y1}`}>
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main orbital path */}
      <path
        d={pathData}
        fill="none"
        stroke={`url(#orbit-gradient-${x1}-${y1})`}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="8, 4"
        className={animated ? 'orbit-path' : ''}
        filter={`url(#glow-${x1}-${y1})`}
      />

      {/* Animated particles flowing along the path */}
      {animated && <OrbitParticles pathData={pathData} color={color} />}
    </svg>
  )
}

/**
 * Animated particles that flow along the orbital path
 */
function OrbitParticles({ pathData, color }: { pathData: string; color: string }) {
  const particleCount = 3

  return (
    <>
      {Array.from({ length: particleCount }).map((_, i) => (
        <circle
          key={`particle-${i}`}
          r="2"
          fill={color}
          opacity="0.8"
        >
          <animateMotion
            dur={`${4 + i * 1.5}s`}
            repeatCount="indefinite"
            path={pathData}
          />
          <animate
            attributeName="opacity"
            values="0;0.8;0"
            dur={`${4 + i * 1.5}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}
    </>
  )
}

/**
 * Alternative: Data stream connection with flowing particles
 */
export function DataStreamConnection({
  x1,
  y1,
  x2,
  y2,
  weight,
  color = '#ffd60a',
}: OrbitConnectionProps) {
  const minX = Math.min(x1, x2) - 20
  const minY = Math.min(y1, y2) - 20
  const width = Math.abs(x2 - x1) + 40
  const height = Math.abs(y2 - y1) + 40

  const relX1 = x1 - minX
  const relY1 = y1 - minY
  const relX2 = x2 - minX
  const relY2 = y2 - minY

  const opacity = 0.4 + weight * 0.4

  return (
    <svg
      style={{
        position: 'absolute',
        left: minX,
        top: minY,
        width,
        height,
        pointerEvents: 'none',
      }}
    >
      {/* Straight data stream line */}
      <line
        x1={relX1}
        y1={relY1}
        x2={relX2}
        y2={relY2}
        stroke={color}
        strokeWidth={2}
        opacity={opacity}
        strokeDasharray="4, 4"
      />

      {/* Fast-moving data packets */}
      <circle r="3" fill={color}>
        <animateMotion
          dur="2s"
          repeatCount="indefinite"
          path={`M ${relX1} ${relY1} L ${relX2} ${relY2}`}
        />
      </circle>
    </svg>
  )
}
