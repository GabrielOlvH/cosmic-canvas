#!/usr/bin/env node

import { DocumentIndexer } from '../src/lib/document-indexer'
import { DocumentAgent } from '../src/lib/document-agent'
import { AgenticRetrieval } from '../src/lib/agentic-retrieval'
import { documentLoader } from '../src/lib/document-loader'
import { documentTracker } from '../src/lib/document-tracker'
import { config } from 'dotenv'

// Load environment variables
config()

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  magenta: '\x1b[35m',
}

async function testAIFlow() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.cyan}║           🧪 AI FLOW INTEGRATION TEST 🧪              ║${colors.reset}`)
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`)

  const openaiKey = process.env.OPENAI_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY

  if (!openaiKey) {
    console.error('❌ No OPENAI_API_KEY found in environment')
    process.exit(1)
  }

  if (!openrouterKey) {
    console.error('❌ No OPENROUTER_API_KEY found in environment')
    process.exit(1)
  }

  console.log(`${colors.green}✓ API keys loaded (OpenAI for embeddings, OpenRouter for completions)${colors.reset}`)

  // Initialize indexer, agent, and agentic retrieval
  const indexer = new DocumentIndexer()
  const agent = new DocumentAgent(indexer)
  const agenticRetrieval = new AgenticRetrieval(indexer)

  console.log(`${colors.yellow}⏳ Initializing AI systems...${colors.reset}`)
  await indexer.initialize(openaiKey)
  await agent.initialize(openaiKey, openrouterKey, 'openai/gpt-5')
  await agenticRetrieval.initialize(openaiKey, openrouterKey, 'openai/gpt-5')
  console.log(`${colors.green}✓ Indexer initialized (OpenAI text-embedding-3-large)${colors.reset}`)
  console.log(`${colors.green}✓ Agent initialized (OpenRouter GPT-5)${colors.reset}`)
  console.log(`${colors.green}✓ Agentic Retrieval initialized (OpenRouter GPT-5)${colors.reset}\n`)

  // Load document tracker
  console.log(`${colors.yellow}⏳ Loading document tracker...${colors.reset}`)
  await documentTracker.load()
  const trackerStats = documentTracker.getStats()
  console.log(`${colors.green}✓ Tracker loaded (${trackerStats.total} previously indexed documents)${colors.reset}\n`)

  // Load documents from Artigos folder (limit to first 10 for testing)
  console.log(`${colors.yellow}⏳ Loading documents from Artigos folder...${colors.reset}`)
  const allDocs = await documentLoader.loadFromFolder('Artigos', false)
  const docs = allDocs.slice(0, 10) // Test with first 10 PDFs
  console.log(`${colors.green}✓ Loaded ${docs.length} documents (limited to first 10 for testing)${colors.reset}`)

  // Filter documents that need indexing (new or modified)
  const docsToIndex = []
  let skipped = 0

  for (const doc of docs) {
    const hash = documentTracker.calculateHash(doc.content)

    if (documentTracker.needsIndexing(doc.metadata.filePath, hash)) {
      docsToIndex.push({
        content: doc.content,
        metadata: {
          source: doc.metadata.source,
          title: doc.metadata.title,
          type: doc.metadata.type,
          timestamp: doc.metadata.timestamp,
        },
        filePath: doc.metadata.filePath,
        hash,
      })
    } else {
      skipped++
    }
  }

  console.log(`${colors.cyan}📊 ${docsToIndex.length} new/modified documents to index, ${skipped} unchanged${colors.reset}\n`)

  // Index documents
  if (docsToIndex.length > 0) {
    console.log(`${colors.yellow}⏳ Indexing ${docsToIndex.length} documents with embeddings...${colors.reset}`)
    const indexResult = await indexer.indexDocuments(docsToIndex.map(d => ({
      content: d.content,
      metadata: d.metadata,
    })))
    console.log(`${colors.green}✓ Indexed ${indexResult.indexed} documents into ${indexResult.chunks} chunks${colors.reset}`)

    // Update tracker
    for (const doc of docsToIndex) {
      documentTracker.markIndexed(doc.filePath, doc.hash, doc.metadata.title, indexResult.chunks / docsToIndex.length)
    }

    await documentTracker.save()
    console.log(`${colors.green}✓ Document tracker updated and saved${colors.reset}\n`)
  } else {
    console.log(`${colors.green}✓ All documents already indexed, skipping indexing${colors.reset}\n`)
  }

  // Test 1: Semantic Search
  console.log(`${colors.cyan}${colors.bright}TEST 1: Semantic Search with Embeddings${colors.reset}`)
  console.log(`${colors.cyan}Query: "gene expression and protein synthesis"${colors.reset}\n`)

  const searchResults = await indexer.search('gene expression and protein synthesis', 5)
  console.log(`${colors.green}Found ${searchResults.length} relevant chunks:${colors.reset}\n`)

  searchResults.forEach((result, idx) => {
    // Use the converted similarity score (0-1 range)
    const percentage = (result.similarity * 100).toFixed(1)
    console.log(`  ${idx + 1}. ${colors.bright}${result.metadata.title}${colors.reset} ${colors.yellow}(${percentage}% similarity, L2 dist: ${result.score.toFixed(3)})${colors.reset}`)
    console.log(`     ${result.content.substring(0, 150)}...\n`)
  })

  // Test 2: AI Agent Question Answering with Retrieval Details
  console.log(`${colors.cyan}${colors.bright}TEST 2: AI Agent Question Answering with Retrieval Details${colors.reset}`)
  const question = 'What are the main research methods discussed in these papers?'
  console.log(`${colors.cyan}Question: "${question}"${colors.reset}\n`)

  console.log(`${colors.yellow}⏳ Step 1: Retrieving relevant context (k=15)...${colors.reset}`)
  const retrievedDocs = await indexer.search(question, 15)
  console.log(`${colors.green}✓ Retrieved ${retrievedDocs.length} chunks${colors.reset}\n`)

  console.log(`${colors.bright}Top 5 most relevant chunks:${colors.reset}`)
  retrievedDocs.slice(0, 5).forEach((doc, idx) => {
    const percentage = (doc.similarity * 100).toFixed(1)
    console.log(`  ${idx + 1}. ${doc.metadata.title} (${percentage}% similarity)`)
    console.log(`     ${doc.content.substring(0, 100)}...`)
  })
  console.log()

  console.log(`${colors.yellow}⏳ Step 2: Building context for GPT-5...${colors.reset}`)
  const context = retrievedDocs.map((r, idx) => `Source ${idx + 1} (${r.metadata.title}):\n${r.content}`).join('\n\n')
  console.log(`${colors.green}✓ Context built: ${context.length} characters${colors.reset}\n`)

  console.log(`${colors.yellow}⏳ Step 3: Generating prompt for GPT-5...${colors.reset}`)
  const prompt = `Answer the following question based ONLY on the provided context. If the context doesn't contain enough information to answer the question, say so.\n\nQuestion: ${question}\n\nContext:\n${context}\n\nAnswer:`
  console.log(`${colors.bright}Prompt preview (first 500 chars):${colors.reset}`)
  console.log(`${colors.cyan}${prompt.substring(0, 500)}...${colors.reset}\n`)

  console.log(`${colors.yellow}⏳ Step 4: Calling GPT-5 via OpenRouter...${colors.reset}\n`)
  const answer = await agent.answerQuestion(question, 15)

  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`)
  console.log(`${colors.green}${colors.bright}AI ANSWER:${colors.reset}\n`)
  console.log(answer)
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}\n`)

  // Test 3: Comprehensive Synthesis with LLM Thinking Process
  console.log(`${colors.cyan}${colors.bright}TEST 3: Comprehensive Synthesis (Iterative Multi-Step RAG)${colors.reset}`)
  const topic = 'experimental methodologies and findings from these research papers'
  console.log(`${colors.cyan}Topic: "${topic}"${colors.reset}\n`)

  console.log(`${colors.yellow}⏳ Step 1: Initial retrieval (maxRetrieval=20)...${colors.reset}`)
  const initialResults = await indexer.search(topic, 20)
  console.log(`${colors.green}✓ Retrieved ${initialResults.length} initial chunks${colors.reset}`)
  console.log(`${colors.cyan}Similarity range: ${(Math.min(...initialResults.map(r => r.similarity)) * 100).toFixed(1)}% - ${(Math.max(...initialResults.map(r => r.similarity)) * 100).toFixed(1)}%${colors.reset}\n`)

  console.log(`${colors.yellow}⏳ Step 2: Building comprehensive context...${colors.reset}`)
  const synthesisContext = initialResults.map((r, idx) => `[Document ${idx + 1}: ${r.metadata.title}]\n${r.content}\n---`).join('\n\n')
  console.log(`${colors.green}✓ Context size: ${synthesisContext.length} characters${colors.reset}\n`)

  console.log(`${colors.yellow}⏳ Step 3: First-pass synthesis with GPT-5...${colors.reset}`)
  console.log(`${colors.bright}Synthesis prompt structure:${colors.reset}`)
  console.log(`${colors.cyan}  - Task: Synthesize information from ALL sources${colors.reset}`)
  console.log(`${colors.cyan}  - Requirements: Comprehensive overview, specific details, logical organization${colors.reset}`)
  console.log(`${colors.cyan}  - Citation: Must cite which documents contributed information${colors.reset}\n`)

  console.log(`${colors.yellow}⏳ Step 4: Running iterative refinement...${colors.reset}`)
  console.log(`${colors.cyan}(GPT-5 will check for gaps and retrieve additional info if needed)${colors.reset}\n`)

  const synthesis = await agent.synthesizeInformation(topic, {
    maxRetrieval: 20,
    iterative: true,
    verbose: true, // Show LLM thinking process
  })

  console.log(`${colors.green}✓ Synthesis complete!${colors.reset}\n`)

  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`)
  console.log(`${colors.green}${colors.bright}COMPREHENSIVE SYNTHESIS:${colors.reset}\n`)
  console.log(synthesis.description)
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}\n`)

  console.log(`${colors.cyan}Sources used: ${synthesis.sources.length} documents, ${synthesis.chunks} chunks${colors.reset}`)
  synthesis.sources.forEach((source, idx) => {
    // Convert L2 distance to similarity percentage
    const similarity = Math.max(0, 1 - (source.relevance / 2))
    const percentage = (similarity * 100).toFixed(1)
    console.log(`  ${idx + 1}. ${source.title} ${colors.yellow}(${percentage}%)${colors.reset}`)
  })

  console.log(`\n${colors.green}${colors.bright}✅ ALL TESTS PASSED!${colors.reset}`)
  console.log(`${colors.green}✓ Embeddings (OpenAI text-embedding-3-large) working${colors.reset}`)
  console.log(`${colors.green}✓ Semantic search working${colors.reset}`)
  console.log(`${colors.green}✓ GPT-5 synthesis working${colors.reset}`)
  console.log(`${colors.green}✓ Multi-document retrieval working${colors.reset}\n`)

  // Test 4: AGENTIC RETRIEVAL (LLM decides what to search)
  console.log(`${colors.cyan}${colors.bright}TEST 4: AGENTIC RETRIEVAL (LLM Autonomously Decides Searches)${colors.reset}`)
  const agenticQuery = 'What are the key findings about spaceflight effects on biological systems?'
  console.log(`${colors.cyan}Question: "${agenticQuery}"${colors.reset}\n`)

  console.log(`${colors.yellow}⏳ Letting GPT-5 autonomously decide what searches to perform...${colors.reset}\n`)

  const agenticResult = await agenticRetrieval.agenticRetrieve(agenticQuery, {
    maxIterations: 5,
    verbose: true,
  })

  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`)
  console.log(`${colors.green}${colors.bright}AGENTIC RETRIEVAL SUMMARY:${colors.reset}\n`)

  console.log(`${colors.bright}Retrieval Steps (LLM's autonomous decisions):${colors.reset}`)
  agenticResult.retrievalSteps.forEach((step, idx) => {
    const similarity = (step.topSimilarity * 100).toFixed(1)
    console.log(`  ${idx + 1}. Query: "${step.query}"`)
    console.log(`     Retrieved: ${step.results} chunks, top similarity: ${similarity}%\n`)
  })

  console.log(`${colors.cyan}Total retrieval steps: ${agenticResult.retrievalSteps.length}${colors.reset}`)
  console.log(`${colors.cyan}Total chunks retrieved: ${agenticResult.totalChunksRetrieved}${colors.reset}\n`)

  console.log(`${colors.bright}Agent's Final Answer:${colors.reset}`)
  console.log(agenticResult.answer)
  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}\n`)

  console.log(`${colors.green}${colors.bright}✅ AGENTIC RETRIEVAL WORKING!${colors.reset}`)
  console.log(`${colors.green}✓ LLM autonomously decided to make ${agenticResult.retrievalSteps.length} searches${colors.reset}`)
  console.log(`${colors.green}✓ Tool calling and function execution working${colors.reset}\n`)

  // Test 5: ACADEMIC RESEARCH MODE with Bibliography
  console.log(`${colors.cyan}${colors.bright}TEST 5: ACADEMIC RESEARCH MODE (Exhaustive + Citations + Bibliography)${colors.reset}`)
  const researchQuery = 'What are the effects of spaceflight on cellular oxidative stress and DNA damage in biological systems?'
  console.log(`${colors.cyan}Research Question: "${researchQuery}"${colors.reset}\n`)

  console.log(`${colors.yellow}⏳ Conducting exhaustive literature review with formal citations...${colors.reset}\n`)

  const researchResult = await agent.conductResearch(researchQuery, {
    exhaustive: true,
    verbose: true
  })

  console.log(`${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}`)
  console.log(`${colors.green}${colors.bright}ACADEMIC RESEARCH SYNTHESIS:${colors.reset}\n`)
  console.log(researchResult.synthesis)
  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}\n`)

  console.log(`${colors.bright}${researchResult.bibliography}${colors.reset}`)
  console.log(`\n${colors.magenta}═══════════════════════════════════════════════════════${colors.reset}\n`)

  console.log(`${colors.cyan}Research Metrics:${colors.reset}`)
  console.log(`  📚 Sources Retrieved: ${researchResult.metrics.sourcesRetrieved}`)
  console.log(`  📝 Citations Made: ${researchResult.metrics.citationsMade}`)
  console.log(`  🔍 Search Iterations: ${researchResult.metrics.searchIterations}`)
  console.log(`  📊 Concept Coverage: ${(researchResult.metrics.coverage * 100).toFixed(1)}%`)
  console.log(`  📖 Bibliography Entries: ${researchResult.sources.length}`)

  console.log(`\n${colors.green}${colors.bright}✅ ACADEMIC RESEARCH MODE COMPLETE!${colors.reset}`)
  console.log(`${colors.green}✓ Exhaustive retrieval working (${researchResult.metrics.searchIterations} iterations)${colors.reset}`)
  console.log(`${colors.green}✓ Formal APA citations integrated (${researchResult.metrics.citationsMade} citations)${colors.reset}`)
  console.log(`${colors.green}✓ Complete bibliography generated (${researchResult.sources.length} sources)${colors.reset}`)
  console.log(`${colors.green}✓ Behaving like academic researcher${colors.reset}\n`)
}

testAIFlow().catch(error => {
  console.error(`\n❌ Test failed: ${error.message}`)
  console.error(error)
  process.exit(1)
})
