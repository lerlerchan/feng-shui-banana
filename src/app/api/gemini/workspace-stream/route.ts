import { NextRequest } from 'next/server';
import { analyzeWorkspaceStream, DirectionalAnalysisData } from '@/lib/gemini';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { image, luckyColors, unluckyColors, directionalAnalysis } = body;

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create a TransformStream for SSE
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start streaming in background
    (async () => {
      try {
        await analyzeWorkspaceStream(
          image,
          luckyColors || [],
          unluckyColors || [],
          (directionalAnalysis as DirectionalAnalysisData) || null,
          async (chunk: string) => {
            // Send each chunk as SSE event
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ text: chunk })}\n\n`)
            );
          }
        );

        // Send completion event
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`)
        );
      } catch (error) {
        console.error('Stream error:', error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`)
        );
      } finally {
        await writer.close();
      }
    })();

    // Return streaming response
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Workspace stream error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to start stream' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
