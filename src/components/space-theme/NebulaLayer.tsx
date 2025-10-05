import '@/styles/space-theme.css'

interface NebulaLayerProps {
  intensity?: number // 0-1, controls opacity
  cloudCount?: number // Number of nebula clouds
}

export function NebulaLayer({ intensity = 0.15, cloudCount = 3 }: NebulaLayerProps) {
  return (
    <div className="nebula-layer" style={{ opacity: intensity }}>
      {/* Large purple nebula cloud */}
      {cloudCount >= 1 && (
        <div
          className="nebula-cloud nebula-cloud-1"
          aria-hidden="true"
        />
      )}

      {/* Blue nebula cloud */}
      {cloudCount >= 2 && (
        <div
          className="nebula-cloud nebula-cloud-2"
          aria-hidden="true"
        />
      )}

      {/* Cyan nebula cloud */}
      {cloudCount >= 3 && (
        <div
          className="nebula-cloud nebula-cloud-3"
          aria-hidden="true"
        />
      )}

      {/* Additional dynamic nebula clouds */}
      <div className="nebula-cloud nebula-cloud-4" aria-hidden="true" />
      <div className="nebula-cloud nebula-cloud-5" aria-hidden="true" />
      <div className="nebula-cloud nebula-cloud-6" aria-hidden="true" />

      {/* Additional clouds if requested */}
      {cloudCount > 3 && Array.from({ length: cloudCount - 3 }).map((_, i) => (
        <div
          key={`extra-cloud-${i}`}
          className="nebula-cloud"
          style={{
            width: `${400 + Math.random() * 400}px`,
            height: `${400 + Math.random() * 400}px`,
            background: `radial-gradient(circle, ${getRandomNebulaColor()} 0%, transparent 70%)`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animation: `nebula-drift-${(i % 3) + 1} ${35 + Math.random() * 15}s ease-in-out infinite`,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

/**
 * Get a random nebula color gradient
 */
function getRandomNebulaColor(): string {
  const colors = [
    '#9d4edd', // Purple
    '#4361ee', // Blue
    '#06ffa5', // Cyan
    '#e63946', // Red
    '#f77f00', // Orange
    '#4cc9f0', // Light blue
  ]

  const color1 = colors[Math.floor(Math.random() * colors.length)]
  const color2 = colors[Math.floor(Math.random() * colors.length)]

  return `${color1}, ${color2} 50%`
}
