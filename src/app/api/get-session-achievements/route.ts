import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { userId, sessionId } = await request.json();
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const SUPABASE_PROJECT_ID = 'mgbfevrzrbjjiajkqpti';
    const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/process-achievements`;

    const edgeFunctionResponse = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({ user_id: userId, session_id: sessionId }),
    });

    const data = await edgeFunctionResponse.json();

    if (!edgeFunctionResponse.ok) {
      return NextResponse.json({ error: data.error || 'Edge function error' }, { status: edgeFunctionResponse.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching session achievements:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}