import { supabase } from '@/integrations/supabase/client';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      console.error('[API/media] Authorization header missing');
      return NextResponse.json({ error: 'Authorization header missing' }, { status: 401 });
    }

    // Use the Supabase client with the user's JWT for RLS
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('[API/media] Unauthorized user:', userError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[API/media] User authenticated: ${user.id}`);

    const { data: mediaPosts, error: fetchError } = await supabase
      .from('media_posts')
      .select('*')
      .order('created_at', { ascending: false });

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