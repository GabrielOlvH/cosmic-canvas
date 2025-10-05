import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'
import { DocumentCanvas } from '@/components/DocumentCanvas'

export const Route = createFileRoute('/demo-canvas')({
  component: DemoCanvasPage,
})

/**
 * Demo canvas page with pre-populated test data
 * Shows the space theme with various planet types and connections
 */
function DemoCanvasPage() {
  // Add beforeunload event listener to warn user before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
      return 'Você tem certeza que quer sair da página? Você perderá todo seu progresso.'
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Mock data representing different types of documents with varying relevance scores
  const mockNodes = [
    {
      id: 'doc1',
      content: 'Artificial Intelligence (AI) is the simulation of human intelligence by machines. It encompasses machine learning, deep learning, natural language processing, computer vision, and robotics. AI systems can learn from data, recognize patterns, make decisions, and solve complex problems autonomously.',
      metadata: {
        source: 'LeCun et al., 2015 | Nature',
        title: 'Deep Learning',
        type: 'article',
      },
      score: 0.15,
      similarity: 0.92,
    },
    {
      id: 'doc2',
      content: 'Machine Learning is a subset of AI that enables systems to learn and improve from experience without being explicitly programmed. It uses algorithms to analyze data, identify patterns, and make predictions. Common types include supervised learning, unsupervised learning, and reinforcement learning.',
      metadata: {
        source: 'Bishop, 2006 | Springer',
        title: 'Pattern Recognition & ML',
        type: 'article',
      },
      score: 0.25,
      similarity: 0.87,
    },
    {
      id: 'doc3',
      content: 'Deep Learning utilizes neural networks with multiple layers to process complex patterns in data. It powers applications like image recognition, speech processing, and autonomous vehicles. Convolutional Neural Networks (CNNs) and Recurrent Neural Networks (RNNs) are popular architectures.',
      metadata: {
        source: 'Goodfellow et al., 2016',
        title: 'Deep Learning (Book)',
        type: 'research',
      },
      score: 0.35,
      similarity: 0.82,
    },
    {
      id: 'doc4',
      content: 'Natural Language Processing (NLP) enables machines to understand, interpret, and generate human language. Applications include chatbots, translation services, sentiment analysis, and text summarization. Transformer models like GPT and BERT have revolutionized NLP.',
      metadata: {
        source: 'Vaswani et al., 2017 | NIPS',
        title: 'Attention Is All You Need',
        type: 'article',
      },
      score: 0.45,
      similarity: 0.77,
    },
    {
      id: 'doc5',
      content: 'Training datasets are crucial for machine learning success. Data must be cleaned, labeled, and split into training, validation, and test sets. Feature engineering and data augmentation improve model performance. Quality data leads to better predictions.',
      metadata: {
        source: 'Deng et al., 2009 | CVPR',
        title: 'ImageNet Dataset',
        type: 'data',
      },
      score: 0.55,
      similarity: 0.72,
    },
    {
      id: 'doc6',
      content: 'Python is the dominant language for AI development. Libraries like TensorFlow, PyTorch, scikit-learn, and Keras simplify model building. NumPy and Pandas handle data manipulation. Jupyter notebooks enable interactive development.',
      metadata: {
        source: 'Paszke et al., 2019 | NeurIPS',
        title: 'PyTorch Framework',
        type: 'code',
      },
      score: 0.65,
      similarity: 0.67,
    },
    {
      id: 'doc7',
      content: 'Computer Vision enables machines to interpret visual information from the world. Applications include facial recognition, object detection, image segmentation, and autonomous navigation. CNNs are particularly effective for vision tasks.',
      metadata: {
        source: 'He et al., 2016 | CVPR',
        title: 'ResNet Architecture',
        type: 'research',
      },
      score: 0.75,
      similarity: 0.62,
    },
    {
      id: 'doc8',
      content: 'Reinforcement Learning trains agents through rewards and penalties. The agent learns optimal strategies by interacting with an environment. Applications include game playing, robotics, and resource management. Q-learning and policy gradients are common approaches.',
      metadata: {
        source: 'Sutton & Barto, 2018 | MIT Press',
        title: 'Reinforcement Learning',
        type: 'article',
      },
      score: 0.85,
      similarity: 0.57,
    },
    {
      id: 'doc9',
      content: 'Neural network architectures vary by application. Feedforward networks for classification, RNNs for sequences, CNNs for images, and Transformers for language. Each architecture has unique strengths and optimal use cases.',
      metadata: {
        source: 'Krizhevsky et al., 2012 | NIPS',
        title: 'AlexNet & CNN Evolution',
        type: 'research',
      },
      score: 0.95,
      similarity: 0.52,
    },
    {
      id: 'doc10',
      content: 'AI ethics addresses bias, privacy, transparency, and accountability. Responsible AI development considers societal impacts. Fairness metrics, explainable AI, and ethical guidelines help ensure beneficial outcomes.',
      metadata: {
        source: 'Jobin et al., 2019 | Nature MI',
        title: 'Global AI Ethics Guidelines',
        type: 'article',
      },
      score: 1.2,
      similarity: 0.40,
    },
  ]

  // Create edges showing relationships between documents
  const mockEdges = [
    { source: 'doc1', target: 'doc2', weight: 0.92 }, // AI -> ML
    { source: 'doc2', target: 'doc3', weight: 0.87 }, // ML -> Deep Learning
    { source: 'doc3', target: 'doc4', weight: 0.82 }, // Deep Learning -> NLP
    { source: 'doc2', target: 'doc5', weight: 0.77 }, // ML -> Training Data
    { source: 'doc2', target: 'doc6', weight: 0.72 }, // ML -> Python
    { source: 'doc3', target: 'doc7', weight: 0.67 }, // Deep Learning -> Computer Vision
    { source: 'doc2', target: 'doc8', weight: 0.62 }, // ML -> Reinforcement Learning
    { source: 'doc3', target: 'doc9', weight: 0.57 }, // Deep Learning -> Architectures
    { source: 'doc1', target: 'doc10', weight: 0.52 }, // AI -> Ethics
  ]

  return (
    <div className="relative w-full h-screen">
      {/* Info Panel */}
      <div className="absolute top-4 left-4 z-10 space-panel p-6 w-96">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-4">
          🌌 Demo Cosmic Canvas
        </h2>
        <div className="text-sm text-gray-300 space-y-3">
          <p className="text-cyan-300">
            Complex research network showing 10 interconnected AI/ML studies with citations, annotations, and relationship types.
          </p>

          <div className="bg-cyan-900/20 border border-cyan-500/30 rounded p-3">
            <p className="font-semibold text-violet-300 mb-2">📚 Document Types:</p>
            <ul className="space-y-1 text-xs">
              <li><span className="text-blue-400">●</span> Blue = Review Articles</li>
              <li><span className="text-purple-400">●</span> Purple = Research Papers</li>
              <li><span className="text-orange-400">●</span> Orange = Code/Tools</li>
              <li><span className="text-yellow-400">●</span> Yellow = Datasets</li>
            </ul>
          </div>

          <div className="bg-slate-900/20 border border-slate-500/30 rounded p-3">
            <p className="font-semibold text-slate-300 mb-2">🔗 Connection Types:</p>
            <ul className="space-y-1 text-xs">
              <li>━━━ Strong (builds upon)</li>
              <li>─── Related work</li>
              <li>┄┄┄ Weak (mentions)</li>
            </ul>
          </div>

          <div className="bg-violet-900/20 border border-violet-500/30 rounded p-3">
            <p className="font-semibold text-cyan-300 mb-2">✨ Canvas Features:</p>
            <ul className="space-y-1 text-xs">
              <li>• Animated starfield background</li>
              <li>• Planet-style document nodes</li>
              <li>• Smooth curved connections</li>
              <li>• Grouped research clusters (frames)</li>
              <li>• Highlight boxes for key studies</li>
              <li>• Export-ready for presentations</li>
            </ul>
          </div>

          <div className="bg-green-900/20 border border-green-500/30 rounded p-3">
            <p className="font-semibold text-green-300 mb-2">📊 Research Tools:</p>
            <ul className="space-y-1 text-xs">
              <li>• Frames group related studies</li>
              <li>• Yellow box highlights primary source</li>
              <li>• Use tldraw tools to add notes</li>
              <li>• Draw connections & annotations</li>
              <li>• Add sticky notes for insights</li>
            </ul>
          </div>

          <div className="bg-pink-900/20 border border-pink-500/30 rounded p-3">
            <p className="font-semibold text-pink-300 mb-2">🎮 Controls:</p>
            <ul className="space-y-1 text-xs">
              <li>• Drag to pan around space</li>
              <li>• Scroll to zoom in/out</li>
              <li>• Click planets to select</li>
              <li>• Double-click to edit</li>
            </ul>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded p-3">
            <p className="font-semibold text-blue-300 mb-2">ℹ️ Canvas Elements:</p>
            <ul className="space-y-1 text-xs">
              <li>• <strong>Frames:</strong> Group related research topics</li>
              <li>• <strong>Yellow box:</strong> Highlights primary source</li>
              <li>• <strong>Colored boxes:</strong> Annotation/callout areas</li>
              <li>• <strong>Blue box (bottom-left):</strong> Legend placeholder</li>
            </ul>
          </div>

          <div className="bg-orange-900/20 border border-orange-500/30 rounded p-3">
            <p className="font-semibold text-orange-300 mb-2">💡 Try This:</p>
            <ul className="space-y-1 text-xs">
              <li>1. Use the <strong>Text tool</strong> (T) to add labels</li>
              <li>2. Use <strong>Draw tool</strong> (D) to sketch connections</li>
              <li>3. Add <strong>Sticky notes</strong> (N) for insights</li>
              <li>4. <strong>Export</strong> (Ctrl+E) for presentations</li>
              <li>5. Double-click boxes to edit/add content</li>
            </ul>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            Navigate to <code className="bg-gray-800 px-1 rounded">/canvas</code> to use with real documents
          </p>
        </div>
      </div>

      {/* Canvas with mock data */}
      <DocumentCanvas nodes={mockNodes} edges={mockEdges} />
    </div>
  )
}
