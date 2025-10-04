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

export class LayoutCalculator {
  private readonly REPULSION_STRENGTH = 100
  private readonly ATTRACTION_STRENGTH = 0.1
  private readonly THEME_ATTRACTION_STRENGTH = 0.05
  private readonly DAMPING = 0.9
  private readonly MIN_DISTANCE = 350 // Minimum distance between nodes
  private readonly CANVAS_WIDTH = 5000
  private readonly CANVAS_HEIGHT = 5000

  /**
   * Calculate force-directed layout for document nodes
   */
  calculateForceDirectedLayout(
    documents: DocumentNode[],
    edges: DocumentEdge[],
    iterations = 100
  ): Map<string, { x: number; y: number }> {
    // Initialize positions randomly
    const nodes = this.initializePositions(documents)

    // Run simulation
    for (let i = 0; i < iterations; i++) {
      this.simulationStep(nodes, edges)
    }

    // Convert to position map
    const positions = new Map<string, { x: number; y: number }>()
    for (const node of nodes) {
      positions.set(node.id, { x: node.x, y: node.y })
    }

    return positions
  }

  /**
   * Initialize node positions randomly
   */
  private initializePositions(documents: DocumentNode[]): NodePosition[] {
    return documents.map(doc => ({
      id: doc.metadata.source,
      x: Math.random() * this.CANVAS_WIDTH,
      y: Math.random() * this.CANVAS_HEIGHT,
      vx: 0,
      vy: 0,
    }))
  }

  /**
   * Single simulation step
   */
  private simulationStep(nodes: NodePosition[], edges: DocumentEdge[]) {
    // Reset forces
    for (const node of nodes) {
      node.vx = 0
      node.vy = 0
    }

    // Apply repulsion between all nodes
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        this.applyRepulsion(nodes[i], nodes[j])
      }
    }

    // Apply attraction along edges
    for (const edge of edges) {
      const source = nodes.find(n => n.id === edge.source)
      const target = nodes.find(n => n.id === edge.target)

      if (source && target) {
        this.applyAttraction(source, target, edge)
      }
    }

    // Update positions
    for (const node of nodes) {
      node.x += node.vx * this.DAMPING
      node.y += node.vy * this.DAMPING

      // Keep within bounds
      node.x = Math.max(0, Math.min(this.CANVAS_WIDTH, node.x))
      node.y = Math.max(0, Math.min(this.CANVAS_HEIGHT, node.y))
    }
  }

  /**
   * Apply repulsion force between two nodes (Coulomb's law)
   */
  private applyRepulsion(nodeA: NodePosition, nodeB: NodePosition) {
    const dx = nodeB.x - nodeA.x
    const dy = nodeB.y - nodeA.y
    const distanceSquared = dx * dx + dy * dy
    const distance = Math.sqrt(distanceSquared)

    if (distance < 0.1) return // Avoid division by zero

    // Repulsion force (inverse square law)
    const force = this.REPULSION_STRENGTH / distanceSquared

    const fx = (dx / distance) * force
    const fy = (dy / distance) * force

    nodeA.vx -= fx
    nodeA.vy -= fy
    nodeB.vx += fx
    nodeB.vy += fy
  }

  /**
   * Apply attraction force along an edge (Hooke's law)
   */
  private applyAttraction(
    nodeA: NodePosition,
    nodeB: NodePosition,
    edge: DocumentEdge
  ) {
    const dx = nodeB.x - nodeA.x
    const dy = nodeB.y - nodeA.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance < 0.1) return

    // Attraction strength varies by edge type
    let strength = this.ATTRACTION_STRENGTH

    if (edge.type === 'semantic') {
      strength *= edge.similarity // Stronger for more similar documents
    } else if (edge.type === 'citation') {
      strength *= 1.5 // Citations create stronger bonds
    } else if (edge.type === 'contradiction') {
      strength *= 0.5 // Contradictions have weaker attraction
    }

    const force = distance * strength

    const fx = (dx / distance) * force
    const fy = (dy / distance) * force

    nodeA.vx += fx
    nodeA.vy += fy
    nodeB.vx -= fx
    nodeB.vy -= fy
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

        adjustedPositions.set(docId, {
          x: pos.x + dx * this.THEME_ATTRACTION_STRENGTH,
          y: pos.y + dy * this.THEME_ATTRACTION_STRENGTH,
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
   * Main method: calculate complete layout
   */
  calculateLayout(
    documents: DocumentNode[],
    edges: DocumentEdge[],
    themes: Theme[],
    themeMap: DocumentThemeMap
  ): LayoutResult {
    // Step 1: Force-directed layout
    let positions = this.calculateForceDirectedLayout(documents, edges, 100)

    // Step 2: Theme grouping
    positions = this.applyThemeGrouping(positions, themes, themeMap)

    // Step 3: Optimize spacing
    positions = this.optimizeSpacing(positions)

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

    return {
      positions,
      bounds: {
        width: maxX - minX + 1000, // Add padding
        height: maxY - minY + 1000,
      },
    }
  }
}
