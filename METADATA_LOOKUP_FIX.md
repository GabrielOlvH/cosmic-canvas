# Metadata Lookup Fix - Incomplete Study Information

## Problem

Some study nodes in the mind map showed complete metadata (title, authors, year, link) while others only showed the document ID (e.g., "doc_145_12870..."). This inconsistency was confusing and made it difficult to identify articles.

## Root Cause

The issue was in `canvas-generator.ts` in the `convertToMindMapFormat()` method:

1. **Missing Adversarial Documents**: When creating the `documentMap` for metadata lookup, only the main `documents` array was passed, excluding `adversarialDocuments`
2. **Incomplete Key Matching**: The document lookup only used exact matches on `metadata.source`, without trying alternative keys

### Why This Matters

During research synthesis:
- Main documents are retrieved from the primary search
- Adversarial documents are retrieved from contradictory/alternative perspective searches
- Findings can reference documents from **both** arrays
- If a finding references an adversarial document, but that document isn't in the lookup map, the metadata lookup fails
- Result: The study node falls back to showing just the documentId instead of formatted metadata

## Solution

### 1. Include All Documents in Lookup Map

**Before:**
```typescript
const mindMapData = this.convertToMindMapFormat(
  researchQuestion,
  themes,
  findingsMap,
  documents  // ❌ Only main documents
)
```

**After:**
```typescript
// IMPORTANT: Include both main and adversarial documents for complete metadata lookup
const allDocuments = [...documents, ...adversarialDocuments]
const mindMapData = this.convertToMindMapFormat(
  researchQuestion,
  themes,
  findingsMap,
  allDocuments  // ✅ All documents
)
```

### 2. Enhanced Document Lookup with Multiple Keys

**Before:**
```typescript
const documentMap = new Map<string, DocumentNode>()
for (const doc of documents) {
  documentMap.set(doc.metadata.source, doc)  // ❌ Only one key
}
```

**After:**
```typescript
const documentMap = new Map<string, DocumentNode>()
for (const doc of documents) {
  // Primary key: exact source
  documentMap.set(doc.metadata.source, doc)
  
  // Secondary key: just filename (in case source includes path)
  const filename = doc.metadata.source.split('/').pop() || doc.metadata.source
  if (filename !== doc.metadata.source) {
    documentMap.set(filename, doc)
  }
  
  // Tertiary key: title (in case documentId is a title)
  if (doc.metadata.title && doc.metadata.title !== doc.metadata.source) {
    documentMap.set(doc.metadata.title, doc)
  }
}
```

### 3. Improved Lookup Logic with Fallbacks

**Before:**
```typescript
const document = documentMap.get(study.documentId)
const studyTitle = document?.metadata?.title || study.documentId
```

**After:**
```typescript
// Try multiple lookup strategies
let document = documentMap.get(study.documentId)

if (!document) {
  // Try filename only
  const filename = study.documentId.split('/').pop() || study.documentId
  document = documentMap.get(filename)
}

if (!document) {
  // Try as title
  document = documentMap.get(study.documentId)
}

// Log if we still can't find it
if (!document) {
  console.warn(`⚠️  Could not find document metadata for: "${study.documentId}"`)
  console.warn(`    Available sources (first 5):`, Array.from(documentMap.keys()).slice(0, 5))
}

const studyTitle = document?.metadata?.title || study.documentId
const studyAuthors = document?.metadata?.authors
const studyUrl = document?.metadata?.url
const studyDoi = document?.metadata?.doi
const studyYear = document?.metadata?.year
```

## Impact

### Before Fix
- **Some studies**: ✅ "Article Title\nAuthors et al. (2020)\n🔗 Click to open article"
- **Other studies**: ❌ "doc_145_12870_2017_Article_975.pdf"

### After Fix
- **All studies**: ✅ "Article Title\nAuthors et al. (2020)\n🔗 Click to open article"

## Technical Details

### Document Flow
```
research-assistant.ts
  └── conductResearchCanvas()
       ├── mainDocuments (from primary search)
       ├── adversarialDocuments (from contradictory searches)
       └── canvasGenerator.generateCanvas(mainDocuments, adversarialDocuments)
            └── convertToMindMapFormat(allDocuments)  ✅ Now includes both
                 └── documentMap with multi-key lookup
```

### Finding to Document Resolution
```
KeyFinding {
  documentId: "doc_145_12870_2017_Article_975.pdf"
}
       ↓
documentMap lookup (tries 3 keys):
  1. Exact: "doc_145_12870_2017_Article_975.pdf"
  2. Filename: "doc_145_12870_2017_Article_975.pdf"
  3. Title: "Transcriptomic analysis of Arabidopsis..."
       ↓
DocumentNode {
  metadata: {
    source: "doc_145_12870_2017_Article_975.pdf",
    title: "Transcriptomic analysis of Arabidopsis...",
    authors: "Johnson et al.",
    year: 2017,
    url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC..."
  }
}
       ↓
Mind Map Node displays:
  "Transcriptomic analysis of Arabidopsis...
   Johnson et al. (2017)
   
   🔗 Click to open article"
```

## Testing

To verify the fix works:

1. **Run a research query** that generates both main and adversarial documents
   ```bash
   npm run dev
   # Navigate to /research
   # Enter query: "mitochondrial dysfunction in aging"
   ```

2. **Check the console** for warning messages:
   ```
   ⚠️  Could not find document metadata for: "doc_xxx.pdf"
   ```
   - **Before fix**: Multiple warnings
   - **After fix**: Zero warnings (or very few edge cases)

3. **Inspect study nodes** in the mind map:
   - All should show formatted titles, not filenames
   - All should show authors and years where available
   - All should be clickable with the 🔗 icon

## Related Files

- `src/lib/canvas-generator.ts` - Main fix location
  - `generateCanvas()` - Combines document arrays
  - `convertToMindMapFormat()` - Enhanced lookup logic
- `src/lib/research-assistant.ts` - Provides both document arrays
- `src/lib/content-extractor.ts` - Creates findings with documentIds
- `src/components/MindMapGenerator.tsx` - Displays study metadata

## Future Improvements

1. **Normalized Document IDs**: Use consistent format across entire pipeline (e.g., always use basename)
2. **Document Index by ID**: Create primary key system during document loading
3. **Metadata Validation**: Add type guards to ensure metadata completeness before rendering
4. **Fuzzy Matching**: For edge cases where exact match fails, use fuzzy string matching on titles
5. **Caching**: Cache document lookups to avoid repeated map searches

## Commit Message

```
fix: include adversarial documents in mind map metadata lookup

Previously, only main documents were included in the documentMap,
causing metadata lookup failures for findings that referenced
adversarial documents. This resulted in some study nodes showing
raw filenames instead of formatted titles/authors/links.

Changes:
- Include both documents and adversarialDocuments in lookup map
- Add multi-key lookup strategy (source, filename, title)
- Add console warnings for failed lookups
- Improve robustness with multiple fallback strategies

Fixes incomplete metadata display in mind map study nodes.
```
