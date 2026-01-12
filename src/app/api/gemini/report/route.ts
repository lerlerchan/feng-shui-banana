import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper to strip data URL prefix from base64 string
function stripDataUrlPrefix(base64: string): string {
  const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
  return match ? match[1] : base64;
}

export async function POST(request: NextRequest) {
  try {
    const { image, luckyColors, unluckyColors, baziChart, dayMaster } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const cleanBase64 = stripDataUrlPrefix(image);

    const luckyColorNames = luckyColors?.map((c: { color: string }) => c.color).join(', ') || 'Not specified';
    const unluckyColorNames = unluckyColors?.map((c: { color: string }) => c.color).join(', ') || 'Not specified';

    const prompt = `You are a master Feng Shui consultant who combines ancient Chinese wisdom with modern science. Generate an entertaining yet educational outfit analysis report.

## User's BaZi Profile:
- Day Master: ${dayMaster || 'Unknown'}
- Lucky Colors: ${luckyColorNames}
- Colors to Avoid: ${unluckyColorNames}

## Your Task:
Analyze the outfit in this image and write a FUN, ENGAGING report that:

1. **Opens with personality** - Start with a witty observation about the outfit
2. **Explains the science** - BaZi (八字) is based on the Chinese calendar's cyclical patterns. The Five Elements (五行) - Metal, Wood, Water, Fire, Earth - represent different energy types. Colors correspond to elements:
   - Metal (金): White, Gold, Silver - represents precision, clarity
   - Wood (木): Green, Teal - represents growth, vitality
   - Water (水): Blue, Black - represents wisdom, flow
   - Fire (火): Red, Orange, Pink - represents passion, energy
   - Earth (土): Yellow, Brown, Beige - represents stability, grounding

3. **Analyze what you see** - Describe the colors in the outfit and which elements they represent

4. **Give the verdict** - How well does this outfit align with the user's elemental needs? Be specific!

5. **Practical tips** - Give 2-3 specific, actionable suggestions

6. **Fun closing** - End with an encouraging or humorous note

## Format Guidelines:
- Use markdown formatting with headers
- Keep paragraphs short and punchy
- Include relevant emojis sparingly for visual appeal
- Total length: 300-400 words
- Tone: Like a knowledgeable friend who's fun at parties

Write the report now:`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64,
        },
      },
    ]);

    const response = await result.response;
    const report = response.text();

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
