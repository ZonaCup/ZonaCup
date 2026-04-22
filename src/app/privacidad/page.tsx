import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function PrivacidadPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-4xl mx-auto">
        <div className="section-tag">Legal</div>
        <h1 className="section-title !text-4xl mb-6">Privacidad</h1>
        <div className="card p-6 text-sm text-ash leading-relaxed">
          Usamos datos minimos para operar tu cuenta, validar pagos, registrar inscripciones y mostrar resultados competitivos dentro de la plataforma.
        </div>
      </main>
      <Footer />
    </>
  );
}
