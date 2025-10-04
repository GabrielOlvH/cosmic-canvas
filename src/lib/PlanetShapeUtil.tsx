import {
  BaseBoxShapeUtil,
  TLBaseShape,
  RecordProps,
  T,
  Rectangle2d,
} from 'tldraw'

// Define the planet shape type
export type PlanetShape = TLBaseShape<
  'planet',
  {
    w: number
    h: number
    color: string
    planetType: 'gas-giant' | 'rocky' | 'dwarf'
    label: string
  }
>

// Define props validation
export const planetShapeProps: RecordProps<PlanetShape> = {
  w: T.number,
  h: T.number,
  color: T.string,
  planetType: T.literalEnum('gas-giant', 'rocky', 'dwarf'),
  label: T.string,
}

export class PlanetShapeUtil extends BaseBoxShapeUtil<PlanetShape> {
  static override type = 'planet' as const

  static override props = planetShapeProps

  override getDefaultProps(): PlanetShape['props'] {
    return {
      w: 200,
      h: 200,
      color: '#4cc9f0',
      planetType: 'gas-giant',
      label: 'Planet',
    }
  }

  override getGeometry(shape: PlanetShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    })
  }

  override component(shape: PlanetShape) {
    const { w, h, color, planetType, label } = shape.props

    return (
      <div style={{ width: w, height: h, position: 'relative' }}>
        <svg
          width={w}
          height={h}
          viewBox="0 0 200 200"
          style={{
            filter: `drop-shadow(0 0 30px ${color}) drop-shadow(0 0 60px ${color}) drop-shadow(0 0 90px ${color}80)`,
          }}
        >
          <defs>
            {/* Enhanced main gradient with more pronounced 3D effect */}
            <radialGradient id={`planet-grad-${shape.id}`} cx="35%" cy="35%">
              <stop offset="0%" stopColor={this.getLighterColor(color, 80)} />
              <stop offset="40%" stopColor={this.getLighterColor(color, 40)} />
              <stop offset="70%" stopColor={color} />
              <stop offset="100%" stopColor={this.getDarkerColor(color, 60)} />
            </radialGradient>

            {/* Stronger shine gradient */}
            <radialGradient id={`shine-${shape.id}`} cx="30%" cy="30%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.6)" />
              <stop offset="40%" stopColor="rgba(255, 255, 255, 0.3)" />
              <stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
            </radialGradient>
          </defs>

          {/* Main planet circle with gradient and colored border */}
          <circle
            cx="100"
            cy="100"
            r="85"
            fill={`url(#planet-grad-${shape.id})`}
            stroke={color}
            strokeWidth="5"
          />

          {/* Surface details based on type */}
          {this.renderSurface(planetType, shape.id, color)}

          {/* Enhanced highlight shine */}
          <ellipse
            cx="65"
            cy="55"
            rx="40"
            ry="50"
            fill={`url(#shine-${shape.id})`}
          />
        </svg>

        {/* External label */}
        <div
          style={{
            position: 'absolute',
            bottom: -35,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 'bold',
            textAlign: 'center',
            textShadow: `0 0 10px ${color}, 0 0 20px ${color}`,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
          }}
        >
          ⭐ {label}
        </div>
      </div>
    )
  }

  override indicator(shape: PlanetShape) {
    return <rect width={shape.props.w} height={shape.props.h} />
  }

  private renderSurface(type: string, shapeId: string, color: string) {
    const lighterColor = this.getLighterColor(color, 50)
    const darkerColor = this.getDarkerColor(color, 30)

    switch (type) {
      case 'gas-giant':
        return (
          <g opacity="0.65">
            {/* Cloud/storm bands with more detail */}
            <ellipse cx="100" cy="70" rx="78" ry="14" fill={lighterColor} opacity="0.8" />
            <ellipse cx="100" cy="88" rx="80" ry="11" fill={darkerColor} opacity="0.6" />
            <ellipse cx="100" cy="105" rx="82" ry="16" fill={lighterColor} opacity="0.7" />
            <ellipse cx="100" cy="125" rx="78" ry="13" fill={darkerColor} opacity="0.5" />
            <ellipse cx="100" cy="145" rx="72" ry="14" fill={lighterColor} opacity="0.6" />
            {/* Storm spots */}
            <ellipse cx="120" cy="90" rx="12" ry="18" fill={lighterColor} opacity="0.4" />
            <ellipse cx="75" cy="120" rx="10" ry="15" fill={darkerColor} opacity="0.5" />
          </g>
        )
      case 'rocky':
        return (
          <g opacity="0.55">
            {/* Craters with more definition */}
            <circle cx="65" cy="65" r="20" fill={darkerColor} />
            <circle cx="135" cy="85" r="17" fill={lighterColor} />
            <circle cx="110" cy="135" r="22" fill={darkerColor} />
            <circle cx="75" cy="125" r="14" fill={lighterColor} />
            <circle cx="145" cy="125" r="18" fill={darkerColor} />
            <circle cx="55" cy="110" r="12" fill={lighterColor} opacity="0.6" />
          </g>
        )
      case 'dwarf':
        return (
          <g opacity="0.5">
            {/* Surface features */}
            <circle cx="85" cy="75" r="24" fill={darkerColor} />
            <circle cx="125" cy="110" r="30" fill={lighterColor} />
            <circle cx="90" cy="135" r="22" fill={darkerColor} />
            <circle cx="130" cy="70" r="16" fill={lighterColor} opacity="0.5" />
          </g>
        )
      default:
        return null
    }
  }

  private getLighterColor(hex: string, amount: number = 40): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.min(255, r + amount)}, ${Math.min(255, g + amount)}, ${Math.min(255, b + amount)})`
  }

  private getDarkerColor(hex: string, amount: number = 40): string {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    return `rgb(${Math.max(0, r - amount)}, ${Math.max(0, g - amount)}, ${Math.max(0, b - amount)})`
  }
}
