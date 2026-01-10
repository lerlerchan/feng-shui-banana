// Gemini API client for outfit analysis
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface OutfitAnalysisResult {
  analysis: string;
  detectedColors: string[];
  colorMatch: 'excellent' | 'good' | 'neutral' | 'poor';
  suggestions: string[];
  elementAlignment: string;
}

export async function analyzeOutfit(
  imageBase64: string,
  luckyColors: { color: string; code: string }[],
  unluckyColors: { color: string; code: string }[]
): Promise<OutfitAnalysisResult> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const luckyColorNames = luckyColors.map(c => c.color).join(', ');
  const unluckyColorNames = unluckyColors.map(c => c.color).join(', ');
  
  const prompt = `You are a Feng Shui fashion advisor analyzing an outfit photo.

The user's lucky colors based on their BaZi (八字) analysis are: ${luckyColorNames}
The colors they should avoid are: ${unluckyColorNames}

Please analyze the outfit in the image and provide:
1. A brief description of the colors visible in the outfit
2. How well the outfit aligns with their lucky colors (excellent/good/neutral/poor)
3. Specific suggestions for improvement based on Five Elements (五行) principles
4. Which element (Metal/Wood/Water/Fire/Earth) the outfit currently represents

Respond in JSON format:
{
  "analysis": "Brief friendly analysis of the outfit",
  "detectedColors": ["color1", "color2"],
  "colorMatch": "excellent|good|neutral|poor",
  "suggestions": ["suggestion1", "suggestion2"],
  "elementAlignment": "Description of element alignment"
}`;

  try {
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ]);
    
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    const jsonMatch = text.match(/{[sS]*}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // Fallback if JSON parsing fails
    return {
      analysis: text,
      detectedColors: [],
      colorMatch: 'neutral',
      suggestions: ['Unable to parse detailed suggestions'],
      elementAlignment: 'Analysis in progress',
    };
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to analyze outfit');
  }
}

export async function analyzeOutfitStream(
  imageBase64: string,
  luckyColors: { color: string; code: string }[],
  unluckyColors: { color: string; code: string }[],
  onChunk: (text: string) => void
): Promise<void> {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  
  const luckyColorNames = luckyColors.map(c => c.color).join(', ');
  const unluckyColorNames = unluckyColors.map(c => c.color).join(', ');
  
  const prompt = `You are a friendly Feng Shui fashion advisor. Analyze this outfit photo.

Lucky colors for today: ${luckyColorNames}
Colors to avoid: ${unluckyColorNames}

Give real-time, conversational feedback about:
1. What colors you see
2. How well they match the lucky colors
3. Quick suggestions

Keep it brief and encouraging!`;

  const result = await model.generateContentStream([
    prompt,
    {
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64,
      },
    },
  ]);
  
  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) {
      onChunk(text);
    }
  }
}
