'use client';

import { 
  BookOpen, 
  Image as ImageIcon, 
  Code as CodeIcon, 
  BarChart3, 
  PlayCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PostTypeSelectorProps {
  selectedType: string;
  onChange: (type: any) => void;
  mode: 'filter' | 'create';
}

const types = [
  { 
    id: 'article', 
    label: 'Article', 
    description: 'Write a rich-text career tutorial or experience post.', 
    icon: BookOpen,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20'
  },
  { 
    id: 'image', 
    label: 'Image', 
    description: 'Upload an image, diagram, or infographic with a caption.', 
    icon: ImageIcon,
    color: 'text-pink-400 bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20'
  },
  { 
    id: 'code', 
    label: 'Code', 
    description: 'Share a code snippet with formatting and syntax highlighting.', 
    icon: CodeIcon,
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20 hover:bg-purple-500/20'
  },
  { 
    id: 'poll', 
    label: 'Poll', 
    description: 'Create an interactive question with 2-4 choices (expires in 7 days).', 
    icon: BarChart3,
    color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20 hover:bg-yellow-500/20'
  },
  { 
    id: 'video', 
    label: 'Video', 
    description: 'Upload a video post rendered via Livepeer stream player.', 
    icon: PlayCircle,
    color: 'text-green-400 bg-green-500/10 border-green-500/20 hover:bg-green-500/20'
  },
];

export function PostTypeSelector({ selectedType, onChange, mode }: PostTypeSelectorProps) {
  if (mode === 'filter') {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onChange('all')}
          className={cn(
            'px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer select-none',
            selectedType === 'all'
              ? 'gradient-hero text-black border-transparent shadow-md shadow-primary/10'
              : 'glass text-muted-foreground hover:text-foreground hover:bg-white/5 border-white/5'
          )}
        >
          All Content
        </button>
        {types.map((type) => {
          const Icon = type.icon;
          const isActive = selectedType === type.id;
          return (
            <button
              key={type.id}
              onClick={() => onChange(type.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all cursor-pointer select-none',
                isActive
                  ? 'bg-primary/20 text-primary border-primary/30 shadow-md'
                  : 'glass text-muted-foreground hover:text-foreground hover:bg-white/5 border-white/5'
              )}
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
      {types.map((type) => {
        const Icon = type.icon;
        const isActive = selectedType === type.id;
        return (
          <button
            key={type.id}
            type="button"
            onClick={() => onChange(type.id)}
            className={cn(
              'flex flex-col items-center sm:items-start text-center sm:text-left p-5 rounded-2xl border transition-all cursor-pointer outline-none select-none h-full',
              isActive
                ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5 text-primary scale-[1.01]'
                : 'glass border-white/5 text-muted-foreground hover:border-white/20 hover:bg-white/[0.02]'
            )}
          >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border mb-4', type.color)}>
              <Icon className="w-5 h-5" />
            </div>
            <span className={cn('font-bold text-sm mb-1.5', isActive ? 'text-white' : 'text-foreground')}>
              {type.label}
            </span>
            <span className="text-[11px] text-muted-foreground leading-relaxed hidden sm:block">
              {type.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}
