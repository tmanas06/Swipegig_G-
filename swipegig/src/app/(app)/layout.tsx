import { Suspense } from 'react';
import Navbar from '@/components/layout/Navbar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Suspense fallback={null}>
        <Navbar />
      </Suspense>
      <main className="lg:pl-[72px] pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-0 min-h-screen">
        {children}
      </main>
    </>
  );
}
