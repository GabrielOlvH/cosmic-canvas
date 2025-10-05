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
      {/* Nebula layer - furthest back with enhanced intensity */}
      <NebulaLayer intensity={nebulaIntensity} cloudCount={6} />

      {/* Cosmic dust particles */}
      <CosmicDust />

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
 * Cosmic dust particles that drift across the canvas
 */
function CosmicDust() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={`dust-${i}`}
          style={{
            position: 'absolute',
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            background: `rgba(${200 + Math.random() * 55}, ${200 + Math.random() * 55}, ${255}, ${0.3 + Math.random() * 0.4})`,
            borderRadius: '50%',
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `particle-drift ${20 + Math.random() * 30}s linear infinite`,
            animationDelay: `${-Math.random() * 20}s`,
            filter: 'blur(1px)',
          }}
          aria-hidden="true"
        />
      ))}
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
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={`shooting-star-${i}`}
          style={{
            position: 'absolute',
            width: '3px',
            height: '150px',
            background: 'linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 1), rgba(77, 201, 240, 0.8), rgba(255, 255, 255, 0))',
            top: `${Math.random() * 60}%`,
            left: `${Math.random() * 100}%`,
            transform: 'rotate(45deg)',
            animation: `shooting-star ${10 + Math.random() * 8}s linear infinite`,
            animationDelay: `${i * 4}s`,
            opacity: 0,
            filter: 'blur(1px)',
            boxShadow: '0 0 10px rgba(77, 201, 240, 0.8)',
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}
