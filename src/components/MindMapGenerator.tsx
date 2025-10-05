import { useEditor, toRichText } from 'tldraw'
import { useEffect } from 'react'
import type { TLShapeId } from 'tldraw'

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
  }
}

/**
 * Positioned node with calculated coordinates and dimensions
 */
interface PositionedNode extends MindMapNode {
  x: number
  y: number
  width: number
  height: number
  angle?: number
  radius?: number
}

interface MindMapGeneratorProps {
  data: MindMapNode
}

/**
 * Layout configuration constants
 */
const LAYOUT_CONFIG = {
  // Radial layout spacing - 4 levels now!
  RADIUS_STEP: 1200, // MASSIVE distance between each level
  MIN_RADIUS: 700, // First ring (sub-topics) distance from center
  
  // Canvas positioning
  CANVAS_CENTER_X: 0,
  CANVAS_CENTER_Y: 0,
  
  // Node sizing - optimized for 4 levels
  CENTRAL_NODE: {
    width: 700,
    height: 250,
  },
  SUBTOPIC_NODE: { // Level 1: Sub-topics
    baseWidth: 350,
    minWidth: 300,
    maxWidth: 550,
    height: 140,
    padding: 50,
  },
  STUDY_NODE: { // Level 2: Study titles
    baseWidth: 320,
    minWidth: 280,
    maxWidth: 500,
    height: 120,
    padding: 45,
  },
  FINDING_NODE: { // Level 3: Key findings
    baseWidth: 280,
    minWidth: 250,
    maxWidth: 450,
    height: 100,
    padding: 35,
  },
  
  // Text sizing (approximate character widths for estimation)
  CHAR_WIDTH: {
    xl: 14,
    l: 10,
    m: 8,
    s: 7,
  },
  
  // Spacing
  MIN_ANGULAR_SEPARATION: 0.35, // MAXIMUM angular space between siblings
  COLLISION_PADDING: 120,
} as const

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

        // Step 2: Calculate positions using radial/spoke layout (like traditional mind maps)
        const positionedTree = calculateNodePositions(data)
        
        // Step 3: Generate tldraw shapes from positioned nodes
        const { shapes, arrows, bindings } = generateTldrawShapes(positionedTree)
        
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
 * RADIAL TREE LAYOUT ALGORITHM
 * 
 * Calculates (x, y) positions for all nodes using polar coordinates.
 * Each level forms a ring around the center, with nodes distributed
 * evenly within their allocated angular sector.
 * 
 * Algorithm steps:
 * 1. Place root (level 0) at canvas center
 * 2. For each level, calculate radius = level * RADIUS_STEP
 * 3. Distribute children evenly within parent's angular sector
 * 4. Convert polar (radius, angle) to Cartesian (x, y)
 * 5. Adjust positions for collision avoidance based on node widths
 */
