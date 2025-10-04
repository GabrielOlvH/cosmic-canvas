import { getPlanetStyle, type PlanetStyle } from '@/lib/space-utils'
import '@/styles/space-theme.css'

interface PlanetShapeProps {
  score: number
  type: string
  title: string
  content: string
  isSelected?: boolean
  isHovered?: boolean
  onClick?: () => void
  onHover?: (hovered: boolean) => void
}

/**
 * Renders a document node as a planet
 */
export function PlanetShape({
  score,
  type,
  title,
  content,
  isSelected = false,
  isHovered = false,
  onClick,
  onHover,
}: PlanetShapeProps) {
  const planetStyle = getPlanetStyle(score, type)

  return (
    <div
      className={`planet-container ${isSelected ? 'planet-selected' : ''}`}
      style={{
        width: planetStyle.size,
        height: planetStyle.size,
        position: 'relative',
        cursor: 'pointer',
      }}
      onClick={onClick}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
    >
      {/* Planet SVG */}
      <PlanetSVG
        planetStyle={planetStyle}
        isHovered={isHovered}
        isSelected={isSelected}
      />

      {/* Planet rings for gas giants */}
      {planetStyle.hasRings && (
        <div
          className="planet-ring"
          style={{
            width: '140%',
            height: '140%',
            top: '-20%',
            left: '-20%',
            borderColor: planetStyle.secondaryColor,
            opacity: isHovered || isSelected ? 0.8 : 0.5,
          }}
        />
      )}

      {/* Text overlay - visible on hover or selection */}
      {(isHovered || isSelected) && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '12px',
            background: 'rgba(10, 14, 39, 0.95)',
            border: `1px solid ${planetStyle.color}`,
            borderRadius: '8px',
            padding: '12px 16px',
            minWidth: '200px',
            maxWidth: '300px',
            color: '#f8f9fa',
            fontSize: '14px',
            zIndex: 1000,
            boxShadow: `0 0 20px ${planetStyle.color}40`,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontWeight: 'bold',
              marginBottom: '6px',
              color: planetStyle.color,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#ccc',
              marginBottom: '6px',
            }}
          >
            Type: {type} • Score: {score.toFixed(3)}
          </div>
          <div
            style={{
              fontSize: '12px',
              lineHeight: '1.4',
              maxHeight: '80px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {content.substring(0, 150)}...
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * SVG representation of a planet
 */
function PlanetSVG({
  planetStyle,
  isHovered,
  isSelected,
}: {
  planetStyle: PlanetStyle
  isHovered: boolean
  isSelected: boolean
}) {
  const { color, secondaryColor, size, type } = planetStyle

  // Different planet types have different visual styles
  const renderPlanetSurface = () => {
    switch (type) {
      case 'gas-giant':
        return <GasGiantSurface color={color} secondaryColor={secondaryColor} />
      case 'rocky':
        return <RockyPlanetSurface color={color} secondaryColor={secondaryColor} />
      case 'dwarf':
        return <DwarfPlanetSurface color={color} secondaryColor={secondaryColor} />
    }
  }

  const glowIntensity = isSelected ? 1.5 : isHovered ? 1.2 : 0.8

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      style={{
        filter: `drop-shadow(0 0 ${10 * glowIntensity}px ${color}) drop-shadow(0 0 ${20 * glowIntensity}px ${color}40)`,
        transition: 'filter 0.3s ease',
      }}
    >
      <defs>
        {/* Gradient for planet surface */}
        <radialGradient id={`planet-gradient-${color}`}>
          <stop offset="0%" stopColor={secondaryColor} stopOpacity="1" />
          <stop offset="60%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.6" />
        </radialGradient>

        {/* Shine effect */}
        <radialGradient id={`shine-${color}`}>
          <stop offset="0%" stopColor="rgba(255, 255, 255, 0.3)" />
          <stop offset="50%" stopColor="rgba(255, 255, 255, 0.1)" />
          <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
        </radialGradient>
      </defs>

      {/* Main planet circle */}
      <circle
        cx="100"
        cy="100"
        r="90"
        fill={`url(#planet-gradient-${color})`}
      />

      {/* Planet surface details */}
      {renderPlanetSurface()}

      {/* Highlight/shine */}
      <ellipse
        cx="70"
        cy="70"
        rx="40"
        ry="50"
        fill={`url(#shine-${color})`}
        opacity="0.6"
      />
    </svg>
  )
}

/**
 * Gas giant surface with bands
 */
function GasGiantSurface({ color, secondaryColor }: { color: string; secondaryColor: string }) {
  return (
    <g opacity="0.4">
      <ellipse cx="100" cy="80" rx="85" ry="15" fill={secondaryColor} />
      <ellipse cx="100" cy="100" rx="88" ry="12" fill={color} />
      <ellipse cx="100" cy="120" rx="85" ry="18" fill={secondaryColor} />
      <ellipse cx="100" cy="145" rx="80" ry="14" fill={color} />
    </g>
  )
}

/**
 * Rocky planet surface with craters
 */
function RockyPlanetSurface({ color, secondaryColor }: { color: string; secondaryColor: string }) {
  return (
    <g opacity="0.3">
      {/* Craters */}
      <circle cx="60" cy="60" r="15" fill={secondaryColor} />
      <circle cx="140" cy="90" r="12" fill={secondaryColor} />
      <circle cx="110" cy="140" r="18" fill={secondaryColor} />
      <circle cx="70" cy="130" r="10" fill={color} />
      <circle cx="150" cy="130" r="14" fill={secondaryColor} />
    </g>
  )
}

/**
 * Dwarf planet - simple textured surface
 */
function DwarfPlanetSurface({ color, secondaryColor }: { color: string; secondaryColor: string }) {
  return (
    <g opacity="0.25">
      <circle cx="80" cy="70" r="20" fill={secondaryColor} />
      <circle cx="130" cy="110" r="25" fill={color} />
      <circle cx="90" cy="140" r="18" fill={secondaryColor} />
    </g>
  )
}
