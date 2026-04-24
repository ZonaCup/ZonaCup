import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { createRiotAuthorizeUrl } from '@/lib/riot';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const signInUrl = new URL('/', request.url);
      signInUrl.searchParams.set('auth', 'required');
      return NextResponse.redirect(signInUrl);
    }

    const state = crypto.randomBytes(24).toString('hex');
    const authorizeUrl = createRiotAuthorizeUrl(request.nextUrl.origin, state);
    const response = NextResponse.redirect(authorizeUrl);
    const secure = request.nextUrl.protocol === 'https:';

    response.cookies.set('riot_oauth_state', state, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    const redirectUrl = new URL('/perfil', request.url);
    redirectUrl.searchParams.set('riot', 'config_error');
    redirectUrl.searchParams.set('message', error instanceof Error ? error.message : 'No se pudo iniciar Riot OAuth');
    return NextResponse.redirect(redirectUrl);
  }
}
