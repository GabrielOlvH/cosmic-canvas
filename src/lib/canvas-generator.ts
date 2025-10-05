import { RelationshipExtractor, type DocumentNode, type DocumentEdge } from './relationship-extractor'
import { ThemeDetector, type Theme, type DocumentThemeMap } from './theme-detector'
import { LayoutCalculator, type MindMapHierarchy, type HierarchyNode } from './layout-calculator'
import { ContentExtractor, type KeyFinding } from './content-extractor'
import { createShapeId } from 'tldraw'
import { toRichText } from 'tldraw'
import type { MindMapNode } from '../components/MindMapGenerator'

export interface CanvasGenerationOptions {
  verbose?: boolean
}

export interface TLDrawShape {
  id: string
  type: string
  x: number
  y: number
  rotation?: number
  props: Record<string, any>
  parentId?: string
  index?: string
  meta?: Record<string, any>
}

export interface TLDrawBinding {
  id: string
  type: string
  fromId: string
  toId: string
  props?: Record<string, any>
}

export interface CanvasResult {
  shapes: TLDrawShape[]
  bindings: TLDrawBinding[]
  themes: Theme[]
  stats: {
    documentCount: number
    edgeCount: number
    themeCount: number
    findingCount?: number
    layout: { width: number; height: number }
  }
  researchQuestion?: string
  hierarchy?: {
    nodes: Record<string, HierarchyNode>
    centerNodeId: string
  }
  findings?: Record<string, KeyFinding[]>
  mindMapData?: MindMapNode // NEW: Mind map data structure for MindMapGenerator component
}

export class CanvasGenerator {
  private relationshipExtractor: RelationshipExtractor
  private themeDetector: ThemeDetector
  private layoutCalculator: LayoutCalculator
  private contentExtractor: ContentExtractor

  constructor() {
    this.relationshipExtractor = new RelationshipExtractor()
    this.themeDetector = new ThemeDetector()
    this.layoutCalculator = new LayoutCalculator()
    this.contentExtractor = new ContentExtractor()
  }

  async initialize(openrouterKey: string, model = 'moonshotai/kimi-k2-0905') {
    await this.themeDetector.initialize(openrouterKey, model)
    await this.contentExtractor.initialize(openrouterKey, model)
  }

