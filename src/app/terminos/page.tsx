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
          <p className="mb-4"><strong>TÉRMINOS, CONDICIONES Y REGLAMENTO DE COMPETICIÓN OFICIAL - ZonaCup</strong></p>
          <p className="mb-4"><strong>1. VÍNCULO LEGAL Y AUTORIZACIÓN DE RIOT GAMES</strong></p>
          <p className="mb-4">Los participantes reconocen que:
          Este evento no es organizado, patrocinado ni administrado directamente por Riot Games, Inc.
          Toda la responsabilidad de la ejecución, gestión de premios y soporte técnico recae exclusivamente en ZonaCup.
          Los participantes deben cumplir en todo momento con los Términos de Servicio de Riot Games y la Política de Privacidad de Riot Games.</p>
          
          <p className="mb-4"><strong>2. REQUISITOS DE ELIGIBILIDAD Y REGISTRO</strong></p>
          <p>Identidad: Los jugadores deben registrarse con su Riot ID y Tagline real. Está prohibido el uso de cuentas smurf (secundarias). Solo se permiten cuentas de nivel 20 o superior.</p>
          <p>Residencia: Los participantes deben residir legalmente en **LATAM**.</p>
          <p>Edad: La edad mínima para participar es de 16 años (o la establecida por la regulación local si es mayor).</p>
          <p className="mb-4">Cuentas activas: Jugadores con suspensiones vigentes por parte de **Riot Games** (Vanguard, Game Ban o Chat Ban) quedan automáticamente excluidos.</p>

          <p className="mb-4"><strong>3. CÓDIGO DE CONDUCTA (TOLERANCIA CERO)</strong></p>
          <p>Comportamiento: Se prohíbe cualquier forma de discurso de odio, racismo, sexismo, homofobia o acoso. Esto aplica a chats de juego, Discord y redes sociales.</p>
          <p>Integridad: Queda prohibido el match-fixing (tamaño de partidos) o cualquier acuerdo entre equipos para alterar el resultado de la competencia.</p>
          <p className="mb-4">Sanciones: El incumplimiento resultará en advertencias, pérdida de rondas, descalificación o baneo permanente de futuras ediciones.</p>
          
          <p className="mb-4"><strong>4. REGLAS TÉCNICAS Y ANTICHEATS</strong></p>
          <p>Riot Vanguard: Es obligatorio que todos los jugadores tengan el sistema Vanguard activo. Cualquier baneo detectado durante el torneo resultará en la expulsión inmediata del equipo completo.</p>
          <p>Exploits y Glitches: Está prohibido el uso de errores conocidos del mapa o de habilidades. La organización publicará una lista de "Glitches prohibidos" actualizada según el parche vigente.</p>
          <p className="mb-4">Software de terceros: Está prohibido cualquier programa que altere los archivos del juego o proporcione ventajas (macros, scripts, overlays no autorizados).</p>

          <p className="mb-4"><strong>5. FORMATO, PUNTUALIDAD Y DISPUTAS</strong></p>
          <p>Check-in: Los equipos deben confirmar asistencia 60 minutos antes del inicio del torneo en [Discord/Página Web].</p>
          <p>Tiempo de tolerancia: Se otorgará un máximo de 0 minutos de espera tras la hora pactada. Pasado este tiempo, se declarará derrota por Walkover (W.O.).</p>
          <p>Pausas: Se permiten pausas tácticas de sistema. Las pausas técnicas por problemas de conexión están limitadas a un máximo de 2 minutos por equipo.</p>
          <p className="mb-4">Sistema de Disputas: Cualquier reclamo sobre un resultado debe enviarse vía Ticket en Discord en un plazo no mayor a 15 minutos tras finalizar el mapa, adjuntando evidencia visual (capturas o clips).</p>

          <p className="mb-4"><strong>6. DERECHOS DE IMAGEN Y TRANSMISIÓN</strong></p>
          <p>Cesión de Derechos: Al participar, el jugador otorga a ZonaCup el derecho de capturar y utilizar su imagen, voz, Riot ID y estadísticas para la transmisión del torneo y contenido promocional.</p>
          <p className="mb-4">Streaming (POV): Los jugadores pueden transmitir su partida si y solo si configuran un retraso (delay) mínimo de 180 segundos (3 minutos).</p>

          <p className="mb-4"><strong>7. GESTIÓN DE PREMIOS (TRANSFERENCIAS, VP Y SKINS)</strong></p>
          <p>Validación: Los premios se entregarán únicamente tras validar que el equipo cumplió con todas las reglas y no incurrió en faltas de integridad.</p>
          <p>Transferencias Bancarias: En caso de premios por transferencia, el capitán del equipo debe proporcionar los datos bancarios correctos (CBU/CVU/IBAN). La organización no se hace responsable por errores en la información proporcionada ni por comisiones bancarias de recepción. El plazo de envío es de 2 días hábiles tras finalizar el evento.</p>
          <p>VALORANT Points (VP) y Skins:</p>
          <p>Si el premio consiste en VP o Skins cargados por Riot Games, la acreditación depende de los tiempos internos de Riot.</p>
          <p>Si las Skins o VP son entregados vía códigos por la organización, se enviarán al capitán del equipo vía Discord/Correo.</p>
          <p className="mb-4">Premios Intransferibles: Los premios se otorgan exclusivamente a los miembros registrados.</p>

          <p className="mb-4"><strong>8. LIMITACIÓN DE RESPONSABILIDAD</strong></p>
          <p>La organización no se hace responsable por: fallos en los servidores de Riot Games, cortes de energía, problemas del ISP (internet) de los jugadores, o hardware defectuoso de los participantes.</p>
          <p className="mb-4">Cláusula de Indemnización: Los participantes aceptan eximir de toda responsabilidad a ZonaCup y a Riot Games ante cualquier reclamo derivado de su participación.</p>

          <p className="mb-4"><strong>9. PROTECCIÓN DE DATOS</strong></p>
          <p className="mb-4">La información recolectada (Riot ID, Datos Bancarios para transferencia, Correo) se utilizará exclusivamente para la gestión del torneo, cumplimiento de la licencia de Riot Games y contacto para la entrega de premios.</p>

          <p className="mb-4"><strong>10. ACEPTACIÓN DE LOS TÉRMINOS</strong></p>
          <p>La inscripción en el torneo o la interacción en los canales oficiales constituye la aceptación total y vinculante de estos Términos y Condiciones.</p>
          <p className="mb-4">Cualquier situación no prevista en este documento será resuelta a discreción de la organización, siempre buscando la equidad y el espíritu competitivo.</p>
          <p><strong>¡Gracias por ser parte de ZonaCup, donde la competencia y la comunidad se unen en cada partida!</strong></p>
        </div>
      </main>
      <Footer />
    </>
  )
}
