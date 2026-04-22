import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function ReglamentoPage() {
  return (
    <>
      <Navbar />
      <main className="pt-24 pb-20 px-5 md:px-10 max-w-4xl mx-auto">
        <div className="section-tag">Legal</div>
        <h1 className="section-title !text-4xl mb-6">Reglamento</h1>
        <div className="card p-6 text-sm text-ash leading-relaxed">
          Reglamento general de competencia. Esta pagina puede ampliarse luego con formato, horarios, sanciones, check-in y criterios de desempate.
        </div>
      </main>
      <Footer />
    </>
  );
}