  /**
   * Main method: Generate TLDraw canvas from research results as MIND MAP
   */
  async generateCanvas(
    documents: DocumentNode[],
    adversarialDocuments: DocumentNode[] = [],
    options: CanvasGenerationOptions = {},
    researchQuery = '' // NEW: Research query for central node
  ): Promise<CanvasResult> {
    const { verbose = false } = options

    const totalStart = Date.now()
    if (verbose) {
      console.log(`\n🎨 Generating MIND MAP canvas for ${documents.length} documents...`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    }

    // PHASE 1: Extract relationships (for connection arrows)
    if (verbose) {
      console.log('\n📊 Phase 1/6: Extracting relationships...')
    }
    const phase1Start = Date.now()

    const relationships = this.relationshipExtractor.extractAllRelationships(
      documents,
      adversarialDocuments
    )

    const allEdges: DocumentEdge[] = [
      ...relationships.semantic,
      ...relationships.citations,
      ...relationships.contradictions,
    ]

    if (verbose) {
      const phase1Time = ((Date.now() - phase1Start) / 1000).toFixed(1)
      console.log(`✓ Found ${allEdges.length} relationships (${phase1Time}s)`)
    }

    // PHASE 2: Detect themes
    if (verbose) {
      console.log('\n🎯 Phase 2/6: Detecting themes...')
    }
    const phase2Start = Date.now()

    const themes = await this.themeDetector.detectThemes(documents)
    const themeMap = this.themeDetector.assignDocumentsToThemes(documents, themes)

    if (verbose) {
      const phase2Time = ((Date.now() - phase2Start) / 1000).toFixed(1)
      console.log(`✓ Identified ${themes.length} themes (${phase2Time}s):`)
      themes.forEach(t => console.log(`  - ${t.name} (${t.documentIds.length} docs)`))
    }

    // PHASE 3: Extract key findings from documents
    if (verbose) {
      console.log('\n📝 Phase 3/6: Extracting key findings...')
    }
    const phase3Start = Date.now()

    const researchQuestion = researchQuery
      ? await this.contentExtractor.extractResearchQuestion(researchQuery)
      : 'Research Overview'

    if (verbose) {
      console.log(`  Research question: "${researchQuestion}"`)
    }

    const findingsMap = await this.contentExtractor.extractAllThemeFindings(
      documents,
      themes,
      researchQuestion,
      verbose
    )

    let totalFindings = 0
    for (const findings of findingsMap.values()) {
      totalFindings += findings.length
    }

    if (verbose) {
      const phase3Time = ((Date.now() - phase3Start) / 1000).toFixed(1)
      console.log(`✓ Extracted ${totalFindings} key findings across ${themes.length} themes (${phase3Time}s)`)
    }

    // PHASE 4: Build hierarchical mind map structure
    if (verbose) {
      console.log('\n🌳 Phase 4/6: Building mind map hierarchy...')
    }
    const phase4Start = Date.now()

    const hierarchy = this.buildMindMapHierarchy(
      researchQuestion,
      themes,
      findingsMap,
      documents
    )

    if (verbose) {
      const phase4Time = ((Date.now() - phase4Start) / 1000).toFixed(1)
      console.log(`✓ Built hierarchy with ${hierarchy.nodes.size} nodes (${phase4Time}s)`)
    }

    // PHASE 5: Calculate hierarchical radial layout
    if (verbose) {
      console.log('\n📐 Phase 5/6: Calculating radial layout...')
    }
    const phase5Start = Date.now()

    const layoutResult = this.layoutCalculator.calculateLayout(
      documents,
      allEdges,
      themes,
      themeMap,
      hierarchy // NEW: Pass hierarchy for radial layout
    )

    if (verbose) {
      const phase5Time = ((Date.now() - phase5Start) / 1000).toFixed(1)
      console.log(`✓ Layout complete: ${layoutResult.bounds.width.toFixed(0)}x${layoutResult.bounds.height.toFixed(0)} (${phase5Time}s)`)
    }

    // PHASE 6: Generate TLDraw shapes for mind map
    if (verbose) {
      console.log('\n🎨 Phase 6/6: Creating mind map shapes...')
    }
    const phase6Start = Date.now()

    const shapes: TLDrawShape[] = []
    const bindings: TLDrawBinding[] = []

    // SIMPLIFIED HUMAN-READABLE LAYOUT
    // Create simple mind map with center node, themes, and labeled connections

    if (verbose) {
      console.log('  → Creating simplified human-readable mind map...')
    }

    // 1. Central research question node (larger, prominent) - returns array of box + label
    shapes.push(...this.createSimpleCenterNode(researchQuestion))

    // 2. Theme nodes around center with top findings as text
    const simplifiedShapes = this.createSimplifiedThemeNodes(
      themes,
      findingsMap,
      researchQuestion
    )
    shapes.push(...simplifiedShapes.shapes)

    // 3. Labeled arrows connecting center to themes
    const labeledArrows = this.createLabeledConnections(
      themes,
      findingsMap,
      simplifiedShapes.positions
    )
    shapes.push(...labeledArrows)

    if (verbose) {
      const phase6Time = ((Date.now() - phase6Start) / 1000).toFixed(1)
      console.log(`✓ Created ${shapes.length} mind map shapes (${phase6Time}s)`)

      // Final summary
      const totalTime = ((Date.now() - totalStart) / 1000).toFixed(1)
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log(`🎉 Mind map generation complete!`)
      console.log(`   Total time: ${totalTime}s`)
      console.log(`   ${documents.length} documents → ${themes.length} themes → ${totalFindings} findings → ${shapes.length} shapes`)
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    }

    // Convert Maps to plain objects for JSON serialization
    const findingsObject: Record<string, KeyFinding[]> = {}
    for (const [key, value] of findingsMap.entries()) {
      findingsObject[key] = value
    }

    const hierarchyNodesObject: Record<string, HierarchyNode> = {}
    for (const [key, value] of hierarchy.nodes.entries()) {
      hierarchyNodesObject[key] = value
    }

    // Generate MindMapNode data structure for MindMapGenerator component
    const mindMapData = this.convertToMindMapFormat(
      researchQuestion,
      themes,
      findingsMap,
      documents
    )

    if (verbose) {
      console.log(`\n✓ Mind map data generated:`)
      console.log(`  - Root text: "${mindMapData.text}"`)
      console.log(`  - Themes: ${mindMapData.children.length}`)
      console.log(`  - Total findings: ${mindMapData.children.reduce((sum, theme) => sum + theme.children.length, 0)}`)
    }

    return {
      shapes,
      bindings,
      themes,
      stats: {
        documentCount: documents.length,
        edgeCount: allEdges.length,
        themeCount: themes.length,
        findingCount: totalFindings,
        layout: layoutResult.bounds,
      },
      researchQuestion,
      hierarchy: {
        nodes: hierarchyNodesObject,
        centerNodeId: hierarchy.centerNodeId,
      },
      findings: findingsObject,
      mindMapData, // NEW: Mind map data for MindMapGenerator
    }
  }

    /**
   * Convert extracted findings into MindMapNode format
   * 
   * Creates a hierarchical structure:
   * - Level 0: Research question (center)
   * - Level 1: Themes (main topics)
   * - Level 2: Studies (documents)
   * - Level 3: Key findings (sub-topics)
   */
  private convertToMindMapFormat(
    researchQuestion: string,
    themes: Theme[],
    findingsMap: Map<string, KeyFinding[]>,
    documents: DocumentNode[]
  ): MindMapNode {
    // Create a map of documentId -> document for quick lookup
    const documentMap = new Map<string, DocumentNode>()
    for (const doc of documents) {
      documentMap.set(doc.metadata.source, doc)
    }
    
    // GROUP FINDINGS BY DOCUMENT (STUDY)
    const documentGroups = new Map<string, { findings: KeyFinding[], theme: Theme }>()
    
    for (const theme of themes) {
      const findings = findingsMap.get(theme.id) || []
      for (const finding of findings) {
        if (!documentGroups.has(finding.documentId)) {
          documentGroups.set(finding.documentId, { findings: [], theme })
        }
        documentGroups.get(finding.documentId)!.findings.push(finding)
      }
    }

    // GROUP STUDIES BY THEME
    const themeStudyMap = new Map<string, Array<{ documentId: string, findings: KeyFinding[] }>>()
    
    for (const [documentId, { findings, theme }] of documentGroups.entries()) {
      if (!themeStudyMap.has(theme.id)) {
        themeStudyMap.set(theme.id, [])
      }
      themeStudyMap.get(theme.id)!.push({ documentId, findings })
    }

    return {
      id: 'root',
      text: researchQuestion || 'Research Overview',
      level: 0,
      metadata: {
        type: 'question',
        description: 'Central research question'
      },
      children: themes.map((theme, themeIndex) => {
        const studies = themeStudyMap.get(theme.id) || []
        
        // Take top 6 studies per sub-topic (for good spacing)
        const topStudies = studies
          .sort((a, b) => b.findings.length - a.findings.length)
          .slice(0, 6)

        return {
          id: `subtopic-${themeIndex}`,
          text: theme.name,
          level: 1,
          metadata: {
            type: 'subtopic',
            documentCount: studies.length,
            description: theme.description || `${studies.length} related studies`
          },
          children: topStudies.map((study, studyIndex) => {
            // Get document metadata from the original documents
            const document = documentMap.get(study.documentId)
            const studyTitle = document?.metadata?.title || study.documentId
            const studyAuthors = document?.metadata?.authors
            const studyUrl = document?.metadata?.url
            const studyDoi = document?.metadata?.doi
            const studyYear = document?.metadata?.year
            
            // Take top 3 findings from this study
            const topFindings = study.findings
              .sort((a, b) => (b.importance || 0) - (a.importance || 0))
              .slice(0, 3)

            return {
              id: `study-${themeIndex}-${studyIndex}`,
              text: studyTitle,
              level: 2,
              metadata: {
                type: 'study',
                source: study.documentId,
                findingCount: study.findings.length,
                authors: studyAuthors,
                doi: studyDoi,
                year: studyYear,
                url: studyUrl,
              },
              children: topFindings.map((finding, findingIndex) => ({
                id: `finding-${themeIndex}-${studyIndex}-${findingIndex}`,
                text: finding.finding,
                level: 3,
                metadata: {
                  type: 'finding',
                  importance: finding.importance,
                },
                children: [],
              })),
            }
          }),
        }
      }),
    }
  }

  /**
   * Build hierarchical mind map structure
   * Level 0: Research Question (center)
   * Level 1: Themes
   * Level 2: Key Findings
   * Level 3: Documents
   */
  private buildMindMapHierarchy(
    researchQuestion: string,
    themes: Theme[],
    findingsMap: Map<string, KeyFinding[]>,
    documents: DocumentNode[]
  ): MindMapHierarchy {
    const nodes = new Map<string, HierarchyNode>()
    const centerNodeId = 'center-research-question'

    // Level 0: Center node
    const centerNode: HierarchyNode = {
      id: centerNodeId,
      level: 0,
      children: themes.map(t => `theme-${t.id}`),
    }
    nodes.set(centerNodeId, centerNode)

    // Level 1: Theme nodes
    for (const theme of themes) {
      const themeNodeId = `theme-${theme.id}`
      const findings = findingsMap.get(theme.id) || []

      const themeNode: HierarchyNode = {
        id: themeNodeId,
        level: 1,
        parentId: centerNodeId,
        children: findings.map(f => `finding-${f.documentId}`),
      }
      nodes.set(themeNodeId, themeNode)

      // Level 2: Finding nodes (one per document in theme)
      for (const finding of findings) {
        const findingNodeId = `finding-${finding.documentId}`

        const findingNode: HierarchyNode = {
          id: findingNodeId,
          level: 2,
          parentId: themeNodeId,
          children: [finding.documentId], // Link to actual document
          importance: finding.importance,
        }
        nodes.set(findingNodeId, findingNode)

        // Level 3: Document node (leaf)
        const docNode: HierarchyNode = {
          id: finding.documentId,
          level: 3,
          parentId: findingNodeId,
          children: [],
        }
        nodes.set(finding.documentId, docNode)
      }
    }

    return {
      nodes,
      centerNodeId,
    }
  }

  /**
   * Create document card shapes
   */
  private createDocumentShapes(
    documents: DocumentNode[],
    positions: Map<string, { x: number; y: number }>,
    themeMap: DocumentThemeMap,
    themes: Theme[]
  ): TLDrawShape[] {
    const CARD_WIDTH = 450
    const CARD_HEIGHT = 280

    return documents.map((doc, index) => {
      const pos = positions.get(doc.metadata.source) || { x: 0, y: 0 }
      const docThemes = themeMap[doc.metadata.source] || []
      const theme = docThemes.length > 0 ? themes.find(t => t.id === docThemes[0]) : null

      return {
        id: createShapeId(doc.metadata.source),
        type: 'document-card',
        x: pos.x,
        y: pos.y,
        props: {
          w: CARD_WIDTH,
          h: CARD_HEIGHT,
          title: doc.metadata.title,
          similarity: doc.similarity,
          theme: theme?.name || 'Uncategorized',
          themeColor: theme?.color || 'grey',
          content: doc.content.substring(0, 200),
          fullContent: doc.content,
          source: doc.metadata.source,
        },
        parentId: theme ? createShapeId(`frame-${theme.id}`) : undefined,
        meta: {
          documentId: doc.metadata.source,
          themeIds: docThemes,
        },
        index: `a${index + 100}`,
      }
    })
  }

  /**
   * Create theme frame shapes to group documents
   */
  private createThemeFrames(
    themes: Theme[],
    documents: DocumentNode[],
    positions: Map<string, { x: number; y: number }>
  ): TLDrawShape[] {
    const CARD_WIDTH = 450
    const CARD_HEIGHT = 280

    return themes.map((theme, index) => {
      // Calculate bounding box for documents in this theme
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity

      for (const docId of theme.documentIds) {
        const pos = positions.get(docId)
        if (pos) {
          minX = Math.min(minX, pos.x)
          minY = Math.min(minY, pos.y)
          maxX = Math.max(maxX, pos.x + CARD_WIDTH)
          maxY = Math.max(maxY, pos.y + CARD_HEIGHT)
        }
      }

      const padding = 50

      return {
        id: createShapeId(`frame-${theme.id}`),
        type: 'frame',
        x: minX - padding,
        y: minY - padding,
        props: {
          w: maxX - minX + 2 * padding,
          h: maxY - minY + 2 * padding,
          name: theme.name,
        },
        meta: {
          themeId: theme.id,
          color: theme.color,
        },
        index: `a${index}`,
      }
    })
  }

  /**
   * Create arrow shapes for connections
   */
  private createConnectionArrows(
    edges: DocumentEdge[],
    positions: Map<string, { x: number; y: number }>
  ): { arrowShapes: TLDrawShape[]; arrowBindings: TLDrawBinding[] } {
    const arrowShapes: TLDrawShape[] = []
    const arrowBindings: TLDrawBinding[] = []

    edges.forEach((edge, index) => {
      const sourcePos = positions.get(edge.source)
      const targetPos = positions.get(edge.target)

      if (!sourcePos || !targetPos) return

      const arrowId = createShapeId(`arrow-${index}`)
      const sourceShapeId = createShapeId(edge.source)
      const targetShapeId = createShapeId(edge.target)

      // Determine arrow style based on edge type
      let color = 'black'
      let dash: 'draw' | 'dashed' | 'dotted' | 'solid' = 'solid'
      let size: 's' | 'm' | 'l' | 'xl' = 'm'

      if (edge.type === 'semantic') {
        color = 'light-blue'
        dash = 'dashed'
        size = 's'
      } else if (edge.type === 'citation') {
        color = 'blue'
        dash = 'solid'
        size = 'm'
      } else if (edge.type === 'contradiction') {
        color = 'red'
        dash = 'solid'
        size = 'm'
      }

      // Calculate relative positions for arrow endpoints (centered on cards)
      const CARD_CENTER_X = 225  // 450 / 2
      const CARD_CENTER_Y = 140  // 280 / 2

      const dx = targetPos.x - sourcePos.x
      const dy = targetPos.y - sourcePos.y

      arrowShapes.push({
        id: arrowId,
        type: 'arrow',
        x: sourcePos.x + CARD_CENTER_X,
        y: sourcePos.y + CARD_CENTER_Y,
        props: {
          start: {
            x: 0,
            y: 0,
          },
          end: {
            x: dx,
            y: dy,
          },
          color,
          dash,
          size,
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow',
        },
        meta: {
          edgeType: edge.type,
          source: edge.source,
          target: edge.target,
        },
        index: `e${index}`,
      })
    })

    return { arrowShapes, arrowBindings }
  }

  /**
   * NEW MIND MAP SHAPE CREATORS
   */

  /**
   * Create central research question node
   */
  private createCenterNode(
    researchQuestion: string,
    positions: Map<string, { x: number; y: number }>
  ): TLDrawShape {
    const pos = positions.get('center-research-question') || { x: 0, y: 0 }

    return {
      id: createShapeId('center-research-question'),
      type: 'geo',
      x: pos.x - 400, // Center the 800px wide shape
      y: pos.y - 125, // Center the 250px tall shape
      props: {
        w: 800,
        h: 250,
        geo: 'ellipse',
        color: 'yellow',
        fill: 'solid',
        richText: toRichText(researchQuestion),
        size: 'xl',
        font: 'sans',
        align: 'middle',
        verticalAlign: 'middle',
        labelColor: 'yellow',
        dash: 'solid',
        growY: 0,
        url: '',
      },
      meta: {
        nodeType: 'center',
        level: 0,
        isMainTopic: true,
      },
      index: 'a0',
    }
  }

  /**
   * Create theme nodes (level 1)
   */
  private createThemeNodes(
    themes: Theme[],
    positions: Map<string, { x: number; y: number }>,
    hierarchy: MindMapHierarchy
  ): TLDrawShape[] {
    return themes.map((theme, index) => {
      const nodeId = `theme-${theme.id}`
      const pos = positions.get(nodeId) || { x: 0, y: 0 }

      return {
        id: createShapeId(nodeId),
        type: 'geo',
        x: pos.x - 250, // Center the 500px wide shape
        y: pos.y - 90, // Center the 180px tall shape
        props: {
          w: 500,
          h: 180,
          geo: 'rectangle',
          color: theme.color,
          fill: 'semi',
          richText: toRichText(theme.name),
          size: 'l',
          font: 'sans',
          align: 'middle',
          verticalAlign: 'middle',
          labelColor: theme.color,
          dash: 'solid',
          growY: 0,
          url: '',
        },
        meta: {
          nodeType: 'theme',
          level: 1,
          themeId: theme.id,
          documentCount: theme.documentIds.length,
        },
        index: `a${10 + index}`,
      }
    })
  }

  /**
   * Create finding nodes (level 2) - showing key findings from documents
   */
  private createFindingNodes(
    findingsMap: Map<string, KeyFinding[]>,
    positions: Map<string, { x: number; y: number }>,
    hierarchy: MindMapHierarchy,
    themes: Theme[]
  ): TLDrawShape[] {
    const shapes: TLDrawShape[] = []
    let shapeIndex = 100

    for (const [themeId, findings] of findingsMap.entries()) {
      const theme = themes.find(t => t.id === themeId)

      for (const finding of findings) {
        const nodeId = `finding-${finding.documentId}`
        const pos = positions.get(nodeId) || { x: 0, y: 0 }

        shapes.push({
          id: createShapeId(nodeId),
          type: 'geo',
          x: pos.x - 225, // Center the 450px wide shape
          y: pos.y - 70, // Center the 140px tall shape
          props: {
            w: 450,
            h: 140,
            geo: 'rectangle',
            color: theme?.color || 'grey',
            fill: 'none',
            richText: toRichText(finding.finding), // KEY FINDING (3-7 words)
            size: 'm',
            font: 'sans',
            align: 'middle',
            verticalAlign: 'middle',
            labelColor: theme?.color || 'grey',
            dash: 'solid',
            growY: 0,
            url: '',
          },
          meta: {
            nodeType: 'finding',
            level: 2,
            findingDetail: finding.detail,
            importance: finding.importance,
            themeId,
          },
          index: `a${shapeIndex++}`,
        })
      }
    }

    return shapes
  }

  /**
   * Create document nodes with finding content (level 3)
   */
  private createDocumentNodesWithFindings(
    documents: DocumentNode[],
    positions: Map<string, { x: number; y: number }>,
    findingsMap: Map<string, KeyFinding[]>,
    hierarchy: MindMapHierarchy
  ): TLDrawShape[] {
    const shapes: TLDrawShape[] = []
    let shapeIndex = 1000

    // Create a map of documentId -> finding for quick lookup
    const docToFinding = new Map<string, KeyFinding>()
    for (const findings of findingsMap.values()) {
      for (const finding of findings) {
        docToFinding.set(finding.documentId, finding)
      }
    }

    for (const doc of documents) {
      const pos = positions.get(doc.metadata.source)
      if (!pos) continue

      const finding = docToFinding.get(doc.metadata.source)
      if (!finding) continue // Skip documents without findings

      shapes.push({
        id: createShapeId(doc.metadata.source),
        type: 'document-card',
        x: pos.x,
        y: pos.y,
        props: {
          w: 450,
          h: 280,
          title: doc.metadata.title,
          similarity: doc.similarity,
          theme: '', // Not needed in mind map
          themeColor: 'grey',
          content: finding.detail, // Show the 1-sentence detail instead of random snippet
          fullContent: doc.content,
          source: doc.metadata.source,
          keyFinding: finding.finding, // NEW: Add key finding to props
        },
        meta: {
          nodeType: 'document',
          level: 3,
          documentId: doc.metadata.source,
          keyFinding: finding.finding,
          findingDetail: finding.detail,
        },
        index: `a${shapeIndex++}`,
      })
    }

    return shapes
  }

  /**
   * Create connection lines between hierarchy levels
   */
  private createHierarchyConnections(
    hierarchy: MindMapHierarchy,
    positions: Map<string, { x: number; y: number }>
  ): TLDrawShape[] {
    const lines: TLDrawShape[] = []
    let lineIndex = 5000

    // Connect each node to its children
    for (const [nodeId, node] of hierarchy.nodes.entries()) {
      const parentPos = positions.get(nodeId)
      if (!parentPos || node.children.length === 0) continue

      for (const childId of node.children) {
        const childPos = positions.get(childId)
        if (!childPos) continue

        // Calculate center points considering shape sizes
        let parentCenterX = parentPos.x
        let parentCenterY = parentPos.y
        let childCenterX = childPos.x
        let childCenterY = childPos.y

        // Adjust for shape sizes
        if (node.level === 0) {
          // Center node: 600x200 ellipse
          parentCenterX = parentPos.x
          parentCenterY = parentPos.y
        } else if (node.level === 1) {
          // Theme node: 500x180 rectangle
          parentCenterX = parentPos.x
          parentCenterY = parentPos.y
        } else if (node.level === 2) {
          // Finding node: 450x140 rectangle
          parentCenterX = parentPos.x
          parentCenterY = parentPos.y
        }

        const dx = childCenterX - parentCenterX
        const dy = childCenterY - parentCenterY

        // Line style and LABEL based on level
        let color = 'black'
        let size: 's' | 'm' | 'l' = 'm'
        let dash: 'draw' | 'dashed' | 'dotted' | 'solid' = 'solid'
        let labelText = ''

        if (node.level === 0) {
          // Center to themes
          color = 'blue'
          size = 'l'
          labelText = 'Theme'
        } else if (node.level === 1) {
          // Themes to findings
          color = 'violet'
          size = 'm'
          labelText = 'Finding'
        } else if (node.level === 2) {
          // Findings to documents
          color = 'grey'
          size = 's'
          dash = 'dashed'
          labelText = 'Evidence'
        }

        lines.push({
          id: createShapeId(`line-${nodeId}-${childId}`),
          type: 'arrow',
          x: parentCenterX,
          y: parentCenterY,
          props: {
            start: { x: 0, y: 0 },
            end: { x: dx, y: dy },
            color,
            size,
            dash,
            arrowheadStart: 'none',
            arrowheadEnd: 'none', // No arrowheads for cleaner mind map look
          },
          meta: {
            connectionType: 'hierarchy',
            level: node.level,
            relationshipExplanation: labelText,
          },
          index: `z${lineIndex++}`, // z-index to put behind shapes
        })
      }
    }

    return lines
  }

  /**
   * Create relationship edges (semantic, citation, contradiction) WITH LABELS
   * These show cross-cutting relationships beyond hierarchy
   */
  private createRelationshipConnectionsWithLabels(
    edges: DocumentEdge[],
    positions: Map<string, { x: number; y: number }>,
    showRelationships = true
  ): TLDrawShape[] {
    if (!showRelationships) return []

    // Limit to top 5 edges by importance to reduce visual clutter
    const sortedEdges = [...edges]
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, 5)

    const lines: TLDrawShape[] = []
    let lineIndex = 8000

    for (const edge of sortedEdges) {
      const sourcePos = positions.get(edge.source)
      const targetPos = positions.get(edge.target)
      if (!sourcePos || !targetPos) continue

      const dx = targetPos.x - sourcePos.x
      const dy = targetPos.y - sourcePos.y

      let color = 'black'
      let size: 's' | 'm' | 'l' = 's'
      let dash: 'draw' | 'dashed' | 'dotted' | 'solid' = 'dashed'
      let labelText = ''

      if (edge.type === 'semantic') {
        color = 'light-blue'
        dash = 'dashed'
        size = 's'
        labelText = `${(edge.similarity * 100).toFixed(0)}% similar`
      } else if (edge.type === 'citation') {
        color = 'green'
        dash = 'solid'
        size = 's'
        labelText = 'cites'
      } else if (edge.type === 'contradiction') {
        color = 'red'
        dash = 'solid'
        size = 'm'
        labelText = 'opposes'
      }

      lines.push({
        id: createShapeId(`relationship-${edge.type}-${lineIndex}`),
        type: 'arrow',
        x: sourcePos.x,
        y: sourcePos.y,
        props: {
          start: { x: 0, y: 0 },
          end: { x: dx, y: dy },
          color,
          size,
          dash,
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow',
        },
        meta: {
          connectionType: 'relationship',
          edgeType: edge.type,
          relationshipExplanation: labelText,
        },
        index: `z${lineIndex++}`,
      })
    }

    return lines
  }

