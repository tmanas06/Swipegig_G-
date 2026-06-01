import path from 'path';

if (typeof global !== 'undefined' && !(global as any).DOMMatrix) {
  (global as any).DOMMatrix = class DOMMatrix {};
}
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import Groq from 'groq-sdk';

// Configure the worker path dynamically at runtime for the Next.js server environment
const workerPath = path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs');
PDFParse.setWorker(workerPath);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

export interface ParsedResume {
  name?: string;
  headline?: string;
  skills: string[];
  experience: Array<{
    company: string;
    title: string;
    period: string;
    description: string;
  }>;
  education: Array<{
    school: string;
    degree: string;
    fieldOfStudy: string;
    period: string;
  }>;
  summary: string;
}

export async function parseResume(buffer: Buffer, fileType: string): Promise<ParsedResume> {
  let text = '';

  try {
    if (fileType === 'application/pdf' || fileType.toLowerCase().includes('pdf')) {
      const parser = new PDFParse({ data: buffer });
      const parsedData = await parser.getText();
      text = parsedData.text;
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileType.toLowerCase().includes('docx') ||
      fileType.toLowerCase().includes('msword')
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      text = buffer.toString('utf-8');
    }
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error('Failed to extract text from resume file');
  }

  if (!text.trim()) {
    throw new Error('Extracted resume text is empty');
  }

  const prompt = `You are a resume parsing AI. Your job is to extract structured information from the following raw resume text.
Extract:
1. Name (as a string)
2. Headline/Current Role (as a string)
3. Skills (as an array of strings, normalized to standard industry keywords, e.g. "Solidity", "React", "TypeScript", "DeFi")
4. Professional Experience (as an array of objects containing company, title, period, and description)
5. Education (as an array of objects containing school, degree, fieldOfStudy, and period)
6. Professional Summary (a brief paragraph summarizing the candidate)

Output MUST be a valid JSON object matching the schema below. Do not output anything except the JSON object.
Schema:
{
  "name": "Alex Chen",
  "headline": "Senior Solidity Developer",
  "skills": ["Solidity", "Hardhat", "TypeScript", "DeFi"],
  "experience": [
    {
      "company": "DeFi Protocol",
      "title": "Smart Contract Engineer",
      "period": "2022 - Present",
      "description": "Led development of lending pool contracts"
    }
  ],
  "education": [
    {
      "school": "University of Waterloo",
      "degree": "Bachelor of Science",
      "fieldOfStudy": "Computer Science",
      "period": "2018 - 2022"
    }
  ],
  "summary": "Experienced blockchain engineer specializing in Solidity smart contracts and DeFi protocols."
}

Resume Text:
${text}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const responseContent = completion.choices[0]?.message?.content || '{}';
    const parsed = JSON.parse(responseContent);
    
    return {
      name: parsed.name || undefined,
      headline: parsed.headline || undefined,
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      summary: parsed.summary || '',
    };
  } catch (error) {
    console.error('Error generating structured resume parse from Groq:', error);
    throw new Error('Failed to parse resume content using AI');
  }
}
