import type { MindMapNode } from '../components/MindMapGenerator'

export interface RadialLayoutNode {
  id: string
  x: number
  y: number
  width: number
  height: number
  level: number
  data: MindMapNode
}

interface Sector {
  start: number
  end: number
  mid: number
  span: number
}

interface ThemeInfo {
  node: MindMapNode
  weight: number
  sector: Sector
  angle: number
}

// Layout constants (tweakable)
// Expanded radii to create generous spacing between hierarchical rings
// (root width is ~700 so first ring needs to clear half-width + margin)
const R1 = 650 // themes (level 1)
const R2 = 1100 // findings (level 2)
const R3 = 1600 // documents (level 3+)
// Angular parameters
const THEME_GAP = 0.08 // radians gap between theme sectors (previous 0.04)
const MIN_THEME_SPAN = 0.25 // ensure not razor thin sectors (previous 0.18)
// Utilization of each theme sector for level2 placement (we purposely under-fill for whitespace)
const SECTOR_UTILIZATION = 0.55 // previously 0.7
// Article (level 2) packing parameters (arc-length based)
const ARTICLE_GAP = 50 // horizontal gap between article rectangles
const ARTICLE_MIN_UTILIZATION = 0.5 // portion of sector span we target at minimum
const ARTICLE_MAX_UTILIZATION = 0.8 // never exceed this of the sector span with articles
const ARTICLE_RADIUS_PADDING = 40 // extra outward padding after radius fit calc
const ARTICLE_MAX_RADIUS_INFLATE = 900 // cap extra radius growth to avoid runaway
const ARTICLE_BASE_RADIUS = R2
// Collision parameters
const COLLISION_ITERATIONS = 7
const COLLISION_PUSH = 28 // radial push per overlap resolution step
const COLLISION_MARGIN = 34 // extra spacing beyond pure rectangle separation
// Theme auto-balance
const MAX_ARTICLES_PER_THEME = 12
const THEME_SPLIT_MIN_CHILDREN = 16 // only split if exceeding this
// Explanation (level3) packing
const EXPLANATION_GAP = 30
const EXPLANATION_BASE_CLEARANCE = 260
const EXPLANATION_MAX_SPREAD_DEG = 50 // total spread (degrees) allocated for explanations cluster


