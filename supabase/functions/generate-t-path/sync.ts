// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { exerciseLibraryData, workoutStructureData } from './data.ts';
import { NullIconExercise } from './types.ts';

export const synchronizeSourceData = async (supabaseServiceRoleClient: ReturnType<typeof createClient>) => {
    console.log('Synchronizing source data...');

    // 1. Safely wipe and repopulate workout_exercise_structure
    const { error: deleteStructureError } = await supabaseServiceRoleClient
        .from('workout_exercise_structure')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Trick to delete all rows
    if (deleteStructureError) throw deleteStructureError;
    console.log('Successfully wiped workout_exercise_structure.');

    const { error: insertStructureError } = await supabaseServiceRoleClient
        .from('workout_exercise_structure')
        .insert(workoutStructureData);
    if (insertStructureError) throw insertStructureError;
    console.log(`Successfully re-inserted ${workoutStructureData.length} workout structure rules.`);

    // 2. Prepare exercises for UPSERT (excluding icon_url initially)
    const exercisesToUpsertWithoutIcon = exerciseLibraryData.map(ex => ({
        library_id: ex.exercise_id,
        name: ex.name,
        main_muscle: ex.main_muscle,
        type: ex.type,
        category: ex.category,
        description: ex.description,
        pro_tip: ex.pro_tip,
        video_url: ex.video_url,
        user_id: null // Global exercises
    }));

    const { error: upsertError } = await supabaseServiceRoleClient
        .from('exercise_definitions')
        .upsert(exercisesToUpsertWithoutIcon, { onConflict: 'library_id' });
        
    if (upsertError) {
        console.error("Upsert error details (without icon_url):", upsertError);
        throw upsertError;
    }
    console.log(`Successfully upserted ${exercisesToUpsertWithoutIcon.length} global exercises (without touching icon_url).`);

    // 3. Identify global exercises that still have a NULL icon_url and update them with the default
    const { data: nullIconExercises, error: fetchNullIconError } = await supabaseServiceRoleClient
        .from('exercise_definitions')
        .select('id, library_id')
        .is('user_id', null)
        .is('icon_url', null);
    
    if (fetchNullIconError) throw fetchNullIconError;

    if (nullIconExercises && nullIconExercises.length > 0) {
        const updatesForNullIcons = nullIconExercises.map((ex: NullIconExercise) => {
            const defaultIcon = exerciseLibraryData.find(csvEx => csvEx.exercise_id === ex.library_id)?.icon_url;
            return {
                id: ex.id,
                icon_url: defaultIcon || 'https://i.imgur.com/2Y4Y4Y4.png' // Fallback to generic if not found in CSV
            };
        });

        const { error: updateIconsError } = await supabaseServiceRoleClient
            .from('exercise_definitions')
            .upsert(updatesForNullIcons, { onConflict: 'id' }); // Upsert by 'id' to update existing rows
        
        if (updateIconsError) {
            console.error("Error updating NULL icon_urls:", updateIconsError);
            throw updateIconsError;
        }
        console.log(`Successfully updated ${updatesForNullIcons.length} global exercises with default icon_urls.`);
    } else {
        console.log('No global exercises found with NULL icon_url to update.');
    }
};