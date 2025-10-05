import { useEditor, toRichText } from 'tldraw'
import { useEffect } from 'react'
import type { TLShapeId } from 'tldraw'
// Radial orbital layout (new)
import type { LayoutNode } from '../lib/force-directed-layout' // Reuse LayoutNode structure for downstream shape code
import { computeRadialOrbitalLayout } from '../lib/radial-orbital-layout'

/**
 * Hierarchical mind map data structure
 * Represents a node in the mind map tree with its text, level, and children
 */
export interface MindMapNode {
  id: string
  text: string
  level: number // 0 = central topic, 1 = main themes, 2+ = sub-topics
  children: MindMapNode[]
  metadata?: {
    type?: string
    description?: string
    documentCount?: number
    source?: string
    importance?: number
    evidence?: string
    findingCount?: number
    authors?: string
    doi?: string
    year?: number
    url?: string
  }
}

interface MindMapGeneratorProps {
  data: MindMapNode
}

/**
 * Color palette for theme nodes
 * Using light, desaturated colors for visual hierarchy
 */
const THEME_COLORS = [
  'light-green',
  'light-blue', 
  'light-red',
  'light-violet',
  'orange',
  'yellow',
] as const

/**
 * MindMapGenerator Component
 * 
 * Programmatically generates a visually appealing mind map on a tldraw canvas.
 * Uses a radial tree layout algorithm to position nodes in a hierarchical structure.
 * 
 * Design hierarchy:
 * - Level 0 (Center): Large blue ellipse with serif font
 * - Level 1 (Themes): Rounded rectangles with distinct colors
 * - Level 2+ (Findings): Text-only nodes in dark gray
 * 
 * All connections use curved arrows with proper bindings for drag-and-drop support.
 */
export const MindMapGenerator: React.FC<MindMapGeneratorProps> = ({ data }) => {
  const editor = useEditor()

  // Handle clicks on study nodes to open article links
  useEffect(() => {
    if (!editor) return

    const handleShapeClick = () => {
      const selectedShapes = editor.getSelectedShapes()
      if (selectedShapes.length !== 1) return

      const shape = selectedShapes[0]
      const shapeId = shape.id

      // Find the corresponding node in the data tree
      const findNodeById = (node: MindMapNode, targetId: string): MindMapNode | null => {
        const shapeIdForNode = `shape:${node.id}`
        if (shapeIdForNode === shapeId) return node
        
        for (const child of node.children) {
          const found = findNodeById(child, targetId)
          if (found) return found
        }
        return null
      }

      const clickedNode = findNodeById(data, shapeId)
      
      // If it's a study node (level 2) with a URL, open it
      if (clickedNode && clickedNode.level === 2 && clickedNode.metadata?.url) {
        window.open(clickedNode.metadata.url, '_blank', 'noopener,noreferrer')
        console.log('🔗 Opening article:', clickedNode.text, clickedNode.metadata.url)
      }
    }

    // Listen to pointer up events (click)
    const handlePointerUp = () => {
      setTimeout(handleShapeClick, 50) // Small delay to ensure selection is updated
    }

    editor.on('event', (event) => {
      if (event.type === 'pointer' && event.name === 'pointer_up') {
        handlePointerUp()
      }
    })

  }, [editor, data])

  useEffect(() => {
    if (!editor || !data) return

    console.log('🎨 MindMapGenerator: Starting generation...')
    console.log('  - Root:', data.text)
    console.log('  - Children:', data.children.length)

    // Generate the mind map in a single atomic operation
    editor.run(() => {
      try {
        console.log('🎨 Generating mind map...')
        
        // Step 1: Clear existing canvas
        const existingShapes = Array.from(editor.getCurrentPageShapeIds())
        if (existingShapes.length > 0) {
          editor.deleteShapes(existingShapes)
        }

        // Step 2: Calculate positions using force-directed layout
        const layoutResult = calculateNodePositions(data)
        
        // Step 3: Generate tldraw shapes from positioned nodes
        const { shapes, arrows, bindings } = generateTldrawShapes(data, layoutResult)
        
        // Step 4: Create all shapes at once (atomic operation)
        // Order matters: nodes first, then arrows, then bindings
        const allShapes = [...shapes, ...arrows]
        editor.createShapes(allShapes as any[])
        
        // Step 5: Create bindings to connect arrows to nodes
        for (const binding of bindings) {
          editor.createBinding(binding as any)
        }
        
        // Step 6: Fit canvas to content with smooth animation
        setTimeout(() => {
          editor.zoomToFit({ 
            animation: { duration: 600 }
          })
        }, 100)
        
        console.log(`✓ Mind map generated: ${shapes.length} nodes, ${arrows.length} connectors`)
        
      } catch (error) {
        console.error('Failed to generate mind map:', error)
      }
    })
  }, [editor, data])

  return null // This component doesn't render any visible elements
}

