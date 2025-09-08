import { supabase } from '@/integrations/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tPathId } = await request.json();
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    // Revert to 'invoke' as 'invoke_async' is not a standard method.
    // The Edge Function itself is designed to return quickly, making the client-side call effectively asynchronous.
    const { data, error } = await supabase.functions.invoke('generate-t-path', {
      body: { tPathId },
      headers: {
        Authorization: authHeader,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    // The response from invoke indicates the function was queued, not completed.
    return NextResponse.json({ message: 'T-Path generation initiated successfully.', functionId: data?.function_id });
  } catch (error: any) {
    console.error('Error initiating T-Path generation:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}