import { StarField } from './StarField'
import { NebulaLayer } from './NebulaLayer'
import '@/styles/space-theme.css'

interface SpaceBackgroundProps {
  starDensity?: number
  nebulaIntensity?: number
  enableMouseParallax?: boolean
  className?: string
}

/**
 * Space-themed background component for tldraw canvas
 * Replaces the default tldraw background with animated stars and nebula
 */
export function SpaceBackground({
  starDensity = 0.5,
  nebulaIntensity = 0.15,
  enableMouseParallax = true,
  className = '',
}: SpaceBackgroundProps) {
  return (
    <div className={`space-background ${className}`}>
      {/* Nebula layer - furthest back */}
      <NebulaLayer intensity={nebulaIntensity} cloudCount={3} />

      {/* Star field layers with parallax */}
      <StarField
        density={starDensity}
        layers={3}
        speed={1}
        mouseParallax={enableMouseParallax}
      />

      {/* Optional: Add shooting stars */}
      <ShootingStars />
    </div>
  )
}

/**
 * Shooting stars effect - occasional meteors
 */
function ShootingStars() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={`shooting-star-${i}`}
          style={{
            position: 'absolute',
            width: '2px',
            height: '100px',
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0))',
            top: `${Math.random() * 50}%`,
            left: `${Math.random() * 100}%`,
            transform: 'rotate(45deg)',
            animation: `shooting-star ${15 + Math.random() * 10}s linear infinite`,
            animationDelay: `${i * 5}s`,
            opacity: 0,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
