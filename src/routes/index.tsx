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
      { progress: 10, delay: 500, message: '🔍 Enriching query with scientific terminology and space biology context...' },
      { progress: 20, delay: 2000, message: '📚 Searching 588 indexed documents across space research database...' },
      { progress: 35, delay: 8000, message: '🧠 Analyzing semantic relationships between documents... (this takes ~1 minute)' },
      { progress: 50, delay: 20000, message: '🎨 Detecting research themes and clustering findings... (this takes ~1 minute)' },
      { progress: 65, delay: 40000, message: '🔗 Building hierarchical knowledge graph structure...' },
      { progress: 75, delay: 60000, message: '📐 Calculating optimal node positions with anti-clustering algorithm...' },
      { progress: 85, delay: 80000, message: '✨ Generating visual layout with arc-length spacing... (almost done!)' },
      { progress: 95, delay: 100000, message: '🎨 Rendering final canvas elements...' },
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
            {/* Title - Always visible */}
            <div className="text-center mb-6">
              <h1 className="text-5xl font-bold text-white mb-3 bg-gradient-to-r from-cyan-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Cosmic Canvas
              </h1>
              <p className="text-lg text-gray-300">
                AI-Powered Research Mind Maps
              </p>
            </div>

            {/* Search Bar - Hide when canvas is loaded */}
            {!canvasData && (
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
                      {/* Time Estimate */}
                      <div className="text-center mb-3">
                        <p className="text-xs text-gray-400">⏱️ Estimated time: 3-4 minutes</p>
                      </div>
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
            )}

            {/* Welcome Message (only when no canvas and not loading) */}
            {!canvasData && !loading && (
              <div className="mt-8 max-w-2xl mx-auto">
                <div className="bg-[#0f1629]/80 backdrop-blur-xl rounded-2xl border border-cyan-500/20 p-8 space-y-4 text-gray-300">
                  <p className="text-base leading-relaxed">
                    Finding connections across hundreds of scientific studies is overwhelming. We built an AI research assistant that transforms database searches into interactive visual knowledge maps.
                  </p>
                  
                  <p className="text-base leading-relaxed">
                    Our system takes <span className="text-cyan-400 font-semibold">608 space biology studies</span>, embedded in ChromaDB, and uses a RAG-powered LangChain agent (via Open Router with <span className="text-cyan-400">moonshotai/kimi-k2-0905</span>) to understand your questions. Instead of returning a simple list, it identifies themes across documents and generates interactive mind maps using tldraw—showing how studies relate to each other and to your query, complete with citations and links.
                  </p>
                  
                  <p className="text-base leading-relaxed">
                    <span className="text-teal-400 font-semibold">Why mind maps?</span> Because research isn't linear. You can see all connections at once, think spatially, edit the maps directly in the app, and export them as images for presentations or papers.
                  </p>
                  
                  <p className="text-base leading-relaxed">
                    This is a working prototype for space biology, but the bigger vision is universal: any research database can become a visual knowledge graph. We're continuing to improve the visuals, speed, and accuracy over time.
                  </p>
                  
                  <p className="text-sm text-cyan-400 italic border-t border-cyan-500/20 pt-4 mt-4">
                    Built for NASA Space Apps Challenge - Making scientific discovery intuitive and visual.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
