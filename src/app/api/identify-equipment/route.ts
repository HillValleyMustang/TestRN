import { NextResponse } from 'next/server';

// This route will proxy the request to the Supabase Edge Function
// It's necessary because direct client-to-Edge-Function calls might have CORS issues
// or require more complex setup for file uploads.
// By proxying through a Next.js API route, we can easily forward the auth token.

export async function POST(request: Request) {
  try {
    const { base64Image, locationTag } = await request.json();
    
    // Extract the Authorization header from the incoming request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    // Call the Supabase Edge Function
    // Replace 'mgbfevrzrbjjiajkqpti' with your actual Supabase Project ID
    const SUPABASE_PROJECT_ID = 'mgbfevrzrbjjiajkqpti'; 
    const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/identify-equipment`;

    const edgeFunctionResponse = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader, // Forward the user's JWT
      },
      body: JSON.stringify({ base64Image, locationTag }),
    });

    const data = await edgeFunctionResponse.json();

    if (!edgeFunctionResponse.ok) {
      // Forward the error from the Edge Function
      return NextResponse.json({ error: data.error || 'Edge function error' }, { status: edgeFunctionResponse.status });
    }

    // The Edge Function now returns an array of identified exercises
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/identify-equipment route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}