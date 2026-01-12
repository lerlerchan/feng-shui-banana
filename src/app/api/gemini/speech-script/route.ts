import { NextRequest, NextResponse } from 'next/server';

// Convert raw PCM (L16) to WAV format by adding header
function pcmToWav(pcmBase64: string, sampleRate: number = 24000, channels: number = 1, bitsPerSample: number = 16): string {
  const pcmData = Buffer.from(pcmBase64, 'base64');
  const dataLength = pcmData.length;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  // WAV header is 44 bytes
  const wavHeader = Buffer.alloc(44);

  // "RIFF" chunk descriptor
  wavHeader.write('RIFF', 0);
  wavHeader.writeUInt32LE(36 + dataLength, 4); // File size - 8
  wavHeader.write('WAVE', 8);

  // "fmt " sub-chunk
  wavHeader.write('fmt ', 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  wavHeader.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
  wavHeader.writeUInt16LE(channels, 22); // NumChannels
  wavHeader.writeUInt32LE(sampleRate, 24); // SampleRate
  wavHeader.writeUInt32LE(byteRate, 28); // ByteRate
  wavHeader.writeUInt16LE(blockAlign, 32); // BlockAlign
  wavHeader.writeUInt16LE(bitsPerSample, 34); // BitsPerSample

  // "data" sub-chunk
  wavHeader.write('data', 36);
  wavHeader.writeUInt32LE(dataLength, 40); // Subchunk2Size

  // Combine header and PCM data
  const wavBuffer = Buffer.concat([wavHeader, pcmData]);
  return wavBuffer.toString('base64');
}

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
    let audioSource: string = 'none';

    // Embed speaking style in the text for TTS
    const ttsText = `Say in an energetic, lively, and expressive voice with natural pauses: ${script}`;

    console.log('=== TTS DEBUG START ===');
    console.log('Script length:', script.length);
    console.log('TTS text preview:', ttsText.substring(0, 100) + '...');

    try {
      // Gemini 2.5 Flash TTS - simple format per official docs
      console.log('Attempting Gemini 2.5 Flash TTS...');
      const ttsResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: ttsText }],
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

      console.log('Gemini 2.5 TTS response status:', ttsResponse.status);

      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        console.log('Gemini 2.5 TTS response keys:', Object.keys(ttsData));
        console.log('Candidates count:', ttsData.candidates?.length);

        if (ttsData.candidates?.[0]?.content?.parts) {
          console.log('Parts count:', ttsData.candidates[0].content.parts.length);
          ttsData.candidates[0].content.parts.forEach((part: { inlineData?: { mimeType: string; data: string }; text?: string }, i: number) => {
            console.log(`Part ${i}:`, part.inlineData ? `audio/${part.inlineData.mimeType} (${part.inlineData.data?.length} chars)` : part.text ? 'text' : 'unknown');
          });
        }

        // Extract audio from response
        const audioPart = ttsData.candidates?.[0]?.content?.parts?.find(
          (part: { inlineData?: { mimeType: string; data: string } }) =>
            part.inlineData?.mimeType?.startsWith('audio/')
        );
        if (audioPart?.inlineData?.data) {
          // Convert PCM to WAV format for browser playback
          const pcmData = audioPart.inlineData.data;
          audioBase64 = pcmToWav(pcmData, 24000, 1, 16);
          audioSource = 'gemini-2.5-flash-tts';
          console.log('SUCCESS: Got audio from Gemini 2.5 TTS, PCM length:', pcmData.length, 'WAV length:', audioBase64?.length);
        } else {
          console.log('WARNING: Gemini 2.5 TTS response OK but no audio part found');
        }
      } else {
        // Log the error for debugging
        const errorText = await ttsResponse.text();
        console.log('Gemini 2.5 TTS FAILED:', ttsResponse.status);
        console.log('Error response:', errorText.substring(0, 500));

        // Fallback to Gemini 2.0 Flash if 2.5 TTS not available
        console.log('Attempting fallback to Gemini 2.0 Flash...');
        const fallbackResponse = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [{ text: ttsText }],
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

        console.log('Gemini 2.0 Flash response status:', fallbackResponse.status);

        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          console.log('Gemini 2.0 Flash response keys:', Object.keys(fallbackData));

          const audioPart = fallbackData.candidates?.[0]?.content?.parts?.find(
            (part: { inlineData?: { mimeType: string; data: string } }) =>
              part.inlineData?.mimeType?.startsWith('audio/')
          );
          if (audioPart?.inlineData?.data) {
            // Convert PCM to WAV format for browser playback
            const pcmData = audioPart.inlineData.data;
            audioBase64 = pcmToWav(pcmData, 24000, 1, 16);
            audioSource = 'gemini-2.0-flash';
            console.log('SUCCESS: Got audio from Gemini 2.0 Flash, PCM length:', pcmData.length, 'WAV length:', audioBase64?.length);
          } else {
            console.log('WARNING: Gemini 2.0 Flash response OK but no audio part found');
          }
        } else {
          const fallbackError = await fallbackResponse.text();
          console.log('Gemini 2.0 Flash FAILED:', fallbackResponse.status);
          console.log('Fallback error:', fallbackError.substring(0, 500));
        }
      }
    } catch (audioError) {
      console.error('Audio generation EXCEPTION:', audioError);
      // Continue without audio - fallback to browser speech
    }

    console.log('=== TTS DEBUG END ===');
    console.log('Final audio source:', audioSource);
    console.log('Audio base64 length:', audioBase64?.length || 0);

    return NextResponse.json({ script, audioBase64, audioSource });
  } catch (error) {
    console.error('Speech script generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech script' },
      { status: 500 }
    );
  }
}
