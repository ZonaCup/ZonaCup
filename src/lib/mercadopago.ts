import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN!,
});

function getBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!baseUrl) {
    throw new Error('Missing NEXT_PUBLIC_BASE_URL');
  }

  return baseUrl.replace(/\/+$/, '');
}

interface CreatePaymentParams {
  tournamentName: string;
  tournamentId: string;
  tournamentSlug: string;
  userId: string;
  registrationId: string;
  amount: number;
  playerEmail: string;
  playerName: string;
}

interface CreateProMembershipPaymentParams {
  userId: string;
  playerEmail: string;
  playerName: string;
  amount: number;
}

export async function createTournamentPayment({
  tournamentName,
  tournamentId,
  tournamentSlug,
  userId,
  registrationId,
  amount,
  playerEmail,
  playerName,
}: CreatePaymentParams) {
  const preference = new Preference(client);
  const baseUrl = getBaseUrl();

  const result = await preference.create({
    body: {
      items: [
        {
          id: `tournament-${tournamentId}`,
          title: `Inscripcion Zona Cup - ${tournamentName}`,
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
        success: `${baseUrl}/torneos/${tournamentSlug}?payment=success`,
        failure: `${baseUrl}/torneos/${tournamentSlug}?payment=failure`,
        pending: `${baseUrl}/torneos/${tournamentSlug}?payment=pending`,
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({
        type: 'tournament_registration',
        registrationId,
        tournamentId,
        tournamentSlug,
        userId,
      }),
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      statement_descriptor: 'ZONA CUP',
    },
  });

  return result;
}

export async function createProMembershipPayment({
  userId,
  playerEmail,
  playerName,
  amount,
}: CreateProMembershipPaymentParams) {
  const preference = new Preference(client);
  const baseUrl = getBaseUrl();

  const result = await preference.create({
    body: {
      items: [
        {
          id: `pro-membership-${userId}`,
          title: 'Membresia Zona Cup Pro',
          description: 'Activacion de membresia mensual Zona Cup Pro',
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
        success: `${baseUrl}/perfil?pro=success`,
        failure: `${baseUrl}/perfil?pro=failure`,
        pending: `${baseUrl}/perfil?pro=pending`,
      },
      auto_return: 'approved',
      external_reference: JSON.stringify({
        type: 'pro_membership',
        userId,
      }),
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
      statement_descriptor: 'ZONA CUP',
    },
  });

  return result;
}

export async function getPaymentInfo(paymentId: string) {
  const payment = new Payment(client);
  return await payment.get({ id: paymentId });
}
