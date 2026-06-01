'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Sparkles,
  Bot,
  User,
  FileText,
  Target,
  BookOpen,
  MessageSquare,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedPrompts = [
  { icon: FileText, text: 'Review my resume for Web3 roles', color: 'text-blue-400' },
  { icon: Target, text: 'What skills do I need for a DeFi role?', color: 'text-green-400' },
  { icon: BookOpen, text: 'Help me prepare for a Solidity interview', color: 'text-purple-400' },
  { icon: MessageSquare, text: 'Write a cover letter for Aave Protocol', color: 'text-orange-400' },
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: currentMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No readable stream');
      }

      const decoder = new TextDecoder();
      let assistantContent = '';
      const assistantMessageId = crypto.randomUUID();

      // Set initial assistant message
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: '',
          timestamp: new Date(),
        },
      ]);
      setIsLoading(false);

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const cleanLine = line.trim();
          if (cleanLine.startsWith('data: ')) {
            const dataStr = cleanLine.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                assistantContent += parsed.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: assistantContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('[AI_CHAT_ERROR]', error);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `Sorry, I encountered an error connecting to the AI service. Here is a simulated response based on your query:\n\n${getSimulatedResponse(messageText)}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background page-enter">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-lg font-bold">AI Career Coach</h1>
          <p className="text-xs text-muted-foreground">Powered by Claude</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400 font-medium">Online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center"
          >
            <div className="w-20 h-20 rounded-3xl glass-accent flex items-center justify-center mb-6">
              <Sparkles className="w-8 h-8 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold mb-3">
              Your AI <span className="text-gradient-accent">Career Coach</span>
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Get personalized career advice, resume reviews, interview prep, and skill roadmaps — all powered by Claude AI.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt.text}
                  onClick={() => handleSubmit(prompt.text)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl glass hover:bg-white/10 transition-all text-left text-sm group cursor-pointer"
                >
                  <prompt.icon className={cn('w-5 h-5 shrink-0', prompt.color)} />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                    {prompt.text}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-6">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    'flex gap-3',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3 relative group',
                      msg.role === 'user'
                        ? 'bg-primary/10 border border-primary/20 text-foreground'
                        : 'glass'
                    )}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        className="absolute -bottom-3 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg glass hover:bg-white/20 transition-all"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shrink-0 mt-1">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="glass rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-border px-6 py-4">
        <div className="max-w-3xl mx-auto relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me about your career, resume, interviews..."
            rows={1}
            className="w-full glass rounded-2xl px-5 py-3.5 pr-14 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/50 bg-transparent"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading}
            className={cn(
              'absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl flex items-center justify-center transition-all',
              input.trim() && !isLoading
                ? 'gradient-hero text-black hover:shadow-lg hover:shadow-primary/20'
                : 'bg-white/5 text-muted-foreground cursor-not-allowed'
            )}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function getSimulatedResponse(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('resume') || q.includes('cv')) {
    return `I'd be happy to help review your resume for Web3 roles! Here are some key suggestions:

**Structure:**
- Lead with a strong summary highlighting your Web3 experience
- List blockchain-specific skills prominently (Solidity, Hardhat, ethers.js)
- Quantify your achievements (e.g., "Managed $10M+ TVL protocol")

**Key improvements:**
1. Add a "Web3 Projects" section showcasing dApps you've built
2. Include links to deployed contracts on Etherscan
3. Mention any audit experience or security knowledge
4. Reference open-source contributions on GitHub

**Skills to highlight:**
- Smart contract development & testing
- DeFi protocol knowledge (AMMs, lending, yield)
- Security best practices & common vulnerabilities
- Frontend Web3 integration (wagmi, viem, ethers)

Would you like me to rewrite specific bullet points for a particular role?`;
  }

  if (q.includes('skill') || q.includes('defi')) {
    return `Great question! Here's a skill roadmap for breaking into DeFi development:

**Must-Have Skills:**
🟢 Solidity (advanced) — ERC standards, gas optimization
🟢 Smart Contract Security — reentrancy, flash loans, oracle manipulation
🟢 DeFi Primitives — AMMs, lending protocols, yield aggregators
🟢 Testing — Foundry/Hardhat, fuzzing, formal verification

**Nice-to-Have:**
🟡 MEV & Flashbots
🟡 Cross-chain bridges & messaging
🟡 Vyper or Huff for gas optimization
🟡 The Graph & subgraph development

**Learning Path (3 months):**
- Month 1: Complete CryptoZombies → Build a basic DEX
- Month 2: Study Uniswap V3 & Aave V3 codebases
- Month 3: Participate in audit contests on Code4rena

Want me to create a detailed weekly study plan?`;
  }

  if (q.includes('interview') || q.includes('prepare')) {
    return `Here are common Solidity interview questions and how to ace them:

**Technical Questions:**
1. "Explain the difference between memory, storage, and calldata"
2. "How would you prevent a reentrancy attack?"
3. "What is the EIP-1967 proxy pattern?"
4. "Explain how Uniswap V3 concentrated liquidity works"
5. "How do you optimize gas in Solidity?"

**System Design:**
- "Design a lending protocol from scratch"
- "How would you build a decentralized oracle?"
- "Design a cross-chain bridge"

**Behavioral Tips:**
- Show your on-chain portfolio and deployed contracts
- Discuss security incidents you've learned from
- Demonstrate understanding of economic incentives
- Ask thoughtful questions about their protocol's architecture

Need me to do a mock interview for any specific role?`;
  }

  if (q.includes('cover letter') || q.includes('aave')) {
    return `Here's a tailored cover letter for Aave Protocol:

---

**Dear Aave Hiring Team,**

As a passionate DeFi developer with 5+ years of experience building decentralized financial applications, I'm thrilled to apply for the Senior Solidity Developer position at Aave Protocol.

**Why I'm a great fit:**
- Built and deployed lending protocol contracts handling $50M+ TVL
- Deep knowledge of Aave V3's architecture and risk parameters
- Published research on flash loan security patterns
- Active contributor to DeFi governance discussions

**What I bring:**
I combine strong technical skills (Solidity, Foundry, formal verification) with a deep understanding of DeFi economics. I've personally used Aave since V1 and have studied your codebase extensively.

**My approach:**
I believe in security-first development, comprehensive testing, and clear documentation. I'd love to contribute to Aave's mission of creating an open, transparent financial system.

I'm excited about the opportunity to discuss how my experience aligns with your team's goals.

Best regards,
[Your Name]

---

Would you like me to adjust the tone or emphasis?`;
  }

  return `That's a great question! Let me think about this carefully.

Based on your profile and the current Web3 job market, here are my thoughts:

1. **Your strengths** align well with current market demands
2. **Areas to focus on** include staying current with emerging protocols
3. **Networking** through DAOs and developer communities is key

I can provide more specific guidance if you tell me:
- What type of role are you targeting?
- What's your experience level?
- Are you open to any specific chains/protocols?

Let me know and I'll give you a detailed, personalized action plan! 🚀`;
}
