import { createFileRoute } from '@tanstack/react-router'
import { documentIndexer } from '@/lib/document-indexer'

export const Route = createFileRoute('/api/canvas-data')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { query, k = 10 } = body

          if (!query) {
            return new Response(JSON.stringify({ error: 'Query is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Initialize indexer if needed
          const apiKey = process.env.OPENAI_API_KEY
          if (apiKey) {
            try {
              await documentIndexer.initialize(apiKey)
            } catch (error) {
              // Already initialized, continue
            }
          }

          const graphData = await documentIndexer.searchRelated(query, k)

          return new Response(
            JSON.stringify({
              success: true,
              ...graphData,
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          )
        } catch (error) {
          console.error('Error getting canvas data:', error)
          return new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
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
