import { json } from '@tanstack/react-start'
import { createFileRoute } from '@tanstack/react-router'
import { ResearchAssistant } from '@/lib/research-assistant'
import { documentIndexer } from '@/lib/document-indexer'

export const Route = createFileRoute('/api/research-canvas')({
  loader: async ({ request }) => {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, { status: 405 })
    }

    try {
      const text = await request.text()
      console.log('Raw request body:', text)

      if (!text) {
        return json({ error: 'Empty request body' }, { status: 400 })
      }

      let body
      try {
        body = JSON.parse(text)
      } catch (parseError) {
        console.error('JSON parse error:', parseError)
        return json(
          {
            error: 'Invalid JSON in request body',
            details: parseError instanceof Error ? parseError.message : 'Unknown parse error',
            receivedText: text.substring(0, 100)
          },
          { status: 400 }
        )
      }

      const { query, verbose = false } = body

      if (!query) {
        return json({ error: 'Query is required' }, { status: 400 })
      }

      // Get API keys from environment
      const openaiKey = process.env.OPENAI_API_KEY
      const openrouterKey = process.env.OPENROUTER_API_KEY

      if (!openaiKey || !openrouterKey) {
        return json(
          { error: 'Server API keys not configured. Please set OPENAI_API_KEY and OPENROUTER_API_KEY in .env' },
          { status: 500 }
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

      return json({
        success: true,
        canvas,
      })
    } catch (error) {
      console.error('Error generating research canvas:', error)
      return json(
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          details: error instanceof Error ? error.stack : undefined,
        },
        { status: 500 }
      )
    }
  },
})
