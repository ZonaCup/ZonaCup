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
          <h3><strong>COMPROMISO CON LA INTEGRIDAD</strong></h3>
           <p>
            En <strong>Zone Cup</strong>, la victoria solo tiene valor si se consigue de forma justa. 
            Para garantizar un entorno competitivo saludable, todos los participantes deben cumplir estrictamente:
           </p>

           <ul>
           <li><strong>Tolerancia Cero al Software de Terceros:</strong> El uso de scripts, hacks (Aimbot, Wallhack) o macros está estrictamente prohibido y resultará en baneo permanente.</li>
           <li><strong>Identidad Única (No Smurfing):</strong> Cada jugador debe competir con su cuenta principal registrada. La suplantación de identidad conlleva la descalificación inmediata del equipo.</li>
           <li><strong>Conducta y Respeto:</strong> No se tolerará el acoso, el lenguaje tóxico ni los insultos hacia oponentes o administradores.</li>
           <li><strong>Fair Play y Colusión:</strong> Cualquier intento de amañar partidas o comportamiento antideportivo será sancionado con el veto de la plataforma.</li>
           </ul>

           <p style={{ marginTop: '20px', fontStyle: 'italic', color: '#ff4655' }}>
            <strong>"El incumplimiento de estas normas será evaluado por el staff y puede derivar en la expulsión definitiva del circuito."</strong>
           </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
