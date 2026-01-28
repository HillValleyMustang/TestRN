// Helper function to get or create a main t-path for a user
// Ensures only ONE main t-path exists per user (gym_id = NULL, parent_t_path_id = NULL)

export async function getOrCreateMainTPath(
  supabaseClient: any,
  userId: string,
  programmeType: 'ppl' | 'ulul',
  profileSettings: { primary_goal?: string; preferred_muscles?: string; health_notes?: string }
): Promise<string> {
  // Check for existing main t-path (gym_id IS NULL, parent_t_path_id IS NULL)
  const { data: existingTPaths, error: fetchError } = await supabaseClient
    .from('t_paths')
    .select('id, template_name, settings')
    .eq('user_id', userId)
    .is('gym_id', null)
    .is('parent_t_path_id', null);
  
  if (fetchError) throw fetchError;
  
  // If exists, return it (ignore duplicate entries - should only be one)
  if (existingTPaths && existingTPaths.length > 0) {
    console.log(`[getOrCreateMainTPath] Found existing main t-path: ${existingTPaths[0].id}`);
    return existingTPaths[0].id;
  }
  
  // Create new main t-path with gym_id = NULL
  const templateName = programmeType === 'ulul' ? '4-Day Upper/Lower' : '3-Day Push/Pull/Legs';
  const { data: newTPath, error: insertError } = await supabaseClient
    .from('t_paths')
    .insert({
      user_id: userId,
      gym_id: null, // CRITICAL: Main t-path has no gym association
      template_name: templateName,
      is_bonus: false,
      parent_t_path_id: null,
      settings: {
        tPathType: programmeType,
        experience: 'intermediate',
        goalFocus: profileSettings.primary_goal,
        preferredMuscles: profileSettings.preferred_muscles,
        constraints: profileSettings.health_notes
      }
    })
    .select('id')
    .single();
  
  if (insertError) throw insertError;
  
  console.log(`[getOrCreateMainTPath] Created new main t-path: ${newTPath.id}`);
  return newTPath.id;
}