function calculateNodePositions(root: MindMapNode): PositionedNode {
  // Estimate node dimensions based on text length and level
  const estimateNodeDimensions = (node: MindMapNode): { width: number; height: number } => {
    if (node.level === 0) {
      // Central topic - fixed large size
      return {
        width: LAYOUT_CONFIG.CENTRAL_NODE.width,
        height: LAYOUT_CONFIG.CENTRAL_NODE.height,
      }
    } else if (node.level === 1) {
      // Sub-topic nodes - dynamic width based on text
      const textWidth = node.text.length * LAYOUT_CONFIG.CHAR_WIDTH.l
      const width = Math.min(
        Math.max(textWidth + LAYOUT_CONFIG.SUBTOPIC_NODE.padding, LAYOUT_CONFIG.SUBTOPIC_NODE.minWidth),
        LAYOUT_CONFIG.SUBTOPIC_NODE.maxWidth
      )
      return {
        width,
        height: LAYOUT_CONFIG.SUBTOPIC_NODE.height,
      }
    } else if (node.level === 2) {
      // Study nodes - medium sized rectangles
      const textWidth = node.text.length * LAYOUT_CONFIG.CHAR_WIDTH.m
      const width = Math.min(
        Math.max(textWidth + LAYOUT_CONFIG.STUDY_NODE.padding, LAYOUT_CONFIG.STUDY_NODE.minWidth),
        LAYOUT_CONFIG.STUDY_NODE.maxWidth
      )
      return {
        width,
        height: LAYOUT_CONFIG.STUDY_NODE.height,
      }
    } else {
      // Finding nodes - smaller rectangles with text
      const textWidth = node.text.length * LAYOUT_CONFIG.CHAR_WIDTH.s
      const width = Math.min(
        Math.max(textWidth + LAYOUT_CONFIG.FINDING_NODE.padding, LAYOUT_CONFIG.FINDING_NODE.minWidth),
        LAYOUT_CONFIG.FINDING_NODE.maxWidth
      )
      return {
        width,
        height: LAYOUT_CONFIG.FINDING_NODE.height,
      }
    }
  }

  /**
   * Recursive positioning function - Radial/Spoke Layout (like traditional mind maps)
   * 
   * @param node - Current node to position
   * @param startAngle - Starting angle for this node's sector (radians)
   * @param angularWidth - Angular width allocated (radians)
   * @returns Positioned node with x, y coordinates and dimensions
   */
  const positionNode = (
    node: MindMapNode,
    startAngle: number,
    angularWidth: number
  ): PositionedNode => {
    const dimensions = estimateNodeDimensions(node)
    
    // Root node at center
    if (node.level === 0) {
      const positioned: PositionedNode = {
        ...node,
        x: LAYOUT_CONFIG.CANVAS_CENTER_X,
        y: LAYOUT_CONFIG.CANVAS_CENTER_Y,
        width: dimensions.width,
        height: dimensions.height,
        angle: 0,
        radius: 0,
        children: [],
      }
      
      // Distribute children evenly around the circle
      const childCount = node.children.length
      if (childCount > 0) {
        const childAngularWidth = (2 * Math.PI) / childCount
        
        positioned.children = node.children.map((child, index) => {
          const childStartAngle = index * childAngularWidth
          return positionNode(child, childStartAngle, childAngularWidth)
        })
      }
      
      return positioned
    }
    
    // Calculate radius - much larger spacing between levels
    const radius = node.level === 1 
      ? LAYOUT_CONFIG.MIN_RADIUS 
      : LAYOUT_CONFIG.MIN_RADIUS + (node.level - 1) * LAYOUT_CONFIG.RADIUS_STEP
    
    // Position at center of angular sector
    const angle = startAngle + angularWidth / 2
    
    // Convert polar to Cartesian
    const x = LAYOUT_CONFIG.CANVAS_CENTER_X + radius * Math.cos(angle)
    const y = LAYOUT_CONFIG.CANVAS_CENTER_Y + radius * Math.sin(angle)
    
    const positioned: PositionedNode = {
      ...node,
      x,
      y,
      width: dimensions.width,
      height: dimensions.height,
      angle,
      radius,
      children: [],
    }
    
    // Position children within this sector
    if (node.children.length > 0) {
      const childCount = node.children.length
      const childAngularWidth = angularWidth / childCount
      
      let currentAngle = startAngle
      positioned.children = node.children.map((child) => {
        const childNode = positionNode(child, currentAngle, childAngularWidth)
        currentAngle += childAngularWidth
        return childNode
      })
    }
    
    return positioned
  }

  // Start positioning from root with full circle

  return positionNode(root, 0, 2 * Math.PI)
}

/**
 * TLDRAW SHAPE GENERATION
 * 
 * Converts positioned nodes into tldraw shape definitions.
 * Creates shapes, arrows, and bindings according to the design specifications.
 * 
 * Shape types by level:
 * - Level 0: geo shape with ellipse, blue fill, serif font, xl size
 * - Level 1: geo shape with rectangle, varied colors, sans font, l size
 * - Level 2+: text shape with no container, sans font, m size
 * 
 * All arrows use curved lines (bend property) with proper bindings.
 */
