import { useEffect, useRef } from 'react'
import {
  Tldraw,
  createShapeId,
  useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import '@/styles/canvas-space-theme.css'
import { DocumentCardUtil } from './shapes/DocumentCardUtil'
import type { CanvasResult } from '../lib/canvas-generator'
import { MindMapGenerator } from './MindMapGenerator'
import { SpaceBackground } from './space-theme/SpaceBackground'

interface ResearchCanvasProps {
  canvasData: CanvasResult
  onShapeClick?: (shapeId: string, props: any) => void
  useMindMap?: boolean // NEW: Toggle between legacy shapes and new mind map
}

const customShapeUtils = [DocumentCardUtil]

function CanvasLoader({ canvasData, useMindMap }: { canvasData: CanvasResult; useMindMap?: boolean }) {
  const editor = useEditor()
  const loadedRef = useRef(false)

  useEffect(() => {
    // Only load once
    if (loadedRef.current) return
    loadedRef.current = true

    // If useMindMap is enabled and mindMapData exists, don't load legacy shapes
    // The MindMapGenerator component will handle it
    if (useMindMap && canvasData.mindMapData) {
      console.log('✓ Using MindMapGenerator for canvas rendering')
      console.log('  - Root text:', canvasData.mindMapData.text)
      console.log('  - Themes:', canvasData.mindMapData.children?.length || 0)
      return
    }

    console.log('✓ Using legacy shape-based rendering')
    console.log('  - Shapes to create:', canvasData.shapes.length)

    try {
      // Clear existing shapes
      const existingShapes = Array.from(editor.getCurrentPageShapeIds())
      if (existingShapes.length > 0) {
        editor.deleteShapes(existingShapes)
      }

      // Create all shapes (legacy mode)
      const shapesToCreate = canvasData.shapes.map((shape) => {
        // Convert our shape format to TLDraw format
        const shapeId = createShapeId(shape.id)

        if (shape.type === 'document-card') {
          return {
            id: shapeId,
            type: 'document-card',
            x: shape.x,
            y: shape.y,
            rotation: shape.rotation || 0,
            props: {
              w: shape.props.w || 450,
              h: shape.props.h || 280,
              ...shape.props,
            },
            meta: shape.meta || {},
            parentId: shape.parentId,
          }
        } else if (shape.type === 'frame') {
          return {
            id: shapeId,
            type: 'frame',
            x: shape.x,
            y: shape.y,
            rotation: shape.rotation || 0,
            props: shape.props,
            meta: shape.meta || {},
          }
        } else if (shape.type === 'arrow') {
          return {
            id: shapeId,
            type: 'arrow',
            x: shape.x,
            y: shape.y,
            rotation: shape.rotation || 0,
            props: shape.props,
            meta: shape.meta || {},
          }
        } else if (shape.type === 'geo') {
          return {
            id: shapeId,
            type: 'geo',
            x: shape.x,
            y: shape.y,
            rotation: shape.rotation || 0,
            props: shape.props,
            meta: shape.meta || {},
          }
        } else if (shape.type === 'text') {
          return {
            id: shapeId,
            type: 'text',
            x: shape.x,
            y: shape.y,
            rotation: shape.rotation || 0,
            props: shape.props,
            meta: shape.meta || {},
          }
        }

        return null
      }).filter(Boolean)

      // Create shapes (arrows now have bindings embedded in their props)
      editor.createShapes(shapesToCreate as any[])

      // Fit canvas to content
      editor.zoomToFit({ animation: { duration: 400 } })

      console.log('✓ Canvas loaded (legacy mode):', {
        shapes: canvasData.shapes.length,
        themes: canvasData.themes.length,
      })
    } catch (error) {
      console.error('Failed to load canvas:', error)
    }
  }, [editor, canvasData, useMindMap])

  return null
}

export function ResearchCanvas({ canvasData, useMindMap = true }: ResearchCanvasProps) {
  return (
    <div className="w-full h-screen relative">
      {/* Space-themed background layer with enhanced dynamics */}
      <SpaceBackground 
        starDensity={0.7} 
        nebulaIntensity={0.35} 
        enableMouseParallax={true}
        className="absolute inset-0 z-0"
      />
      
      {/* TLDraw canvas with transparent background */}
      <div className="absolute inset-0 z-10" style={{
        // Make tldraw background transparent to show space theme
        '--color-background': 'transparent',
        '--color-low': 'rgba(255, 255, 255, 0.05)',
        '--color-mid': 'rgba(255, 255, 255, 0.1)',
      } as React.CSSProperties}>
        <Tldraw
          shapeUtils={customShapeUtils}
          onMount={() => {
            console.log('TLDraw editor mounted')
          }}
        >
          <CanvasLoader canvasData={canvasData} useMindMap={useMindMap} />
          {/* Render MindMapGenerator if enabled and data is available */}
          {useMindMap && canvasData.mindMapData && (
            <MindMapGenerator data={canvasData.mindMapData} />
          )}
        </Tldraw>
      </div>
    </div>
  )
}
