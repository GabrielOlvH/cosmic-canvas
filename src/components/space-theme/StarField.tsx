import { useEffect, useRef } from 'react'
import { generateStars, getStarColor, type Star } from '@/lib/space-utils'

interface StarFieldProps {
  density?: number // Stars per 1000 square pixels
  layers?: number // Number of parallax layers (default: 3)
  speed?: number // Animation speed multiplier
  mouseParallax?: boolean // Enable mouse parallax effect
}

export function StarField({
  density = 0.5,
  layers = 3,
  speed = 1,
  mouseParallax = true,
}: StarFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const starsRef = useRef<Star[][]>([])
  const animationFrameRef = useRef<number>()
  const mouseRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight

      // Generate stars for each layer
      const totalArea = canvas.width * canvas.height
      const starsPerLayer = Math.floor((totalArea / 1000) * density)

      starsRef.current = []
      for (let i = 0; i < layers; i++) {
        starsRef.current.push(
          generateStars(starsPerLayer, canvas.width, canvas.height, i)
        )
      }
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Mouse move handler for parallax
    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseParallax) return

      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: ((e.clientX - rect.left) / canvas.width - 0.5) * 50,
        y: ((e.clientY - rect.top) / canvas.height - 0.5) * 50,
      }
    }

    if (mouseParallax) {
      window.addEventListener('mousemove', handleMouseMove)
    }

    // Animation loop
    let time = 0
    const animate = () => {
      if (!canvas || !ctx) return

      time += 0.016 * speed // ~60fps

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw each layer with parallax
      starsRef.current.forEach((layerStars, layerIndex) => {
        const parallaxFactor = (layerIndex + 1) / layers

        layerStars.forEach((star) => {
          // Calculate position with parallax
          let x = star.x + Math.sin(time * star.speed) * 2
          let y = star.y + Math.cos(time * star.speed * 0.5) * 2

          // Add mouse parallax
          if (mouseParallax) {
            x += mouseRef.current.x * parallaxFactor
            y += mouseRef.current.y * parallaxFactor
          }

          // Wrap around edges
          x = ((x % canvas.width) + canvas.width) % canvas.width
          y = ((y % canvas.height) + canvas.height) % canvas.height

          // Twinkle effect
          const twinkle = 0.5 + Math.sin(time * 2 + star.x + star.y) * 0.5
          const opacity = star.opacity * twinkle

          // Draw star
          ctx.beginPath()
          ctx.arc(x, y, star.radius, 0, Math.PI * 2)

          // Use gradient for larger stars
          if (star.radius > 1) {
            const gradient = ctx.createRadialGradient(x, y, 0, x, y, star.radius)
            gradient.addColorStop(0, `rgba(255, 255, 255, ${opacity})`)
            gradient.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.5})`)
            gradient.addColorStop(1, `rgba(255, 255, 255, 0)`)
            ctx.fillStyle = gradient
          } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`
          }

          ctx.fill()

          // Add glow for brightest stars
          if (star.opacity > 0.8 && star.radius > 1) {
            ctx.shadowBlur = 4
            ctx.shadowColor = getStarColor()
            ctx.fill()
            ctx.shadowBlur = 0
          }
        })
      })

      animationFrameRef.current = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (mouseParallax) {
        window.removeEventListener('mousemove', handleMouseMove)
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [density, layers, speed, mouseParallax])

  return (
    <canvas
      ref={canvasRef}
      className="star-field"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
