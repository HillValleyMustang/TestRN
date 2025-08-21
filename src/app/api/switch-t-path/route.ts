import { supabase } from '@/integrations/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { oldTPathId, newTPathId } = await request.json();
    
    // Extract the Authorization header from the incoming request
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      // If no authorization header is present, return an unauthorized error
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    // Call the edge function, explicitly passing the Authorization header
    const { data, error } = await supabase.functions.invoke('disassociate-tpath-exercises', {
      body: { oldTPathId, newTPathId },
      headers: {
        Authorization: authHeader, // Forward the user's JWT
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error switching T-Path:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}