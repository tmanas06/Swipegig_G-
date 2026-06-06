'use client';

import * as Player from '@livepeer/react/player';
import { getSrc } from '@livepeer/react/external';
import { Play, Pause } from 'lucide-react';

export function VideoPlayer({ playbackId }: { playbackId: string }) {
  const src = getSrc(`https://livepeercdn.com/hls/${playbackId}/index.m3u8`);

  if (!src) {
    return (
      <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-black flex items-center justify-center text-xs text-muted-foreground">
        Invalid video source
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl overflow-hidden shadow-lg border border-white/10 bg-black relative group aspect-video">
      <Player.Root src={src}>
        <Player.Container className="w-full h-full">
          <Player.Video title="SwipeGig Creator Video" className="w-full h-full object-cover" />
          <Player.Controls className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Player.PlayPauseTrigger className="w-12 h-12 rounded-full bg-primary/80 hover:bg-primary text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-lg">
              <Player.PlayingIndicator asChild matcher={false}>
                <Play className="w-6 h-6 fill-current translate-x-0.5" />
              </Player.PlayingIndicator>
              <Player.PlayingIndicator asChild matcher={true}>
                <Pause className="w-6 h-6 fill-current" />
              </Player.PlayingIndicator>
            </Player.PlayPauseTrigger>
          </Player.Controls>
        </Player.Container>
      </Player.Root>
    </div>
  );
}
