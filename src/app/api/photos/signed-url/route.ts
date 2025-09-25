import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const photoPath = searchParams.get('path');

    if (!photoPath) {
      return NextResponse.json({ error: 'Photo path is required.' }, { status: 400 });
    }

    // Security check: Ensure the user is requesting a URL for their own photo folder.
    if (!photoPath.startsWith(`${user.id}/`)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase.storage
      .from('user-photos')
      .createSignedUrl(photoPath, 60); // 60 seconds validity

    if (error) {
      throw error;
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error: any) {
    console.error('Error creating signed URL:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}