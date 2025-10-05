import { createFileRoute } from '@tanstack/react-router'
import { documentIndexer } from '@/lib/document-indexer'

export const Route = createFileRoute('/api/index-documents')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json()
          const { documents, apiKey } = body

          if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API key is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          if (!documents || !Array.isArray(documents)) {
            return new Response(JSON.stringify({ error: 'Documents array is required' }), {
              status: 400,
              headers: { 'Content-Type': 'application/json' },
            })
          }

          // Initialize if not already done
          try {
            await documentIndexer.initialize(apiKey)
          } catch (error) {
            // Already initialized, continue
          }

          const result = await documentIndexer.indexDocuments(documents)

          return new Response(
            JSON.stringify({
              success: true,
              ...result,
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            }
          )
        } catch (error) {
          console.error('Error indexing documents:', error)
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
