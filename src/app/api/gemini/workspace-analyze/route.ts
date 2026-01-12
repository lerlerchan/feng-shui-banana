import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper to strip data URL prefix from base64 string
function stripDataUrlPrefix(base64: string): string {
  const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
  return match ? match[1] : base64;
}

// 2026 Feng Shui Knowledge Base
const FENGSHUI_2026_KNOWLEDGE = `
## 2026 Year of the Fire Horse (火马年) - Workspace Feng Shui Guide

### Flying Stars Chart for 2026 (九宫飞星图):
| Direction | Star | Theme | Auspicious Element/Colors |
|-----------|------|-------|---------------------------|
| East (E) | 8 White Star (八白) | Wealth Position (财位) - Build Good Relationships | Fire: Red, Orange |
| West (W) | 3 Jade Star (三碧) | Gain Wealth and Profit | Water: Blue, Black |
| Southeast (SE) | 9 Purple Star (九紫) | Celebration (喜庆) - Explore Proactively | Wood: Green |
| Northeast (NE) | 4 Dark Green Star (四绿) | Academic/Peach Blossom (文昌/桃花) - Advance Steadily | Water: Blue, Black |
| Southwest (SW) | 7 Scarlet Star (七赤) | Stay Composed and Focused | Water: Blue, Black |
| South (S) | 5 Yellow Star (五黄) | DISASTER STAR - Pay Attention to Safety | Metal: White, Gold (to weaken) |
| North (N) | 6 White Star (六白) | Nobleman (贵人) - Keep Calm and Be Patient | Water: Blue, Black |
| Northwest (NW) | 2 Black Star (二黑) | Illness Star - Treat Others Sincerely | Metal: White, Gold (to weaken) |
| Center | 1 White Star (一白) | Career Growth Potential | |

### Auspicious Star Positions for Workspace:
- **Wealth Star (正财/偏财)**: West 277.5° - 292.5° - Place Infinite Riches or piggy bank
- **Benefactor Star (贵人)**: West 262.5° - 277.5° and Northwest 322.5° - 337.5° - Display portraits of mentors
- **Academic Star (文昌)**: Southwest 232.5° - 247.5° - Display books, stationery
- **Heavenly Doctor Star (天医)**: Southeast 142.5° - 157.5° - For health energy

### Inauspicious Star Positions to AVOID or Remedy:
- **Five Yellow Disaster Star (五黄)**: South 157.5° - 202.5° - AVOID sitting here, use metal objects to weaken
- **Two Black Illness Star (二黑)**: Northwest 292.5° - 337.5° - Avoid if health is weak
- **Grand Duke (太岁)**: South 172.5° - 187.5° - Do NOT face or sit with back to this direction
- **Sui Po (岁破)**: North 352.5° - 7.5° - Avoid major activities here
- **Three Killing (三煞)**: North 337.5° - 22.5° - Do not sit with back to North

### Workspace Feng Shui Principles:
1. **Desk Position**: Back should face a solid wall (support), front should have open view (bright future)
2. **Avoid**: Sitting with back to door, under beams, facing sharp corners
3. **Wealth Corner**: Typically diagonal from entrance - keep clean and bright, place water features or plants
4. **Colors by Element**:
   - Metal (金): White, Gold, Silver - precision, clarity
   - Wood (木): Green, Teal - growth, vitality
   - Water (水): Blue, Black - wisdom, flow
   - Fire (火): Red, Orange, Pink - passion, energy
   - Earth (土): Yellow, Brown, Beige - stability, grounding

### Remedies:
- Place salt lamp or metal objects in South to neutralize Five Yellow
- Use plants or water features in East for wealth
- Keep North area clean and quiet
- Add green plants in Northeast for academic/career luck
`;

export async function POST(request: NextRequest) {
  try {
    const { image, luckyColors, unluckyColors, directionalAnalysis } = await request.json();

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const cleanBase64 = stripDataUrlPrefix(image);

    const luckyColorNames = luckyColors?.map((c: { color: string }) => c.color).join(', ') || 'Not specified';
    const unluckyColorNames = unluckyColors?.map((c: { color: string }) => c.color).join(', ') || 'Not specified';

    // Build directional context if available
    let directionalContext = '';
    if (directionalAnalysis) {
      directionalContext = `
User's Personal Feng Shui Directions:
- Best Sitting Direction: Face ${directionalAnalysis.sittingDirection?.primaryDirection || 'Not specified'}
- Best Desk Position: ${directionalAnalysis.deskPosition?.primaryDirection || 'Not specified'} sector
- Wealth Corner: ${directionalAnalysis.wealthCorner?.direction || 'Not specified'}
`;
    }

    const prompt = `You are a professional Feng Shui consultant analyzing a workspace photo based on 2026 Flying Star Feng Shui principles.

${FENGSHUI_2026_KNOWLEDGE}

## User's BaZi Profile:
- Lucky Colors: ${luckyColorNames}
- Colors to Avoid: ${unluckyColorNames}
${directionalContext}

## Your Task:
Analyze this workspace photo and provide Feng Shui recommendations based on:

1. **Visible Elements Analysis**: Identify colors, objects, plants, furniture arrangement visible in the workspace
2. **2026 Flying Star Assessment**: Based on what you can see, assess if the workspace aligns with 2026 auspicious positions
3. **Color Harmony**: How well do the workspace colors match the user's lucky colors?
4. **Feng Shui Issues**: Identify any visible Feng Shui problems (clutter, sharp corners pointing at desk, blocked energy flow)
5. **Specific Recommendations**: Give 2-3 actionable tips based on 2026 Feng Shui

Respond in JSON format:
{
  "analysis": "Brief overall workspace Feng Shui assessment (2-3 sentences)",
  "detectedColors": ["color1", "color2", "color3"],
  "colorMatch": "excellent|good|neutral|poor",
  "reason": "Brief reason for the rating (max 15 words)",
  "flyingStarNotes": "Brief note about 2026 Flying Star relevance (1 sentence)",
  "suggestions": ["Suggestion 1 based on 2026 Feng Shui", "Suggestion 2", "Suggestion 3"],
  "elementAlignment": "Which Five Elements are dominant in this workspace"
}

IMPORTANT: Keep analysis concise. Focus on practical, actionable Feng Shui advice based on 2026 principles.`;

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
    let text = response.text();

    // Strip markdown code blocks if present
    text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return NextResponse.json(parsed);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
      }
    }

    // Fallback if JSON parsing fails
    return NextResponse.json({
      analysis: text,
      detectedColors: [],
      colorMatch: 'neutral',
      reason: 'Unable to determine alignment',
      flyingStarNotes: 'Analysis complete',
      suggestions: ['Please try again for detailed suggestions'],
      elementAlignment: 'Mixed elements detected',
    });
  } catch (error) {
    console.error('Workspace analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze workspace' },
      { status: 500 }
    );
  }
}