function generateTldrawShapes(tree: PositionedNode) {
  const shapes: any[] = []
  const arrows: any[] = []
  const bindings: any[] = []
  
  // Track created shape IDs for binding arrows
  const shapeIdMap = new Map<string, TLShapeId>()
  
  /**
   * Create a tldraw shape ID from our node ID
   */
  const getShapeId = (nodeId: string): TLShapeId => {
    if (!shapeIdMap.has(nodeId)) {
      shapeIdMap.set(nodeId, `shape:${nodeId}` as TLShapeId)
    }
    return shapeIdMap.get(nodeId)!
  }
  
  /**
   * Recursively traverse tree and create shapes
   */
  const traverseAndCreateShapes = (
    node: PositionedNode,
    parentNode?: PositionedNode,
    themeColorIndex = 0
  ) => {
    const shapeId = getShapeId(node.id)
    
    // CREATE NODE SHAPE based on level (4 levels total)
    if (node.level === 0) {
      // LEVEL 0: CENTRAL RESEARCH QUESTION - Large blue ellipse
      shapes.push({
        id: shapeId,
        type: 'geo',
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
        props: {
          geo: 'ellipse',
          w: node.width,
          h: node.height,
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
      const color = THEME_COLORS[themeColorIndex % THEME_COLORS.length]
      shapes.push({
        id: shapeId,
        type: 'geo',
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
        props: {
          geo: 'rectangle',
          w: node.width,
          h: node.height,
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
      // LEVEL 2: STUDIES (titles + authors) - Medium rectangles with pattern fill
      shapes.push({
        id: shapeId,
        type: 'geo',
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
        props: {
          geo: 'rectangle',
          w: node.width,
          h: node.height,
          fill: 'pattern',
          color: 'light-blue',
          font: 'sans',
          size: 'm',
          richText: toRichText(node.text),
          align: 'middle',
          verticalAlign: 'middle',
          dash: 'draw',
          growY: 0,
        },
      })
    } else {
      // LEVEL 3: KEY FINDINGS - Small rectangles with semi-transparent fill
      shapes.push({
        id: shapeId,
        type: 'geo',
        x: node.x - node.width / 2,
        y: node.y - node.height / 2,
        props: {
          geo: 'rectangle',
          w: node.width,
          h: node.height,
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
    
    // CREATE ARROW connecting to parent (if not root)
    if (parentNode) {
      const arrowId = `shape:arrow-${node.id}` as TLShapeId
      const parentShapeId = getShapeId(parentNode.id)
      
      // Slight curve for organic feel - radial spokes
      const angleDiff = (node.angle || 0) - (parentNode.angle || 0)
      const bendAmount = Math.sin(angleDiff) * 15
      
      // Create arrow shape
      // Start and end coordinates will be managed by bindings
      arrows.push({
        id: arrowId,
        type: 'arrow',
        x: parentNode.x,
        y: parentNode.y,
        props: {
          start: { x: 0, y: 0 },
          end: { x: node.x - parentNode.x, y: node.y - parentNode.y },
          bend: bendAmount,
          color: 'grey',
          fill: 'none',
          dash: 'draw', // Organic hand-drawn style
          size: 'm',
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow',
        },
      })
      
      // CREATE BINDINGS to connect arrow terminals to nodes
      // Binding at arrow START (parent node)
      bindings.push({
        id: `binding:${arrowId}-start` as TLShapeId,
        type: 'arrow',
        fromId: arrowId,
        toId: parentShapeId,
        props: {
          terminal: 'start',
          normalizedAnchor: { x: 0.5, y: 0.5 }, // Center of parent node
          isExact: false,
          isPrecise: false,
        },
      })
      
      // Binding at arrow END (child node)
      bindings.push({
        id: `binding:${arrowId}-end` as TLShapeId,
        type: 'arrow',
        fromId: arrowId,
        toId: shapeId,
        props: {
          terminal: 'end',
          normalizedAnchor: { x: 0.5, y: 0.5 }, // Center of child node
          isExact: false,
          isPrecise: false,
        },
      })
    }
    
    // Recursively process children
    node.children.forEach((child, index) => {
      // Pass theme color index for level 1 nodes, inherit for deeper levels
      const childColorIndex = node.level === 0 ? index : themeColorIndex
      traverseAndCreateShapes(child as PositionedNode, node, childColorIndex)
    })
  }
  
  // Start traversal from root
  traverseAndCreateShapes(tree)
  
  return { shapes, arrows, bindings }
}

export default MindMapGenerator
