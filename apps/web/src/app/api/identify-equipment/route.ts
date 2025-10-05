import { supabase } from '@/integrations/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Expect an array of base64 images
    const { base64Images } = await request.json();
    
    // Extract the Authorization header from the incoming request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    // Call the Supabase Edge Function, passing the array of images
    const SUPABASE_PROJECT_ID = 'mgbfevrzrbjjiajkqpti'; 
    const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/identify-equipment`;

    const edgeFunctionResponse = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader, // Forward the user's JWT
      },
      body: JSON.stringify({ base64Images }), // Send the array of images
    });

    const data = await edgeFunctionResponse.json();

    if (!edgeFunctionResponse.ok) {
      // Forward the error from the Edge Function
      return NextResponse.json({ error: data.error || 'Edge function error' }, { status: edgeFunctionResponse.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in /api/identify-equipment route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}