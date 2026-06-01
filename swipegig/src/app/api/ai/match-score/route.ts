import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { jobTitle, jobDescription, jobSkills, userSkills, userExperience } = await request.json();

    if (!jobTitle || !jobDescription) {
      return NextResponse.json({ error: 'Job title and description required' }, { status: 400 });
    }

    const prompt = `Analyze the match between a candidate and a job posting. Return JSON only.

Job:
- Title: ${jobTitle}
- Description: ${jobDescription}
- Required Skills: ${(jobSkills || []).join(', ')}

Candidate:
- Skills: ${(userSkills || []).join(', ')}
- Experience: ${userExperience || 'Not provided'}

Return this exact JSON format:
{
  "overallScore": <number 0-100>,
  "skillBreakdown": [
    { "skill": "<skill name>", "status": "match" | "partial" | "missing", "notes": "<brief note>" }
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "gaps": ["<gap 1>", "<gap 2>"],
  "recommendation": "<brief recommendation>"
}`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 1024,
      response_format: { type: 'json_object' },
    });

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}');
    return NextResponse.json(result);
  } catch (error) {
    console.error('[AI_MATCH_SCORE]', error);
    return NextResponse.json({ error: 'AI service unavailable' }, { status: 500 });
  }
}
