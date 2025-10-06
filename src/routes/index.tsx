import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ResearchCanvas } from '@/components/ResearchCanvas'
import { SpaceBackground } from '@/components/space-theme/SpaceBackground'
import { Search, Loader2 } from 'lucide-react'
import type { CanvasResult } from '@/lib/canvas-generator'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const [query, setQuery] = useState('')
  const [canvasData, setCanvasData] = useState<CanvasResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [progress, setProgress] = useState(0)

  // Warn before leaving if canvas exists
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (canvasData) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [canvasData])

  // Simulate progress during loading
  useEffect(() => {
    if (!loading) {
      setProgress(0)
      return
    }

    const stages = [
      { progress: 15, delay: 500, message: '🔍 Enriching query with domain context...' },
      { progress: 30, delay: 2000, message: '📚 Searching 588 indexed documents...' },
      { progress: 50, delay: 4000, message: '🧠 Analyzing semantic relationships...' },
      { progress: 65, delay: 6000, message: '🎨 Detecting research themes...' },
      { progress: 80, delay: 8000, message: '🔗 Building knowledge graph...' },
      { progress: 90, delay: 10000, message: '✨ Generating visual layout...' },
    ]

    stages.forEach(({ progress: p, delay, message }) => {
      setTimeout(() => {
        if (loading) {
          setProgress(p)
          setStatusMessage(message)
        }
      }, delay)
    })
  }, [loading])

  const handleGenerateCanvas = async () => {
    if (!query.trim()) {
      setError('Please enter a research question')
      return
    }

    setLoading(true)
    setError(null)
    setStatusMessage('🔍 Searching documents...')

    try {
      const startTime = Date.now()
      setStatusMessage('⏳ Generating canvas (2-4 minutes)...')

      const response = await fetch('/api/research-canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          verbose: true,
        }),
      })

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
      setStatusMessage(`📡 Received response after ${elapsed}s...`)

      const responseText = await response.text()
      let data
      try {
        data = JSON.parse(responseText)
      } catch (parseError) {
        if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
          throw new Error('Server returned HTML error page. Check server logs.')
        }
        throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`)
      }

      if (!response.ok) {
        throw new Error(data.error || data.details || 'Failed to generate canvas')
      }

      if (!data.canvas) {
        throw new Error('Server response missing canvas data')
      }

      setStatusMessage('✨ Canvas generated!')
      console.log('✓ Canvas generated:', data.canvas)
      setProgress(100)
      setCanvasData(data.canvas)
      
      // Clear status after a brief moment
      setTimeout(() => {
        setStatusMessage('')
        setProgress(0)
      }, 2000)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      console.error('❌ Error:', errorMessage)
      setError(errorMessage)
      setStatusMessage('')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleGenerateCanvas()
    }
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0a0e27]">
      {/* Space Background */}
      <div className="absolute inset-0 z-0">
        <SpaceBackground />
      </div>

      {/* Canvas (if exists) */}
      {canvasData && (
        <div className="absolute inset-0 z-10">
          <ResearchCanvas canvasData={canvasData} />
        </div>
      )}

      {/* Search Overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        <div className="flex items-start justify-center pt-12 px-4">
          <div className="pointer-events-auto w-full max-w-3xl">
            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-5xl font-bold text-white mb-3 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Cosmic Canvas
              </h1>
              <p className="text-lg text-gray-300">
                AI-Powered Research Mind Maps
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 via-teal-500/20 to-cyan-500/20 rounded-2xl blur-xl" />
              <div className="relative bg-[#0f1629]/90 backdrop-blur-xl rounded-2xl border border-cyan-500/30 shadow-2xl">
                <div className="flex items-center gap-4 p-6">
                  <Search className="w-6 h-6 text-cyan-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your research question..."
                    disabled={loading}
                    className="flex-1 bg-transparent text-white text-lg placeholder-gray-400 outline-none disabled:opacity-50"
                  />
                  <button
                    onClick={handleGenerateCanvas}
                    disabled={loading || !query.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-medium rounded-xl hover:from-cyan-400 hover:to-teal-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <span>Generate</span>
                    )}
                  </button>
                </div>

                {/* Progress Indicator */}
                {loading && (
                  <div className="px-6 pb-6">
                    {/* Progress Bar */}
                    <div className="relative h-2 bg-gray-700/50 rounded-full overflow-hidden mb-3">
                      <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {/* Status Text */}
                    <p className="text-sm text-cyan-300">{statusMessage}</p>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="px-6 pb-4">
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                      <p className="text-sm text-red-400">{error}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Welcome Message (only when no canvas and not loading) */}
            {!canvasData && !loading && (
              <div className="mt-8 text-center">
                <p className="text-gray-400 text-sm">
                  Explore space biology research through interactive visual canvases
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
