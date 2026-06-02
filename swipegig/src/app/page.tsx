'use client';

import Link from 'next/link';
import { usePrivy } from '@privy-io/react-auth';
import { motion } from 'framer-motion';
import {
  Zap,
  Brain,
  Coins,
  Shield,
  ArrowRight,
  GitFork,
  MessageCircle,
  Sparkles,
  ChevronRight,
  Users,
  Briefcase,
  TrendingUp,
} from 'lucide-react';

const features = [
  {
    icon: Zap,
    title: 'Swipe to Match',
    description: 'Tinder-style job discovery. Swipe right on opportunities that excite you.',
    color: 'from-green-500/20 to-green-500/5',
    iconColor: 'text-green-400',
    borderColor: 'border-green-500/20',
  },
  {
    icon: Brain,
    title: 'AI Career Coach',
    description: 'Claude-powered coaching with resume rewriting, interview prep, and skill roadmaps.',
    color: 'from-purple-500/20 to-purple-500/5',
    iconColor: 'text-purple-400',
    borderColor: 'border-purple-500/20',
  },
  {
    icon: Coins,
    title: 'Earn G$ Rewards',
    description: 'Get paid in G$ tokens for applying, interviewing, and building your career.',
    color: 'from-yellow-500/20 to-yellow-500/5',
    iconColor: 'text-yellow-400',
    borderColor: 'border-yellow-500/20',
  },
  {
    icon: Shield,
    title: 'On-Chain Identity',
    description: 'Build a verified career profile with skill NFTs and work history on Celo.',
    color: 'from-cyan-500/20 to-cyan-500/5',
    iconColor: 'text-cyan-400',
    borderColor: 'border-cyan-500/20',
  },
];

const steps = [
  {
    step: '01',
    title: 'Connect & Upload',
    description: 'Sign in with email, social, or wallet. Upload your resume for instant AI parsing.',
  },
  {
    step: '02',
    title: 'Swipe & Match',
    description: 'Browse AI-matched jobs with a satisfying swipe UI. Save, skip, or auto-apply.',
  },
  {
    step: '03',
    title: 'Earn & Grow',
    description: 'Earn G$ for every action. Get AI coaching to level up your career.',
  },
];

