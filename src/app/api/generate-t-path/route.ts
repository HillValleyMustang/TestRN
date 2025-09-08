import { supabase } from '@/integrations/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log("[API Route Debug] /api/generate-t-path: Request received.");
  try {
    const { tPathId } = await request.json();
    console.log(`[API Route Debug] /api/generate-t-path: Received tPathId: ${tPathId}`);
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.error("[API Route Debug] /api/generate-t-path: Authorization header missing.");
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }
    console.log("[API Route Debug] /api/generate-t-path: Authorization header present.");

    console.log("[API Route Debug] /api/generate-t-path: Invoking Supabase Edge Function 'generate-t-path'.");
    const { data, error } = await supabase.functions.invoke('generate-t-path', {
      body: { tPathId },
      headers: {
        Authorization: authHeader,
      },
    });
    console.log("[API Route Debug] /api/generate-t-path: Supabase Edge Function invocation completed.");

    if (error) {
      console.error("[API Route Debug] /api/generate-t-path: Error from Supabase Edge Function:", error.message);
      throw new Error(error.message);
    }
    console.log("[API Route Debug] /api/generate-t-path: Supabase Edge Function returned data:", data);

    return NextResponse.json({ message: 'T-Path generation initiated successfully.', functionId: data?.function_id });
  } catch (error: any) {
    console.error('[API Route Debug] /api/generate-t-path: Error in route handler:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}