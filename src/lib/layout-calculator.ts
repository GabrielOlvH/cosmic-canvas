import type { DocumentNode } from './relationship-extractor'
import type { DocumentEdge } from './relationship-extractor'
import type { Theme, DocumentThemeMap } from './theme-detector'

export interface NodePosition {
  id: string
  x: number
  y: number
  vx: number // velocity x
  vy: number // velocity y
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>
  bounds: { width: number; height: number }
}

export interface HierarchyNode {
  id: string
  level: number // 0=center, 1=theme, 2=finding, 3=document
  parentId?: string
  children: string[]
  importance?: number // For ordering within level
}

export interface MindMapHierarchy {
  nodes: Map<string, HierarchyNode>
  centerNodeId: string
}

export class LayoutCalculator {
  // Mind map layout constants
  private readonly CENTER_RADIUS = 800 // Distance from center to level 1 (themes)
  private readonly LEVEL_SPACING = 900 // Distance between each level (increased for better spacing)
  private readonly MIN_ANGULAR_SPACING = 15 // Minimum degrees between siblings
  private readonly MIN_DISTANCE = 550 // Minimum distance between any two nodes
  private readonly CENTER_NODE_SIZE = { width: 600, height: 200 }
  private readonly THEME_NODE_SIZE = { width: 500, height: 180 }
  private readonly FINDING_NODE_SIZE = { width: 450, height: 280 }
  private readonly DOCUMENT_NODE_SIZE = { width: 450, height: 280 }

  /**
   * HIERARCHICAL RADIAL LAYOUT - Proper mind map structure
   * Replaces the scattered force-directed layout with organized radial hierarchy
   */
  calculateHierarchicalRadialLayout(hierarchy: MindMapHierarchy): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>()

    // Level 0: Center node at origin
    const centerNode = hierarchy.nodes.get(hierarchy.centerNodeId)
    if (!centerNode) {
      throw new Error('Center node not found in hierarchy')
    }

    positions.set(hierarchy.centerNodeId, { x: 0, y: 0 })

    // Process each level radially outward
    this.layoutLevel1_Themes(centerNode, hierarchy.nodes, positions)
    this.layoutLevel2_Findings(hierarchy.nodes, positions)
    this.layoutLevel3_Documents(hierarchy.nodes, positions)

