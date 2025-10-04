import { RelationshipExtractor, type DocumentNode, type DocumentEdge } from './relationship-extractor'
import { ThemeDetector, type Theme, type DocumentThemeMap } from './theme-detector'
import { LayoutCalculator } from './layout-calculator'
import { createShapeId } from 'tldraw'

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
    layout: { width: number; height: number }
  }
}

export class CanvasGenerator {
  private relationshipExtractor: RelationshipExtractor
  private themeDetector: ThemeDetector
  private layoutCalculator: LayoutCalculator

  constructor() {
    this.relationshipExtractor = new RelationshipExtractor()
    this.themeDetector = new ThemeDetector()
    this.layoutCalculator = new LayoutCalculator()
  }

  async initialize(openrouterKey: string, model = 'moonshotai/kimi-k2-0905') {
    await this.themeDetector.initialize(openrouterKey, model)
  }

  /**
   * Main method: Generate TLDraw canvas from research results
   */
  async generateCanvas(
    documents: DocumentNode[],
    adversarialDocuments: DocumentNode[] = [],
    options: CanvasGenerationOptions = {}
  ): Promise<CanvasResult> {
    const { verbose = false } = options

    if (verbose) {
      console.log(`🎨 Generating canvas for ${documents.length} documents...`)
    }

    // PHASE 1: Extract relationships
    if (verbose) {
      console.log('📊 Phase 1: Extracting relationships...')
    }

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
      console.log(`✓ Found ${allEdges.length} relationships`)
      console.log(`  - Semantic: ${relationships.semantic.length}`)
      console.log(`  - Citations: ${relationships.citations.length}`)
      console.log(`  - Contradictions: ${relationships.contradictions.length}`)
    }

    // PHASE 2: Detect themes
    if (verbose) {
      console.log('🎯 Phase 2: Detecting themes...')
    }

    const themes = await this.themeDetector.detectThemes(documents)
    const themeMap = this.themeDetector.assignDocumentsToThemes(documents, themes)

    if (verbose) {
      console.log(`✓ Identified ${themes.length} themes:`)
      themes.forEach(t => console.log(`  - ${t.name} (${t.documentIds.length} docs)`))
    }

    // PHASE 3: Calculate layout
    if (verbose) {
      console.log('📐 Phase 3: Calculating layout...')
    }

    const layoutResult = this.layoutCalculator.calculateLayout(
      documents,
      allEdges,
      themes,
      themeMap
    )

    if (verbose) {
      console.log(`✓ Layout complete: ${layoutResult.bounds.width}x${layoutResult.bounds.height}`)
    }

    // PHASE 4: Generate TLDraw shapes
    if (verbose) {
      console.log('🎨 Phase 4: Creating canvas shapes...')
    }

    const shapes: TLDrawShape[] = []
    const bindings: TLDrawBinding[] = []

    // Create document card shapes
    const documentShapes = this.createDocumentShapes(
      documents,
      layoutResult.positions,
      themeMap,
      themes
    )
    shapes.push(...documentShapes)

    // Create theme frames
    const frameShapes = this.createThemeFrames(
      themes,
      documents,
      layoutResult.positions
    )
    shapes.push(...frameShapes)

    // Create connection arrows
    const { arrowShapes, arrowBindings } = this.createConnectionArrows(
      allEdges,
      layoutResult.positions
    )
    shapes.push(...arrowShapes)
    bindings.push(...arrowBindings)

    if (verbose) {
      console.log(`✓ Created ${shapes.length} shapes and ${bindings.length} bindings`)
    }

    return {
      shapes,
      bindings,
      themes,
      stats: {
        documentCount: documents.length,
        edgeCount: allEdges.length,
        themeCount: themes.length,
        layout: layoutResult.bounds,
      },
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
          title: doc.metadata.title,
          similarity: doc.similarity,
          theme: theme?.name || 'Uncategorized',
          themeColor: theme?.color || 'gray',
          content: doc.content.substring(0, 200),
          fullContent: doc.content,
          source: doc.metadata.source,
        },
        meta: {
          documentId: doc.metadata.source,
          themeIds: docThemes,
        },
        index: `a${index}`,
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
          maxX = Math.max(maxX, pos.x + 300) // Document card width
          maxY = Math.max(maxY, pos.y + 200) // Document card height
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
        index: `f${index}`,
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

      arrowShapes.push({
        id: arrowId,
        type: 'arrow',
        x: sourcePos.x + 150, // Center of source card
        y: sourcePos.y + 100,
        props: {
          start: {
            x: 0,
            y: 0,
          },
          end: {
            x: targetPos.x - sourcePos.x,
            y: targetPos.y - sourcePos.y,
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

      // Create bindings (arrows bind to shapes)
      arrowBindings.push({
        id: createShapeId(`binding-start-${index}`),
        type: 'arrow',
        fromId: arrowId,
        toId: createShapeId(edge.source),
        props: {
          terminal: 'start',
        },
      })

      arrowBindings.push({
        id: createShapeId(`binding-end-${index}`),
        type: 'arrow',
        fromId: arrowId,
        toId: createShapeId(edge.target),
        props: {
          terminal: 'end',
        },
      })
    })

    return { arrowShapes, arrowBindings }
  }
}
