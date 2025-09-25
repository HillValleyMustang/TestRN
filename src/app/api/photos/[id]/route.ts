import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const photoId = params.id;
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, get the photo record to ensure ownership and get the file path
    const { data: photoData, error: fetchError } = await supabase
      .from('progress_photos')
      .select('id, photo_path, user_id')
      .eq('id', photoId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
      }
      throw fetchError;
    }

    if (photoData.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete the file from storage
    const { error: storageError } = await supabase.storage
      .from('user-photos')
      .remove([photoData.photo_path]);

    if (storageError) {
      // Log the error but proceed to delete the DB record anyway
      console.error('Error deleting from storage, but proceeding to delete DB record:', storageError);
    }

    // Delete the record from the database
    const { error: dbError } = await supabase
      .from('progress_photos')
      .delete()
      .eq('id', photoId);

    if (dbError) {
      throw dbError;
    }

    return NextResponse.json({ message: 'Photo deleted successfully.' });

  } catch (error: any) {
    console.error(`Error in /api/photos/${photoId}:`, error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}