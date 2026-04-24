import { NextRequest, NextResponse } from 'next/server';
import { getPaymentInfo } from '@/lib/mercadopago';
import { createAdminSupabase } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Mercado Pago sends different notification types
    if (body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ error: 'No payment ID' }, { status: 400 });
    }

    // Get payment details from MP
    const paymentInfo = await getPaymentInfo(String(paymentId));
    const status = paymentInfo.status; // approved, rejected, pending, etc.
    const externalRef = paymentInfo.external_reference;

    if (!externalRef) {
      return NextResponse.json({ error: 'No external reference' }, { status: 400 });
    }

    const parsedReference = JSON.parse(externalRef);

    const supabase = createAdminSupabase();
    const normalizedStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'pending';

    if (parsedReference.type === 'pro_membership') {
      const { userId } = parsedReference;

      if (!userId) {
        return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
      }

      if (normalizedStatus === 'approved') {
        const nextExpiration = new Date();
        nextExpiration.setMonth(nextExpiration.getMonth() + 1);

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            is_pro: true,
            pro_expires_at: nextExpiration.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId);

        if (profileError) {
          console.error('Profile PRO update error:', profileError);
          return NextResponse.json({ error: 'DB error' }, { status: 500 });
        }
      }

      await supabase.from('payments').insert({
        user_id: userId,
        amount: paymentInfo.transaction_amount,
        currency: paymentInfo.currency_id,
        provider: 'mercadopago',
        provider_payment_id: String(paymentId),
        status: normalizedStatus,
        metadata: {
          payment_type: 'pro_membership',
          mp_status: paymentInfo.status,
          mp_status_detail: paymentInfo.status_detail,
          mp_payment_method: paymentInfo.payment_method_id,
        },
      });

      return NextResponse.json({ received: true, status });
    }

    const { registrationId, tournamentId, userId } = parsedReference;

    // Update registration payment status
    const { error: regError } = await supabase
      .from('registrations')
      .update({
        payment_status: normalizedStatus,
        payment_id: String(paymentId),
        amount_paid: paymentInfo.transaction_amount,
        currency: paymentInfo.currency_id,
      })
      .eq('id', registrationId);

    if (regError) {
      console.error('Registration update error:', regError);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    // Log the payment
    await supabase.from('payments').insert({
      user_id: userId,
      registration_id: registrationId,
      amount: paymentInfo.transaction_amount,
      currency: paymentInfo.currency_id,
      provider: 'mercadopago',
      provider_payment_id: String(paymentId),
      status: normalizedStatus,
      metadata: {
        payment_type: parsedReference.type || 'tournament_registration',
        tournamentId,
        mp_status: paymentInfo.status,
        mp_status_detail: paymentInfo.status_detail,
        mp_payment_method: paymentInfo.payment_method_id,
      },
    });

    // If approved, the DB trigger will auto-increment tournament slots

    return NextResponse.json({ received: true, status });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
