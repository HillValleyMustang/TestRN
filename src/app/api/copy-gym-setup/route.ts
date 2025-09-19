import { supabase } from '@/integrations/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { sourceGymId, targetGymId } = await request.json();
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const { data, error } = await supabase.functions.invoke('copy-gym-setup', {
      body: { sourceGymId, targetGymId },
      headers: {
        Authorization: authHeader,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error copying gym setup:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}