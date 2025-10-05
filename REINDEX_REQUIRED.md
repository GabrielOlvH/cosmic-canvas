# 📚 Re-indexing Required for Enhanced Metadata

## What Changed?

The document loader now extracts rich metadata from PDFs:
- ✅ **Article Title** (from PDF metadata or first page)
- ✅ **Authors** (from PDF metadata)
- ✅ **DOI** (Digital Object Identifier) for publication links
- ✅ **Publication Year**
- ✅ **Journal Name** (if available)

## Why Re-index?

The current vector database contains only basic metadata (filename). To get:
- Real article titles instead of filenames like "doc_123_nature.pdf"
- Clickable DOI links to publications
- Author information
- Publication years

You need to re-index all documents.

## How to Re-index

### Option 1: Full Re-index (Recommended)
```bash
# Stop Chroma
npm run chroma:stop

# Remove old database
docker volume rm cosmic-canvas-chroma-data

# Start fresh Chroma
npm run chroma:start

# Re-index all documents (will now extract metadata)
npm run index-all
```

### Option 2: Quick Update (if you want to keep some data)
```bash
# Just re-run indexing (will update changed documents)
npm run index-all
```

## What You'll See After Re-indexing

**Before:**
- Study node text: "doc_145_12870_2017_Article_975"

**After:**
- Study node text: "Arabidopsis thaliana Response to Spaceflight Environment"
- Below the title: "doi:10.1186/s12870-017-0975-x" (clickable link)
- Authors info in metadata

## Estimated Time

- Re-indexing 588 PDFs: ~10-15 minutes
- The script will show progress for each batch

## Next Steps

After re-indexing:
1. The mind map will show proper article titles
2. DOI links will be available for accessing publications
3. Author information will be displayed
4. Better organization by actual research content

---

**Note:** The document loader now automatically extracts this metadata during indexing. No manual work needed!
