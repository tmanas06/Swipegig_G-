import Navbar from '@/components/layout/Navbar';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Navbar />
      <main className="lg:pl-[72px] pb-20 lg:pb-0 min-h-screen">
        {children}
      </main>
    </>
  );
}
