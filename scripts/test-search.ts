#!/usr/bin/env node

import { DocumentIndexer } from '../src/lib/document-indexer'
import { config } from 'dotenv'

config()

async function testSearch() {
  const query = process.argv[2] || 'plants'
  console.log(`\n🔍 Testing search for: "${query}"\n`)

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    console.error('❌ No OPENAI_API_KEY')
    process.exit(1)
  }

  const indexer = new DocumentIndexer()
  await indexer.initialize(openaiKey)

  // Test with different k values
  console.log('📊 Searching with k=10...\n')
  const results = await indexer.search(query, 10)

  if (results.length === 0) {
    console.log('❌ No results found!\n')
  } else {
    console.log(`✅ Found ${results.length} results:\n`)
    
    results.forEach((r, i) => {
      console.log(`${i + 1}. [Similarity: ${r.similarity.toFixed(3)}] ${r.metadata.title}`)
      console.log(`   Source: ${r.metadata.source}`)
      console.log(`   Content preview: ${r.content.substring(0, 100)}...\n`)
    })
  }

  // Also show lower threshold results
  console.log('\n📊 All results with similarity > 0.4:\n')
  const filtered = results.filter(r => r.similarity > 0.4)
  console.log(`Found ${filtered.length} results with similarity > 0.4`)
  
  if (filtered.length > 0) {
    console.log('\nTop result:')
    console.log(`  Title: ${filtered[0].metadata.title}`)
    console.log(`  Similarity: ${filtered[0].similarity.toFixed(3)}`)
    console.log(`  Score (L2 distance): ${filtered[0].score.toFixed(3)}`)
  }
}

testSearch().catch(console.error)
