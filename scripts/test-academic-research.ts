#!/usr/bin/env node

import { DocumentIndexer } from '../src/lib/document-indexer'
import { DocumentAgent } from '../src/lib/document-agent'
import { config } from 'dotenv'
import { writeFileSync } from 'fs'

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

async function testAcademicResearch() {
  console.log(`\n${colors.cyan}${colors.bright}╔════════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.cyan}${colors.bright}║     🎓 ACADEMIC RESEARCH MODE TEST - ENHANCED PROMPT 🎓    ║${colors.reset}`)
  console.log(`${colors.cyan}${colors.bright}╚════════════════════════════════════════════════════════════╝${colors.reset}\n`)

  const openaiKey = process.env.OPENAI_API_KEY
  const openrouterKey = process.env.OPENROUTER_API_KEY

  if (!openaiKey || !openrouterKey) {
    console.error('❌ Missing API keys')
    process.exit(1)
  }

  console.log(`${colors.green}✓ API keys loaded${colors.reset}`)

  // Initialize indexer and agent
  const indexer = new DocumentIndexer()
  const agent = new DocumentAgent(indexer)

  console.log(`${colors.yellow}⏳ Initializing AI systems...${colors.reset}`)
  await indexer.initialize(openaiKey)
  await agent.initialize(openaiKey, openrouterKey, 'openai/gpt-5')
  console.log(`${colors.green}✓ Indexer initialized (OpenAI text-embedding-3-large)${colors.reset}`)
  console.log(`${colors.green}✓ Agent initialized (OpenRouter GPT-5)${colors.reset}\n`)

  // Choose a research question likely to have contradictory findings
  const researchQuestion = 'What are the effects of microgravity and spaceflight on immune system function and disease resistance in biological organisms?'

  console.log(`${colors.cyan}${colors.bright}RESEARCH QUESTION:${colors.reset}`)
  console.log(`${colors.cyan}"${researchQuestion}"${colors.reset}\n`)

  console.log(`${colors.yellow}⏳ Conducting exhaustive academic literature review...${colors.reset}`)
  console.log(`${colors.yellow}This process includes:${colors.reset}`)
  console.log(`${colors.yellow}  1. Exhaustive source discovery (iterative search)${colors.reset}`)
  console.log(`${colors.yellow}  2. Adversarial query generation (finding contradictions)${colors.reset}`)
  console.log(`${colors.yellow}  3. Bibliography metadata extraction${colors.reset}`)
  console.log(`${colors.yellow}  4. Academic synthesis with XML-structured prompting${colors.reset}`)
  console.log(`${colors.yellow}  5. Contradiction detection and reporting${colors.reset}\n`)

  const startTime = Date.now()

  const researchResult = await agent.conductResearch(researchQuestion, {
    exhaustive: true,
    verbose: true,
  })

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`\n${colors.green}✅ Research complete in ${duration}s${colors.reset}\n`)

  // Display results
  console.log(`${colors.magenta}${'═'.repeat(80)}${colors.reset}`)
  console.log(`${colors.green}${colors.bright}ACADEMIC LITERATURE REVIEW SYNTHESIS${colors.reset}\n`)
  console.log(researchResult.synthesis)
  console.log(`\n${colors.magenta}${'═'.repeat(80)}${colors.reset}\n`)

  console.log(`${colors.bright}${researchResult.bibliography}${colors.reset}`)
  console.log(`\n${colors.magenta}${'═'.repeat(80)}${colors.reset}\n`)

  console.log(`${colors.cyan}${colors.bright}RESEARCH METRICS:${colors.reset}`)
  console.log(`  📚 Sources Retrieved: ${colors.green}${researchResult.metrics.sourcesRetrieved}${colors.reset}`)
  console.log(`  📝 Citations Made: ${colors.green}${researchResult.metrics.citationsMade}${colors.reset}`)
  console.log(`  🔍 Search Iterations: ${colors.green}${researchResult.metrics.searchIterations}${colors.reset}`)
  console.log(`  📊 Concept Coverage: ${colors.green}${(researchResult.metrics.coverage * 100).toFixed(1)}%${colors.reset}`)
  console.log(`  📖 Bibliography Entries: ${colors.green}${researchResult.sources.length}${colors.reset}`)
  console.log(`  ⏱️  Duration: ${colors.green}${duration}s${colors.reset}\n`)

  // Save to file
  const outputFilename = `academic-review-${Date.now()}.md`
  const fullOutput = `# Academic Literature Review

**Research Question:** ${researchQuestion}

**Date:** ${new Date().toISOString()}

**Metrics:**
- Sources Retrieved: ${researchResult.metrics.sourcesRetrieved}
- Citations Made: ${researchResult.metrics.citationsMade}
- Search Iterations: ${researchResult.metrics.searchIterations}
- Concept Coverage: ${(researchResult.metrics.coverage * 100).toFixed(1)}%

---

${researchResult.synthesis}

---

${researchResult.bibliography}
`

  writeFileSync(outputFilename, fullOutput)
  console.log(`${colors.green}✓ Full review saved to: ${colors.bright}${outputFilename}${colors.reset}\n`)

  // Quality checks
  console.log(`${colors.cyan}${colors.bright}QUALITY CHECKS:${colors.reset}`)

  const hasContradictionSection = researchResult.synthesis.includes('## Contradictions and Conflicts')
  console.log(`  ${hasContradictionSection ? '✓' : '✗'} Contradictions section present: ${colors.green}${hasContradictionSection}${colors.reset}`)

  const citationDensity = researchResult.metrics.citationsMade / researchResult.synthesis.split(/\n/).length
  console.log(`  ${citationDensity > 0.3 ? '✓' : '✗'} Citation density: ${colors.green}${citationDensity.toFixed(2)} citations/line${colors.reset}`)

  const hasSynthesisSection = researchResult.synthesis.includes('## Synthesis and Discussion')
  console.log(`  ${hasSynthesisSection ? '✓' : '✗'} Synthesis section present: ${colors.green}${hasSynthesisSection}${colors.reset}`)

  const hasMethodology = researchResult.synthesis.includes('## Methodological Overview')
  console.log(`  ${hasMethodology ? '✓' : '✗'} Methodology section present: ${colors.green}${hasMethodology}${colors.reset}`)

  console.log(`\n${colors.green}${colors.bright}✅ ACADEMIC RESEARCH MODE TEST COMPLETE!${colors.reset}\n`)
}

testAcademicResearch().catch(error => {
  console.error(`\n❌ Test failed: ${error.message}`)
  console.error(error)
  process.exit(1)
})