// Simple seeded hash for deterministic jitter
function hashString(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function estimateNodeDimensions(node: MindMapNode): { width: number; height: number } {
  const charWidth = 8
  if (node.level === 0) {
    return { width: 700, height: 250 }
  } else if (node.level === 1) {
    const textWidth = node.text.length * 10
    return { width: Math.min(Math.max(textWidth + 50, 300), 550), height: 140 }
  } else if (node.level === 2) {
    const textWidth = node.text.length * charWidth
    return { width: Math.min(Math.max(textWidth + 45, 280), 500), height: 180 }
  } else {
    const textWidth = node.text.length * 7
    return { width: Math.min(Math.max(textWidth + 35, 250), 450), height: 100 }
  }
}




export function computeRadialOrbitalLayout(root: MindMapNode): Map<string, RadialLayoutNode> {
  const nodes = new Map<string, RadialLayoutNode>()
  const seed = hashString(root.id)
  const random = rng(seed)

  // Root first
  const rootDim = estimateNodeDimensions(root)
  nodes.set(root.id, {
    id: root.id,
    x: 0,
    y: 0,
    width: rootDim.width,
    height: rootDim.height,
    level: 0,
    data: root,
  })

  // Auto-split dense themes into multiple pseudo-themes for better visual balance
  const originalThemes = root.children.filter(c => c.level === 1)
  const themes: MindMapNode[] = []
  for (const th of originalThemes) {
    const articles = th.children.filter(c => c.level === 2)
    if (articles.length > THEME_SPLIT_MIN_CHILDREN) {
      const chunkSize = Math.ceil(articles.length / Math.ceil(articles.length / MAX_ARTICLES_PER_THEME))
      let part = 0
      for (let i = 0; i < articles.length; i += chunkSize) {
        const slice = articles.slice(i, i + chunkSize)
        themes.push({
          ...th,
          id: th.id + '_part' + (++part),
          text: th.text + ' (' + part + ')',
          children: slice.concat(th.children.filter(c => c.level !== 2)),
        })
      }
    } else {
      themes.push(th)
    }
  }
  // Uniform sector allocation (equal angular spacing) for clearer symmetric mind map
  const themeCount = themes.length || 1
  const totalGap = THEME_GAP * themeCount
  const baseSpan = (Math.PI * 2 - totalGap) / themeCount
  let cursor = 0
  const themeInfos: ThemeInfo[] = []
  for (let i = 0; i < themes.length; i++) {
    const span = Math.max(baseSpan, MIN_THEME_SPAN)
    const start = cursor
    const end = start + span
    const mid = (start + end) / 2
    themeInfos.push({
      node: themes[i],
      weight: 1,
      sector: { start, end, mid, span },
      angle: mid,
    })
    cursor = end + THEME_GAP
  }

  // Normalize if we exceeded 2π unintentionally
  // (Simple approach: recentre angles around average mid)
  // Place themes
  for (const info of themeInfos) {
    const theta = info.angle
    const x = R1 * Math.cos(theta)
    const y = R1 * Math.sin(theta)
    const dim = estimateNodeDimensions(info.node)
    nodes.set(info.node.id, {
      id: info.node.id,
      x,
      y,
      width: dim.width,
      height: dim.height,
      level: 1,
      data: info.node,
    })
  }

  // Place level 2 (articles) per theme using arc-length packing to prevent collisions
  for (const info of themeInfos) {
    const childrenL2 = info.node.children.filter(c => c.level === 2)
    if (childrenL2.length === 0) continue
    const sectorSpan = info.sector.span
    // Target usable span (bounded)
    const targetSpan = sectorSpan * Math.min(
      ARTICLE_MAX_UTILIZATION,
      Math.max(ARTICLE_MIN_UTILIZATION, SECTOR_UTILIZATION)
    )

    // Measure widths
    const articleDims = childrenL2.map(ch => ({ ch, dim: estimateNodeDimensions(ch) }))
    const totalLinear = articleDims.reduce((acc, a) => acc + a.dim.width, 0)
    const totalGaps = ARTICLE_GAP * (childrenL2.length - 1)
    const totalArcLengthNeeded = totalLinear + totalGaps

    // Compute minimal radius so that arc length fits inside targetSpan * r
    // arcLength = radius * angleSpan => radius = arcLength / angleSpan
    let requiredRadius = totalArcLengthNeeded / targetSpan
    if (requiredRadius < ARTICLE_BASE_RADIUS) requiredRadius = ARTICLE_BASE_RADIUS
    const maxRadius = ARTICLE_BASE_RADIUS + ARTICLE_MAX_RADIUS_INFLATE
    if (requiredRadius > maxRadius) requiredRadius = maxRadius
    const r2Theme = requiredRadius + ARTICLE_RADIUS_PADDING

    // Now compute actual angle widths per article at this radius
    const angleWidths = articleDims.map(a => (a.dim.width) / r2Theme)
    // Add proportional gap angles
    const gapAngle = ARTICLE_GAP / r2Theme
    const totalAngleUsed = angleWidths.reduce((s, aw) => s + aw, 0) + gapAngle * (childrenL2.length - 1)
    // Center this within sector at mid
    const startAngle = info.sector.mid - totalAngleUsed / 2

    let cursorA = startAngle
    articleDims.forEach((entry, idx) => {
      const aWidth = angleWidths[idx]
      const angleCenter = cursorA + aWidth / 2
      const rJitter = 1 + (random() - 0.5) * 0.02 // small jitter to avoid perfect circle
      const r = r2Theme * rJitter
      const x = r * Math.cos(angleCenter)
      const y = r * Math.sin(angleCenter)
      nodes.set(entry.ch.id, {
        id: entry.ch.id,
        x,
        y,
        width: entry.dim.width,
        height: entry.dim.height,
        level: 2,
        data: entry.ch,
      })
      cursorA += aWidth + gapAngle
    })
  }

  // Place deeper levels (documents / findings detail)
  // Strategy: For each level2 node, group descendants level >=3.
  for (const info of themeInfos) {
    const l2Nodes = info.node.children.filter(c => c.level === 2)
    for (const l2 of l2Nodes) {
      const l3List: MindMapNode[] = []
      const collect = (n: MindMapNode) => {
        for (const c of n.children) {
          if (c.level >= 3) l3List.push(c)
          collect(c)
        }
      }
      collect(l2)
      if (l3List.length === 0) continue

      const parentPlaced = nodes.get(l2.id)!
      const parentAngle = Math.atan2(parentPlaced.y, parentPlaced.x)

      // Arc-length packing for explanations around parent angle
      const parentBoxRadius = Math.hypot(parentPlaced.x, parentPlaced.y)
      const clearanceBase = Math.max(parentBoxRadius + parentPlaced.width / 2 + EXPLANATION_BASE_CLEARANCE, R3)
      // Measure dims
      const dims = l3List.map(doc => ({ doc, dim: estimateNodeDimensions(doc) }))
      const totalWidth = dims.reduce((s, d) => s + d.dim.width, 0)
      const totalGaps = EXPLANATION_GAP * (l3List.length - 1)
      // Choose a spread angle (rad)
      const maxSpreadRad = (EXPLANATION_MAX_SPREAD_DEG * Math.PI) / 180
      // Required radius so that arc length = widths+gaps inside chosen spread
      let rNeeded = (totalWidth + totalGaps) / maxSpreadRad
      if (rNeeded < clearanceBase) rNeeded = clearanceBase
      const radius = rNeeded
      const angleWidths = dims.map(d => d.dim.width / radius)
      const gapAngle = EXPLANATION_GAP / radius
      const totalAngle = angleWidths.reduce((a, b) => a + b, 0) + gapAngle * (l3List.length - 1)
      const startA = parentAngle - totalAngle / 2
      let cursorA = startA
      dims.forEach(({ doc, dim }, idx) => {
        const aCenter = cursorA + angleWidths[idx] / 2
        const jitter = (random() - 0.5) * 0.02
        const rFinal = radius + jitter * 80 + idx * 12
        const x = rFinal * Math.cos(aCenter)
        const y = rFinal * Math.sin(aCenter)
        nodes.set(doc.id, {
          id: doc.id,
          x,
          y,
          width: dim.width,
          height: dim.height,
          level: doc.level,
          data: doc,
        })
        cursorA += angleWidths[idx] + gapAngle
      })
    }
  }

  // Collision refinement pass (deterministic) – radial outward pushes only to preserve general orbital structure
  resolveCollisions(nodes)

  return nodes
}

// ---- Collision Handling --------------------------------------------------

function resolveCollisions(nodes: Map<string, RadialLayoutNode>) {
  // Group by level (exclude root level 0 from moving)
  const levelGroups = new Map<number, RadialLayoutNode[]>()
  for (const n of nodes.values()) {
    if (n.level === 0) continue
    if (!levelGroups.has(n.level)) levelGroups.set(n.level, [])
    levelGroups.get(n.level)!.push(n)
  }

  for (const [, arr] of levelGroups.entries()) {
    // Deterministic ordering for reproducibility
    arr.sort((a, b) => a.id.localeCompare(b.id))
    for (let iter = 0; iter < COLLISION_ITERATIONS; iter++) {
      let any = false
      for (let i = 0; i < arr.length; i++) {
        const a = arr[i]
        for (let j = i + 1; j < arr.length; j++) {
          const b = arr[j]
          if (rectOverlap(a, b)) {
            // Push the one that is further clockwise (higher angle) outward
            const angleA = Math.atan2(a.y, a.x)
            const angleB = Math.atan2(b.y, b.x)
            const pushTarget = angleA < angleB ? b : a
            radialPush(pushTarget, COLLISION_PUSH)
            any = true
          }
        }
      }
      if (!any) break
    }
  }
}

function rectOverlap(a: RadialLayoutNode, b: RadialLayoutNode): boolean {
  return !(
    a.x + a.width / 2 + COLLISION_MARGIN < b.x - b.width / 2 ||
    a.x - a.width / 2 - COLLISION_MARGIN > b.x + b.width / 2 ||
    a.y + a.height / 2 + COLLISION_MARGIN < b.y - b.height / 2 ||
    a.y - a.height / 2 - COLLISION_MARGIN > b.y + b.height / 2
  )
}

function radialPush(n: RadialLayoutNode, delta: number) {
  const r = Math.hypot(n.x, n.y)
  if (r === 0) return
  const newR = r + delta
  const scale = newR / r
  n.x *= scale
  n.y *= scale
}
