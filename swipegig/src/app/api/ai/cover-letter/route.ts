import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, companyName, userProfile } = await request.json();

    if (!jobTitle || !companyName) {
      return NextResponse.json({ error: 'Job title and company name required' }, { status: 400 });
    }

    const prompt = `Write a professional, tailored cover letter for the following job application.

Job: ${jobTitle} at ${companyName}
Description: ${jobDescription || 'Not provided'}

Candidate Profile:
- Name: ${userProfile?.name || '[Name]'}
- Headline: ${userProfile?.headline || 'Software Developer'}
- Skills: ${(userProfile?.skills || []).join(', ')}
- Bio: ${userProfile?.bio || 'Not provided'}

Requirements:
1. Keep it concise (250-350 words)
2. Open with a compelling hook specific to the company
3. Highlight relevant skills and experience
4. Show genuine interest in the company's mission
5. End with a clear call to action
6. Professional but personable tone

Write the cover letter now:`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 1024,
      stream: true,
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[AI_COVER_LETTER]', error);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 });
  }
}
