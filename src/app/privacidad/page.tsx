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
          
           <p className="mb-6"><strong>1. RECOPILACIÓN DE INFORMACIÓN:</strong><br /> Al registrarte en nuestra plataforma, recopilamos datos esenciales como tu <strong>Riot ID</strong>, <strong>Tagline</strong>, <strong>Rango</strong> y <strong>País</strong>. Estos datos son necesarios para validar tu identidad en el juego y asegurar la transparencia en la competición.</p>

           <p className="mb-6"><strong>2. USO DE LOS DATOS:</strong><br /> Tu información privada como se utiliza exclusivamente para la gestión de torneos, creación de llaves de emparejamiento y contacto directo en caso de entrega de premios. <strong>ZonaCup</strong> no vende ni comparte tus datos con empresas de publicidad externas.</p>

           <p className="mb-6"><strong>2.1 Datos de Contacto para Premios:</strong><br /> En caso de ganar premios que requieran contacto directo (transferencias bancarias, premios físicos), se solicitará información adicional como correo electrónico y datos bancarios. Esta información se utiliza únicamente para la gestión de premios y se elimina una vez finalizado el proceso de entrega.</p>

           <p className="mb-6"><strong>2.2 Datos de Juego:</strong><br /> La información relacionada con tu rendimiento en el juego (Riot ID, Rango, País) se utiliza para la creación de llaves de emparejamiento y para la transmisión de partidas. Esta información es visible públicamente durante el torneo.</p>

           <p className="mb-6"><strong>2.3 Cumplimiento con Riot Games:</strong><br /> Al participar en nuestros torneos, aceptas que tu información de juego sea utilizada conforme a los requisitos de Riot Games para licencias de torneo. Esto incluye la validación de cuentas y el cumplimiento de las políticas de Riot.</p>

           <p className="mb-6"><strong>2.4 No Recolección de Datos Sensibles:</strong><br /> No recopilamos datos sensibles como información financiera, contraseñas, o cualquier otro dato que no sea estrictamente necesario para la gestión de torneos y premios.</p>

           <p className="mb-6"><strong>2.5 Retención de Datos:</strong><br /> Conservamos tu información durante el tiempo necesario para cumplir con los fines para los cuales fue recopilada, incluyendo la gestión de torneos, entrega de premios y cumplimiento de obligaciones legales. Una vez que ya no sea necesaria, tus datos serán eliminados de forma segura.</p>

           <p className="mb-6"><strong>2.6 Consentimiento para Comunicaciones:</strong><br /> Al proporcionar tu correo electrónico, aceptas recibir comunicaciones relacionadas con el torneo, actualizaciones importantes y notificaciones sobre premios. Puedes optar por no recibir estas comunicaciones en cualquier momento a través del menú de configuración de tu perfil.</p>

           <p className="mb-6"><strong>2.7 Seguridad de la Información:</strong><br /> Implementamos medidas de seguridad para proteger tu información contra accesos no autorizados, alteraciones o divulgaciones. Sin embargo, ten en cuenta que ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro.</p>

           <p className="mb-6"><strong>2.8 Cambios en la Política de Privacidad:</strong><br /> Nos reservamos el derecho de actualizar esta política de privacidad en cualquier momento. Cualquier cambio será notificado a través de nuestros canales oficiales y se aplicará a partir de su publicación.</p>

           <p className="mb-6"><strong>2.9 Contacto para Consultas sobre Privacidad:</strong><br /> Si tienes alguna pregunta o inquietud sobre nuestra política de privacidad, puedes contactarnos a través de nuestro correo electrónico oficial o mediante un ticket en nuestro Discord.</p>

           <p className="mb-6"><strong>2.10 Cumplimiento Legal:</strong><br /> Nos comprometemos a cumplir con todas las leyes y regulaciones aplicables en materia de protección de datos, incluyendo el Reglamento General de Protección de Datos (GDPR) de la Unión Europea y cualquier otra legislación local relevante.</p>

           <p className="mb-6"><strong>3. SEGURIDAD Y ALMACENAMIENTO:</strong><br /> Toda tu información está protegida mediante almacenamiento cifrado. No tenemos acceso a tus contraseñas de Riot Games ni a información privada de tu cuenta de juego más allá de lo que es visible públicamente en el cliente.</p>

           <p className="mb-6"><strong>4. DERECHOS DEL USUARIO:</strong><br /> Tienes derecho a solicitar la edición o eliminación definitiva de tus datos de nuestra base de datos en cualquier momento a través de los canales oficiales de soporte o el menú de configuración de perfil.</p>

           <p className="mb-6 italic">Al utilizar nuestra plataforma, aceptas el tratamiento de tus datos bajo estos términos de seguridad.</p>

        </div>
      </main>
      <Footer />
    </>
  );
}
