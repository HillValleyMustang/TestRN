import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// This file is configured for the Next.js App Router client-side.
// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClientComponentClient();