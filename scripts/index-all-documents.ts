#!/usr/bin/env node

import { DocumentIndexer } from '../src/lib/document-indexer'
import { documentLoader } from '../src/lib/document-loader'
import { documentTracker } from '../src/lib/document-tracker'
import { config } from 'dotenv'

// Load environment variables
config()

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
}

async function indexAllDocuments() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.cyan}║           📚 FULL DOCUMENT INDEXING 📚               ║${colors.reset}`)
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`)

  // Check if we should force re-indexing (skip tracker checks)
  const forceReindex = process.argv.includes('--force')
  if (forceReindex) {
    console.log(`${colors.yellow}⚠️  FORCE MODE: Will re-index all documents regardless of tracker${colors.reset}\n`)
  }

  const openaiKey = process.env.OPENAI_API_KEY

  if (!openaiKey) {
    console.error('❌ No OPENAI_API_KEY found in environment')
    process.exit(1)
  }

  console.log(`${colors.green}✓ API key loaded${colors.reset}`)

  // Initialize indexer
  const indexer = new DocumentIndexer()

  console.log(`${colors.yellow}⏳ Initializing indexer...${colors.reset}`)
  await indexer.initialize(openaiKey)
  console.log(`${colors.green}✓ Indexer initialized (OpenAI text-embedding-3-large)${colors.reset}\n`)

  // Load document tracker
  console.log(`${colors.yellow}⏳ Loading document tracker...${colors.reset}`)
  await documentTracker.load()
  const trackerStats = documentTracker.getStats()
  console.log(`${colors.green}✓ Tracker loaded (${trackerStats.total} previously indexed documents)${colors.reset}\n`)

  // Load ALL documents from Artigos folder
  console.log(`${colors.yellow}⏳ Loading ALL documents from Artigos folder...${colors.reset}`)
  const allDocs = await documentLoader.loadFromFolder('Artigos', false)
  console.log(`${colors.green}✓ Loaded ${allDocs.length} PDF documents${colors.reset}`)

  // Filter documents that need indexing (new or modified)
  const docsToIndex = []
  let skipped = 0

  console.log(`${colors.yellow}⏳ Checking which documents need indexing...${colors.reset}`)
  for (const doc of allDocs) {
    const hash = documentTracker.calculateHash(doc.content)

    if (forceReindex || documentTracker.needsIndexing(doc.metadata.filePath, hash)) {
      docsToIndex.push({
        content: doc.content,
        metadata: {
          source: doc.metadata.source,
          title: doc.metadata.title,
          type: doc.metadata.type,
          timestamp: doc.metadata.timestamp,
          authors: doc.metadata.authors,
          doi: doc.metadata.doi,
          year: doc.metadata.year,
          journal: doc.metadata.journal,
          url: doc.metadata.url,
        },
        filePath: doc.metadata.filePath,
        hash,
      })
    } else {
      skipped++
    }
  }

  console.log(`${colors.cyan}📊 ${docsToIndex.length} new/modified documents to index, ${skipped} unchanged${colors.reset}\n`)

  // Index documents in batches
  if (docsToIndex.length > 0) {
    const batchSize = 10
    let totalIndexed = 0
    let totalChunks = 0

    for (let i = 0; i < docsToIndex.length; i += batchSize) {
      const batch = docsToIndex.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(docsToIndex.length / batchSize)

      console.log(`${colors.yellow}⏳ Indexing batch ${batchNum}/${totalBatches} (${batch.length} documents)...${colors.reset}`)

      const indexResult = await indexer.indexDocuments(batch.map(d => ({
        content: d.content,
        metadata: d.metadata,
      })))

      totalIndexed += indexResult.indexed
      totalChunks += indexResult.chunks

      console.log(`${colors.green}✓ Batch ${batchNum} complete: ${indexResult.indexed} docs → ${indexResult.chunks} chunks${colors.reset}`)

      // Update tracker for this batch
      for (const doc of batch) {
        documentTracker.markIndexed(doc.filePath, doc.hash, doc.metadata.title, indexResult.chunks / batch.length)
      }

      // Save tracker after each batch
      await documentTracker.save()
    }

    console.log(`\n${colors.green}✅ INDEXING COMPLETE!${colors.reset}`)
    console.log(`${colors.green}✓ Total documents indexed: ${totalIndexed}${colors.reset}`)
    console.log(`${colors.green}✓ Total chunks created: ${totalChunks}${colors.reset}`)
    console.log(`${colors.green}✓ Document tracker saved${colors.reset}\n`)
  } else {
    console.log(`${colors.green}✓ All documents already indexed, nothing to do${colors.reset}\n`)
  }

  // Final stats
  const finalStats = documentTracker.getStats()
  console.log(`${colors.cyan}📊 Final Statistics:${colors.reset}`)
  console.log(`  Total tracked documents: ${finalStats.total}`)
  console.log(`  Total chunks: ${finalStats.totalChunks}\n`)
}

indexAllDocuments().catch(error => {
  console.error(`\n❌ Indexing failed: ${error.message}`)
  console.error(error)
  process.exit(1)
})
