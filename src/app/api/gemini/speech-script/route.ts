import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { report, type } = await request.json();

    if (!report) {
      return NextResponse.json({ error: 'No report provided' }, { status: 400 });
    }

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

    // First, generate the script text
    const textResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    if (!textResponse.ok) {
      throw new Error('Failed to generate script');
    }

    const textData = await textResponse.json();
    const script = textData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Now generate audio using Gemini 2.0 Flash with audio output
    let audioBase64: string | null = null;

    try {
      const audioResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: `Read the following script aloud in a lively, energetic Singaporean accent. Be expressive and fun, like a friendly kopitiam auntie giving advice! Add natural pauses and emphasis where appropriate.\n\nScript:\n${script}`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Kore', // Energetic voice
                  },
                },
              },
            },
          }),
        }
      );

      if (audioResponse.ok) {
        const audioData = await audioResponse.json();
        // Extract audio from response
        const audioPart = audioData.candidates?.[0]?.content?.parts?.find(
          (part: { inlineData?: { mimeType: string; data: string } }) => part.inlineData?.mimeType?.startsWith('audio/')
        );
        if (audioPart?.inlineData?.data) {
          audioBase64 = audioPart.inlineData.data;
        }
      }
    } catch (audioError) {
      console.error('Audio generation error:', audioError);
      // Continue without audio - fallback to browser speech
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
