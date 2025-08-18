import { supabase } from '@/integrations/supabase/client';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { tPathId } = await request.json();
    
    // Call the edge function
    const { data, error } = await supabase.functions.invoke('generate-t-path', {
      body: { tPathId }
    });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error generating T-Path:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}