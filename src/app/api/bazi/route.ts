import { NextRequest, NextResponse } from 'next/server';
import { calculateBazi } from '@/lib/bazi';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gender, birthDate, birthTime } = body;

    if (!birthDate) {
      return NextResponse.json(
        { error: 'Birth date is required' },
        { status: 400 }
      );
    }

    const result = calculateBazi(birthDate, birthTime || undefined);

    return NextResponse.json(result);
  } catch (error) {
    console.error('BaZi calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate BaZi' },
      { status: 500 }
    );
  }
}
