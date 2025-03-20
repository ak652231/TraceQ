// app/api/auth/validate-session/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getUserFromSession } from '../../../lib/session'; 

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionToken =  cookieStore.get('sessionToken')?.value;
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    const user = await getUserFromSession(sessionToken);
    
    if (user) {
      return NextResponse.json({
        id: user.id,
        role: user.role,
      });
    } else {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}