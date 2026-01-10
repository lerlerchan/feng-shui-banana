import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { report, type } = await request.json();

    if (!report) {
      return NextResponse.json({ error: 'No report provided' }, { status: 400 });
    }

    const scriptPrompt = `You are a fun, lively Feng Shui consultant from Singapore! Convert this ${type === 'workspace' ? 'workspace' : 'outfit'} Feng Shui report into a SINGLISH speech script - entertaining, humorous, and full of personality!

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

    // First, generate the script text using Gemini 2.0 Flash
    const textResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: scriptPrompt }] }],
        }),
      }
    );

    if (!textResponse.ok) {
      throw new Error('Failed to generate script');
    }

    const textData = await textResponse.json();
    const script = textData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Now generate audio using Gemini 2.5 Flash TTS (better quality)
    let audioBase64: string | null = null;

    try {
      // Gemini 2.5 Flash TTS with style prompt for lively Singlish delivery
      const ttsResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: script }],
              },
            ],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: 'Kore', // Energetic, expressive voice
                  },
                },
                // Style prompt for Singlish delivery
                multiSpeakerVoiceConfig: {
                  speakerVoiceConfigs: [
                    {
                      speaker: 'default',
                      voiceConfig: {
                        prebuiltVoiceConfig: {
                          voiceName: 'Kore',
                        },
                      },
                    },
                  ],
                },
              },
            },
            // System instruction for speaking style
            systemInstruction: {
              parts: [
                {
                  text: 'Speak in a lively, energetic Singaporean accent. Be expressive, warm, and fun - like a friendly kopitiam auntie giving advice! Use natural pauses, vary your pitch for emphasis, and sound genuinely excited when sharing good news. Add slight dramatic pauses before important points.',
                },
              ],
            },
          }),
        }
      );

      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        // Extract audio from response
        const audioPart = ttsData.candidates?.[0]?.content?.parts?.find(
          (part: { inlineData?: { mimeType: string; data: string } }) =>
            part.inlineData?.mimeType?.startsWith('audio/')
        );
        if (audioPart?.inlineData?.data) {
          audioBase64 = audioPart.inlineData.data;
        }
      } else {
        // Fallback to Gemini 2.0 Flash if 2.5 TTS not available
        console.log('Gemini 2.5 TTS not available, falling back to 2.0 Flash');
        const fallbackResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `Read this script aloud in a lively, energetic Singaporean accent:\n\n${script}`,
                    },
                  ],
                },
              ],
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: 'Kore',
                    },
                  },
                },
              },
            }),
          }
        );

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          const audioPart = fallbackData.candidates?.[0]?.content?.parts?.find(
            (part: { inlineData?: { mimeType: string; data: string } }) =>
              part.inlineData?.mimeType?.startsWith('audio/')
          );
          if (audioPart?.inlineData?.data) {
            audioBase64 = audioPart.inlineData.data;
          }
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
