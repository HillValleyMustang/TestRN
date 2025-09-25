import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    const notes = formData.get('notes') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No photo file provided.' }, { status: 400 });
    }

    // Create a unique file path for the user
    const timestamp = Date.now();
    const filePath = `${user.id}/${timestamp}-${file.name}`;

    // Upload the file to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-photos')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError);
      throw uploadError;
    }

    // Insert a record into the progress_photos table
    const { data: insertData, error: insertError } = await supabase
      .from('progress_photos')
      .insert({
        user_id: user.id,
        photo_path: uploadData.path,
        notes: notes,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Supabase progress_photos insert error:', insertError);
      // If the database insert fails, remove the orphaned file from storage
      await supabase.storage.from('user-photos').remove([filePath]);
      throw insertError;
    }

    return NextResponse.json(insertData);

  } catch (error: any) {
    console.error('Error in /api/photos/upload:', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}