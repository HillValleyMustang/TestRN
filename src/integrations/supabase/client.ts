import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Database } from '@/types/supabase';

// This client is for use in client components and automatically handles
// authentication using cookies, which is necessary for Next.js API routes.
export const supabase = createClientComponentClient<Database>();