  /**
   * Create simplified center node (larger, more prominent)
   */
  private createSimpleCenterNode(researchQuestion: string): TLDrawShape[] {
    const box: TLDrawShape = {
      id: createShapeId('center'),
      type: 'geo',
      x: -250,
      y: -100,
      rotation: 0,
      isLocked: false,
      opacity: 1,
      props: {
        w: 500,
        h: 200,
        geo: 'rectangle',
        color: 'blue',
        labelColor: 'blue',
        fill: 'solid',
        dash: 'solid',
        size: 'xl',
        font: 'sans',
        align: 'middle',
        verticalAlign: 'middle',
        growY: 0,
        url: '',
      },
      meta: {
        nodeType: 'center',
      },
      index: 'a0',
      typeName: 'shape',
    }

    const label: TLDrawShape = {
      id: createShapeId('center-label'),
      type: 'text',
      x: -230,
      y: -80,
      rotation: 0,
      isLocked: false,
      opacity: 1,
      props: {
        richText: toRichText(researchQuestion),
        size: 'xl',
        font: 'sans',
        color: 'blue',
        w: 460,
        textAlign: 'middle',
        autoSize: false,
        scale: 1,
      },
      meta: {},
      index: 'a0_label',
      typeName: 'shape',
    }

    return [box, label]
  }

