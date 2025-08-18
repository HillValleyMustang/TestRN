/**
 * This file contains the Json type definition.
 * It is part of the Supabase generated types, refactored for modularity.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]