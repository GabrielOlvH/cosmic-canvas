import { createFileRoute } from '@tanstack/react-router'
import { ResearchAssistant } from '@/lib/research-assistant'
import { documentIndexer } from '@/lib/document-indexer'

export const Route = createFileRoute('/api/research-canvas')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const text = await request.text()
          console.log('🔍 Raw request body:', text.substring(0, 100))

          if (!text) {
            return new Response(JSON.stringify({ error: 'Empty request body' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          let body: Record<string, unknown>
          try {
            body = JSON.parse(text)
          } catch (parseError) {
            console.error('JSON parse error:', parseError)
            return new Response(
              JSON.stringify({
                error: 'Invalid JSON in request body',
                details: parseError instanceof Error ? parseError.message : 'Unknown parse error',
              }),
              {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          const { query, verbose = false } = body as {
            query?: string
            verbose?: boolean
          }

          if (!query) {
            return new Response(JSON.stringify({ error: 'Query is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Get API keys from environment
          const openaiKey = process.env.OPENAI_API_KEY
          const openrouterKey = process.env.OPENROUTER_API_KEY

          if (!openaiKey || !openrouterKey) {
            return new Response(
              JSON.stringify({ error: 'Server API keys not configured' }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          // Initialize document indexer
          try {
            await documentIndexer.initialize(openaiKey, process.env.CHROMA_URL)
          } catch (error) {
            console.error('❌ Failed to initialize document indexer:', error)
            return new Response(
              JSON.stringify({
                error: 'Failed to initialize document indexer',
                details: error instanceof Error ? error.message : String(error),
              }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          if (!documentIndexer.isReady()) {
            console.error('❌ Document indexer not ready after initialization attempt')
            return new Response(
              JSON.stringify({ error: 'Document indexer is not ready' }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          // Initialize research assistant
          const assistant = new ResearchAssistant(documentIndexer)
          await assistant.initialize(openaiKey, openrouterKey)

          console.log(`🔍 Generating research canvas for query: "${query}"`)

          // Generate canvas
          const canvas = await assistant.conductResearchCanvas(query, {
            verbose,
          })

          console.log(`✓ Canvas generated:`, {
            shapes: canvas.shapes.length,
            bindings: canvas.bindings.length,
            themes: canvas.themes.length,
            stats: canvas.stats,
          })
          
          // Log mindMapData status
          if (canvas.mindMapData) {
            console.log(`✓ Mind map data included:`, {
              root: canvas.mindMapData.text,
              themes: canvas.mindMapData.children.length,
              totalFindings: canvas.mindMapData.children.reduce((sum, theme) => sum + theme.children.length, 0),
            })
          } else {
            console.error('❌ WARNING: mindMapData is missing from canvas response!')
          }

          // Validate that the canvas can be serialized to JSON
          let responseJson: string
          try {
            responseJson = JSON.stringify({
              success: true,
              canvas,
            })
          } catch (serializationError) {
            console.error('❌ Failed to serialize canvas to JSON:', serializationError)
            return new Response(
              JSON.stringify({
                error: 'Failed to serialize canvas data',
                details: serializationError instanceof Error ? serializationError.message : 'Unknown serialization error',
              }),
              {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
              }
            )
          }

          console.log(`✓ Response JSON size: ${(responseJson.length / 1024).toFixed(1)} KB`)

          // Validate response structure
          const responseObj = JSON.parse(responseJson)
          if (responseObj.canvas.findings && typeof responseObj.canvas.findings !== 'object') {
            console.error('❌ Warning: findings is not an object:', typeof responseObj.canvas.findings)
          }
          if (responseObj.canvas.hierarchy?.nodes && typeof responseObj.canvas.hierarchy.nodes !== 'object') {
            console.error('❌ Warning: hierarchy.nodes is not an object:', typeof responseObj.canvas.hierarchy.nodes)
          }

          return new Response(responseJson, {
            headers: { 'Content-Type': 'application/json' },
          })
        } catch (error) {
          console.error('❌ Error generating research canvas:', error)
          return new Response(
            JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
              details: error instanceof Error ? error.stack : undefined,
            }),
            {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
      },
    },
  },
})
