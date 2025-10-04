#!/usr/bin/env node

import { ChromaClient } from 'chromadb'

async function checkChroma() {
  const client = new ChromaClient({
    path: 'http://localhost:8000',
  })

  try {
    // Get the collection
    const collection = await client.getCollection({
      name: 'cosmic-canvas-documents',
    })

    const count = await collection.count()
    console.log(`✓ Collection exists: cosmic-canvas-documents`)
    console.log(`✓ Total embeddings in collection: ${count}`)

    if (count > 0) {
      // Get a sample
      const sample = await collection.peek({ limit: 5 })
      console.log(`\nSample documents:`)
      sample.ids.forEach((id, idx) => {
        const metadata = sample.metadatas?.[idx]
        console.log(`  ${idx + 1}. ID: ${id}`)
        console.log(`     Title: ${metadata?.title || 'N/A'}`)
        console.log(`     Source: ${metadata?.source || 'N/A'}`)
      })
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`)
    console.log('\nCollection does not exist or is empty')
  }
}

checkChroma()
