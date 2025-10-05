import { createFileRoute } from '@tanstack/react-router'
import { Tldraw } from 'tldraw'
import 'tldraw/tldraw.css'
import { MindMapGenerator, type MindMapNode } from '@/components/MindMapGenerator'

export const Route = createFileRoute('/mind-map-demo')({
  component: MindMapDemoPage,
})

/**
 * Demo page showcasing the MindMapGenerator component
 * 
 * This demonstrates how to use the MindMapGenerator with sample data
 * representing academic research findings organized hierarchically.
 */

// Sample mind map data structure
const sampleMindMapData: MindMapNode = {
  id: 'root',
  text: 'Effects of Spaceflight on Cellular Function',
  level: 0,
  children: [
    {
      id: 'theme-1',
      text: 'Oxidative Stress',
      level: 1,
      children: [
        {
          id: 'finding-1-1',
          text: 'Increased ROS production in microgravity',
          level: 2,
          children: [],
        },
        {
          id: 'finding-1-2',
          text: 'Mitochondrial Complex I deficiency',
          level: 2,
          children: [],
        },
        {
          id: 'finding-1-3',
          text: 'Upregulation of antioxidant enzymes',
          level: 2,
          children: [],
        },
      ],
    },
    {
      id: 'theme-2',
      text: 'Gene Expression Changes',
      level: 1,
      children: [
        {
          id: 'finding-2-1',
          text: 'Differential expression of 847 genes',
          level: 2,
          children: [],
        },
        {
          id: 'finding-2-2',
          text: 'Cell cycle arrest pathways activated',
          level: 2,
          children: [],
        },
        {
          id: 'finding-2-3',
          text: 'DNA repair mechanisms enhanced',
          level: 2,
          children: [],
        },
        {
          id: 'finding-2-4',
          text: 'Inflammatory response genes upregulated',
          level: 2,
          children: [],
        },
      ],
    },
    {
      id: 'theme-3',
      text: 'Radiation Effects',
      level: 1,
      children: [
        {
          id: 'finding-3-1',
          text: 'Cosmic ray-induced DNA damage',
          level: 2,
          children: [],
        },
        {
          id: 'finding-3-2',
          text: 'Increased chromosomal aberrations',
          level: 2,
          children: [],
        },
      ],
    },
    {
      id: 'theme-4',
      text: 'Immune System Dysfunction',
      level: 1,
      children: [
        {
          id: 'finding-4-1',
          text: 'T-cell activation impairment',
          level: 2,
          children: [],
        },
        {
          id: 'finding-4-2',
          text: 'Cytokine production altered',
          level: 2,
          children: [],
        },
        {
          id: 'finding-4-3',
          text: 'Natural killer cell activity reduced',
          level: 2,
          children: [],
        },
      ],
    },
    {
      id: 'theme-5',
      text: 'Bone Density Loss',
      level: 1,
      children: [
        {
          id: 'finding-5-1',
          text: 'Osteoclast activity increased',
          level: 2,
          children: [],
        },
        {
          id: 'finding-5-2',
          text: 'Calcium metabolism disrupted',
          level: 2,
          children: [],
        },
      ],
    },
    {
      id: 'theme-6',
      text: 'Muscle Atrophy',
      level: 1,
      children: [
        {
          id: 'finding-6-1',
          text: 'Protein degradation pathways activated',
          level: 2,
          children: [],
        },
        {
          id: 'finding-6-2',
          text: 'Myofibril disorganization observed',
          level: 2,
          children: [],
        },
        {
          id: 'finding-6-3',
          text: 'Mitochondrial dysfunction in muscle cells',
          level: 2,
          children: [],
        },
      ],
    },
  ],
}

function MindMapDemoPage() {
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-purple-900 text-white p-4 shadow-lg">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Mind Map Generator Demo</h1>
          <p className="text-sm opacity-80 mt-1">
            Hierarchical visualization using radial tree layout algorithm
          </p>
        </div>
      </header>

      {/* Instructions */}
      <div className="bg-blue-50 border-b border-blue-200 p-3">
        <div className="container mx-auto text-sm">
          <p className="text-blue-900">
            <strong>Instructions:</strong> The mind map is generated automatically using a radial tree layout.
            You can drag nodes, zoom with mouse wheel, and use tldraw tools to annotate.
          </p>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <Tldraw
          onMount={() => {
            console.log('TLDraw editor mounted - Mind Map Generator will run')
          }}
        >
          <MindMapGenerator data={sampleMindMapData} />
        </Tldraw>
      </div>

      {/* Footer with data structure preview */}
      <footer className="bg-gray-800 text-white p-3 text-xs">
        <div className="container mx-auto">
          <details>
            <summary className="cursor-pointer hover:text-blue-300">
              View Sample Data Structure (Click to expand)
            </summary>
            <pre className="mt-2 bg-gray-900 p-2 rounded overflow-x-auto max-h-48 overflow-y-auto">
              {JSON.stringify(sampleMindMapData, null, 2)}
            </pre>
          </details>
        </div>
      </footer>
    </div>
  )
}