  /**
   * Create simplified theme nodes arranged in a circle
   * Returns shapes and their positions for connecting arrows
   */
  private createSimplifiedThemeNodes(
    themes: Theme[],
    findingsMap: Map<string, KeyFinding[]>,
    researchQuestion: string
  ): { shapes: TLDrawShape[]; positions: Map<string, { x: number; y: number }> } {
    const shapes: TLDrawShape[] = []
    const positions = new Map<string, { x: number; y: number }>()

    const radius = 600 // Distance from center
    const centerX = 0
    const centerY = 0

    themes.forEach((theme, index) => {
      const angle = (index / themes.length) * 2 * Math.PI - Math.PI / 2
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)

      // Get top 3 findings for this theme
      const findings = (findingsMap.get(theme.id) || []).slice(0, 3)
      const findingsText = findings.map((f, i) => `${i + 1}. ${f.finding}`).join('\n')

      // Theme box (no text)
      const themeBox: TLDrawShape = {
        id: createShapeId(`theme-${theme.id}`),
        type: 'geo',
        x: x - 150,
        y: y - 100,
        rotation: 0,
        isLocked: false,
        opacity: 1,
        props: {
          w: 300,
          h: 200,
          geo: 'rectangle',
          color: 'violet',
          labelColor: 'violet',
          fill: 'semi',
          dash: 'solid',
          size: 'm',
          font: 'sans',
          align: 'middle',
          verticalAlign: 'middle',
          growY: 0,
          url: '',
        },
        meta: {
          nodeType: 'theme',
          themeId: theme.id,
        },
        index: `a${index + 1}`,
        typeName: 'shape',
      }

      // Theme label as separate text shape
      const themeLabel: TLDrawShape = {
        id: createShapeId(`theme-label-${theme.id}`),
        type: 'text',
        x: x - 140,
        y: y - 90,
        rotation: 0,
        isLocked: false,
        opacity: 1,
        props: {
          richText: toRichText(`${theme.name}\n\n${findingsText}`),
          size: 's',
          font: 'sans',
          color: 'violet',
          w: 280,
          textAlign: 'start',
          autoSize: false,
          scale: 1,
        },
        meta: {},
        index: `a${index + 1}_label`,
        typeName: 'shape',
      }

      shapes.push(themeBox, themeLabel)
      positions.set(theme.id, { x, y })
    })

    return { shapes, positions }
  }

  /**
   * Create labeled connections between center and themes
   */
  private createLabeledConnections(
    themes: Theme[],
    findingsMap: Map<string, KeyFinding[]>,
    themePositions: Map<string, { x: number; y: number }>
  ): TLDrawShape[] {
    const shapes: TLDrawShape[] = []

    themes.forEach((theme, index) => {
      const pos = themePositions.get(theme.id)
      if (!pos) return

      // Arrow from center to theme
      const arrow: TLDrawShape = {
        id: createShapeId(`arrow-${theme.id}`),
        type: 'arrow',
        x: 0,
        y: 0,
        rotation: 0,
        isLocked: false,
        opacity: 1,
        props: {
          start: { x: 0, y: 0 },
          end: { x: pos.x, y: pos.y },
          color: 'blue',
          size: 'm',
          dash: 'solid',
          arrowheadStart: 'none',
          arrowheadEnd: 'arrow',
        },
        meta: {
          connectionType: 'theme-connection',
        },
        index: `z${index}`,
        typeName: 'shape',
      }

      shapes.push(arrow)
    })

    return shapes
  }
}
