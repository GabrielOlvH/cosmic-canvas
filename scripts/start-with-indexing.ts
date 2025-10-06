#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { config } from 'dotenv'

// Load environment variables
config()

const colors = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
}

async function runCommand(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
    })

    proc.on('close', (code) => {
      resolve(code === 0)
    })

    proc.on('error', (err) => {
      console.error(`${colors.red}❌ Command failed: ${err.message}${colors.reset}`)
      resolve(false)
    })
  })
}

async function checkChroma(): Promise<boolean> {
  console.log(`${colors.yellow}⏳ Checking Chroma connection...${colors.reset}`)

  const chromaUrl = process.env.CHROMA_URL || 'http://localhost:8000'

  try {
    const response = await fetch(`${chromaUrl}/api/v1/heartbeat`)
    if (response.ok) {
      console.log(`${colors.green}✓ Chroma is running at ${chromaUrl}${colors.reset}`)
      return true
    }
  } catch {
    // Failed to connect
  }

  console.log(`${colors.red}❌ Chroma is not running at ${chromaUrl}${colors.reset}`)
  console.log(`${colors.yellow}Please start Chroma with: npm run chroma:start${colors.reset}`)
  return false
}

async function main() {
  console.log(`\n${colors.cyan}╔═══════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.cyan}║        🚀 COSMIC CANVAS - PRODUCTION START 🚀        ║${colors.reset}`)
  console.log(`${colors.cyan}╚═══════════════════════════════════════════════════════╝${colors.reset}\n`)

  // Step 1: Check Chroma
  const chromaRunning = await checkChroma()
  if (!chromaRunning) {
    process.exit(1)
  }

  // Step 2: Index documents
  console.log(`\n${colors.yellow}⏳ Indexing documents...${colors.reset}`)
  const indexSuccess = await runCommand('tsx', ['scripts/index-all-documents.ts'])

  if (!indexSuccess) {
    console.error(`${colors.red}❌ Document indexing failed${colors.reset}`)
    process.exit(1)
  }

  console.log(`${colors.green}✓ Documents indexed successfully${colors.reset}\n`)

  // Step 3: Start the server
  console.log(`${colors.cyan}🚀 Starting production server...${colors.reset}\n`)

  // Use npm start to run the production server
  const serverSuccess = await runCommand('npm', ['start'])

  if (!serverSuccess) {
    console.error(`${colors.red}❌ Server failed to start${colors.reset}`)
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(`${colors.red}❌ Startup failed: ${error.message}${colors.reset}`)
  process.exit(1)
})
