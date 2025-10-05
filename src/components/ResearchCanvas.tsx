import { useEffect, useRef } from 'react'
import {
  Tldraw,
  type TLShapeId,
  type Editor,
  createShapeId,
  useEditor,
} from 'tldraw'
import 'tldraw/tldraw.css'
import { DocumentCardUtil, type DocumentCardShape } from './shapes/DocumentCardUtil'
import type { CanvasResult } from '../lib/canvas-generator'

interface ResearchCanvasProps {
  canvasData: CanvasResult
  onShapeClick?: (shapeId: string, props: any) => void
}

const customShapeUtils = [DocumentCardUtil]

function CanvasLoader({ canvasData }: { canvasData: CanvasResult }) {
  const editor = useEditor()
  const loadedRef = useRef(false)

  useEffect(() => {
    // Only load once
    if (loadedRef.current) return
    loadedRef.current = true

    try {
      // Clear existing shapes
      const existingShapes = editor.getCurrentPageShapeIds()
      if (existingShapes.length > 0) {
        editor.deleteShapes(existingShapes)
      }

      // Create all shapes
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

      console.log('✓ Canvas loaded:', {
        shapes: canvasData.shapes.length,
        themes: canvasData.themes.length,
      })
    } catch (error) {
      console.error('Failed to load canvas:', error)
    }
  }, [editor, canvasData])

  return null
}

export function ResearchCanvas({ canvasData, onShapeClick }: ResearchCanvasProps) {
  return (
    <div className="w-full h-screen">
      <Tldraw
        shapeUtils={customShapeUtils}
        onMount={(editor) => {
          console.log('TLDraw editor mounted')
        }}
      >
        <CanvasLoader canvasData={canvasData} />
      </Tldraw>
    </div>
  )
}
