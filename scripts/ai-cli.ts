#!/usr/bin/env node

import * as readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { DocumentIndexer } from '../src/lib/document-indexer'
import { DocumentAgent } from '../src/lib/document-agent'
import { documentLoader } from '../src/lib/document-loader'
import { config } from 'dotenv'
import { existsSync } from 'node:fs'

// Load environment variables
config()

const rl = readline.createInterface({ input, output })

const indexer = new DocumentIndexer()
const agent = new DocumentAgent(indexer)
let isInitialized = false
let isAgentInitialized = false
let documentsFolder = ''

// Color codes for terminal
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
}

function log(message: string, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`)
}

function logSuccess(message: string) {
  log(`✓ ${message}`, colors.green)
}

function logError(message: string) {
  log(`✗ ${message}`, colors.red)
}

function logInfo(message: string) {
  log(`ℹ ${message}`, colors.cyan)
}

function logWarning(message: string) {
  log(`⚠ ${message}`, colors.yellow)
}

async function initialize() {
  log('\n╔═══════════════════════════════════════════════════════╗', colors.cyan)
  log('║        🌌 COSMIC CANVAS AI CLI TESTING TOOL 🌌       ║', colors.cyan)
  log('╚═══════════════════════════════════════════════════════╝\n', colors.cyan)

  // Check for API key
  let apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    logWarning('No OPENAI_API_KEY found in environment')
    apiKey = await rl.question(`${colors.yellow}Enter your OpenAI API key: ${colors.reset}`)
  } else {
    logSuccess(`API key loaded from environment (${apiKey.slice(0, 8)}...)`)
  }

  try {
    await indexer.initialize(apiKey)
    isInitialized = true
    logSuccess('AI indexer initialized successfully')

    // Also initialize the agent for synthesis
    await agent.initialize(apiKey, 'gpt-5')
    isAgentInitialized = true
    logSuccess('AI agent initialized successfully (using gpt-5)\n')
  } catch (error) {
    logError(`Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`)
    process.exit(1)
  }
}

async function loadDocumentsFromFolder() {
  const folder = await rl.question(`${colors.cyan}Enter folder path to load documents from: ${colors.reset}`)

  if (!existsSync(folder)) {
    logError(`Folder not found: ${folder}`)
    return
  }

  try {
    log('\n🔄 Loading documents...', colors.dim)
    const docs = await documentLoader.loadFromFolder(folder)

    if (docs.length === 0) {
      logWarning('No supported documents found (.txt, .md, .json)')
      return
    }

    logInfo(`Found ${docs.length} documents`)

    // Convert to indexer format
    const docsToIndex = docs.map(doc => ({
      content: doc.content,
      metadata: {
        source: doc.metadata.source,
        title: doc.metadata.title,
        type: doc.metadata.type,
        timestamp: doc.metadata.timestamp,
      },
    }))

    const result = await indexer.indexDocuments(docsToIndex)
    logSuccess(`Indexed ${result.indexed} documents into ${result.chunks} chunks\n`)

    documentsFolder = folder

    // Show preview of loaded documents
    log('📚 Loaded documents:', colors.magenta)
    docs.forEach((doc, idx) => {
      const preview = doc.content.slice(0, 80).replace(/\n/g, ' ')
      console.log(`  ${idx + 1}. ${colors.bright}${doc.metadata.title}${colors.reset} - ${preview}...`)
    })
    console.log()
  } catch (error) {
    logError(`Failed to load documents: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function search() {
  const query = await rl.question(`${colors.cyan}Enter search query: ${colors.reset}`)
  const kStr = await rl.question(`${colors.cyan}Number of results (default 5): ${colors.reset}`)
  const k = kStr ? parseInt(kStr, 10) : 5

  try {
    log('\n🔍 Searching...', colors.dim)
    const results = await indexer.search(query, k)

    if (results.length === 0) {
      logWarning('No results found')
      return
    }

    log(`\n📊 Found ${results.length} results:\n`, colors.green)

    results.forEach((result, idx) => {
      const score = (result.score * 100).toFixed(2)
      console.log(`${colors.bright}${idx + 1}. ${result.metadata.title}${colors.reset} ${colors.dim}(similarity: ${score}%)${colors.reset}`)
      console.log(`   ${colors.dim}Source: ${result.metadata.source}${colors.reset}`)
      console.log(`   ${result.content.slice(0, 200)}...\n`)
    })
  } catch (error) {
    logError(`Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function visualizeGraph() {
  const query = await rl.question(`${colors.cyan}Enter query for graph visualization: ${colors.reset}`)
  const kStr = await rl.question(`${colors.cyan}Number of nodes (default 10): ${colors.reset}`)
  const k = kStr ? parseInt(kStr, 10) : 10

  try {
    log('\n🎨 Building document graph...', colors.dim)
    const graph = await indexer.searchRelated(query, k)

    log(`\n🌐 Document Graph:\n`, colors.magenta)
    log(`Nodes: ${graph.nodes.length}`, colors.cyan)
    log(`Edges: ${graph.edges.length}\n`, colors.cyan)

    // Display nodes
    log('📍 Nodes:', colors.bright)
    graph.nodes.forEach((node, idx) => {
      const score = (node.score * 100).toFixed(2)
      console.log(`  ${idx + 1}. ${colors.green}${node.id}${colors.reset} - ${node.metadata?.title} ${colors.dim}(${score}%)${colors.reset}`)
    })

    // Display edges
    if (graph.edges.length > 0) {
      log('\n🔗 Connections:', colors.bright)
      graph.edges.forEach(edge => {
        const weight = (edge.weight * 100).toFixed(2)
        console.log(`  ${colors.yellow}${edge.source}${colors.reset} → ${colors.yellow}${edge.target}${colors.reset} ${colors.dim}(${weight}%)${colors.reset}`)
      })
    }
    console.log()
  } catch (error) {
    logError(`Graph visualization failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function showStats() {
  const docs = indexer.getDocuments()

  log('\n📈 Statistics:\n', colors.magenta)
  console.log(`  Total documents indexed: ${colors.bright}${docs.length}${colors.reset}`)
  console.log(`  Documents folder: ${colors.bright}${documentsFolder || 'Not set'}${colors.reset}`)

  if (docs.length > 0) {
    const types = new Set(docs.map(d => d.metadata.type))
    console.log(`  Document types: ${colors.bright}${Array.from(types).join(', ')}${colors.reset}`)
  }
  console.log()
}

async function synthesize() {
  const query = await rl.question(`${colors.cyan}Enter topic to synthesize: ${colors.reset}`)

  try {
    log('\n🤖 Synthesizing information from all documents...', colors.dim)
    log('This may take a moment as the AI analyzes all relevant information...\n', colors.dim)

    const result = await agent.synthesizeInformation(query, {
      maxRetrieval: 20,
      iterative: true,
    })

    log('═'.repeat(80), colors.magenta)
    log(`\n📚 COMPREHENSIVE SYNTHESIS: ${query}\n`, colors.bright)
    log('═'.repeat(80), colors.magenta)

    console.log(`\n${result.description}\n`)

    log('─'.repeat(80), colors.dim)
    log(`\n📖 Sources Used (${result.sources.length} documents, ${result.chunks} chunks):\n`, colors.cyan)

    result.sources.forEach((source, idx) => {
      const relevance = (source.relevance * 100).toFixed(1)
      console.log(`  ${idx + 1}. ${colors.bright}${source.title}${colors.reset} ${colors.dim}(${relevance}% relevant)${colors.reset}`)
    })

    console.log()
  } catch (error) {
    logError(`Synthesis failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function answerQuestion() {
  const question = await rl.question(`${colors.cyan}Enter your question: ${colors.reset}`)

  try {
    log('\n🤖 Thinking...', colors.dim)
    const answer = await agent.answerQuestion(question)

    log('\n💡 Answer:\n', colors.green)
    console.log(answer)
    console.log()
  } catch (error) {
    logError(`Failed to answer: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function compareTopics() {
  const topicsStr = await rl.question(`${colors.cyan}Enter topics to compare (comma-separated): ${colors.reset}`)
  const topics = topicsStr.split(',').map(t => t.trim()).filter(Boolean)

  if (topics.length < 2) {
    logWarning('Please provide at least 2 topics to compare\n')
    return
  }

  try {
    log(`\n🤖 Comparing: ${topics.join(' vs ')}...`, colors.dim)
    const comparison = await agent.compareTopics(topics)

    log('\n📊 Comparison:\n', colors.magenta)
    console.log(comparison)
    console.log()
  } catch (error) {
    logError(`Comparison failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function summarizeTopic() {
  const topic = await rl.question(`${colors.cyan}Enter topic to summarize: ${colors.reset}`)

  try {
    log('\n🤖 Creating summary...', colors.dim)
    const result = await agent.summarizeTopic(topic)

    log('═'.repeat(80), colors.magenta)
    log(`\n📝 SUMMARY: ${topic}\n`, colors.bright)
    log('═'.repeat(80), colors.magenta)

    console.log(`\n${result.description}\n`)

    log('─'.repeat(80), colors.dim)
    log(`\n📖 Sources (${result.sources.length} documents, ${result.chunks} chunks)\n`, colors.cyan)

    console.log()
  } catch (error) {
    logError(`Summary failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

function showHelp() {
  log('\n📖 Available Commands:\n', colors.cyan)

  log(`${colors.bright}Indexing & Search:${colors.reset}`, colors.yellow)
  console.log(`  ${colors.bright}load${colors.reset}      - Load documents from a folder`)
  console.log(`  ${colors.bright}search${colors.reset}    - Search for documents by query`)
  console.log(`  ${colors.bright}graph${colors.reset}     - Visualize document relationships`)

  log(`\n${colors.bright}AI Agent (Synthesis & Analysis):${colors.reset}`, colors.yellow)
  console.log(`  ${colors.bright}synthesize${colors.reset} - Generate comprehensive description of a topic`)
  console.log(`  ${colors.bright}ask${colors.reset}       - Ask a question and get AI-powered answer`)
  console.log(`  ${colors.bright}compare${colors.reset}   - Compare and contrast multiple topics`)
  console.log(`  ${colors.bright}summarize${colors.reset} - Create detailed summary of a topic`)

  log(`\n${colors.bright}Utilities:${colors.reset}`, colors.yellow)
  console.log(`  ${colors.bright}stats${colors.reset}     - Show indexing statistics`)
  console.log(`  ${colors.bright}clear${colors.reset}     - Clear all indexed documents`)
  console.log(`  ${colors.bright}help${colors.reset}      - Show this help message`)
  console.log(`  ${colors.bright}exit${colors.reset}      - Exit the CLI\n`)
}

async function clearDocuments() {
  const confirm = await rl.question(`${colors.yellow}Are you sure you want to clear all indexed documents? (y/n): ${colors.reset}`)

  if (confirm.toLowerCase() === 'y') {
    indexer.clear()
    documentsFolder = ''
    logSuccess('All documents cleared\n')
  } else {
    logInfo('Cancelled\n')
  }
}

async function mainLoop() {
  await initialize()
  showHelp()

  while (true) {
    const command = await rl.question(`${colors.cyan}cosmic-canvas>${colors.reset} `)

    switch (command.trim().toLowerCase()) {
      case 'load':
        await loadDocumentsFromFolder()
        break

      case 'search':
        if (indexer.getDocuments().length === 0) {
          logWarning('No documents indexed. Use "load" first.\n')
        } else {
          await search()
        }
        break

      case 'graph':
        if (indexer.getDocuments().length === 0) {
          logWarning('No documents indexed. Use "load" first.\n')
        } else {
          await visualizeGraph()
        }
        break

      case 'synthesize':
      case 'syn':
        if (indexer.getDocuments().length === 0) {
          logWarning('No documents indexed. Use "load" first.\n')
        } else if (!isAgentInitialized) {
          logWarning('AI agent not initialized.\n')
        } else {
          await synthesize()
        }
        break

      case 'ask':
      case 'question':
        if (indexer.getDocuments().length === 0) {
          logWarning('No documents indexed. Use "load" first.\n')
        } else if (!isAgentInitialized) {
          logWarning('AI agent not initialized.\n')
        } else {
          await answerQuestion()
        }
        break

      case 'compare':
        if (indexer.getDocuments().length === 0) {
          logWarning('No documents indexed. Use "load" first.\n')
        } else if (!isAgentInitialized) {
          logWarning('AI agent not initialized.\n')
        } else {
          await compareTopics()
        }
        break

      case 'summarize':
      case 'summary':
        if (indexer.getDocuments().length === 0) {
          logWarning('No documents indexed. Use "load" first.\n')
        } else if (!isAgentInitialized) {
          logWarning('AI agent not initialized.\n')
        } else {
          await summarizeTopic()
        }
        break

      case 'stats':
        await showStats()
        break

      case 'clear':
        await clearDocuments()
        break

      case 'help':
        showHelp()
        break

      case 'exit':
      case 'quit':
        log('\n👋 Goodbye!\n', colors.cyan)
        rl.close()
        process.exit(0)

      case '':
        break

      default:
        logError(`Unknown command: ${command}. Type "help" for available commands.\n`)
    }
  }
}

mainLoop().catch(error => {
  logError(`Fatal error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  process.exit(1)
})
