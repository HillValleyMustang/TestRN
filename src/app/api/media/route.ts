// This log should appear if the file is even loaded by Next.js
console.log('[API/media - FILE LOADED]');

import { NextResponse } from 'next/server';
// Removed supabase import for this test

export async function GET(request: Request) {
  // This log should appear if the GET function is entered
  console.log('[API/media - GET FUNCTION ENTERED]');

  // For testing, let's return a simple hardcoded response
  return NextResponse.json({ message: 'Hello from media API test!' });
}