const stats = [
  { value: '10K+', label: 'Web3 Jobs', icon: Briefcase },
  { value: '5K+', label: 'Active Users', icon: Users },
  { value: '89%', label: 'Match Rate', icon: TrendingUp },
  { value: '$2M+', label: 'G$ Distributed', icon: Coins },
];

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export default function LandingPage() {
  const { login, authenticated } = usePrivy();

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-[150px]" />
      </div>

      {/* Header */}
      <header className="relative z-10">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center">
              <img
                src="/logo.svg"
                alt="SwipeGig Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-bold text-gradient-hero">SwipeGig</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </a>
            <a href="#stats" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Stats
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {authenticated ? (
              <Link
                href="/feed"
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-hero text-black font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all duration-300"
              >
                Open App
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <button
                onClick={() => login()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl gradient-hero text-black font-semibold text-sm hover:shadow-lg hover:shadow-primary/20 transition-all duration-300 cursor-pointer"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-primary text-sm text-primary mb-8"
          >
            <Sparkles className="w-4 h-4" />
            Built for GoodDollar Buildathon on Celo
          </motion.div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
            Find Your Dream Job
            <br />
            <span className="text-gradient-hero">in Web3</span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            Swipe through AI-matched opportunities, get career coaching from Claude,
            earn G$ rewards, and build your verified on-chain career identity.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => (authenticated ? window.location.href = '/feed' : login())}
              className="group flex items-center gap-2.5 px-8 py-4 rounded-2xl gradient-hero text-black font-bold text-base hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              Start Swiping
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <a
              href="#how-it-works"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl glass hover:bg-white/10 text-foreground font-semibold text-base transition-all duration-300"
            >
              Learn More
              <ChevronRight className="w-5 h-5" />
            </a>
          </div>
        </motion.div>

        {/* Hero Visual - Mock Swipe Card */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20 max-w-md mx-auto"
        >
          <div className="relative">
            {/* Back cards (stacked) */}
            <div className="absolute inset-0 glass rounded-3xl transform rotate-3 scale-95 opacity-40" />
            <div className="absolute inset-0 glass rounded-3xl transform -rotate-2 scale-[0.97] opacity-60" />

            {/* Front card */}
            <div className="relative glass rounded-3xl p-6 gradient-border">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg mb-3">
                    A
                  </div>
                  <h3 className="text-xl font-bold">Senior Solidity Developer</h3>
                  <p className="text-muted-foreground text-sm mt-1">Aave Protocol • Remote</p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30">
                  <span className="text-green-400 font-bold text-sm">92%</span>
                  <span className="text-green-400/70 text-xs">match</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {['Solidity', 'DeFi', 'Hardhat', 'TypeScript', 'Auditing'].map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-medium text-muted-foreground"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">$180k – $250k</span>
                <span className="text-muted-foreground">Posted 2d ago</span>
              </div>

              {/* Swipe indicators */}
              <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-1.5 text-red-400/60 text-xs">
                  <span>← Skip</span>
                </div>
                <div className="flex items-center gap-1.5 text-green-400/60 text-xs">
                  <span>Save →</span>
                </div>
                <div className="flex items-center gap-1.5 text-purple-400/60 text-xs">
                  <span>↑ Apply</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
            Everything you need to{' '}
            <span className="text-gradient-primary">land your next role</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
            AI-powered matching, career coaching, on-chain rewards, and a beautiful swipe experience.
          </motion.p>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {features.map((feature) => (
            <motion.div
              key={feature.title}
              variants={fadeInUp}
              className={`group glass rounded-2xl p-8 border ${feature.borderColor} hover:border-opacity-50 transition-all duration-300 hover:scale-[1.02]`}
            >
              <div
                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5`}
              >
                <feature.icon className={`w-7 h-7 ${feature.iconColor}`} />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
            How it <span className="text-gradient-accent">works</span>
          </motion.h2>
          <motion.p variants={fadeInUp} className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Three simple steps to your next Web3 opportunity.
          </motion.p>
        </motion.div>

        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              variants={fadeInUp}
              className="relative glass rounded-2xl p-8 text-center"
            >
              <div className="text-6xl font-black text-gradient-hero opacity-20 mb-4">
                {step.step}
              </div>
              <h3 className="text-xl font-bold mb-3">{step.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{step.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ChevronRight className="w-8 h-8 text-muted-foreground/30" />
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: '-100px' }}
          variants={staggerContainer}
          className="glass rounded-3xl p-12 gradient-border"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                variants={fadeInUp}
                className="text-center"
              >
                <stat.icon className="w-8 h-8 text-primary mx-auto mb-3 opacity-60" />
                <div className="text-3xl sm:text-4xl font-bold text-gradient-primary mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h2 className="text-3xl sm:text-5xl font-bold mb-6">
            Ready to find your{' '}
            <span className="text-gradient-hero">dream job?</span>
          </h2>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
            Join thousands of Web3 professionals already swiping their way to better careers.
          </p>
          <button
            onClick={() => (authenticated ? window.location.href = '/feed' : login())}
            className="group inline-flex items-center gap-2.5 px-10 py-5 rounded-2xl gradient-hero text-black font-bold text-lg hover:shadow-2xl hover:shadow-primary/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            Get Started — It&apos;s Free
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center">
                <img
                  src="/logo.svg"
                  alt="SwipeGig Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-lg font-bold text-gradient-hero">SwipeGig</span>
            </div>

            <div className="flex items-center gap-6">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <GitFork className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </a>
            </div>

            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} SwipeGig. Built on Celo with GoodDollar.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
