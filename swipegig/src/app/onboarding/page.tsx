'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  FileText,
  User,
  Check,
  ChevronRight,
  ChevronLeft,
  Zap,
  Shield,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useUserStore } from '@/stores/useUserStore';

const SKILL_OPTIONS = [
  'Solidity', 'Rust', 'TypeScript', 'JavaScript', 'Python', 'Go',
  'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express',
  'Smart Contracts', 'DeFi', 'NFTs', 'DAOs', 'L2 Scaling',
  'Hardhat', 'Foundry', 'Ethers.js', 'wagmi', 'viem',
  'GraphQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'AWS', 'Docker', 'Kubernetes', 'CI/CD',
  'Security Auditing', 'Formal Verification', 'MEV',
  'Product Management', 'UI/UX Design', 'Technical Writing',
];

const steps = [
  { title: 'Welcome', description: 'Sign in to get started' },
  { title: 'Profile', description: 'Tell us about yourself' },
  { title: 'Skills', description: 'Select your expertise' },
  { title: 'Resume', description: 'Upload your CV' },
  { title: 'Ready', description: 'Start swiping!' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { authenticated, login, user } = usePrivy();
  const { setOnboarded } = useUserStore();
  const [currentStep, setCurrentStep] = useState(authenticated ? 1 : 0);
  const [profileData, setProfileData] = useState({
    name: '',
    headline: '',
    bio: '',
    location: '',
  });
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleSaveProfile = async () => {
    if (!user?.id) {
      toast.error('You must connect your account first.');
      return;
    }

    try {
      // 1. Update text fields and skills
      const updateResponse = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-privy-user-id': user.id,
        },
        body: JSON.stringify({
          name: profileData.name,
          headline: profileData.headline,
          bio: profileData.bio,
          location: profileData.location,
          skills: selectedSkills,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }

      // 2. Upload resume if selected
      if (resumeFile) {
        const fileFormData = new FormData();
        fileFormData.append('file', resumeFile);

        const uploadResponse = await fetch('/api/profile/upload-resume', {
          method: 'POST',
          headers: {
            'x-privy-user-id': user.id,
          },
          body: fileFormData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload and parse resume');
        }

        const data = await uploadResponse.json();
        // Pre-fill profile fields if they were extracted by AI and not yet entered manually
        if (data.user) {
          setProfileData({
            name: data.user.name || profileData.name,
            headline: data.user.profile?.headline || profileData.headline,
            bio: data.user.profile?.bio || profileData.bio,
            location: data.user.profile?.location || profileData.location,
          });
          if (data.user.profile?.skills) {
            setSelectedSkills(data.user.profile.skills);
          }
        }
        toast.success('Resume parsed and profile updated!');
      } else {
        toast.success('Profile updated successfully!');
      }
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile. Please try again.');
      throw error;
    }
  };

  const handleNext = async (isSkipping = false) => {
    if (currentStep === 3 && !isSkipping) {
      setIsUploading(true);
      try {
        await handleSaveProfile();
        setCurrentStep((s) => s + 1);
      } catch (e) {
        // Allow user to proceed even if upload fails
        console.error(e);
        setCurrentStep((s) => s + 1);
      } finally {
        setIsUploading(false);
      }
    } else if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      setOnboarded(true);
      router.push('/feed');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : [...prev, skill]
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setResumeFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.docx'))) {
      setResumeFile(file);
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress Bar */}
      <div className="px-6 pt-6">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            {steps.map((step, i) => (
              <div key={i} className="flex-1 flex items-center gap-2">
                <div
                  className={cn(
                    'h-1.5 rounded-full flex-1 transition-all duration-500',
                    i <= currentStep ? 'bg-primary' : 'bg-white/10'
                  )}
                />
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </p>
            <p className="text-sm font-medium text-primary">
              {steps[currentStep].title}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            {/* Step 0: Welcome / Login */}
            {currentStep === 0 && (
              <motion.div
                key="welcome"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <div className="w-20 h-20 rounded-3xl gradient-hero flex items-center justify-center mx-auto mb-8">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-4">
                  Welcome to <span className="text-gradient-hero">SwipeGig</span>
                </h2>
                <p className="text-muted-foreground mb-10 max-w-md mx-auto">
                  Connect your account to start discovering AI-matched Web3 jobs and earning G$ rewards.
                </p>
                <button
                  onClick={() => {
                    if (authenticated) {
                      setCurrentStep(1);
                    } else {
                      login();
                    }
                  }}
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl gradient-hero text-black font-bold text-base hover:shadow-2xl hover:shadow-primary/30 transition-all cursor-pointer"
                >
                  {authenticated ? 'Continue' : 'Connect Account'}
                  <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {/* Step 1: Profile */}
            {currentStep === 1 && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h2 className="text-2xl font-bold mb-2">Tell us about yourself</h2>
                <p className="text-muted-foreground mb-8">This helps us match you with the right jobs.</p>
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Full Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                      placeholder="Alex Chen"
                      className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-transparent placeholder:text-muted-foreground/40"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Headline</label>
                    <input
                      type="text"
                      value={profileData.headline}
                      onChange={(e) => setProfileData({ ...profileData, headline: e.target.value })}
                      placeholder="Senior Solidity Developer | DeFi Builder"
                      className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-transparent placeholder:text-muted-foreground/40"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Bio</label>
                    <textarea
                      value={profileData.bio}
                      onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                      placeholder="Tell us a bit about your experience and what you're looking for..."
                      rows={3}
                      className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-transparent placeholder:text-muted-foreground/40 resize-none"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <input
                      type="text"
                      value={profileData.location}
                      onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                      placeholder="San Francisco, CA / Remote"
                      className="w-full glass rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 bg-transparent placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Skills */}
            {currentStep === 2 && (
              <motion.div
                key="skills"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h2 className="text-2xl font-bold mb-2">Select your skills</h2>
                <p className="text-muted-foreground mb-6">
                  Choose all that apply. Selected: {selectedSkills.length}
                </p>
                <div className="flex flex-wrap gap-2 max-h-[400px] overflow-y-auto pr-2">
                  {SKILL_OPTIONS.map((skill) => (
                    <button
                      key={skill}
                      onClick={() => toggleSkill(skill)}
                      className={cn(
                        'px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer',
                        selectedSkills.includes(skill)
                          ? 'bg-primary/20 border border-primary/40 text-primary'
                          : 'glass hover:bg-white/10 text-muted-foreground'
                      )}
                    >
                      {selectedSkills.includes(skill) && (
                        <Check className="w-3.5 h-3.5 inline mr-1.5" />
                      )}
                      {skill}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Resume */}
            {currentStep === 3 && (
              <motion.div
                key="resume"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <h2 className="text-2xl font-bold mb-2">Upload your resume</h2>
                <p className="text-muted-foreground mb-8">
                  Our AI will parse it and fill your profile automatically.
                </p>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  className={cn(
                    'border-2 border-dashed rounded-2xl p-12 text-center transition-all',
                    resumeFile
                      ? 'border-primary/50 bg-primary/5'
                      : 'border-white/10 hover:border-white/20'
                  )}
                >
                  {resumeFile ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl glass-primary flex items-center justify-center">
                        <FileText className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold">{resumeFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(resumeFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => setResumeFile(null)}
                        className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold mb-1">Drop your resume here</p>
                        <p className="text-sm text-muted-foreground">PDF or DOCX, max 10MB</p>
                      </div>
                      <label className="px-6 py-2.5 rounded-xl glass hover:bg-white/10 text-sm font-medium cursor-pointer transition-colors">
                        Browse Files
                        <input
                          type="file"
                          accept=".pdf,.docx"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center mt-4">
                  You can skip this step and upload later.
                </p>
              </motion.div>
            )}

            {/* Step 4: Ready */}
            {currentStep === 4 && (
              <motion.div
                key="ready"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <div className="w-24 h-24 rounded-3xl glass-primary flex items-center justify-center mx-auto mb-8 animate-[pulseGlow_2s_infinite]">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-3xl font-bold mb-4">You're all set! 🚀</h2>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Your profile is ready. Start swiping through AI-matched jobs and earn G$ rewards along the way.
                </p>
                <div className="glass rounded-2xl p-6 max-w-sm mx-auto mb-8">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <Check className="w-5 h-5 text-primary" />
                      <span>Account connected</span>
                    </div>
                    {profileData.name && (
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="w-5 h-5 text-primary" />
                        <span>Profile created</span>
                      </div>
                    )}
                    {selectedSkills.length > 0 && (
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="w-5 h-5 text-primary" />
                        <span>{selectedSkills.length} skills selected</span>
                      </div>
                    )}
                    {resumeFile && (
                      <div className="flex items-center gap-3 text-sm">
                        <Check className="w-5 h-5 text-primary" />
                        <span>Resume uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Bottom Nav */}
      <div className="px-6 py-6 border-t border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0 || isUploading}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
              currentStep === 0
                ? 'opacity-0 pointer-events-none'
                : 'glass hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {currentStep > 0 && currentStep < steps.length - 1 && (
            <button
              onClick={() => handleNext(true)}
              disabled={isUploading}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Skip
            </button>
          )}

          <button
            onClick={handleNext}
            disabled={isUploading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl gradient-hero text-black font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Parsing...
              </>
            ) : (
              <>
                {currentStep === steps.length - 1 ? 'Start Swiping' : 'Continue'}
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
