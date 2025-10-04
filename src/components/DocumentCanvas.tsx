import { Tldraw, Editor, TLComponents, createShapeId } from 'tldraw'
import 'tldraw/tldraw.css'
import { useEffect, useState, useRef } from 'react'
import { SpaceBackground } from './space-theme/SpaceBackground'
import { getPlanetStyle } from '@/lib/space-utils'
import { PlanetShapeUtil } from '@/lib/PlanetShapeUtil'
import '@/styles/space-theme.css'

interface CanvasNode {
  id: string
  content: string
  metadata: {
    source: string
    title: string
    type: string
  }
  score: number // L2 distance (lower = more similar)
  similarity?: number // Converted similarity score (0-1, higher = more similar)
}

interface CanvasEdge {
  source: string
  target: string
  weight: number
}

interface DocumentCanvasProps {
  nodes: CanvasNode[]
  edges: CanvasEdge[]
}

export function DocumentCanvas({ nodes, edges }: DocumentCanvasProps) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const hasZoomedToFit = useRef(false)

  // Custom components for tldraw
  const components: TLComponents = {
    Background: SpaceBackground,
  }

  // Custom shape utilities
  const shapeUtils = [PlanetShapeUtil]

  useEffect(() => {
    if (!editor || nodes.length === 0) return

    // Clear existing shapes
    editor.selectAll()
    editor.deleteShapes(editor.getSelectedShapeIds())

    // Create document nodes with radial layout
    // First node (most relevant) is central and larger
    const shapeIds: Record<string, string> = {}
    const centerX = 0
    const centerY = 0
    const radius = 600 // Distance from center for satellite planets

    // Build array of shapes to create with explicit IDs
    const shapesToCreate = nodes.map((node, index) => {
      const similarity = node.similarity ?? Math.max(0, 1 - node.score / 2)

      let x, y, size

      if (index === 0) {
        // Central planet - largest and most prominent
        x = centerX
        y = centerY
        size = 450 // Much larger central planet
      } else {
        // Satellite planets arranged in a circle with more uniform sizing
        const angle = ((index - 1) / (nodes.length - 1)) * Math.PI * 2
        x = centerX + Math.cos(angle) * radius
        y = centerY + Math.sin(angle) * radius
        size = 170 + similarity * 20 // More uniform size (170-190)
      }

      // Generate shape ID
      const shapeId = createShapeId()
      shapeIds[node.id] = shapeId

      const planetType = index === 0 ? 'gas-giant' : (similarity > 0.7 ? 'gas-giant' : similarity > 0.5 ? 'rocky' : 'dwarf')

      return {
        id: shapeId,
        type: 'planet' as const,
        x: x - size / 2, // Center the circle
        y: y - size / 2,
        props: {
          w: size,
          h: size,
          color: getPlanetColor(node.metadata.type || 'document'),
          planetType,
          label: node.metadata.title,
        },
      }
    })

    // Create all shapes at once
    editor.createShapes(shapesToCreate)

    // TODO: Add text labels once we solve the richText cloning issue
    // For now, planets are clickable and show their metadata in tldraw's inspector

    // Get central shape for later use
    const centralId = shapeIds[nodes[0].id]
    const centralShape = editor.getShape(centralId)

    // Create complex network of connections showing research relationships
    const createConnection = (sourceIdx: number, targetIdx: number, connectionType: 'primary' | 'secondary' | 'weak') => {
      if (!nodes[sourceIdx] || !nodes[targetIdx]) return

      const sourceShape = editor.getShape(shapeIds[nodes[sourceIdx].id])
      const targetShape = editor.getShape(shapeIds[nodes[targetIdx].id])

      if (!sourceShape || !targetShape) return

      const sourceX = sourceShape.x + (sourceShape.props as any).w / 2
      const sourceY = sourceShape.y + (sourceShape.props as any).h / 2
      const targetX = targetShape.x + (targetShape.props as any).w / 2
      const targetY = targetShape.y + (targetShape.props as any).h / 2

      const dx = targetX - sourceX
      const dy = targetY - sourceY

      const styles = {
        primary: { color: 'white', size: 'm' as const, dash: 'solid' as const },
        secondary: { color: 'light-blue', size: 's' as const, dash: 'solid' as const },
        weak: { color: 'grey', size: 's' as const, dash: 'dotted' as const },
      }

      const style = styles[connectionType]

      editor.createShape({
        type: 'line',
        x: sourceX,
        y: sourceY,
        props: {
          points: {
            a1: { id: 'a1', index: 'a1', x: 0, y: 0 },
            a2: {
              id: 'a2',
              index: 'a2',
              x: dx * 0.5 - dy * 0.1,
              y: dy * 0.5 + dx * 0.1,
            },
            a3: { id: 'a3', index: 'a3', x: dx, y: dy },
          },
          spline: 'cubic',
          color: style.color,
          size: style.size,
          dash: style.dash,
        },
      })
    }

    // Primary connections (strong relationships)
    createConnection(0, 1, 'primary') // Central -> ML
    createConnection(0, 2, 'primary') // Central -> DL
    createConnection(1, 2, 'primary') // ML -> DL
    createConnection(2, 3, 'primary') // DL -> NLP

    // Secondary connections (related work)
    createConnection(1, 4, 'secondary') // ML -> Data
    createConnection(1, 5, 'secondary') // ML -> Python
    createConnection(2, 6, 'secondary') // DL -> Vision
    createConnection(1, 7, 'secondary') // ML -> RL
    createConnection(2, 8, 'secondary') // DL -> Architectures

    // Weak connections (tangential relationships)
    createConnection(3, 5, 'weak') // NLP -> Python
    createConnection(4, 5, 'weak') // Data -> Python
    createConnection(6, 8, 'weak') // Vision -> Architectures
    createConnection(7, 8, 'weak') // RL -> Architectures
    createConnection(0, 9, 'weak') // Central -> Ethics

    // Cross-cluster connections
    if (nodes.length >= 10) {
      createConnection(3, 6, 'secondary') // NLP -> Vision
      createConnection(4, 7, 'weak') // Data -> RL
    }

    // Smart layout for research presentation elements
    // Only add if there are enough nodes
    if (nodes.length >= 5) {

      // Get all planet shapes for positioning reference
      const allPlanetShapes = nodes.map((n, i) => ({
        shape: editor.getShape(shapeIds[n.id]),
        index: i,
        node: n
      })).filter(x => x.shape)

      // Calculate bounds of all planets
      const allX = allPlanetShapes.map(p => p.shape!.x)
      const allY = allPlanetShapes.map(p => p.shape!.y)
      const allW = allPlanetShapes.map(p => (p.shape!.props as any).w)
      const allH = allPlanetShapes.map(p => (p.shape!.props as any).h)
      const minX = Math.min(...allX)
      const maxX = Math.max(...allX.map((x, i) => x + allW[i]))
      const minY = Math.min(...allY)
      const maxY = Math.max(...allY.map((y, i) => y + allH[i]))

      // Subtle highlight on central planet only
      if (centralShape) {
        const size = (centralShape.props as any).w
        editor.createShape({
          type: 'geo',
          x: centralShape.x - 25,
          y: centralShape.y - 25,
          props: {
            w: size + 50,
            h: size + 50,
            geo: 'ellipse',
            color: 'yellow',
            fill: 'none',
            dash: 'dotted',
            size: 's',
          },
        })
      }

      // Smart callout positions with sticky notes
      const calloutOffset = 300

      // Annotation boxes positioned around the cluster
      const topCalloutY = minY - calloutOffset
      editor.createShape({
        type: 'geo',
        x: centerX - 180,
        y: topCalloutY,
        props: {
          w: 360,
          h: 180,
          geo: 'rectangle',
          color: 'violet',
          fill: 'semi',
          dash: 'draw',
          size: 's',
        },
      })

      const rightCalloutX = maxX + 100
      editor.createShape({
        type: 'geo',
        x: rightCalloutX,
        y: centerY - 120,
        props: {
          w: 320,
          h: 220,
          geo: 'rectangle',
          color: 'light-green',
          fill: 'semi',
          dash: 'draw',
          size: 's',
        },
      })

      editor.createShape({
        type: 'geo',
        x: minX - 120,
        y: maxY + 80,
        props: {
          w: 380,
          h: 240,
          geo: 'rectangle',
          color: 'light-blue',
          fill: 'solid',
          dash: 'draw',
          size: 's',
        },
      })

      // Citation count badge
      if (nodes[2]) {
        const dlShape = editor.getShape(shapeIds[nodes[2].id])
        if (dlShape) {
          editor.createShape({
            type: 'geo',
            x: dlShape.x + 200,
            y: dlShape.y - 80,
            props: {
              w: 180,
              h: 100,
              geo: 'ellipse',
              color: 'orange',
              fill: 'semi',
              dash: 'dashed',
              size: 's',
            },
          })
        }
      }

      // Implementation note
      if (nodes[5]) {
        const pyShape = editor.getShape(shapeIds[nodes[5].id])
        if (pyShape) {
          editor.createShape({
            type: 'geo',
            x: pyShape.x - 280,
            y: pyShape.y + 50,
            props: {
              w: 240,
              h: 120,
              geo: 'rectangle',
              color: 'red',
              fill: 'semi',
              dash: 'draw',
              size: 's',
            },
          })
        }
      }
    }

    // Only zoom to fit on initial load, not every time nodes change
    if (!hasZoomedToFit.current) {
      editor.zoomToFit({ animation: { duration: 400 } })
      hasZoomedToFit.current = true
    }
  }, [editor, nodes])

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Tldraw
        onMount={setEditor}
        components={components}
        shapeUtils={shapeUtils}
      />
    </div>
  )
}

/**
 * Map document type to vibrant hex colors matching reference image
 */
function getPlanetColor(type: string): string {
  const colorMap: Record<string, string> = {
    article: '#2563eb',    // Rich blue (like reference central planet)
    text: '#2563eb',       // Rich blue
    research: '#a855f7',   // Vibrant purple (like reference purple planet)
    paper: '#d32f2f',      // Deep red/crimson (like reference red planet)
    data: '#eab308',       // Bright yellow/gold (like reference yellow planet)
    dataset: '#eab308',    // Bright yellow/gold
    code: '#f97316',       // Vibrant orange (like reference orange planet)
    default: '#10b981',    // Emerald green (like reference green planet)
  }

  return colorMap[type.toLowerCase()] || colorMap.default
}
