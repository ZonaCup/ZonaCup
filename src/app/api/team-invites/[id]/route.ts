import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabase, createServerSupabase } from '@/lib/supabase-server';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const serverSupabase = await createServerSupabase();
    const adminSupabase = createAdminSupabase();
    const { data: { user } } = await serverSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { action } = await request.json();
    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Accion invalida' }, { status: 400 });
    }

    const { data: invite, error: inviteError } = await adminSupabase
      .from('team_invites')
      .select('id, tournament_id, team_id, invited_user_id, status')
      .eq('id', id)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invitacion no encontrada' }, { status: 404 });
    }

    if (invite.invited_user_id !== user.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (invite.status !== 'pending') {
      return NextResponse.json({ error: 'La invitacion ya fue respondida' }, { status: 400 });
    }

    if (action === 'accept') {
      const { data: memberships, error: membershipsError } = await adminSupabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      if (membershipsError) {
        return NextResponse.json({ error: membershipsError.message }, { status: 500 });
      }

      const otherTeamIds = (memberships || [])
        .map((membership) => membership.team_id)
        .filter((teamId) => teamId && teamId !== invite.team_id);

      if (otherTeamIds.length > 0) {
        const { data: conflictingRegistrations, error: conflictingRegistrationsError } = await adminSupabase
          .from('registrations')
          .select('id')
          .eq('tournament_id', invite.tournament_id)
          .in('team_id', otherTeamIds)
          .neq('payment_status', 'rejected');

        if (conflictingRegistrationsError) {
          return NextResponse.json({ error: conflictingRegistrationsError.message }, { status: 500 });
        }

        if ((conflictingRegistrations || []).length > 0) {
          return NextResponse.json({ error: 'Ya estas vinculado a otro equipo inscripto en este torneo' }, { status: 400 });
        }
      }

      const { error: memberError } = await adminSupabase
        .from('team_members')
        .upsert({
          team_id: invite.team_id,
          user_id: user.id,
          role: 'member',
        }, { onConflict: 'team_id,user_id' });

      if (memberError) {
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }
    }

    const { data: updatedInvite, error: updateError } = await adminSupabase
      .from('team_invites')
      .update({
        status: action === 'accept' ? 'accepted' : 'rejected',
        responded_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedInvite) {
      return NextResponse.json({ error: updateError?.message || 'No se pudo actualizar la invitacion' }, { status: 500 });
    }

    return NextResponse.json({ invite: updatedInvite });
  } catch (error) {
    console.error('Respond invite error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error interno' }, { status: 500 });
  }
}
