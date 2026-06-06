'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { usePrivy } from '@privy-io/react-auth';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Upload, Loader2, Sparkles, Plus, Trash2, X } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import GoodDollarVerifyGate from '@/components/GoodDollarVerifyGate';
import { PostTypeSelector } from '@/components/marketplace/PostTypeSelector';

// Dynamically import rich-text editor to avoid Next.js SSR crashes
import 'react-quill-new/dist/quill.snow.css';
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] flex items-center justify-center border border-white/10 rounded-2xl bg-white/[0.01] text-xs text-muted-foreground animate-pulse">
      Loading article editor...
    </div>
  ),
});

// Dynamically import Monaco Editor to avoid SSR errors
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] flex items-center justify-center border border-white/10 rounded-2xl bg-white/[0.01] text-xs text-muted-foreground animate-pulse">
      Loading code editor...
    </div>
  ),
});

const PRESET_TAGS = ['Web3', 'Career', 'Tutorial', 'Interview', 'DeFi', 'Solidity', 'Rust', 'Resume', 'Salary'];

const CODE_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'solidity', label: 'Solidity' },
  { value: 'rust', label: 'Rust' },
  { value: 'python', label: 'Python' },
  { value: 'html', label: 'HTML/CSS' },
  { value: 'json', label: 'JSON' },
];

export default function CreatePostPage() {
  return (
    <GoodDollarVerifyGate feature="marketplace">
      <CreatePostForm />
    </GoodDollarVerifyGate>
  );
}

