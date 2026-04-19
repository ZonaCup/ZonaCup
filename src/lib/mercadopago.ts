import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

interface CreatePaymentParams {
  tournamentName: string;
  tournamentId: string;
  userId: string;
  registrationId: string;
  amount: number;
  playerEmail: string;
  playerName: string;
}

export async function createTournamentPayment({
  tournamentName,
  tournamentId,
  userId,
  registrationId,
  amount,
  playerEmail,
  playerName,
}: CreatePaymentParams) {
  const preference = new Preference(client);

  const result = await preference.create({
    body: {
      items: [
        {
          id: `tournament-${tournamentId}`,
          title: `Inscripción Zona Cup - ${tournamentName}`,
          description: `Entrada al torneo ${tournamentName}`,
          quantity: 1,
          unit_price: amount,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email: playerEmail,
        name: playerName,
      },
      back_urls: {
        success: `${process.env.NEXT_PUBLIC_BASE_URL}/torneos/${tournamentId}?payment=success`,
        failure: `${process.env.NEXT_PUBLIC_BASE_URL}/torneos/${tournamentId}?payment=failure`,
        pending: `${process.env.NEXT_PUBLIC_BASE_URL}/torneos/${tournamentId}?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({
        registrationId,
        tournamentId,
        userId,
      }),
      notification_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/mercadopago`,
      statement_descriptor: 'ZONA CUP',
    },
  });

  return result;
}

export async function getPaymentInfo(paymentId: string) {
  const payment = new Payment(client);
  return await payment.get({ id: paymentId });
}
