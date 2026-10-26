export interface MemoryEpisode {
  id: string;
  coords: [number, number, number];
  timestamp: string; // Formatted e.g. "7:16 PM 10/26/2026"
  rawTime: number;
  dwellSeconds: number;
  observation: string;
  source: 'visual_scan' | 'prop_interaction' | 'spontaneous_thought';
  embedding?: number[]; // 1024-dim from mxbai-embed-large
}

const DB_NAME = 'CortexCompanion_Memories';
const STORE_NAME = 'episodes';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Generate 1024-dim vector using local Ollama model
export async function getEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch('http://localhost:11434/api/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mxbai-embed-large:latest',
        prompt: text
      })
    });
    if (res.ok) {
      const data = await res.json();
      return data.embedding || null;
    }
  } catch (err) {
    console.warn('[Memory] Embedding generation failed, storing text without vector:', err);
  }
  return null;
}

// Save a 4D spatiotemporal memory episode
export async function saveEpisode(episode: Omit<MemoryEpisode, 'id' | 'embedding'>): Promise<MemoryEpisode> {
  const db = await openDB();
  const vector = await getEmbedding(episode.observation);

  const fullEpisode: MemoryEpisode = {
    ...episode,
    id: `ep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    embedding: vector || undefined
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.add(fullEpisode);
    req.onsuccess = () => resolve(fullEpisode);
    req.onerror = () => reject(req.error);
  });
}

// Retrieve all chronological memories
export async function getAllEpisodes(): Promise<MemoryEpisode[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const results: MemoryEpisode[] = req.result || [];
      // Sort chronologically descending
      results.sort((a, b) => b.rawTime - a.rawTime);
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

// Simple Cosine Similarity
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
}

// Semantic Memory Recall
export async function queryMemories(queryText: string, topK = 3): Promise<MemoryEpisode[]> {
  const queryVec = await getEmbedding(queryText);
  if (!queryVec) return [];

  const episodes = await getAllEpisodes();
  const scored = episodes
    .filter(e => e.embedding && e.embedding.length > 0)
    .map(e => ({
      episode: e,
      score: cosineSimilarity(queryVec, e.embedding!)
    }));

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(s => s.episode);
}

// Clean helper to format 4D spatiotemporal string
export function format4DCoordinate(x: number, z: number, dwellSec: number): string {
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }).toLowerCase();
  const dateStr = `${now.getMonth() + 1}.${now.getDate()}.${now.getFullYear()}`;
  return `(${x.toFixed(1)}, ${z.toFixed(1)}, ${timeStr} ${dateStr}) [Dwell: ${Math.round(dwellSec)}s]`;
}