/**
 * FORCE-DIRECTED GRAPH LAYOUT
 * 
 * Uses physics simulation to position nodes dynamically.
 * Edges are routed with waypoints to avoid overlapping nodes.
 */
function calculateNodePositions(root: MindMapNode): Map<string, LayoutNode> {
  console.log('🌀 Calculating radial-orbital layout...')
  // Use new deterministic radial orbital layout to avoid overlap & show hierarchy clearly
  const radialNodes = computeRadialOrbitalLayout(root)

  // Adapt radial nodes to LayoutNode interface expected by downstream shape generation
  const adapted = new Map<string, LayoutNode>()
  for (const [id, n] of radialNodes.entries()) {
    adapted.set(id, {
      id: n.id,
      x: n.x,
      y: n.y,
      vx: 0,
      vy: 0,
      width: n.width,
      height: n.height,
      level: n.level,
      mass: 1,
      data: n.data,
    })
  }
  console.log(`✓ Radial-orbital layout: ${adapted.size} nodes positioned`)
  return adapted
}

/**
 * TLDRAW SHAPE GENERATION FOR FORCE-DIRECTED LAYOUT
 * 
 * Converts positioned nodes from force-directed layout into tldraw shapes.
 * Creates complex edges with waypoints instead of simple straight arrows.
 */
