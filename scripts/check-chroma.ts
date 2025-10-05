#!/usr/bin/env node

import { ChromaClient } from 'chromadb'

async function checkChroma() {
  const chromaUrl = (process.env.CHROMA_URL ?? 'http://localhost:8000').trim()

  let url: URL
  try {
    url = new URL(chromaUrl)
  } catch (error) {
    console.error(`❌ Invalid CHROMA_URL: ${chromaUrl}`)
    if (error instanceof Error) {
      console.error(error.message)
    }
    process.exit(1)
  }

  const portFromUrl = url.port ? Number(url.port) : url.protocol === 'https:' ? 443 : 8000

  const client = new ChromaClient({
    host: url.hostname,
    port: portFromUrl,
    ssl: url.protocol === 'https:',
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
    const message = error instanceof Error ? error.message : String(error)
    console.error(`❌ Error: ${message}`)
    console.log('\nCollection does not exist yet or the Chroma server is empty.')
    console.log('   - Start the app and index documents to populate the collection.')
  }
}

checkChroma()