function CreatePostForm() {
  const router = useRouter();
  const { user } = usePrivy();

  const [type, setType] = useState<'article' | 'image' | 'code' | 'poll' | 'video'>('article');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // Type-specific states
  const [articleContent, setArticleContent] = useState('');
  
  const [imageUrl, setImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imageProgress, setImageProgress] = useState(0);

  const [codeContent, setCodeContent] = useState('// paste your code here\n');
  const [codeLanguage, setCodeLanguage] = useState('javascript');

  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);
  const [pollQuestion, setPollQuestion] = useState('');

  const [videoPlaybackId, setVideoPlaybackId] = useState('');
  const [videoUrl, setVideoUrl] = useState(''); // local preview or direct fallback URL
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // File upload logic using XHR for tracking progress
  const uploadFile = (file: File, fileType: 'image' | 'video'): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/marketplace/upload');
      
      if (user?.id) {
        xhr.setRequestHeader('x-privy-user-id', user.id);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          if (fileType === 'image') setImageProgress(percent);
          if (fileType === 'video') setVideoProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch (e) {
            reject(new Error('Invalid upload response'));
          }
        } else {
          reject(new Error(xhr.responseText || 'Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', fileType);
      xhr.send(formData);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    setImageProgress(0);
    try {
      const result = await uploadFile(file, 'image');
      setImageUrl(result.url);
      toast.success('Image uploaded successfully!');
    } catch (err: any) {
      toast.error('Image upload failed. Try again.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    setVideoProgress(0);
    try {
      const result = await uploadFile(file, 'video');
      setVideoPlaybackId(result.playbackId);
      if (result.url) {
        setVideoUrl(result.url);
      }
      toast.success('Video processed successfully!');
    } catch (err: any) {
      toast.error('Video processing failed. Try again.');
    } finally {
      setIsUploadingVideo(false);
    }
  };

  // Poll option updates
  const handleAddPollOption = () => {
    if (pollOptions.length >= 4) return;
    setPollOptions([...pollOptions, '']);
  };

  const handleRemovePollOption = (index: number) => {
    if (pollOptions.length <= 2) return;
    const next = [...pollOptions];
    next.splice(index, 1);
    setPollOptions(next);
  };

  const handlePollOptionChange = (index: number, val: string) => {
    const next = [...pollOptions];
    next[index] = val;
    setPollOptions(next);
  };

  // Tags list
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTag.trim().replace(/#/g, '');
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const togglePresetTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  // Validation
  const isValid = () => {
    if (!title.trim()) return false;
    if (type === 'article' && !articleContent.trim()) return false;
    if (type === 'image' && !imageUrl) return false;
    if (type === 'code' && (!codeContent.trim() || !codeLanguage)) return false;
    if (type === 'poll') {
      if (!pollQuestion.trim()) return false;
      const validOpts = pollOptions.filter((opt) => opt.trim().length > 0);
      if (validOpts.length < 2) return false;
    }
    if (type === 'video' && !videoPlaybackId) return false;
    return true;
  };

  // Submit
  const handlePublish = async () => {
    if (!isValid() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        title,
        type,
        tags,
      };

      if (type === 'article') {
        payload.content = articleContent;
      } else if (type === 'image') {
        payload.mediaUrl = imageUrl;
      } else if (type === 'code') {
        payload.content = codeContent;
        payload.language = codeLanguage;
      } else if (type === 'poll') {
        payload.content = pollQuestion;
        payload.pollOptions = pollOptions.filter((opt) => opt.trim().length > 0);
      } else if (type === 'video') {
        payload.mediaUrl = videoPlaybackId;
      }

      const response = await fetch('/api/marketplace/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': user?.id || '',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create post');
      }

      const createdPost = await response.json();
      toast.success('Post published successfully!');
      router.push(`/marketplace/post/${createdPost.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to publish post.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 pb-24">
        {/* Navigation */}
        <Link 
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Marketplace
        </Link>

        {/* Title Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2 flex items-center gap-2">
            Create Career Post <Sparkles className="w-5 h-5 text-primary" />
          </h1>
          <p className="text-muted-foreground text-sm">
            Choose a post type to get started. Be helpful, informative, and clear to attract G$ tips from other developers.
          </p>
        </div>

        {/* Editor Form */}
        <div className="space-y-6">
          {/* Post Type Selector */}
          <div className="glass rounded-3xl p-6 border border-white/5 space-y-3">
            <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Select Content Type</label>
            <PostTypeSelector selectedType={type} onChange={setType} mode="create" />
          </div>

          {/* Form Fields */}
          <div className="glass rounded-3xl p-6 sm:p-8 border border-white/5 space-y-6">
            {/* Title */}
            <div>
              <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 block">Post Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'poll'
                    ? 'e.g. Which smart contract auditing firm is best for a junior?'
                    : type === 'code'
                    ? 'e.g. Optimized ERC20 gas-saver transfer method'
                    : 'e.g. 5 career rules to break to get hired in Web3'
                }
                className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent text-white font-semibold"
              />
            </div>

            {/* Type Specific Content Sections */}

            {/* 1. Article Editor */}
            {type === 'article' && (
              <div>
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 block">Rich Content</label>
                <div className="rounded-xl overflow-hidden border border-white/10 bg-white/[0.01]">
                  <ReactQuill 
                    theme="snow" 
                    value={articleContent} 
                    onChange={setArticleContent}
                    placeholder="Describe your career lesson, tips, or guidelines here..."
                  />
                </div>
              </div>
            )}

            {/* 2. Image Uploader */}
            {type === 'image' && (
              <div>
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 block">Upload Image</label>
                {imageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 max-h-[300px]">
                    <img src={imageUrl} alt="Uploaded preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setImageUrl('')}
                      className="absolute top-4 right-4 p-2 rounded-xl bg-black/60 hover:bg-black text-white hover:text-red-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => imageInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/[0.01] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      ref={imageInputRef}
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                    {isUploadingImage ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Uploading image ({imageProgress}%)</span>
                        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-primary" style={{ width: `${imageProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white block mb-0.5">Click to upload image</span>
                          <span className="text-xs text-muted-foreground">Supports PNG, JPG, GIF up to 10MB</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Code Editor */}
            {type === 'code' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Code Snippet</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground select-none">Language:</span>
                    <select
                      value={codeLanguage}
                      onChange={(e) => setCodeLanguage(e.target.value)}
                      className="bg-background border border-white/10 rounded-xl px-3 py-1.5 text-xs text-foreground cursor-pointer outline-none"
                    >
                      {CODE_LANGUAGES.map((lang) => (
                        <option key={lang.value} value={lang.value}>
                          {lang.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 overflow-hidden bg-black/40">
                  <MonacoEditor
                    height="280px"
                    language={codeLanguage}
                    theme="vs-dark"
                    value={codeContent}
                    onChange={(val) => setCodeContent(val || '')}
                    options={{
                      fontSize: 13,
                      minimap: { enabled: false },
                      automaticLayout: true,
                      scrollbar: { vertical: 'hidden' },
                      padding: { top: 12, bottom: 12 },
                    }}
                  />
                </div>
              </div>
            )}

            {/* 4. Poll Creator */}
            {type === 'poll' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 block">Poll Question</label>
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="e.g. Which of these solidity tools do you prefer for testing?"
                    className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent text-white font-semibold"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-1 block">Poll Choices</label>
                  {pollOptions.map((option, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handlePollOptionChange(idx, e.target.value)}
                        placeholder={`Choice ${idx + 1}`}
                        className="flex-1 glass rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary bg-transparent text-white"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemovePollOption(idx)}
                          className="p-2.5 rounded-xl border border-red-500/10 hover:border-red-500/30 text-red-400 bg-red-500/5 hover:bg-red-500/10 transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {pollOptions.length < 4 && (
                    <button
                      type="button"
                      onClick={handleAddPollOption}
                      className="inline-flex items-center gap-1.5 text-xs text-primary font-semibold hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-xl transition-all cursor-pointer mt-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Option
                    </button>
                  )}
                </div>

                <div className="pt-2">
                  <p className="text-[11px] text-muted-foreground select-none">
                    * Note: Polls expire exactly 7 days after publication. Expired polls do not accept further votes.
                  </p>
                </div>
              </div>
            )}

            {/* 5. Video Uploader */}
            {type === 'video' && (
              <div>
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 block">Upload Video via Livepeer</label>
                {videoPlaybackId ? (
                  <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black max-h-[300px]">
                    <div className="aspect-video flex items-center justify-center p-8 bg-zinc-900 border border-white/5 rounded-2xl">
                      <span className="text-sm font-semibold text-green-400">✓ Video processing complete! Playback ID: {videoPlaybackId}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setVideoPlaybackId('');
                        setVideoUrl('');
                      }}
                      className="absolute top-4 right-4 p-2 rounded-xl bg-black/60 hover:bg-black text-white hover:text-red-400 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => videoInputRef.current?.click()}
                    className="border-2 border-dashed border-white/10 hover:border-primary/40 hover:bg-primary/[0.01] rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all gap-3 text-center"
                  >
                    <input
                      type="file"
                      accept="video/*"
                      ref={videoInputRef}
                      onChange={handleVideoSelect}
                      className="hidden"
                    />
                    {isUploadingVideo ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Uploading video ({videoProgress}%)</span>
                        <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden mt-1">
                          <div className="h-full bg-primary" style={{ width: `${videoProgress}%` }} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
                          <Upload className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <div>
                          <span className="text-sm font-semibold text-white block mb-0.5">Click to upload video</span>
                          <span className="text-xs text-muted-foreground">Supports MP4, MOV, WEBM up to 500MB</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tags Input */}
            <div className="border-t border-white/5 pt-6 space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider font-bold text-muted-foreground mb-2 block">Searchable Tags</label>
                <form onSubmit={handleAddTag} className="flex gap-2 max-w-sm mb-3">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    placeholder="Enter a custom tag (e.g. Celo)..."
                    className="flex-1 glass rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-transparent text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl gradient-hero text-black hover:shadow-md text-xs font-bold transition-all cursor-pointer"
                  >
                    Add
                  </button>
                </form>

                {/* Preset tags suggestion */}
                <div className="flex flex-wrap gap-1.5 mb-4 select-none">
                  {PRESET_TAGS.map((tag) => {
                    const isAdded = tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => togglePresetTag(tag)}
                        className={cn(
                          'text-[10px] px-2.5 py-1 rounded-md border font-semibold transition-all cursor-pointer',
                          isAdded
                            ? 'bg-primary/20 text-primary border-primary/30'
                            : 'glass border-white/5 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Added tags */}
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold"
                      >
                        #{tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="p-0.5 rounded-full hover:bg-white/10 text-muted-foreground hover:text-red-400 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="border-t border-white/5 pt-6 flex justify-end">
              <button
                type="button"
                onClick={handlePublish}
                disabled={!isValid() || isSubmitting || isUploadingImage || isUploadingVideo}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl gradient-hero text-black font-extrabold text-sm hover:shadow-lg hover:shadow-primary/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all select-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  'Publish Post'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
