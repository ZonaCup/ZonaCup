import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { exchangeRiotCodeForTokens, getRiotAccountMe } from '@/lib/riot';

export async function GET(request: NextRequest) {
  const redirectUrl = new URL('/perfil', request.url);
  const secure = request.nextUrl.protocol === 'https:';

  try {
    const code = request.nextUrl.searchParams.get('code');
    const state = request.nextUrl.searchParams.get('state');
    const storedState = request.cookies.get('riot_oauth_state')?.value;

    if (!code || !state || !storedState || state !== storedState) {
      redirectUrl.searchParams.set('riot', 'state_error');
      return NextResponse.redirect(redirectUrl);
    }

    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      redirectUrl.searchParams.set('riot', 'auth_required');
      return NextResponse.redirect(redirectUrl);
    }

    const tokenPayload = await exchangeRiotCodeForTokens(code, request.nextUrl.origin);
    const account = await getRiotAccountMe(tokenPayload.access_token);

    const updates = {
      riot_id: account?.gameName || null,
      riot_tag: account?.tagLine || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      throw error;
    }

    const response = NextResponse.redirect(new URL('/perfil?riot=connected', request.url));
    response.cookies.set('riot_oauth_state', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error) {
    redirectUrl.searchParams.set('riot', 'error');
    redirectUrl.searchParams.set('message', error instanceof Error ? error.message : 'No se pudo vincular la cuenta Riot');
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set('riot_oauth_state', '', {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 0,
    });
    return response;
  }
}
