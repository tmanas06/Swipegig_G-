import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const privyUserId = request.headers.get('x-privy-user-id');
    if (!privyUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { privyId: privyUserId },
      select: { id: true, isGoodDollarVerified: true },
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!dbUser.isGoodDollarVerified) {
      return NextResponse.json(
        { error: 'Must be GoodDollar verified to upload media' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null; // 'image' or 'video'

    if (!file || !type) {
      return NextResponse.json(
        { error: 'File and type (image or video) are required' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const bytesLimit = type === 'image' ? 10 * 1024 * 1024 : 500 * 1024 * 1024;
    if (file.size > bytesLimit) {
      return NextResponse.json(
        { error: `File size exceeds the limit of ${type === 'image' ? '10MB' : '500MB'}` },
        { status: 400 }
      );
    }

    // Dynamic import to avoid SSR errors or compile checks if not installed yet
    const web3Token = process.env.WEB3_STORAGE_TOKEN;
    const livepeerKey = process.env.LIVEPEER_API_KEY;

    // Local upload fallback function
    const saveLocally = async () => {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      const safeName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, safeName);
      fs.writeFileSync(filePath, buffer);
      return `/uploads/${safeName}`;
    };

    if (type === 'image') {
      if (web3Token && web3Token !== 'your_web3_storage_token_here') {
        try {
          // Classic Web3.Storage REST API upload
          const response = await fetch('https://api.web3.storage/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${web3Token}`,
              'Content-Type': file.type,
            },
            body: buffer,
          });

          if (response.ok) {
            const data = await response.json();
            return NextResponse.json({
              url: `https://ipfs.io/ipfs/${data.cid}`,
              cid: data.cid,
            });
          }
        } catch (ipfsError) {
          console.error('[IPFS_UPLOAD_FAILED], using local fallback:', ipfsError);
        }
      }

      // Local storage fallback
      const localUrl = await saveLocally();
      return NextResponse.json({ url: localUrl, isLocal: true });
    }

    if (type === 'video') {
      if (livepeerKey && livepeerKey !== 'your_livepeer_key_here') {
        try {
          // Call livepeer upload helper
          const { uploadVideoToLivepeer } = await import('@/lib/livepeer');
          const result = await uploadVideoToLivepeer(file);
          return NextResponse.json(result);
        } catch (livepeerErr) {
          console.error('[LIVEPEER_UPLOAD_FAILED], using local fallback:', livepeerErr);
        }
      }

      // Local storage fallback
      const localUrl = await saveLocally();
      return NextResponse.json({
        assetId: `mock-asset-${Date.now()}`,
        playbackId: `mock-playback-${Date.now()}`,
        url: localUrl,
        isLocal: true,
      });
    }

    return NextResponse.json({ error: 'Unsupported type' }, { status: 400 });
  } catch (error: any) {
    console.error('[MARKETPLACE_UPLOAD_POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
