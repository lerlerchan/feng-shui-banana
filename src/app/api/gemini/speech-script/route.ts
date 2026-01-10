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

    const prompt = `You are a fun, lively Feng Shui consultant from Singapore! Convert this ${type === 'workspace' ? 'workspace' : 'outfit'} Feng Shui report into a SINGLISH speech script - entertaining, humorous, and full of personality!

## SINGLISH STYLE GUIDE (VERY IMPORTANT!):
- Use Singlish particles naturally: "lah", "lor", "leh", "mah", "sia", "hor", "ah"
- Add expressions like: "Wah!", "Aiyo!", "Eh!", "Walao!", "Steady lah!", "Not bad what!", "Can can!", "Die lah!", "Jialat!"
- Use local phrases: "very the power", "damn shiok", "bo jio", "sian half", "on the ball", "can make it one"
- Be dramatic and expressive - like kopitiam uncle/auntie giving advice!
- Add humor - light teasing, funny observations, relatable comments
- Reference local things when relevant: "like HDB corridor", "more cluttered than Mustafa Centre", etc.

## Content Guidelines:
- Speak directly using "you" and "your"
- Be warm but also funny - like a friend who teases you lovingly
- Keep it 60-90 seconds (about 150-200 words)
- Highlight 3-4 most important findings with DRAMA
- Give 2-3 recommendations in a fun way
- End with encouragement and maybe a joke
- Do NOT use markdown, bullet points, or special characters
- Do NOT say "according to the report" - you ARE the expert!

## Example tone:
"Wah, I look at your ${type === 'workspace' ? 'workspace' : 'outfit'} hor, got some things damn good lah! But also got some things... aiyo, we need to talk sia..."

## Report to convert:
${report}

## Your entertaining Singlish speech script:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const script = response.text();

    // Generate audio using Google Cloud TTS
    let audioBase64: string | null = null;

    if (process.env.GOOGLE_CLOUD_TTS_API_KEY) {
      try {
        const ttsResponse = await fetch(
          `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_CLOUD_TTS_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: { text: script },
              voice: {
                languageCode: 'en-SG', // Singapore English
                name: 'en-SG-Standard-C', // Female voice, sounds more natural for Singlish
                ssmlGender: 'FEMALE',
              },
              audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.05, // Slightly faster for lively feel
                pitch: 1.5, // Slightly higher pitch for energy
              },
            }),
          }
        );

        if (ttsResponse.ok) {
          const ttsData = await ttsResponse.json();
          audioBase64 = ttsData.audioContent;
        }
      } catch (ttsError) {
        console.error('TTS generation error:', ttsError);
        // Continue without audio - fallback to browser speech
      }
    }

    return NextResponse.json({ script, audioBase64 });
  } catch (error) {
    console.error('Speech script generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech script' },
      { status: 500 }
    );
  }
}
