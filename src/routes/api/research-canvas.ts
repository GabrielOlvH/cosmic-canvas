import { createFileRoute } from '@tanstack/react-router'
import { ResearchAssistant } from '@/lib/research-assistant'
import { documentIndexer } from '@/lib/document-indexer'

// IP-based rate limiter (10 requests per hour)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 60 * 1000 // 1 hour in milliseconds

function getClientIp(request: Request): string {
  // Try to get IP from various headers (for proxies, load balancers, etc.)
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  // Fallback to a default if no IP can be determined
  return 'unknown'
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    // New window or expired window
    const resetTime = now + RATE_WINDOW_MS
    rateLimitMap.set(ip, { count: 1, resetTime })
    return { allowed: true, remaining: RATE_LIMIT - 1, resetTime }
  }

  if (record.count >= RATE_LIMIT) {
    // Rate limit exceeded
    return { allowed: false, remaining: 0, resetTime: record.resetTime }
  }

  // Increment count
  record.count++
  return { allowed: true, remaining: RATE_LIMIT - record.count, resetTime: record.resetTime }
}

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now()
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip)
    }
  }
}, 5 * 60 * 1000)

export const Route = createFileRoute('/api/research-canvas')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // Rate limiting check
          const clientIp = getClientIp(request)
          const rateLimit = checkRateLimit(clientIp)

          if (!rateLimit.allowed) {
            const retryAfter = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
            return new Response(
              JSON.stringify({
                error: 'Rate limit exceeded',
                message: `You have exceeded the rate limit of ${RATE_LIMIT} requests per hour. Please try again later.`,
                retryAfter
              }),
              {
                status: 429,
                headers: {
                  'Content-Type': 'application/json',
                  'X-RateLimit-Limit': RATE_LIMIT.toString(),
                  'X-RateLimit-Remaining': '0',
                  'X-RateLimit-Reset': rateLimit.resetTime.toString(),
                  'Retry-After': retryAfter.toString()
                },
              }
            )
          }

          console.log(`✓ Rate limit check passed for IP ${clientIp}: ${rateLimit.remaining} requests remaining`)
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
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': RATE_LIMIT.toString(),
              'X-RateLimit-Remaining': rateLimit.remaining.toString(),
              'X-RateLimit-Reset': rateLimit.resetTime.toString(),
            },
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