    return positions
  }

  /**
   * Layout Level 1: Main themes radiating from center
   */
  private layoutLevel1_Themes(
    centerNode: HierarchyNode,
    nodes: Map<string, HierarchyNode>,
    positions: Map<string, { x: number; y: number }>
  ) {
    const themeIds = centerNode.children
    if (themeIds.length === 0) return

    // Distribute themes evenly around center (360°)
    const angleStep = 360 / themeIds.length

    themeIds.forEach((themeId, index) => {
      const angle = (index * angleStep * Math.PI) / 180 // Convert to radians
      const x = Math.cos(angle) * this.CENTER_RADIUS
      const y = Math.sin(angle) * this.CENTER_RADIUS

      positions.set(themeId, { x, y })
    })
  }

  /**
   * Layout Level 2: Findings branching from each theme
   * Uses ARC-LENGTH based spacing for even distribution
   */
  private layoutLevel2_Findings(
    nodes: Map<string, HierarchyNode>,
    positions: Map<string, { x: number; y: number }>
  ) {
    // For each theme node
    for (const [nodeId, node] of nodes.entries()) {
      if (node.level !== 1) continue // Only process theme nodes

      const themePos = positions.get(nodeId)
      if (!themePos || node.children.length === 0) continue

      // Calculate angle from center to this theme
      const themeAngle = Math.atan2(themePos.y, themePos.x)

      // ARC-LENGTH based spacing: calculate required arc to fit all findings
      const findingCount = node.children.length
      const radius = this.CENTER_RADIUS + this.LEVEL_SPACING
      const nodeWidth = 500 // approximate width of finding node
      const minArcLength = nodeWidth * 1.3 // 30% padding between nodes
      const requiredArcLength = minArcLength * findingCount
      const arcSpan = (requiredArcLength / radius) * (180 / Math.PI) // Convert to degrees
      const cappedArcSpan = Math.min(120, arcSpan) // Cap at 120° to prevent overlap with adjacent themes

      node.children.forEach((findingId, index) => {
        // Evenly distribute findings across the arc
        const offsetAngle = cappedArcSpan / 2 - (index / (findingCount - 1 || 1)) * cappedArcSpan
        const findingAngle = themeAngle + (offsetAngle * Math.PI) / 180

        // Position at next radius level
        const x = Math.cos(findingAngle) * radius
        const y = Math.sin(findingAngle) * radius

        positions.set(findingId, { x, y })
      })
    }
  }

  /**
   * Layout Level 3: Documents branching from findings
   * Uses ARC-LENGTH based spacing for even distribution
   */
  private layoutLevel3_Documents(
    nodes: Map<string, HierarchyNode>,
    positions: Map<string, { x: number; y: number }>
  ) {
    // For each finding node
    for (const [nodeId, node] of nodes.entries()) {
      if (node.level !== 2) continue // Only process finding nodes

      const findingPos = positions.get(nodeId)
      if (!findingPos || node.children.length === 0) continue

      // Calculate angle from center to this finding
      const findingAngle = Math.atan2(findingPos.y, findingPos.x)

      // ARC-LENGTH based spacing: calculate required arc to fit all documents
      const docCount = node.children.length
      const radius = this.CENTER_RADIUS + this.LEVEL_SPACING * 2
      const nodeWidth = 460 // approximate width of document node
      const minArcLength = nodeWidth * 1.3 // 30% padding between nodes
      const requiredArcLength = minArcLength * docCount
      const arcSpan = (requiredArcLength / radius) * (180 / Math.PI) // Convert to degrees
      const cappedArcSpan = Math.min(100, arcSpan) // Cap at 100° to prevent overlap

      node.children.forEach((docId, index) => {
        // Evenly distribute documents across the arc
        const offsetAngle = cappedArcSpan / 2 - (index / (docCount - 1 || 1)) * cappedArcSpan
        const docAngle = findingAngle + (offsetAngle * Math.PI) / 180

        // Position at outermost radius level
        const x = Math.cos(docAngle) * radius
        const y = Math.sin(docAngle) * radius

        positions.set(docId, { x, y })
      })
    }
  }

  /**
   * DEPRECATED: Old force-directed layout (keeping for backward compatibility)
   * Use calculateHierarchicalRadialLayout instead
   */
  calculateForceDirectedLayout(
    documents: DocumentNode[],
    edges: DocumentEdge[],
    iterations = 300
  ): Map<string, { x: number; y: number }> {
    if (documents.length === 0) {
      return new Map()
    }

    // Calculate optimal distance (k) - smaller k for tighter layout
    const k = 200 // Fixed optimal distance between nodes

    // Initialize positions near origin for better viewport fit
    const nodes = this.initializePositionsCompact(documents, k)

    // Initial temperature
    const initialTemp = k * 3

    // Run simulation with cooling
    for (let i = 0; i < iterations; i++) {
      const temp = initialTemp * (1 - i / iterations) // Linear cooling
      this.fruchtermanReingoldStep(nodes, edges, k, temp)
    }

    // Center the layout around (0, 0)
    this.centerLayout(nodes)

    // Convert to position map
    const positions = new Map<string, { x: number; y: number }>()
    for (const node of nodes) {
      positions.set(node.id, { x: node.x, y: node.y })
    }

    return positions
  }

  /**
   * Initialize node positions in a grid pattern with some randomness
   */
  private initializePositionsGrid(documents: DocumentNode[]): NodePosition[] {
    const gridSize = Math.ceil(Math.sqrt(documents.length))
    const cellWidth = this.CANVAS_WIDTH / gridSize
    const cellHeight = this.CANVAS_HEIGHT / gridSize

    return documents.map((doc, i) => {
      const row = Math.floor(i / gridSize)
      const col = i % gridSize

      // Position in center of grid cell with small random offset
      const x = col * cellWidth + cellWidth / 2 + (Math.random() - 0.5) * cellWidth * 0.3
      const y = row * cellHeight + cellHeight / 2 + (Math.random() - 0.5) * cellHeight * 0.3

      return {
        id: doc.metadata.source,
        x: Math.max(0, Math.min(this.CANVAS_WIDTH, x)),
        y: Math.max(0, Math.min(this.CANVAS_HEIGHT, y)),
        vx: 0,
        vy: 0,
      }
    })
  }

  /**
   * Initialize positions in a compact grid near origin
   */
  private initializePositionsCompact(documents: DocumentNode[], k: number): NodePosition[] {
    const gridSize = Math.ceil(Math.sqrt(documents.length))
    const cellSize = k * 1.5 // Cell size based on optimal distance

    return documents.map((doc, i) => {
      const row = Math.floor(i / gridSize)
      const col = i % gridSize

      // Center the grid around origin with small random offset
      const x = (col - gridSize / 2) * cellSize + (Math.random() - 0.5) * cellSize * 0.3
      const y = (row - gridSize / 2) * cellSize + (Math.random() - 0.5) * cellSize * 0.3

      return {
        id: doc.metadata.source,
        x,
        y,
        vx: 0,
        vy: 0,
      }
    })
  }

  /**
   * Center layout around origin (0, 0)
   */
  private centerLayout(nodes: NodePosition[]) {
    if (nodes.length === 0) return

    // Calculate center of mass
    let sumX = 0
    let sumY = 0
    for (const node of nodes) {
      sumX += node.x
      sumY += node.y
    }
    const centerX = sumX / nodes.length
    const centerY = sumY / nodes.length

    // Shift all nodes to center around origin
    for (const node of nodes) {
      node.x -= centerX
      node.y -= centerY
    }
  }

  /**
   * Fruchterman-Reingold algorithm step with temperature cooling
   */
  private fruchtermanReingoldStep(
    nodes: NodePosition[],
    edges: DocumentEdge[],
    k: number,
    temperature: number
  ) {
    // Calculate repulsive forces (all pairs of nodes)
    for (let i = 0; i < nodes.length; i++) {
      nodes[i].vx = 0
      nodes[i].vy = 0

      for (let j = 0; j < nodes.length; j++) {
        if (i === j) continue

        const dx = nodes[i].x - nodes[j].x
        const dy = nodes[i].y - nodes[j].y
        const distance = Math.sqrt(dx * dx + dy * dy) || 1 // Avoid division by zero

        // Repulsive force: fr(d) = k² / d
        const repulsiveForce = (k * k) / distance

        const fx = (dx / distance) * repulsiveForce
        const fy = (dy / distance) * repulsiveForce

        nodes[i].vx += fx
        nodes[i].vy += fy
      }
    }

    // Calculate attractive forces (connected nodes)
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.source)
      const target = nodes.find(n => n.id === edge.target)

      if (!source || !target) continue

      const dx = target.x - source.x
      const dy = target.y - source.y
      const distance = Math.sqrt(dx * dx + dy * dy) || 1

      // Attractive force: fa(d) = d² / k
      let attractiveForce = (distance * distance) / k

      // Adjust attraction by edge type
      if (edge.type === 'semantic') {
        attractiveForce *= edge.similarity // Stronger for similar docs
      } else if (edge.type === 'citation') {
        attractiveForce *= 1.5
      } else if (edge.type === 'contradiction') {
        attractiveForce *= 0.8
      }

      const fx = (dx / distance) * attractiveForce
      const fy = (dy / distance) * attractiveForce

      source.vx += fx
      source.vy += fy
      target.vx -= fx
      target.vy -= fy
    }

    // Apply temperature-limited displacement
    for (const node of nodes) {
      const displacement = Math.sqrt(node.vx * node.vx + node.vy * node.vy) || 1

      // Limit displacement to temperature
      const limitedDisplacement = Math.min(displacement, temperature)

      node.x += (node.vx / displacement) * limitedDisplacement
      node.y += (node.vy / displacement) * limitedDisplacement

      // Keep within bounds
      node.x = Math.max(50, Math.min(this.CANVAS_WIDTH - 50, node.x))
      node.y = Math.max(50, Math.min(this.CANVAS_HEIGHT - 50, node.y))
    }
  }

  /**
   * Apply hierarchical grouping by theme
   */
  applyThemeGrouping(
    positions: Map<string, { x: number; y: number }>,
    themes: Theme[],
    themeMap: DocumentThemeMap
  ): Map<string, { x: number; y: number }> {
    // Calculate theme centers
    const themeCenters = new Map<string, { x: number; y: number; count: number }>()

    for (const theme of themes) {
      let sumX = 0
      let sumY = 0
      let count = 0

      for (const docId of theme.documentIds) {
        const pos = positions.get(docId)
        if (pos) {
          sumX += pos.x
          sumY += pos.y
          count++
        }
      }

      if (count > 0) {
        themeCenters.set(theme.id, {
          x: sumX / count,
          y: sumY / count,
          count,
        })
      }
    }

    // Adjust positions toward theme centers
    const adjustedPositions = new Map<string, { x: number; y: number }>()

    for (const [docId, pos] of positions.entries()) {
      const themes = themeMap[docId] || []
      if (themes.length === 0) {
        adjustedPositions.set(docId, pos)
        continue
      }

      // Pull toward theme center
      const themeId = themes[0] // Use first theme if multiple
      const themeCenter = themeCenters.get(themeId)

      if (themeCenter) {
        const dx = themeCenter.x - pos.x
        const dy = themeCenter.y - pos.y

        // Very subtle theme grouping - just nudge nodes slightly toward theme center
        const THEME_STRENGTH = 0.1
        adjustedPositions.set(docId, {
          x: pos.x + dx * THEME_STRENGTH,
          y: pos.y + dy * THEME_STRENGTH,
        })
      } else {
        adjustedPositions.set(docId, pos)
      }
    }

    return adjustedPositions
  }

  /**
   * Ensure no overlaps between nodes
   */
  optimizeSpacing(
    positions: Map<string, { x: number; y: number }>
  ): Map<string, { x: number; y: number }> {
    const posArray = Array.from(positions.entries())
    let adjusted = true
    let iterations = 0
    const maxIterations = 50

    while (adjusted && iterations < maxIterations) {
      adjusted = false
      iterations++

      for (let i = 0; i < posArray.length; i++) {
        for (let j = i + 1; j < posArray.length; j++) {
          const [idA, posA] = posArray[i]
          const [idB, posB] = posArray[j]

          const dx = posB.x - posA.x
          const dy = posB.y - posA.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          // If too close, push apart
          if (distance < this.MIN_DISTANCE) {
            adjusted = true

            const pushDistance = (this.MIN_DISTANCE - distance) / 2
            const angle = Math.atan2(dy, dx)

            posA.x -= Math.cos(angle) * pushDistance
            posA.y -= Math.sin(angle) * pushDistance
            posB.x += Math.cos(angle) * pushDistance
            posB.y += Math.sin(angle) * pushDistance
          }
        }
      }
    }

    return new Map(posArray)
  }

  /**
   * Main method: calculate complete layout using HIERARCHICAL MIND MAP structure
   */
  calculateLayout(
    documents: DocumentNode[],
    edges: DocumentEdge[],
    themes: Theme[],
    themeMap: DocumentThemeMap,
    hierarchy?: MindMapHierarchy // New parameter for mind map hierarchy
  ): LayoutResult {
    let positions: Map<string, { x: number; y: number }>

    if (hierarchy) {
      // NEW: Use hierarchical radial layout for proper mind map
      positions = this.calculateHierarchicalRadialLayout(hierarchy)
    } else {
      // FALLBACK: Use old force-directed layout
      positions = this.calculateForceDirectedLayout(documents, edges, 300)
      positions = this.applyThemeGrouping(positions, themes, themeMap)
      positions = this.optimizeSpacing(positions)
    }

    // Calculate bounds
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity

    for (const pos of positions.values()) {
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x)
      maxY = Math.max(maxY, pos.y)
    }

    // Add padding
    const padding = 1000

    return {
      positions,
      bounds: {
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
      },
    }
  }
}