function generateTldrawShapes(root: MindMapNode, layoutNodes: Map<string, LayoutNode>) {
  const shapes: any[] = []
  const arrows: any[] = []
  const bindings: any[] = []
  
  // Track created shape IDs
  const shapeIdMap = new Map<string, TLShapeId>()
  const getShapeId = (nodeId: string): TLShapeId => {
    if (!shapeIdMap.has(nodeId)) {
      shapeIdMap.set(nodeId, `shape:${nodeId}` as TLShapeId)
    }
    return shapeIdMap.get(nodeId)!
  }
  
  // Build parent-child relationships from tree structure
  const edges: Array<{ parent: string; child: string }> = []
  const buildEdges = (node: MindMapNode, parentId?: string) => {
    if (parentId) {
      edges.push({ parent: parentId, child: node.id })
    }
    for (const child of node.children) {
      buildEdges(child, node.id)
    }
  }
  buildEdges(root)
  
  // Create node shapes
  let themeIndex = 0
  for (const [nodeId, layoutNode] of layoutNodes.entries()) {
    const shapeId = getShapeId(nodeId)
    const node = layoutNode.data
    
    // Determine color for level 1 nodes
    if (node.level === 1) {
      themeIndex++
    }
    const colorIndex = node.level === 0 ? 0 : themeIndex - 1
    
    // CREATE NODE SHAPE based on level
    if (node.level === 0) {
      // LEVEL 0: CENTRAL RESEARCH QUESTION - Large blue ellipse
      shapes.push({
        id: shapeId,
        type: 'geo',
        x: layoutNode.x - layoutNode.width / 2,
        y: layoutNode.y - layoutNode.height / 2,
        props: {
          geo: 'ellipse',
          w: layoutNode.width,
          h: layoutNode.height,
          fill: 'solid',
          color: 'blue',
          font: 'serif',
          size: 'xl',
          richText: toRichText(node.text),
          align: 'middle',
          verticalAlign: 'middle',
        },
      })
    } else if (node.level === 1) {
      // LEVEL 1: SUB-TOPICS - Colored rectangles (solid)
      const color = THEME_COLORS[colorIndex % THEME_COLORS.length]
      shapes.push({
        id: shapeId,
        type: 'geo',
        x: layoutNode.x - layoutNode.width / 2,
        y: layoutNode.y - layoutNode.height / 2,
        props: {
          geo: 'rectangle',
          w: layoutNode.width,
          h: layoutNode.height,
          fill: 'solid',
          color: color,
          font: 'sans',
          size: 'l',
          richText: toRichText(node.text),
          align: 'middle',
          verticalAlign: 'middle',
          growY: 0,
        },
      })
    } else if (node.level === 2) {
      // LEVEL 2: STUDIES - Medium rectangles with pattern fill
      let displayText = node.text
      
      if (node.metadata?.authors) {
        displayText += `\n${node.metadata.authors}`
      }
      
      if (node.metadata?.year) {
        displayText += ` (${node.metadata.year})`
      }
      
      if (node.metadata?.url) {
        displayText += '\n\n🔗 Click to open article'
      }
      
      shapes.push({
        id: shapeId,
        type: 'geo',
        x: layoutNode.x - layoutNode.width / 2,
        y: layoutNode.y - layoutNode.height / 2,
        props: {
          geo: 'rectangle',
          w: layoutNode.width,
          h: layoutNode.height,
          fill: 'pattern',
          color: 'light-blue',
          font: 'sans',
          size: 'm',
          richText: toRichText(displayText),
          align: 'middle',
          verticalAlign: 'middle',
          dash: 'draw',
          growY: 0,
        },
      })
    } else {
      // LEVEL 3: KEY FINDINGS - Small rectangles
      shapes.push({
        id: shapeId,
        type: 'geo',
        x: layoutNode.x - layoutNode.width / 2,
        y: layoutNode.y - layoutNode.height / 2,
        props: {
          geo: 'rectangle',
          w: layoutNode.width,
          h: layoutNode.height,
          fill: 'semi',
          color: 'grey',
          font: 'sans',
          size: 's',
          richText: toRichText(node.text),
          align: 'start-legacy',
          verticalAlign: 'start',
          dash: 'draw',
          growY: 0,
        },
      })
    }
  }
  
  // Routing: compute middle handle to avoid node overlaps
  const rects: Record<string, { x: number; y: number; w: number; h: number }> = {}
  for (const [nid, ln] of layoutNodes.entries()) {
    rects[nid] = { x: ln.x - ln.width / 2, y: ln.y - ln.height / 2, w: ln.width, h: ln.height }
  }
  const computeMiddle = (from: string, to: string) => {
    const a = layoutNodes.get(from)!
    const b = layoutNodes.get(to)!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy))
    const nx = -dy / dist
    const ny = dx / dist
    let offset = Math.min(220, Math.max(80, dist * 0.25))
    for (const id in rects) {
      if (id === from || id === to) continue
      const r = rects[id]
      const cx = r.x + r.w / 2
      const cy = r.y + r.h / 2
      const t = ((cx - a.x) * dx + (cy - a.y) * dy) / (dist * dist)
      if (t > 0.08 && t < 0.92) {
        const px = a.x + dx * t
        const py = a.y + dy * t
        const dLine = Math.hypot(cx - px, cy - py)
        if (dLine < Math.max(r.w, r.h) * 0.55) {
          offset = Math.max(offset, Math.max(r.w, r.h) * 0.7 + 90)
        }
      }
    }
    return { midX: (a.x + b.x) / 2 + nx * offset, midY: (a.y + b.y) / 2 + ny * offset, dx, dy }
  }
  for (const edge of edges) {
    const parentNode = layoutNodes.get(edge.parent)
    const childNode = layoutNodes.get(edge.child)
    if (!parentNode || !childNode) continue
    const { midX, midY, dx, dy } = computeMiddle(edge.parent, edge.child)
    const arrowId = `shape:arrow-${edge.child}` as TLShapeId
    const parentShapeId = getShapeId(edge.parent)
    const childShapeId = getShapeId(edge.child)
    
    // Compute bend amount based on perpendicular offset from middle point
    // Bend is signed: positive curves one way, negative the other
    const midVecX = midX - parentNode.x
    const midVecY = midY - parentNode.y
    const straightMidX = dx / 2
    const straightMidY = dy / 2
    const offsetX = midVecX - straightMidX
    const offsetY = midVecY - straightMidY
    // Project offset onto perpendicular to get signed distance
    const dist = Math.sqrt(dx * dx + dy * dy)
    const bendAmount = dist > 0 ? ((offsetX * (-dy) + offsetY * dx) / dist) * 0.5 : 0
    
    arrows.push({
      id: arrowId,
      type: 'arrow',
      x: parentNode.x,
      y: parentNode.y,
      props: {
        start: { x: 0, y: 0 },
        end: { x: dx, y: dy },
        bend: bendAmount,
        color: 'grey',
        fill: 'none',
        dash: 'draw',
        size: 'm',
        arrowheadStart: 'none',
        arrowheadEnd: 'arrow',
      },
    })
    bindings.push({ id: `binding:${arrowId}-start` as TLShapeId, type: 'arrow', fromId: arrowId, toId: parentShapeId, props: { terminal: 'start', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false } })
    bindings.push({ id: `binding:${arrowId}-end` as TLShapeId, type: 'arrow', fromId: arrowId, toId: childShapeId, props: { terminal: 'end', normalizedAnchor: { x: 0.5, y: 0.5 }, isExact: false, isPrecise: false } })
  }
  
  return { shapes, arrows, bindings }
}

export default MindMapGenerator
