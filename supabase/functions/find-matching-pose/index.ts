// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseServiceRoleClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header missing' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: userError } = await supabaseServiceRoleClient.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { source_photo_id } = await req.json();
    if (!source_photo_id) {
      return new Response(JSON.stringify({ error: 'source_photo_id is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 1. Fetch the source photo to get its created_at timestamp
    const { data: sourcePhoto, error: sourcePhotoError } = await supabaseServiceRoleClient
      .from('progress_photos')
      .select('created_at')
      .eq('id', source_photo_id)
      .eq('user_id', user.id)
      .single();

    if (sourcePhotoError || !sourcePhoto) {
      return new Response(JSON.stringify({ error: 'Source photo not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Calculate the target date (30 days prior)
    const sourceDate = new Date(sourcePhoto.created_at);
    const targetDate = new Date(sourceDate);
    targetDate.setDate(sourceDate.getDate() - 30);

    // 3. Fetch all other photos for the user
    const { data: otherPhotos, error: otherPhotosError } = await supabaseServiceRoleClient
      .from('progress_photos')
      .select('id, created_at')
      .eq('user_id', user.id)
      .neq('id', source_photo_id);

    if (otherPhotosError) throw otherPhotosError;

    let matchedPhotoId: string | null = null;

    if (otherPhotos && otherPhotos.length > 0) {
      // 4. Find the photo with the timestamp closest to the target date
      let closestPhoto = null;
      let minDiff = Infinity;

      for (const photo of otherPhotos) {
        const photoDate = new Date(photo.created_at);
        const diff = Math.abs(photoDate.getTime() - targetDate.getTime());
        if (diff < minDiff) {
          minDiff = diff;
          closestPhoto = photo;
        }
      }
      matchedPhotoId = closestPhoto?.id || null;
    }

    // 5. Fallback: If no other photos exist, find the user's very first photo
    if (!matchedPhotoId) {
      const { data: firstPhoto, error: firstPhotoError } = await supabaseServiceRoleClient
        .from('progress_photos')
        .select('id')
        .eq('user_id', user.id)
        .neq('id', source_photo_id)
        .order('created_at', { ascending: true })
        .limit(1)
        .single();
      
      if (firstPhotoError && firstPhotoError.code !== 'PGRST116') throw firstPhotoError;
      
      if (firstPhoto) {
        matchedPhotoId = firstPhoto.id;
      }
    }

    if (!matchedPhotoId) {
      return new Response(JSON.stringify({ error: 'No matching photo could be found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 6. Fetch the full record of the matched photo
    const { data: matchedPhoto, error: matchedPhotoError } = await supabaseServiceRoleClient
      .from('progress_photos')
      .select('*')
      .eq('id', matchedPhotoId)
      .single();

    if (matchedPhotoError) throw matchedPhotoError;

    return new Response(JSON.stringify({ matchedPhoto }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Error in find-matching-pose edge function:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});