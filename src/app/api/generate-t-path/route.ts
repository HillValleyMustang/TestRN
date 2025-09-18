import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  console.log("[API Route Debug] /api/generate-t-path: Request received.");
  try {
    const { tPathId, preferred_session_length, confirmedExerciseIds } = await request.json(); // Destructure new value
    console.log(`[API Route Debug] /api/generate-t-path: Received tPathId: ${tPathId}, preferred_session_length: ${preferred_session_length}, confirmedExerciseIds:`, confirmedExerciseIds);
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.error("[API Route Debug] /api/generate-t-path: Authorization header missing.");
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }
    console.log("[API Route Debug] /api/generate-t-path: Authorization header present.");

    // Use direct fetch instead of supabase.functions.invoke for more robust error handling
    const SUPABASE_PROJECT_ID = 'mgbfevrzrbjjiajkqpti'; 
    const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/generate-t-path`;

    const edgeFunctionResponse = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ tPathId, preferred_session_length, confirmedExerciseIds }), // Forward it
    });

    const data = await edgeFunctionResponse.json();

    if (!edgeFunctionResponse.ok) {
      // Forward the error from the Edge Function
      console.error("[API Route Debug] /api/generate-t-path: Error from Edge Function:", data.error || 'Unknown edge function error');
      return NextResponse.json({ error: data.error || 'Edge function returned a non-2xx status code' }, { status: edgeFunctionResponse.status });
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