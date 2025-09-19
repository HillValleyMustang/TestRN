import { supabase } from '@/integrations/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { gymId } = await request.json();
    
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const { data, error } = await supabase.functions.invoke('setup-default-gym', {
      body: { gymId },
      headers: {
        Authorization: authHeader,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error setting up default gym:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}