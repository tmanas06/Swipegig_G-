// src/lib/livepeer.ts
import { Livepeer } from 'livepeer';

const livepeer = new Livepeer({
  apiKey: process.env.LIVEPEER_API_KEY!,
});

export async function uploadVideoToLivepeer(
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ assetId: string; playbackId: string }> {
  // 1. Create asset
  const response = await livepeer.asset.create({
    name: file.name,
    storage: { ipfs: true },
  });

  if (!response.data?.tusEndpoint || !response.data?.asset?.id) {
    throw new Error('Failed to create upload endpoint from Livepeer');
  }

  const tusEndpoint = response.data.tusEndpoint;
  const id = response.data.asset.id;

  // Use tus-js-client for chunked upload
  return new Promise((resolve, reject) => {
    const Upload = require('tus-js-client').Upload;
    const upload = new Upload(file, {
      endpoint: tusEndpoint,
      metadata: { id },
      chunkSize: 5 * 1024 * 1024, // 5MB chunks
      onError: (error: Error) => {
        reject(error);
      },
      onProgress: (bytesSent: number, bytesTotal: number) => {
        if (onProgress) {
          const percentage = Math.round((bytesSent / bytesTotal) * 100);
          onProgress(percentage);
        }
      },
      onSuccess: async () => {
        try {
          // Poll for playbackId
          const ready = await waitForAsset(id);
          resolve({ assetId: id, playbackId: ready.playbackId });
        } catch (error) {
          reject(error);
        }
      },
    });
    upload.start();
  });
}

async function waitForAsset(
  assetId: string,
  maxAttempts = 30
): Promise<{ playbackId: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    const response = await livepeer.asset.get(assetId);
    if (response.asset?.status?.phase === 'ready' && response.asset?.playbackId) {
      return { playbackId: response.asset.playbackId };
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Video processing timed out');
}
