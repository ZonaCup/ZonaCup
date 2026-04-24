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
          <p className="mb-4"><strong>Que onda gente les dejo por acá abajo las reglas del servidor 👇</strong></p>

          <p className="mb-4"><strong>📜 REGLAMENTO OFICIAL - ZONA CUP</strong></p>

          <p className="mb-4"><strong>1️⃣ Respeta a la comunidad 🤜🤛</strong></p>
          <p className="mb-4">Trata a todos los miembros con cortesía. No se tolera el acoso, los insultos, el racismo, la homofobia ni cualquier forma de discriminación. Queremos un ambiente sano para todos.</p>

          <p className="mb-4"><strong>2️⃣ Nada de Spam ⌨️</strong></p>
          <p className="mb-4">No envíes enlaces de otros servidores, redes sociales propias o publicidad sin permiso previo de los moderadores. Esto incluye mensajes directos (DM) no deseados a otros miembros.</p>

          <p className="mb-4"><strong>3️⃣ Contenido Apropiado (NSFW) 🔞</strong></p>
          <p className="mb-4">Mantén el contenido apto para todo público. Está prohibido compartir imágenes, videos o links de contenido sexualmente explícito o gore (violencia extrema).</p>

          <p className="mb-4"><strong>4️⃣ Canales Específicos</strong></p>
          <p className="mb-4">Usa los canales para lo que fueron creados. No hables de temas aleatorios en el canal de noticias, ni satures el canal de charla general con comandos de bots.</p>

          <p className="mb-4"><strong>5️⃣ Nombres y Avatares 🃏</strong></p>
          <p className="mb-4">Tu nombre de usuario (nickname) y foto de perfil no deben ser ofensivos, ni hacerse pasar por el staff o figuras públicas para engañar.</p>

          <p className="mb-4"><strong>6️⃣ No hables de Temas Inapropiados 🔇</strong></p>
          <p className="mb-4">Evita discusiones intensas sobre política, religión o temas altamente polémicos que solo busquen generar conflicto. Venimos a pasar un buen rato.</p>

          <p className="mb-4"><strong>7️⃣ Escucha al Staff  📢</strong></p>
          <p className="mb-4">Las decisiones de los moderadores y administradores son definitivas. Si tienes un problema con una sanción, habla por privado de forma educada, no generes un escándalo en los canales públicos.</p>

          <p className="mb-4"><strong>8️⃣ Ayuda a la comunidad y comunica al staff  🔰</strong></p>
          <p className="mb-4">Si notas actividad extraña de algún miembro o moderador que afecte a la comunidad, no olvides de comunicarlo con el staff.</p>

          <p className="mb-4"><strong>¡Recuerda que si incumples las reglas podrás ser sancionado/a o expulsado/a!</strong></p>
        </div>
      </main>
      <Footer />
    </>
  )
}
