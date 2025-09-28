// This log should appear if the file is even loaded by Next.js
console.log('[API/test - FILE LOADED]');

import { NextResponse } from 'next/server';

export async function GET() {
  console.log('[API/test - GET FUNCTION ENTERED]');
  return NextResponse.json({ message: 'Hello from test API!' });
}