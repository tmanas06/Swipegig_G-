'use client';

import { useUserStore } from '@/stores/useUserStore';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function ResetOnboardingButton() {
  const { setOnboarded } = useUserStore();
  const router = useRouter();

  const handleReset = () => {
    setOnboarded(false);
    toast.success('Local onboarding status reset! Redirecting...');
    router.push('/onboarding');
  };

  return (
    <button
      onClick={handleReset}
      className="bg-yellow-600 hover:bg-yellow-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors"
    >
      Reset Local Onboarding
    </button>
  );
}
