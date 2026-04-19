'use client';

import { useState } from 'react';

const faqs = [
  {
    q: '¿Cuánto cuesta inscribirse?',
    a: 'Desde USD 8 por jugador en torneos 2v2 semanales (~$11.200 ARS, $7.600 CLP, S/ 30 PEN). Los 5v5 Major cuestan USD 12. Tu entrada cubre tu lugar + tu parte del pool de premios.',
  },
  {
    q: '¿Cuándo y cómo se pagan los premios?',
    a: 'Máximo 48 horas post-torneo. Mercado Pago, transferencia bancaria o PayPal según tu país. Sin excepciones. Cero premios impagos desde el día 1.',
  },
  {
    q: '¿Necesito un rango mínimo?',
    a: 'Depende del torneo. Los Weekly Open no tienen requisito. Algunos torneos especiales tienen tope máximo (ej: Underdog Night, máx Platino). Cada torneo lo aclara antes de inscribirte.',
  },
  {
    q: '¿Cómo controlan el cheating?',
    a: 'VOD review obligatorio desde Top 8. Reportes comunitarios con evidencia. Ban permanente y público del cheater. Integrity Score para cada jugador que afecta permisos y accesos.',
  },
  {
    q: '¿Qué pasa si mi compañero no aparece?',
    a: 'Tenés 15 minutos post check-in para encontrar reemplazo. Si no, se te reembolsa el 100% de la inscripción. Tu compañero que no apareció pierde Integrity Score.',
  },
  {
    q: '¿Puedo jugar desde Chile o Perú?',
    a: 'Sí. Zona Cup opera en Argentina, Chile y Perú. Los premios se pagan en la moneda/pasarela local de cada país. Los rankings son unificados para toda LATAM.',
  },
];

export default function FAQClient() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-2xl mx-auto mt-10 flex flex-col gap-2 text-left">
      {faqs.map((faq, i) => (
        <div
          key={i}
          className={`rounded overflow-hidden cursor-pointer transition-all border ${open === i ? 'border-fire-core/20 bg-bg-card' : 'border-white/[0.04] bg-bg-card hover:border-fire-core/15'}`}
          onClick={() => setOpen(open === i ? null : i)}
        >
          <div className="px-5 py-4 flex justify-between items-center">
            <span className="text-sm text-ivory font-semibold">{faq.q}</span>
            <span className={`text-fire-core text-xl transition-transform ${open === i ? 'rotate-45' : ''}`}>+</span>
          </div>
          {open === i && (
            <div className="px-5 pb-4 text-[13px] text-ash leading-relaxed">{faq.a}</div>
          )}
        </div>
      ))}
    </div>
  );
}
