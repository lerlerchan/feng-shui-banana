import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper to strip data URL prefix from base64 string
function stripDataUrlPrefix(base64: string): string {
  const match = base64.match(/^data:image\/\w+;base64,(.+)$/);
  return match ? match[1] : base64;
}

// 2026 Feng Shui Knowledge
const FENGSHUI_2026_KNOWLEDGE = `
## 2026 Year of the Fire Horse (火马年) - Flying Stars

### Key Positions for 2026:
- **East**: 8 White Star (八白) - Wealth Star - Activate with Fire element (red/orange)
- **West**: 3 Jade Star (三碧) - Wealth & Profit - Enhance with Water (blue/black)
- **South**: 5 Yellow Star (五黄) - DISASTER STAR - Neutralize with Metal (white/gold)
- **North**: 6 White Star (六白) - Nobleman Star - Keep clean and calm
- **Northwest**: 2 Black Star (二黑) - Illness Star - Remedy with Metal
- **Southeast**: 9 Purple Star (九紫) - Celebration - Enhance with Wood (green)
- **Northeast**: 4 Dark Green Star (四绿) - Academic Star - Enhance with Water
- **Southwest**: 7 Scarlet Star (七赤) - Focus Star - Balance with Water

### Important 2026 Warnings:
- Grand Duke (太岁): South - Do NOT face or sit with back to South
- Sui Po (岁破): North - Avoid major activities
- Three Killing (三煞): North sector - Don't sit with back to North
`;

export async function POST(request: NextRequest) {
  try {
    const { images, singleImage, luckyColors, unluckyColors, is360Mode, directionalAnalysis } = await request.json();

    if (!images && !singleImage) {
      return NextResponse.json({ error: 'No image(s) provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const luckyColorNames = luckyColors?.map((c: { color: string }) => c.color).join(', ') || 'Not specified';
    const unluckyColorNames = unluckyColors?.map((c: { color: string }) => c.color).join(', ') || 'Not specified';

    // Build directional context if available
    let directionalContext = '';
    if (directionalAnalysis) {
      directionalContext = `
### User's Personal Feng Shui Directions:
- Best Sitting Direction: Face ${directionalAnalysis.sittingDirection?.primaryDirection || 'Not specified'}
- Best Desk Position: ${directionalAnalysis.deskPosition?.primaryDirection || 'Not specified'} sector
- Wealth Corner: ${directionalAnalysis.wealthCorner?.direction || 'Not specified'}
`;
    }

    const prompt = `You are a master Feng Shui consultant creating a comprehensive workspace analysis report based on 2026 Flying Star principles.

${FENGSHUI_2026_KNOWLEDGE}

## User's BaZi Profile:
- Lucky Colors: ${luckyColorNames}
- Colors to Avoid: ${unluckyColorNames}
${directionalContext}

## Your Task:
${is360Mode ? 'You are analyzing 4 images showing all cardinal directions (North, East, South, West) of the workspace.' : 'You are analyzing a single workspace photo.'}

Write a COMPREHENSIVE, PROFESSIONAL Feng Shui report that includes:

## Report Structure:

### 1. Executive Summary 🏢
- Quick overall assessment (2-3 sentences)
- Overall energy rating (Excellent/Good/Needs Work/Critical)

### 2. What I Observed 👁️
- List key items, colors, and arrangements you see
- Note the dominant elements present
- Identify any Feng Shui red flags

### 3. 2026 Flying Star Analysis ⭐
- How does this workspace align with 2026's Flying Star positions?
- Identify any areas sitting in auspicious or inauspicious star positions
- Note any conflicts with Grand Duke, Sui Po, or Three Killing

### 4. Element Balance Analysis ⚖️
- Break down the Five Elements present (Metal, Wood, Water, Fire, Earth)
- Identify which elements are excessive or lacking
- How this affects the user based on their lucky colors

### 5. Color Harmony Report 🎨
- How well do the workspace colors match user's lucky colors?
- Identify any colors to avoid that are present
- Specific color adjustments recommended

### 6. Priority Recommendations 📋
- List 5-7 specific, actionable changes ranked by importance
- Include WHY each change matters
- Note which 2026 Flying Star each recommendation addresses

### 7. Quick Wins ✨
- 3 simple changes that can be made TODAY
- Low-cost, high-impact adjustments

### 8. Final Verdict 🎯
- Summary score and encouraging closing
- What this workspace does WELL
- Most critical change to make first

## Format Guidelines:
- Use markdown headers (##, ###)
- Use bullet points for lists
- Include relevant emojis for visual appeal
- Be specific - reference actual items you see
- Total length: 600-800 words
- Tone: Professional yet approachable, like a consultant who genuinely wants to help

Write the comprehensive report now:`;

    // Prepare image(s) for the API
    const imageContents = [];

    if (is360Mode && images) {
      // Multiple images for 360 mode
      const directionOrder = ['N', 'E', 'S', 'W'];
      const directionNames = { N: 'NORTH', E: 'EAST', S: 'SOUTH', W: 'WEST' };

      for (const dir of directionOrder) {
        const img = images.find((i: { direction: string }) => i.direction === dir);
        if (img) {
          imageContents.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: stripDataUrlPrefix(img.image),
            },
          });
        }
      }
    } else if (singleImage) {
      // Single image mode
      imageContents.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: stripDataUrlPrefix(singleImage),
        },
      });
    }

    const result = await model.generateContent([prompt, ...imageContents]);

    const response = await result.response;
    const report = response.text();

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Workspace report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate workspace report' },
      { status: 500 }
    );
  }
}
