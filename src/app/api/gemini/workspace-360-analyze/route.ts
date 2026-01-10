import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper to strip data URL prefix from base64 string
function stripDataUrlPrefix(base64: string): string {
  const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
  return match ? match[1] : base64;
}

// 2026 Feng Shui Knowledge Base (same as workspace-analyze)
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
    const { images, luckyColors, unluckyColors, directionalAnalysis } = await request.json();

    if (!images || images.length !== 4) {
      return NextResponse.json({ error: 'Exactly 4 directional images required (N, E, S, W)' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

    const prompt = `You are a master Feng Shui consultant performing a comprehensive 360-degree workspace analysis based on 2026 Flying Star principles.

You have been provided 4 images showing the workspace from each cardinal direction:
- NORTH view: First image
- EAST view: Second image
- SOUTH view: Third image
- WEST view: Fourth image

${FENGSHUI_2026_KNOWLEDGE}

## User's BaZi Profile:
- Lucky Colors: ${luckyColorNames}
- Colors to Avoid: ${unluckyColorNames}
${directionalContext}

## Your Task:
Synthesize observations from ALL FOUR directions to provide a complete spatial Feng Shui analysis.

Analyze:
1. **Overall Assessment** - Rate the complete workspace and provide summary
2. **Direction-by-Direction** - What's in each direction and its 2026 Flying Star implications
3. **Element Balance** - Distribution of Five Elements across the entire space
4. **Prioritized Actions** - Top 5 most impactful changes to make

CRITICAL 2026 CONSIDERATIONS:
- South has the Five Yellow (五黄) disaster star - check if there are any problematic items there
- East has the 8 White (八白) wealth star - should be activated with fire element colors
- Northwest has the 2 Black (二黑) illness star - should have metal remedies
- North has the 6 White (六白) nobleman star - keep this area clean

Respond in JSON format with BULLET POINTS for easy reading:
{
  "overallScore": "excellent|good|neutral|poor",
  "overallAnalysis": ["Key point 1 about the workspace", "Key point 2", "Key point 3"],
  "directionBreakdown": [
    {
      "direction": "N",
      "observations": ["What you see item 1", "Item 2", "Item 3"],
      "score": "excellent|good|neutral|poor",
      "flyingStarNote": "Brief 2026 Flying Star note (1 line)",
      "recommendations": ["Action 1", "Action 2"]
    },
    {
      "direction": "E",
      "observations": ["..."],
      "score": "...",
      "flyingStarNote": "...",
      "recommendations": ["..."]
    },
    {
      "direction": "S",
      "observations": ["..."],
      "score": "...",
      "flyingStarNote": "...",
      "recommendations": ["..."]
    },
    {
      "direction": "W",
      "observations": ["..."],
      "score": "...",
      "flyingStarNote": "...",
      "recommendations": ["..."]
    }
  ],
  "elementBalance": [
    {"element": "Wood", "percentage": 20, "location": "East wall plants"},
    {"element": "Fire", "percentage": 15, "location": "..."},
    {"element": "Earth", "percentage": 25, "location": "..."},
    {"element": "Metal", "percentage": 20, "location": "..."},
    {"element": "Water", "percentage": 20, "location": "..."}
  ],
  "prioritizedRecommendations": [
    "Most impactful change with specific location",
    "Second priority action",
    "Third priority action",
    "Fourth action",
    "Fifth action"
  ],
  "flyingStarInsights": ["Key 2026 insight 1", "Key insight 2", "Key insight 3"]
}

IMPORTANT:
- Use SHORT bullet points (max 15 words each) for easy mobile reading
- Be specific about locations
- Reference actual items you see in the images
- NO paragraph text - everything should be scannable bullet points`;

    // Sort images by direction order: N, E, S, W
    const directionOrder = ['N', 'E', 'S', 'W'];
    const sortedImages = directionOrder.map(dir =>
      images.find((img: { direction: string }) => img.direction === dir)
    ).filter(Boolean);

    const result = await model.generateContent([
      prompt,
      ...sortedImages.map((img: { image: string }) => ({
        inlineData: {
          mimeType: 'image/jpeg',
          data: stripDataUrlPrefix(img.image),
        },
      })),
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
      overallScore: 'neutral',
      overallAnalysis: text,
      directionBreakdown: [],
      elementBalance: [],
      prioritizedRecommendations: ['Please try again for detailed recommendations'],
      flyingStarInsights: 'Analysis complete - see overall analysis',
    });
  } catch (error) {
    console.error('360 Workspace analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze 360 workspace' },
      { status: 500 }
    );
  }
}
