import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { documentIndexer } from '@/lib/document-indexer'

export const Route = createFileRoute('/api/search')({
  loader: async ({ request }) => {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 })
    }

    try {
      const body = await request.json()
      const { query, k = 5 } = body

      if (!query) {
        return json({ error: 'Query is required' }, { status: 400 })
      }

      const results = await documentIndexer.search(query, k)

      return json({
        success: true,
        results,
      })
    } catch (error) {
      console.error('Error searching documents:', error)
      return json(
        { error: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      )
    }
  },
})
