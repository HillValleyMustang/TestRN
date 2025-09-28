// This log should appear if the file is even loaded by Next.js
console.log('[API/media - FILE LOADED]');

import { supabase } from '@/integrations/supabase/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // This log should appear if the GET function is entered
  console.log('[API/media - GET FUNCTION ENTERED]');

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.error('[API/media] Authorization header missing');
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[API/media] Unauthorized user:', userError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[API/media] User authenticated: ${user.id}`);

    // This log should appear before the Supabase query
    console.log('[API/media] Preparing Supabase query for media_posts...');
    const { data: mediaPosts, error: fetchError } = await supabase
      .from('media_posts')
      .select('*')
      .order('created_at', { ascending: false });

    // This log should appear after the Supabase query, showing raw data/error
    console.log('[API/media] Supabase query result - data:', mediaPosts, 'error:', fetchError);

    if (fetchError) {
      console.error('[API/media] Error fetching media posts from Supabase:', fetchError.message);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    console.log(`[API/media] Fetched ${mediaPosts?.length || 0} media posts.`);
    console.log('[API/media] Media posts data:', mediaPosts);

    return NextResponse.json(mediaPosts);
  } catch (error: any) {
    console.error('Error in /api/media route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}