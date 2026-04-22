import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function TerminosPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-4xl mx-auto">
        <div className="section-tag">Legal</div>
        <h1 className="section-title !text-4xl mb-6">Terminos</h1>
        <div className="card p-6 text-sm text-ash leading-relaxed">
          Al usar Zona Cup y registrarte en un torneo aceptas las condiciones de participacion, pagos, validacion de identidad y resolucion administrativa de partidas.
        </div>
      </main>
      <Footer />
    </>
  );
}
