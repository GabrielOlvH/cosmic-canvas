import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { DocumentCanvas } from '@/components/DocumentCanvas'
import '@/styles/space-theme.css'

export const Route = createFileRoute('/canvas')({
  component: CanvasPage,
})

interface CanvasNode {
  id: string
  content: string
  metadata: {
    source: string
    title: string
    type: string
  }
  score: number
}

interface CanvasEdge {
  source: string
  target: string
  weight: number
}

function CanvasPage() {
  const [query, setQuery] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [nodes, setNodes] = useState<CanvasNode[]>([])
  const [edges, setEdges] = useState<CanvasEdge[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [documents, setDocuments] = useState('')
  const [indexing, setIndexing] = useState(false)
  const [showPanel, setShowPanel] = useState(true)

  const handleIndexDocuments = async () => {
    if (!apiKey) {
      setError('Please provide an OpenAI API key')
      return
    }

    if (!documents) {
      setError('Please provide documents to index')
      return
    }

    setIndexing(true)
    setError(null)

    try {
      // Parse documents - expecting JSON format
      const parsedDocs = JSON.parse(documents)

      const response = await fetch('/api/index-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documents: parsedDocs,
          apiKey,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to index documents')
      }

      alert(`Successfully indexed ${data.indexed} documents into ${data.chunks} chunks`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to index documents')
    } finally {
      setIndexing(false)
    }
  }

  const handleSearch = async () => {
    if (!query) {
      setError('Please enter a search query')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/canvas-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, k: 10 }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search')
      }

      setNodes(data.nodes)
      setEdges(data.edges)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative w-full h-screen">
      {/* Control Panel */}
      {showPanel && (
        <div className="absolute top-4 left-4 z-10 space-panel p-6 w-96 max-h-[90vh] overflow-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Cosmic Canvas
            </h2>
            <button
              type="button"
              onClick={() => setShowPanel(false)}
              className="text-cyan-400 hover:text-cyan-300 text-xl"
            >
              ✕
            </button>
          </div>

          {/* API Key Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-cyan-300">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full p-2 rounded holographic-input"
            />
          </div>

          {/* Index Documents Section */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-violet-300">Index Documents</h3>
            <textarea
              value={documents}
              onChange={(e) => setDocuments(e.target.value)}
              placeholder={`[
  {
    "content": "Your document content here...",
    "metadata": {
      "source": "doc1",
      "title": "Document 1",
      "type": "article"
    }
  }
]`}
              className="w-full p-2 rounded font-mono text-sm h-40 holographic-input"
            />
            <button
              type="button"
              onClick={handleIndexDocuments}
              disabled={indexing}
              className="mt-2 w-full holographic-button p-2 rounded font-semibold disabled:opacity-50"
            >
              {indexing ? 'Indexing...' : 'Index Documents'}
            </button>
          </div>

          {/* Search Section */}
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2 text-cyan-300">Search & Visualize</h3>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter search query..."
              className="w-full p-2 rounded mb-2 holographic-input"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="w-full holographic-button p-2 rounded font-semibold disabled:opacity-50"
            >
              {loading ? 'Searching...' : '🔍 Search & Generate Canvas'}
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Results Summary */}
          {nodes.length > 0 && (
            <div className="mt-4 p-3 bg-cyan-900/20 border border-cyan-500/30 rounded">
              <p className="text-sm text-cyan-200">
                🌟 Found {nodes.length} related documents with {edges.length} connections
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 text-sm text-gray-300">
            <h4 className="font-semibold mb-2 text-violet-300">How to use:</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Enter your OpenAI API key</li>
              <li>Paste your documents in JSON format</li>
              <li>Click "Index Documents"</li>
              <li>Enter a search query</li>
              <li>Explore the cosmic canvas</li>
            </ol>
          </div>
        </div>
      )}

      {/* Toggle Panel Button */}
      {!showPanel && (
        <button
          type="button"
          onClick={() => setShowPanel(true)}
          className="absolute top-4 left-4 z-10 space-panel p-3 holographic-button"
        >
          ☰ Open Panel
        </button>
      )}

      {/* Canvas */}
      {nodes.length > 0 ? (
        <DocumentCanvas nodes={nodes} edges={edges} />
      ) : (
        <div className="flex items-center justify-center h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
          <div className="text-center text-cyan-300">
            <h3 className="text-xl font-semibold mb-2">🌌 No documents in the cosmos yet</h3>
            <p className="text-gray-400">Index some documents and search to discover your knowledge universe</p>
          </div>
        </div>
      )}
    </div>
  )
}
