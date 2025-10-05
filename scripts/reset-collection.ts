import { ChromaClient } from 'chromadb';

async function resetCollection() {
  const client = new ChromaClient({ path: 'http://localhost:8000' });
  
  try {
    console.log('⏳ Deleting old collection...');
    await client.deleteCollection({ name: 'cosmic-canvas-documents' });
    console.log('✓ Collection deleted');
  } catch (error) {
    console.log('ℹ️  Collection does not exist or already deleted');
  }
  
  console.log('✓ Ready for fresh indexing');
}

resetCollection().catch(console.error);
