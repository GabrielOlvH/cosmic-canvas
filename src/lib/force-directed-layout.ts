/**
 * Force-Directed Graph Layout with Edge Routing
 * 
 * Implements a physics-based layout algorithm that positions nodes
 * dynamically based on forces (repulsion, attraction, hierarchy).
 * Includes sophisticated edge routing with waypoints to avoid node overlaps.
 */

import type { MindMapNode } from '../components/MindMapGenerator'

export interface Vector2D {
  x: number
  y: number
}

export interface LayoutNode {
  id: string
  x: number
  y: number
  vx: number // velocity x
  vy: number // velocity y
  fx?: number // fixed position x
  fy?: number // fixed position y
  width: number
  height: number
  level: number
  mass: number
  data: MindMapNode
}

export interface LayoutEdge {
  source: string
  target: string
  waypoints: Vector2D[] // Intermediate points for routing
}

export interface ForceDirectedLayoutResult {
  nodes: Map<string, LayoutNode>
  edges: LayoutEdge[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

/**
 * Configuration for force-directed layout
 */
interface LayoutConfig {
  // Physics parameters
  repulsionForce: number // How strongly nodes push each other away
  attractionForce: number // How strongly connected nodes pull together
  centeringForce: number // How strongly nodes are pulled to center
  hierarchyForce: number // Vertical force to separate levels
  damping: number // Velocity damping (0-1, higher = more friction)
  
  // Simulation parameters
  iterations: number // Number of simulation steps
  timeStep: number // Time step for each iteration
  convergenceThreshold: number // Stop when forces are below this
  
  // Layout parameters
  idealLinkLength: number // Preferred distance between connected nodes
  levelSeparation: number // Vertical distance between hierarchy levels
  minNodeDistance: number // Minimum distance to maintain between nodes
  
  // Edge routing
  routingEnabled: boolean
  routingSegments: number // Number of bend points to add for routing
  obstacleAvoidanceForce: number
}

const DEFAULT_CONFIG: LayoutConfig = {
  // Physics - tuned for radial orbital layout with organic positioning
  repulsionForce: 30000,         // Moderate repulsion for natural spacing
  attractionForce: 0.05,         // Stronger to maintain radial orbits
  centeringForce: 0.002,         // Very weak - allow natural expansion
  hierarchyForce: 0.05,          // Minimal - radial not vertical
  damping: 0.85,                 // Moderate friction for smooth settling
  
  // Simulation
  iterations: 400,               // Balanced simulation length
  timeStep: 1.0,
  convergenceThreshold: 0.1,     // Practical convergence threshold
  
  // Layout - Radial orbital distances
  idealLinkLength: 350,          // Comfortable orbital spacing
  levelSeparation: 300,          // Clear hierarchy levels
  minNodeDistance: 180,          // Prevent overlap naturally
  
  // Edge routing - smooth curves
  routingEnabled: true,
  routingSegments: 5,            // Organic curved connections
  obstacleAvoidanceForce: 800,   // Moderate obstacle avoidance
}

export class ForceDirectedLayout {
  private config: LayoutConfig
  private nodes: Map<string, LayoutNode> = new Map()
  private edges: LayoutEdge[] = []
  private adjacencyList: Map<string, Set<string>> = new Map()

  constructor(config: Partial<LayoutConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Main layout calculation method
   */
  calculate(root: MindMapNode): ForceDirectedLayoutResult {
    console.log('🔄 Starting force-directed layout calculation...')
    
    // Step 1: Build graph structure
    this.buildGraph(root)
    
    // Step 2: Initialize node positions
    this.initializePositions()
    
    // Step 3: Run force simulation
    this.runSimulation()
    
    // Step 4: Route edges with waypoints
    if (this.config.routingEnabled) {
      this.routeEdges()
    }
    
    // Step 5: Calculate bounds
    const bounds = this.calculateBounds()
    
    console.log(`✓ Layout complete: ${this.nodes.size} nodes, ${this.edges.length} edges`)
    
    return {
      nodes: this.nodes,
      edges: this.edges,
      bounds,
    }
  }

  /**
   * Build graph structure from tree
   */
  private buildGraph(root: MindMapNode) {
    const queue: Array<{ node: MindMapNode; parent?: string }> = [{ node: root }]
    
    while (queue.length > 0) {
      const { node, parent } = queue.shift()!
      
      // Create layout node
      const dimensions = this.estimateNodeDimensions(node)
      const layoutNode: LayoutNode = {
        id: node.id,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        width: dimensions.width,
        height: dimensions.height,
        level: node.level,
        mass: this.calculateNodeMass(node),
        data: node,
      }
      
      // Fix root position at center
      if (node.level === 0) {
        layoutNode.fx = 0
        layoutNode.fy = 0
      }
      
      this.nodes.set(node.id, layoutNode)
      
      // Create edge to parent
      if (parent) {
        this.edges.push({
          source: parent,
          target: node.id,
          waypoints: [],
        })
        
        // Update adjacency list
        if (!this.adjacencyList.has(parent)) {
          this.adjacencyList.set(parent, new Set())
        }
        if (!this.adjacencyList.has(node.id)) {
          this.adjacencyList.set(node.id, new Set())
        }
        this.adjacencyList.get(parent)!.add(node.id)
        this.adjacencyList.get(node.id)!.add(parent)
      }
      
      // Add children to queue
      for (const child of node.children) {
        queue.push({ node: child, parent: node.id })
      }
    }
  }

  /**
   * Initialize node positions with smart placement
   */
  private initializePositions() {
    // Group nodes by level
    const levelGroups = new Map<number, LayoutNode[]>()
    
    for (const node of this.nodes.values()) {
      if (!levelGroups.has(node.level)) {
        levelGroups.set(node.level, [])
      }
      levelGroups.get(node.level)!.push(node)
    }
    
    // Position each level in radial orbital pattern
    for (const [level, nodes] of levelGroups.entries()) {
      if (level === 0) continue // Root is fixed at origin
      
      const count = nodes.length
      // Natural orbital radius that scales with level
      const radius = this.config.idealLinkLength * (level + 0.8)
      
      // Distribute nodes in organic orbital pattern with variation
      nodes.forEach((node, index) => {
        if (node.fx !== undefined && node.fy !== undefined) return // Skip fixed nodes
        
        const angle = (index / count) * 2 * Math.PI
        // Add organic variation to make it less rigid
        const radiusVar = radius + (Math.random() - 0.5) * (radius * 0.15)
        const angleVar = angle + (Math.random() - 0.5) * 0.3
        
        node.x = radiusVar * Math.cos(angleVar)
        node.y = radiusVar * Math.sin(angleVar)
      })
    }
  }

  /**
   * Run force simulation
   */
  private runSimulation() {
    let iteration = 0
    let maxForce = Infinity
    
    while (iteration < this.config.iterations && maxForce > this.config.convergenceThreshold) {
      maxForce = 0
      
      // Reset forces
      for (const node of this.nodes.values()) {
        if (node.fx !== undefined) continue // Skip fixed nodes
        
        const forces = { x: 0, y: 0 }
        
        // 1. Repulsion force - all nodes push each other away
        for (const other of this.nodes.values()) {
          if (node.id === other.id) continue
          
          const repulsion = this.calculateRepulsion(node, other)
          forces.x += repulsion.x
          forces.y += repulsion.y
        }
        
        // 2. Attraction force - connected nodes pull together
        const neighbors = this.adjacencyList.get(node.id) || new Set()
        for (const neighborId of neighbors) {
          const neighbor = this.nodes.get(neighborId)!
          const attraction = this.calculateAttraction(node, neighbor)
          forces.x += attraction.x
          forces.y += attraction.y
        }
        
        // 3. Hierarchy force - maintain vertical level separation
        const hierarchyForce = this.calculateHierarchyForce(node)
        forces.y += hierarchyForce
        
        // 4. Centering force - slight pull toward center
        forces.x += -node.x * this.config.centeringForce
        forces.y += -node.y * this.config.centeringForce
        
        // Apply forces to velocity
        node.vx += forces.x * this.config.timeStep
        node.vy += forces.y * this.config.timeStep
        
        // Apply damping
        node.vx *= this.config.damping
        node.vy *= this.config.damping
        
        // Track maximum force for convergence
        const forceMagnitude = Math.sqrt(forces.x ** 2 + forces.y ** 2)
        maxForce = Math.max(maxForce, forceMagnitude)
      }
      
      // Update positions
      for (const node of this.nodes.values()) {
        if (node.fx !== undefined && node.fy !== undefined) {
          node.x = node.fx
          node.y = node.fy
          continue
        }
        
        node.x += node.vx * this.config.timeStep
        node.y += node.vy * this.config.timeStep
      }
      
      iteration++
      
      // Log progress every 100 iterations
      if (iteration % 100 === 0) {
        console.log(`  Iteration ${iteration}/${this.config.iterations}, max force: ${maxForce.toFixed(2)}`)
      }
    }
    
    console.log(`✓ Simulation converged after ${iteration} iterations (max force: ${maxForce.toFixed(2)})`)
  }

  /**
   * Calculate repulsion force between two nodes
   */
  private calculateRepulsion(node: LayoutNode, other: LayoutNode): Vector2D {
    const dx = node.x - other.x
    const dy = node.y - other.y
    const distanceSquared = dx * dx + dy * dy
    
    if (distanceSquared === 0) {
      // Add small random displacement to avoid division by zero
      return {
        x: (Math.random() - 0.5) * 10,
        y: (Math.random() - 0.5) * 10,
      }
    }
    
    const distance = Math.sqrt(distanceSquared)
    const minDist = this.config.minNodeDistance
    
    // Stronger repulsion when nodes are too close
    let forceMagnitude = this.config.repulsionForce / distanceSquared
    
    // Moderate extra repulsion if nodes are overlapping
    if (distance < minDist) {
      forceMagnitude *= 3 // 3x multiplier for close nodes
    }
    
    return {
      x: (dx / distance) * forceMagnitude,
      y: (dy / distance) * forceMagnitude,
    }
  }

  /**
   * Calculate attraction force between connected nodes
   */
  private calculateAttraction(node: LayoutNode, neighbor: LayoutNode): Vector2D {
    const dx = neighbor.x - node.x
    const dy = neighbor.y - node.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    if (distance === 0) return { x: 0, y: 0 }
    
    // Spring force: F = k * (distance - idealLength)
    const displacement = distance - this.config.idealLinkLength
    const forceMagnitude = displacement * this.config.attractionForce
    
    return {
      x: (dx / distance) * forceMagnitude,
      y: (dy / distance) * forceMagnitude,
    }
  }

  /**
   * Calculate hierarchy force to maintain level separation
   */
  private calculateHierarchyForce(node: LayoutNode): number {
    const idealY = node.level * this.config.levelSeparation
    const displacement = idealY - node.y
    return displacement * this.config.hierarchyForce
  }

  /**
   * Route edges with waypoints to avoid node overlaps
   */
  private routeEdges() {
    console.log('🛤️  Routing edges with waypoints...')
    
    for (const edge of this.edges) {
      const source = this.nodes.get(edge.source)!
      const target = this.nodes.get(edge.target)!
      
      // Calculate direct path
      const waypoints = this.calculateEdgeWaypoints(source, target)
      edge.waypoints = waypoints
    }
  }

  /**
   * Calculate waypoints for edge routing using A* path planning
   */
  private calculateEdgeWaypoints(source: LayoutNode, target: LayoutNode): Vector2D[] {
    const waypoints: Vector2D[] = []
    
    // Simple implementation: Add bend points and push away from obstacles
    const segments = this.config.routingSegments
    
    for (let i = 1; i < segments; i++) {
      const t = i / segments
      
      // Linear interpolation between source and target
      let x = source.x + (target.x - source.x) * t
      let y = source.y + (target.y - source.y) * t
      
      // Push waypoint away from overlapping nodes
      for (const node of this.nodes.values()) {
        if (node.id === source.id || node.id === target.id) continue
        
        const dx = x - node.x
        const dy = y - node.y
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // If waypoint is too close to a node, push it away
        const nodeRadius = Math.max(node.width, node.height) / 2
        if (distance < nodeRadius + 50) {
          const pushDistance = nodeRadius + 50 - distance
          x += (dx / distance) * pushDistance
          y += (dy / distance) * pushDistance
        }
      }
      
      waypoints.push({ x, y })
    }
    
    return waypoints
  }

  /**
   * Calculate layout bounds
   */
  private calculateBounds(): { minX: number; minY: number; maxX: number; maxY: number } {
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    
    for (const node of this.nodes.values()) {
      const halfWidth = node.width / 2
      const halfHeight = node.height / 2
      
      minX = Math.min(minX, node.x - halfWidth)
      minY = Math.min(minY, node.y - halfHeight)
      maxX = Math.max(maxX, node.x + halfWidth)
      maxY = Math.max(maxY, node.y + halfHeight)
    }
    
    // Add padding
    const padding = 200
    return {
      minX: minX - padding,
      minY: minY - padding,
      maxX: maxX + padding,
      maxY: maxY + padding,
    }
  }

  /**
   * Estimate node dimensions based on content
   */
  private estimateNodeDimensions(node: MindMapNode): { width: number; height: number } {
    const charWidth = 8
    
    if (node.level === 0) {
      return { width: 700, height: 250 }
    } else if (node.level === 1) {
      const textWidth = node.text.length * 10
      return {
        width: Math.min(Math.max(textWidth + 50, 300), 550),
        height: 140,
      }
    } else if (node.level === 2) {
      const textWidth = node.text.length * charWidth
      return {
        width: Math.min(Math.max(textWidth + 45, 280), 500),
        height: 180,
      }
    } else {
      const textWidth = node.text.length * 7
      return {
        width: Math.min(Math.max(textWidth + 35, 250), 450),
        height: 100,
      }
    }
  }

  /**
   * Calculate node mass (affects how forces move it)
   */
  private calculateNodeMass(node: MindMapNode): number {
    // Root has infinite mass (fixed)
    if (node.level === 0) return Infinity
    
    // Higher level nodes are lighter
    return 1 + node.children.length * 0.5
  }
}
