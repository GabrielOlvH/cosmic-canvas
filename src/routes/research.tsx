import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ResearchCanvas } from '@/components/ResearchCanvas'
import type { CanvasResult } from '@/lib/canvas-generator'

export const Route = createFileRoute('/research')({
  component: ResearchPage,
})

function ResearchPage() {
  const [query, setQuery] = useState('')
  const [canvasData, setCanvasData] = useState<CanvasResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPanel, setShowPanel] = useState(true)
  const [statusMessage, setStatusMessage] = useState<string>('')

  const handleGenerateCanvas = async () => {
    if (!query.trim()) {
      setError('Please enter a research question')
      return
    }

    setLoading(true)
    setError(null)
    setStatusMessage('🔍 Sending request to server...')

    try {
      console.log('🔍 Generating research canvas...')

      const startTime = Date.now()
      setStatusMessage('⏳ Waiting for server response (this may take 2-4 minutes)...')

      const response = await fetch('/api/research-canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          verbose: true,
        }),
      })

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      setStatusMessage(`📡 Received response after ${elapsed}s, parsing data...`)

      console.log('✓ Response status:', response.status)
      console.log('✓ Response headers:', Object.fromEntries(response.headers.entries()))

      setStatusMessage('📄 Reading response data...')
      const responseText = await response.text()
      console.log('✓ Response size:', (responseText.length / 1024).toFixed(1), 'KB')
      console.log('✓ Response preview:', responseText.substring(0, 200))

      let data
      try {
        setStatusMessage('🔧 Parsing JSON response...')
        data = JSON.parse(responseText)
      } catch (parseError) {
        console.error('❌ JSON Parse Error:', parseError)
        console.error('Response text:', responseText)

        // Check if response is HTML error page
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          throw new Error('Server returned HTML error page instead of JSON. Check server logs for details.')
        }

        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`)
      }

      if (!response.ok) {
        console.error('❌ API Error Response:', data)
        throw new Error(data.error || data.details || 'Failed to generate research canvas')
      }

      if (!data.canvas) {
        console.error('❌ Missing canvas in response:', data)
        throw new Error('Server response missing canvas data')
      }

      setStatusMessage('✨ Canvas generated successfully!')
      console.log('✓ Canvas generated successfully:', data.canvas.stats)
      console.log('✓ Canvas shapes:', data.canvas.shapes?.length || 0)
      console.log('✓ Canvas themes:', data.canvas.themes?.length || 0)
      console.log('✓ Mind map data:', data.canvas.mindMapData ? 'Present ✓' : 'Missing ✗')
      if (data.canvas.mindMapData) {
        console.log('  - Root text:', data.canvas.mindMapData.text)
        console.log('  - Themes:', data.canvas.mindMapData.children?.length || 0)
      }

      setCanvasData(data.canvas)
      setShowPanel(false) // Hide panel to show full canvas
      setStatusMessage('')
    } catch (err) {
      console.error('❌ Error:', err)
      setError(err instanceof Error ? err.message : 'Failed to generate canvas')
      setStatusMessage('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full h-screen bg-white">
      {/* Control Panel */}
      {showPanel && (
        <div className="absolute top-4 left-4 z-10 bg-white shadow-lg rounded-lg border border-gray-200 p-6 w-[500px] max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Research Canvas
            </h2>
            {canvasData && (
              <button
                type="button"
                onClick={() => setShowPanel(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            )}
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Generate an interactive knowledge graph from your indexed documents.
            The canvas will show document relationships, themes, and contradictions.
          </p>

          {/* Research Question Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700">
              Research Question
            </label>
            <textarea
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleGenerateCanvas()
                }
              }}
              placeholder="e.g., What are the effects of spaceflight on cellular oxidative stress?"
              className="w-full p-3 rounded border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
              rows={4}
            />
            <p className="text-xs text-gray-500 mt-1">
              Press Ctrl+Enter to generate
            </p>
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerateCanvas}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-3 rounded font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Generating Canvas...</span>
              </>
            ) : (
              <>
                <span>🔍</span>
                <span>Generate Research Canvas</span>
              </>
            )}
          </button>

          {/* Status Message */}
          {statusMessage && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              {statusMessage}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Canvas Stats */}
          {canvasData && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <h3 className="font-semibold text-blue-900 mb-2">Canvas Generated</h3>
              <div className="text-sm text-blue-800 space-y-1">
                <p>📄 Documents: {canvasData.stats.documentCount}</p>
                <p>🔗 Connections: {canvasData.stats.edgeCount}</p>
                <p>🎨 Themes: {canvasData.stats.themeCount}</p>
                <p>
                  📐 Size: {canvasData.stats.layout.width} × {canvasData.stats.layout.height}
                </p>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600 font-medium mb-2">Themes:</p>
                <div className="flex flex-wrap gap-1">
                  {canvasData.themes.map((theme) => (
                    <span
                      key={theme.id}
                      className="text-xs px-2 py-1 bg-white border border-blue-300 rounded-full text-blue-700"
                    >
                      {theme.name} ({theme.documentIds.length})
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 text-sm text-gray-600">
            <h4 className="font-semibold mb-2 text-gray-800">How it works:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Enter your research question</li>
              <li>The system finds relevant documents</li>
              <li>Identifies themes and relationships</li>
              <li>Creates an interactive knowledge graph</li>
              <li>Explore by zooming, panning, and clicking</li>
            </ol>
          </div>

          {/* Legend */}
          <div className="mt-6 p-3 bg-gray-50 rounded border border-gray-200">
            <h4 className="font-semibold mb-2 text-gray-800 text-sm">Legend:</h4>
            <div className="space-y-2 text-xs text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-blue-400" />
                <span>Semantic similarity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-blue-600" />
                <span>Citation link</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-red-500" />
                <span>Contradiction</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toggle Panel Button */}
      {!showPanel && canvasData && (
        <button
          type="button"
          onClick={() => setShowPanel(true)}
          className="absolute top-4 left-4 z-10 bg-white shadow-lg rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
        >
          ☰ Show Panel
        </button>
      )}

      {/* Canvas or Empty State */}
      {canvasData ? (
        <ResearchCanvas canvasData={canvasData} />
      ) : (
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center text-gray-600 max-w-md">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-2xl font-semibold mb-3 text-gray-800">
              Research Canvas
            </h3>
            <p className="text-gray-600 mb-6">
              Enter a research question to generate an interactive knowledge graph
              from your indexed documents. The canvas will visualize document
              relationships, themes, and contradictory findings.
            </p>
            <div className="text-sm text-gray-500">
              Make sure you've indexed some documents first at{' '}
              <a href="/canvas" className="text-blue-600 hover:underline">
                /canvas
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
