import { NextRequest, NextResponse } from 'next/server';
import { analyzeOutfit } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, luckyColors, unluckyColors } = body;

    if (!image) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }

    const result = await analyzeOutfit(image, luckyColors || [], unluckyColors || []);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Gemini analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze outfit' },
      { status: 500 }
    );
  }
}
