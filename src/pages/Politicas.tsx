import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Shield, FileText, RefreshCw, Mail, Phone, MapPin, CheckCircle2 } from 'lucide-react'
import { LanguageSelector } from '../components/LanguageSelector'

type LegalTab = 'privacidad' | 'terminos' | 'reembolsos'

export const Politicas = () => {
  const [activeTab, setActiveTab] = useState<LegalTab>('privacidad')

  return (
    <div className="min-h-screen bg-brand-lightGray text-brand-black selection:bg-brand-blue selection:text-white flex flex-col">
      {/* NAVBAR */}
      <nav className="h-20 bg-white/95 backdrop-blur-md border-b border-brand-gray/20 sticky top-0 z-40 flex items-center justify-between px-6 lg:px-12 shadow-sm">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-black rounded-lg overflow-hidden flex items-center justify-center p-1">
            <img src="/pwa-icon.png" alt="Straje.App" className="w-full h-full object-contain" />
          </div>
          <span className="text-2xl font-black uppercase tracking-tighter italic">Straje.App</span>
        </Link>
        <div className="flex items-center gap-4">
          <LanguageSelector variant="navbar" />
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brand-gray hover:text-brand-blue transition-colors"
          >
            <ArrowLeft size={16} /> Volver al Inicio
          </Link>
        </div>
      </nav>

      {/* HEADER */}
      <header className="bg-brand-black text-white py-14 px-6 lg:px-12 border-b-4 border-brand-blue relative overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-4 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-blue/20 text-brand-blue rounded-full text-[10px] font-black uppercase tracking-widest border border-brand-blue/30">
            <Shield size={12} /> Marco Legal y Transparencia
          </div>
          <h1 className="text-3xl lg:text-5xl font-black uppercase tracking-tighter italic">
            Términos, Privacidad y Reembolsos
          </h1>
          <p className="text-sm lg:text-base text-brand-gray max-w-2xl font-medium">
            En Straje.App protegemos tu información, garantizamos la continuidad de tu negocio y operamos con total claridad bajo estándares internacionales de comercio digital y protección de datos.
          </p>
          <p className="text-[11px] text-white/40 uppercase tracking-widest font-bold">
            Última actualización: Noviembre 2026 · Válido globalmente
          </p>
        </div>
      </header>

      {/* TABS SELECTOR */}
      <div className="max-w-5xl mx-auto w-full px-6 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-2 rounded-2xl shadow-md border border-brand-gray/15">
          <button
            onClick={() => setActiveTab('privacidad')}
            className={`py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'privacidad'
                ? 'bg-brand-black text-white shadow-lg'
                : 'text-brand-gray hover:text-brand-black hover:bg-brand-lightGray'
            }`}
          >
            <Shield size={16} className={activeTab === 'privacidad' ? 'text-brand-blue' : ''} />
            Privacidad
          </button>
          <button
            onClick={() => setActiveTab('terminos')}
            className={`py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'terminos'
                ? 'bg-brand-black text-white shadow-lg'
                : 'text-brand-gray hover:text-brand-black hover:bg-brand-lightGray'
            }`}
          >
            <FileText size={16} className={activeTab === 'terminos' ? 'text-brand-blue' : ''} />
            Términos y Condiciones
          </button>
          <button
            onClick={() => setActiveTab('reembolsos')}
            className={`py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              activeTab === 'reembolsos'
                ? 'bg-brand-black text-white shadow-lg'
                : 'text-brand-gray hover:text-brand-black hover:bg-brand-lightGray'
            }`}
          >
            <RefreshCw size={16} className={activeTab === 'reembolsos' ? 'text-brand-blue' : ''} />
            Reembolsos y Cancelación
          </button>
        </div>
      </div>

      {/* CONTENT AREA */}
      <main className="max-w-5xl mx-auto w-full px-6 py-8 flex-1">
        <div className="bg-white rounded-[2rem] p-6 lg:p-12 shadow-xl border border-brand-gray/15 space-y-8 leading-relaxed">
          {/* TAB 1: POLÍTICA DE PRIVACIDAD */}
          {activeTab === 'privacidad' && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-black uppercase tracking-tight text-brand-black flex items-center gap-3">
                  <Shield className="text-brand-blue" size={28} />
                  Política de Privacidad y Protección de Datos
                </h2>
                <p className="text-xs text-brand-gray font-bold uppercase mt-1">
                  Cumplimiento con RGPD (UE), LGPD (Brasil), Ley 25.326 (Argentina) y normativas internacionales de SaaS.
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">1. Responsable del Tratamiento</h3>
                <p className="text-sm text-brand-gray">
                  El responsable de la recopilación y tratamiento de los datos personales es <strong>Straje.App</strong>, desarrollado y administrado por <strong>Leandro Dichiara</strong>, con domicilio en Trenque Lauquen, Provincia de Buenos Aires, República Argentina. Contacto directo: <a href="mailto:LEAN04_23@HOTMAIL.COM" className="text-brand-blue underline font-bold">LEAN04_23@HOTMAIL.COM</a> / WhatsApp: <strong>+54 9 2392 538089</strong>.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">2. Información que Recopilamos</h3>
                <p className="text-sm text-brand-gray">
                  Recopilamos únicamente los datos necesarios para brindar y mejorar el servicio de gestión comercial:
                </p>
                <ul className="text-sm text-brand-gray space-y-2 list-disc pl-5">
                  <li><strong>Datos de Cuenta:</strong> Nombre del titular, correo electrónico de acceso y contraseña (cifrada irreversiblemente con algoritmos criptográficos bcrypt/Argon2 en Supabase).</li>
                  <li><strong>Datos de la Empresa:</strong> Nombre del comercio, dirección, localidad, teléfono comercial, logotipo y avisos legales en comprobantes.</li>
                  <li><strong>Datos Operativos del Negocio:</strong> Inventario de artículos, talles, precios de venta y alquiler, registro de transacciones, historial de caja y datos de clientes finales (nombre, DNI/identificación y contacto) ingresados voluntariamente por el usuario para la confección de remitos y alquileres.</li>
                  <li><strong>Datos Técnicos:</strong> Dirección IP anonimizada, país/región geolocalizada para adaptar moneda e idioma y métricas básicas de uso del sistema.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">3. Seguridad de Datos y Pasarelas de Pago</h3>
                <p className="text-sm text-brand-gray">
                  <strong>Straje.App NO almacena ni tiene acceso en ningún momento a los datos de tus tarjetas de crédito, débito o credenciales bancarias.</strong> Todos los pagos son procesados de forma cifrada de extremo a extremo mediante proveedores certificados PCI-DSS Nivel 1:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-4 bg-brand-lightGray rounded-xl border border-brand-gray/20">
                    <p className="text-xs font-black uppercase text-brand-black mb-1">En Argentina (ARS)</p>
                    <p className="text-xs text-brand-gray">Mercado Pago Argentina S.A. procesa las transacciones con tokens seguros SSL/TLS de 256 bits.</p>
                  </div>
                  <div className="p-4 bg-brand-lightGray rounded-xl border border-brand-gray/20">
                    <p className="text-xs font-black uppercase text-brand-black mb-1">En el Exterior (USD, EUR, etc.)</p>
                    <p className="text-xs text-brand-gray">Pasarelas bancarias y de procesamiento con tarjeta internacional Visa, Mastercard y Amex con autenticación 3D Secure 2.0.</p>
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">4. No Venta de Datos</h3>
                <p className="text-sm text-brand-gray">
                  Jamás vendemos, alquilamos ni comercializamos tus datos comerciales ni los de tus clientes con anunciantes, intermediarios o terceros. Tu base de datos es exclusivamente tuya y privada.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">5. Derechos del Usuario (ARCO)</h3>
                <p className="text-sm text-brand-gray">
                  Tenés derecho a acceder, rectificar, limitar, exportar o eliminar totalmente tu cuenta y todos sus datos en cualquier momento desde tu panel de configuración o enviando un correo a <a href="mailto:LEAN04_23@HOTMAIL.COM" className="text-brand-blue underline font-bold">LEAN04_23@HOTMAIL.COM</a>.
                </p>
              </section>
            </div>
          )}

          {/* TAB 2: TÉRMINOS Y CONDICIONES */}
          {activeTab === 'terminos' && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-black uppercase tracking-tight text-brand-black flex items-center gap-3">
                  <FileText className="text-brand-blue" size={28} />
                  Términos y Condiciones del Servicio
                </h2>
                <p className="text-xs text-brand-gray font-bold uppercase mt-1">
                  Acuerdo legal vinculante para el uso de la plataforma Straje.App.
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">1. Aceptación del Servicio</h3>
                <p className="text-sm text-brand-gray">
                  Al registrar una cuenta o utilizar Straje.App en su versión Web o Aplicación Móvil (PWA), aceptás de manera plena y sin reservas los presentes Términos y Condiciones. Si no estás de acuerdo, debés abstenerte de utilizar la plataforma.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">2. Modalidad de Software como Servicio (SaaS)</h3>
                <p className="text-sm text-brand-gray">
                  Straje.App se comercializa bajo la modalidad SaaS (Software as a Service) por suscripción mensual. Brinda herramientas para el control de inventario, punto de venta, gestión de alquiler de prendas y trajes, señas, devoluciones, lavandería y métricas de rentabilidad.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">3. Período de Prueba Gratuito</h3>
                <p className="text-sm text-brand-gray">
                  Todo nuevo usuario registrado accede a un período de prueba gratuito de <strong>30 días</strong> sin necesidad de ingresar tarjeta de crédito ni comprometer fondos. Finalizado dicho período, el usuario podrá elegir suscribirse a uno de los planes para continuar operando sin interrupción.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">4. Planes y Soporte Técnico</h3>
                <ul className="text-sm text-brand-gray space-y-2 list-disc pl-5">
                  <li><strong>Plan Estándar:</strong> Destinado a tiendas con una única sucursal física. Incluye facturación, caja diaria, stock, alquileres, cuentas corrientes y soporte técnico gratuito.</li>
                  <li><strong>Plan Premium:</strong> Destinado a negocios en expansión con múltiples sucursales, control de depósitos centralizados, roles avanzados de empleados y soporte preferencial.</li>
                  <li><strong>Actualizaciones Incluidas:</strong> Todas las mejoras del sistema, parches y videos tutoriales están incluidos sin costos extras de mantenimiento.</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">5. Uso Responsable y Legal</h3>
                <p className="text-sm text-brand-gray">
                  El usuario se compromete a no utilizar la plataforma para actividades ilícitas, fraudulentas o que vulneren derechos de terceros, así como a resguardar la confidencialidad de sus contraseñas de acceso.
                </p>
              </section>
            </div>
          )}

          {/* TAB 3: REEMBOLSOS Y CANCELACIÓN */}
          {activeTab === 'reembolsos' && (
            <div className="space-y-6">
              <div className="border-b pb-4">
                <h2 className="text-2xl font-black uppercase tracking-tight text-brand-black flex items-center gap-3">
                  <RefreshCw className="text-brand-blue" size={28} />
                  Políticas de Suscripción, Cancelación y Reembolso
                </h2>
                <p className="text-xs text-brand-gray font-bold uppercase mt-1">
                  Transparencia absoluta en cobros, períodos de prueba y garantías para el comprador.
                </p>
              </div>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">1. Garantía de Prueba Gratuita (30 Días)</h3>
                <p className="text-sm text-brand-gray">
                  Dado que Straje.App ofrece <strong>30 días de prueba 100% gratuitos y funcionales</strong> antes de requerir cualquier pago, cada usuario tiene la oportunidad de comprobar exhaustivamente la idoneidad del sistema para su comercio antes de realizar un desembolso.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">2. Cancelación en Cualquier Momento</h3>
                <p className="text-sm text-brand-gray">
                  No existen contratos de permanencia mínima ni cláusulas de penalización. Podés cancelar tu suscripción mensual en cualquier momento con un solo clic desde tu panel de usuario o comunicándote con nuestro canal de soporte. La cuenta continuará activa hasta finalizar el ciclo de facturación pagado y no se realizarán renovaciones posteriores.
                </p>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">3. Política de Reembolso (Garantía de 7 Días)</h3>
                <p className="text-sm text-brand-gray">
                  Si tras efectuar el pago mensual de tu suscripción experimentás problemas técnicos insalvables atribuibles a nuestra plataforma que te impidan utilizar el servicio, podés solicitar el <strong>reembolso total del 100% de tu último pago dentro de los primeros 7 (siete) días corridos</strong> posteriores a la transacción.
                </p>
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3">
                  <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-900">
                    <strong>Compromiso Straje.App:</strong> Las solicitudes de reembolso se procesan en un plazo máximo de 48 horas hábiles hacia el mismo medio de pago utilizado (Mercado Pago o tarjeta bancaria internacional).
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-brand-black">4. Procedimiento de Solicitud</h3>
                <p className="text-sm text-brand-gray">
                  Para tramitar una solicitud de reembolso o aclaración de facturación, únicamente requerimos tu comprobante de pago o email de registro enviado a:
                </p>
                <div className="p-4 bg-brand-lightGray rounded-xl border border-brand-gray/20 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase text-brand-black">Correo Electrónico de Facturación</p>
                    <a href="mailto:LEAN04_23@HOTMAIL.COM" className="text-sm text-brand-blue font-bold">LEAN04_23@HOTMAIL.COM</a>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase text-brand-black">Atención Rápida WhatsApp</p>
                    <a href="https://wa.me/5492392538089" target="_blank" rel="noreferrer" className="text-sm text-[#25D366] font-bold">+54 9 2392 538089</a>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* CONTACT INFO FOOTER */}
          <div className="pt-8 border-t border-brand-gray/20 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-brand-gray font-medium">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-brand-blue" />
              <span>Trenque Lauquen, Buenos Aires, Argentina</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="mailto:LEAN04_23@HOTMAIL.COM" className="hover:text-brand-blue flex items-center gap-1.5">
                <Mail size={14} /> LEAN04_23@HOTMAIL.COM
              </a>
              <a href="https://wa.me/5492392538089" target="_blank" rel="noreferrer" className="hover:text-[#25D366] flex items-center gap-1.5 font-bold">
                <Phone size={14} /> WhatsApp Soporte
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER SIMPLE */}
      <footer className="bg-white border-t border-brand-gray/10 py-6 px-6 text-center text-xs text-brand-gray font-bold uppercase tracking-widest">
        © {new Date().getFullYear()} Straje.App · Plataforma Global de Gestión Retail
      </footer>
    </div>
  )
}
