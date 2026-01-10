import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { report, type } = await request.json();

    if (!report) {
      return NextResponse.json({ error: 'No report provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a friendly Feng Shui consultant speaking to a client. Convert this ${type === 'workspace' ? 'workspace' : 'outfit'} Feng Shui report into a natural, conversational speech script that will be read aloud.

## Guidelines:
- Speak directly to the listener using "you" and "your"
- Be warm, friendly, and encouraging - like talking to a friend
- Keep it concise - aim for 60-90 seconds of speaking time (about 150-200 words)
- Highlight the 3-4 most important findings
- Give 2-3 key actionable recommendations
- Use simple language, avoid technical jargon
- Add natural pauses with commas and periods
- End with an encouraging note
- Do NOT use markdown formatting, bullet points, or special characters
- Do NOT say "according to the report" - speak as if YOU did the analysis
- Use conversational fillers naturally like "So," "Now," "Also,"

## Report to convert:
${report}

## Your conversational speech script:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const script = response.text();

    return NextResponse.json({ script });
  } catch (error) {
    console.error('Speech script generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech script' },
      { status: 500 }
    );
  }
}
