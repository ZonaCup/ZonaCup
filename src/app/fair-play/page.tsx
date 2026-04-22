import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function FairPlayPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-4xl mx-auto">
        <div className="section-tag">Competencia</div>
        <h1 className="section-title !text-4xl mb-6">Fair Play</h1>
        <div className="card p-6 text-sm text-ash leading-relaxed">
          Toda conducta antideportiva, uso de cheats, suplantacion, collusion o abuso del sistema puede derivar en descalificacion y veto competitivo.
        </div>
      </main>
      <Footer />
    </>
  );
}
