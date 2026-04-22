import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ContactoPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-4xl mx-auto">
        <div className="section-tag">Soporte</div>
        <h1 className="section-title !text-4xl mb-6">Contacto</h1>
        <div className="card p-6 text-sm text-ash leading-relaxed">
          Para soporte operativo, incidencias de torneo o pagos, escribinos por Discord mientras terminamos de completar esta seccion.
        </div>
      </main>
      <Footer />
    </>
  );
}
