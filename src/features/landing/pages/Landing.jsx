import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, Menu, X, CalendarPlus, MapPin, Phone, Mail, Clock, Navigation,
  HeartHandshake, ClipboardList, FlaskConical, FileText, Receipt, UserRound,
  Stethoscope, ShieldCheck, Smartphone, ChevronDown, MessageCircle, Lock,
  IdCard, CalendarCheck, Activity,
} from 'lucide-react';
import { centroMedico } from '../../../config/centroMedico';
import { BrandMark, EcgStrip } from '../../auth/components/authUI';

// Todos los datos de la clínica (nombre, contacto, horarios, especialidades)
// se editan en src/config/centroMedico.js → `sitio`.
const S = centroMedico.sitio;
const DIRECCION = `${centroMedico.direccion}, ${centroMedico.ciudad}`;
const MAPA_EMBED = `https://www.google.com/maps?q=${encodeURIComponent(S.mapa_busqueda || DIRECCION)}&output=embed`;
const MAPA_LINK  = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(S.mapa_busqueda || DIRECCION)}`;
const TEL_HREF   = `tel:${(S.telefono_citas || centroMedico.telefono).replace(/[^\d+]/g, '')}`;
const WHATSAPP   = S.whatsapp ? `https://wa.me/${S.whatsapp.replace(/\D/g, '')}` : '';
const CORREO     = S.email_contacto || centroMedico.email;

const PORTAL = '/login?modo=paciente';

/* ═════════════════════════════════ Página ═════════════════════════════════ */
export default function Landing() {
  return (
    <div className="min-h-screen bg-white text-ink-900 overflow-x-hidden">
      <Nav />
      <main>
        <Hero />
        <Nosotros />
        <Especialidades />
        <Servicios />
        <PedirCita />
        <Ubicacion />
        <Preguntas />
      </main>
      <Footer />
    </div>
  );
}

/* ───────────────────────────── Navegación ───────────────────────────── */
const SECCIONES = [
  ['nosotros', 'Nosotros'],
  ['especialidades', 'Especialidades'],
  ['servicios', 'Servicios'],
  ['citas', 'Pedir cita'],
  ['ubicacion', 'Ubicación'],
];

function Nav() {
  const [abierto, setAbierto] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur border-b border-line">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-6">
        <a href="#inicio" className="flex items-center gap-2.5 min-w-0">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-tight truncate">{S.nombre}</span>
        </a>

        <nav className="hidden lg:flex items-center gap-6 text-[13.5px] text-ink-700">
          {SECCIONES.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="hover:text-ink-900 transition-colors">{label}</a>
          ))}
        </nav>

        <div className="ml-auto hidden lg:flex items-center gap-2">
          <a href={TEL_HREF} className="inline-flex items-center gap-1.5 px-3 py-2 text-[13.5px] font-medium text-ink-800 hover:bg-surface rounded-lg transition-colors">
            <Phone size={14} /> {S.telefono_citas}
          </a>
          <Link to={PORTAL} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13.5px] font-medium text-white bg-brand-700 hover:bg-brand-800 rounded-lg transition-colors">
            <UserRound size={14} /> Portal del paciente
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setAbierto(v => !v)}
          className="lg:hidden ml-auto p-2 -mr-2 rounded-lg hover:bg-surface"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={abierto}
        >
          {abierto ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {abierto && (
        <div className="lg:hidden border-t border-line bg-white px-4 py-3 space-y-1">
          {SECCIONES.map(([id, label]) => (
            <a key={id} href={`#${id}`} onClick={() => setAbierto(false)}
              className="block px-2 py-2.5 text-[14px] text-ink-800 rounded-lg hover:bg-surface">
              {label}
            </a>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <a href={TEL_HREF} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[14px] font-medium border border-line rounded-lg">
              <Phone size={14} /> Llamar
            </a>
            <Link to={PORTAL} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[14px] font-medium text-white bg-brand-700 rounded-lg">
              <UserRound size={14} /> Portal
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

/* ──────────────────────────────── Hero ──────────────────────────────── */
const CUADRICULA = {
  backgroundImage: [
    'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
    'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
    'linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
  ].join(', '),
  backgroundSize: '8px 8px, 8px 8px, 40px 40px, 40px 40px',
};

function Hero() {
  return (
    <section id="inicio">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-16 lg:pt-20 lg:pb-24 grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-14 items-center [&>*]:min-w-0">
        <div>
          <p className="inline-flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.16em] text-brand-700">
            <MapPin size={13} /> {centroMedico.ciudad}
          </p>
          <h1 className="mt-4 font-display text-[44px] sm:text-[56px] lg:text-[64px] leading-[1.02] tracking-[-0.01em]">
            Tu salud, <em className="italic text-brand-700">en buenas manos.</em>
          </h1>
          <p className="mt-6 text-[16px] leading-relaxed text-ink-700 max-w-[520px]">
            {S.eslogan} Médicos generales y especialistas en un solo lugar, y tus citas,
            resultados y fórmulas disponibles en línea.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link to={PORTAL}
              className="group inline-flex items-center justify-center gap-2 px-5 py-3 text-[14.5px] font-medium text-white bg-brand-700 hover:bg-brand-800 rounded-lg transition-colors">
              <CalendarPlus size={16} /> Agendar cita en línea
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a href={TEL_HREF}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-[14.5px] font-medium text-ink-800 border border-line hover:bg-surface rounded-lg transition-colors">
              <Phone size={16} /> Llamar para pedir cita
            </a>
          </div>

          <dl className="mt-10 pt-6 border-t border-line grid sm:grid-cols-2 gap-4 text-[13.5px]">
            <div className="flex gap-2.5">
              <MapPin size={16} className="flex-shrink-0 mt-0.5 text-brand-700" />
              <div>
                <dt className="font-medium text-ink-900">{centroMedico.direccion}</dt>
                <dd className="text-ink-500">{centroMedico.ciudad}</dd>
              </div>
            </div>
            <div className="flex gap-2.5">
              <Clock size={16} className="flex-shrink-0 mt-0.5 text-brand-700" />
              <div>
                <dt className="font-medium text-ink-900">{S.horarios[0]?.[0]}</dt>
                <dd className="text-ink-500">{S.horarios[0]?.[1]}</dd>
              </div>
            </div>
          </dl>
        </div>

        <TarjetaAtencion />
      </div>
    </section>
  );
}

// Panel oscuro: horario de atención + accesos rápidos.
function TarjetaAtencion() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-brand-900 text-white shadow-[0_30px_60px_-20px_rgba(17,34,90,0.45)]">
      <div className="absolute inset-0" style={CUADRICULA} aria-hidden />
      <div className="relative p-6 sm:p-7">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/60">Horario de atención</p>
        <ul className="mt-4 divide-y divide-white/10">
          {S.horarios.map(([dias, horas]) => (
            <li key={dias} className="flex items-center justify-between gap-4 py-3 text-[14px]">
              <span className="text-white/80">{dias}</span>
              <span className={`font-mono text-[13px] ${horas.toLowerCase() === 'cerrado' ? 'text-white/40' : 'text-white'}`}>{horas}</span>
            </li>
          ))}
        </ul>

        <EcgStrip className="mt-4 -mx-6 sm:-mx-7 [&>div:first-child]:px-6 sm:[&>div:first-child]:px-7" />

        <div className="mt-5 grid sm:grid-cols-2 gap-2.5">
          <Link to={PORTAL}
            className="group flex items-center gap-3 rounded-xl bg-white/[0.07] border border-white/15 hover:bg-white/[0.12] px-3.5 py-3 transition-colors">
            <UserRound size={18} strokeWidth={1.75} className="text-accent-300" />
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-medium">Soy paciente</span>
              <span className="block text-[11.5px] text-white/55">Citas, resultados y facturas</span>
            </span>
            <ArrowRight size={14} className="text-white/40 group-hover:text-white" />
          </Link>
          <a href={MAPA_LINK} target="_blank" rel="noopener noreferrer"
            className="group flex items-center gap-3 rounded-xl bg-white/[0.07] border border-white/15 hover:bg-white/[0.12] px-3.5 py-3 transition-colors">
            <Navigation size={18} strokeWidth={1.75} className="text-accent-300" />
            <span className="flex-1 min-w-0">
              <span className="block text-[14px] font-medium">Cómo llegar</span>
              <span className="block text-[11.5px] text-white/55 truncate">{centroMedico.direccion}</span>
            </span>
            <ArrowRight size={14} className="text-white/40 group-hover:text-white" />
          </a>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────── Nosotros ────────────────────────────── */
const VALORES = [
  { icon: HeartHandshake, titulo: 'Atención humana',        texto: 'Te escuchamos con calma y te explicamos tu diagnóstico y tratamiento en palabras claras.' },
  { icon: Stethoscope,    titulo: 'Médicos y especialistas', texto: 'Medicina general y especialidades en el mismo lugar, para que no tengas que ir de un sitio a otro.' },
  { icon: ClipboardList,  titulo: 'Historia clínica digital', texto: 'Cada médico que te atiende conoce tus antecedentes, alergias y tratamientos anteriores.' },
  { icon: ShieldCheck,    titulo: 'Tu información, protegida', texto: 'Sólo los médicos que te atienden ven tu historia, y cada consulta a ella queda registrada.' },
];

function Nosotros() {
  return (
    <section id="nosotros" className="bg-surface border-y border-line scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
        <Encabezado
          eyebrow="Nosotros"
          titulo={<>Un centro médico pensado <em className="italic text-brand-700">para ti y tu familia.</em></>}
          texto={`En ${S.nombre} atendemos a niños, adultos y adultos mayores con un equipo de medicina general y especialistas, y con la información de cada paciente organizada para darle continuidad a su cuidado.`}
        />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALORES.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo} className="rounded-xl bg-white border border-line p-5">
              <span className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-700">
                <Icon size={19} strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{titulo}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">{texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Especialidades ─────────────────────────── */
function Especialidades() {
  return (
    <section id="especialidades" className="scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <Encabezado
            eyebrow="Especialidades"
            titulo={<>Medicina general <em className="italic text-brand-700">y especialistas.</em></>}
            texto="Agenda con el especialista que necesitas. Si no sabes cuál, empieza por medicina general: tu médico te orienta."
          />
          <Link to={PORTAL}
            className="self-start lg:self-auto inline-flex items-center gap-2 px-4 py-2.5 text-[13.5px] font-medium text-brand-700 border border-brand-200 hover:bg-brand-50 rounded-lg transition-colors">
            <CalendarPlus size={15} /> Agendar con un especialista
          </Link>
        </div>

        <ul className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-line border border-line rounded-2xl overflow-hidden">
          {S.especialidades.map(([nombre, descripcion]) => (
            <li key={nombre} className="bg-white p-5 flex gap-3">
              <Activity size={16} strokeWidth={1.75} className="flex-shrink-0 mt-1 text-brand-600" />
              <div>
                <h3 className="text-[15px] font-semibold tracking-tight">{nombre}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{descripcion}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ────────────────────────────── Servicios ───────────────────────────── */
const SERVICIOS = [
  { icon: Stethoscope,  titulo: 'Consulta médica',         texto: 'Consulta general de primera vez y consulta con especialista.' },
  { icon: CalendarCheck, titulo: 'Controles',              texto: 'Seguimiento de tu tratamiento y de enfermedades crónicas como hipertensión o diabetes.' },
  { icon: FlaskConical, titulo: 'Órdenes de exámenes',     texto: 'Tu médico genera la orden y la puedes descargar e imprimir desde el portal.' },
  { icon: FileText,     titulo: 'Fórmulas y documentos',   texto: 'Fórmula médica, incapacidades y soportes de cada atención, siempre disponibles.' },
  { icon: ClipboardList, titulo: 'Resultados en línea',    texto: 'Consulta los resultados que tu médico adjunta a tu historia sin volver a la clínica.' },
  { icon: Receipt,      titulo: 'Facturas en línea',       texto: 'Revisa el estado de tus facturas y descarga tus recibos en PDF.' },
];

function Servicios() {
  return (
    <section id="servicios" className="bg-surface border-y border-line scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
        <Encabezado
          eyebrow="Servicios"
          titulo={<>Todo lo de tu consulta, <em className="italic text-brand-700">antes y después.</em></>}
          texto="Desde que pides la cita hasta que recibes tus resultados, sin filas ni papeles perdidos."
        />
        <div className="mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-10">
          {SERVICIOS.map(({ icon: Icon, titulo, texto }) => (
            <div key={titulo}>
              <span className="w-10 h-10 rounded-lg bg-white border border-line flex items-center justify-center text-brand-700">
                <Icon size={19} strokeWidth={1.75} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{titulo}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">{texto}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───────────────────── Cómo pedir una cita / portal ───────────────────── */
const PASOS_CITA = [
  { icon: IdCard,        titulo: 'Regístrate una vez',  texto: 'En recepción toman tu nombre, documento y fecha de nacimiento. Si ya eres paciente, ya estás registrado.' },
  { icon: Smartphone,    titulo: 'Entra al portal',     texto: 'Desde el celular o el computador, con tu número de documento y tu fecha de nacimiento. No necesitas correo.' },
  { icon: CalendarPlus,  titulo: 'Elige tu cita',       texto: 'Especialidad, médico, día y una de las horas libres. Si no puedes asistir, cancélala desde ahí mismo.' },
  { icon: ClipboardList, titulo: 'Después de la consulta', texto: 'Encuentra tus fórmulas, órdenes, resultados y facturas en el portal, listos para descargar.' },
];

function PedirCita() {
  return (
    <section id="citas" className="bg-brand-900 text-white scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <Encabezado
            oscuro
            eyebrow="Pedir cita"
            titulo={<>Agenda tu cita <em className="italic text-accent-300">sin llamar ni hacer fila.</em></>}
            texto="El portal del paciente está abierto todos los días, a cualquier hora."
          />
          <Link to={PORTAL}
            className="self-start lg:self-auto group inline-flex items-center gap-2 px-5 py-3 text-[14.5px] font-medium text-brand-900 bg-white hover:bg-brand-50 rounded-lg transition-colors">
            Ir al portal del paciente
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        <ol className="mt-12 grid md:grid-cols-4 gap-4">
          {PASOS_CITA.map(({ icon: Icon, titulo, texto }, i) => (
            <li key={titulo} className="relative rounded-xl bg-white/[0.05] border border-white/10 p-5">
              <div className="flex items-center justify-between">
                <Icon size={19} strokeWidth={1.75} className="text-accent-300" />
                <span className="font-mono text-[12px] text-white/40">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight">{titulo}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/65">{texto}</p>
              {i < PASOS_CITA.length - 1 && (
                <ArrowRight size={16} className="hidden md:block absolute top-1/2 -right-[14px] -translate-y-1/2 text-white/30" />
              )}
            </li>
          ))}
        </ol>

        <p className="mt-8 text-[13.5px] text-white/65">
          ¿Prefieres que te ayudemos? Llámanos al{' '}
          <a href={TEL_HREF} className="font-medium text-white underline underline-offset-4 decoration-white/30 hover:decoration-white">{S.telefono_citas}</a>
          {WHATSAPP && <> o escríbenos por{' '}
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline underline-offset-4 decoration-white/30 hover:decoration-white">WhatsApp</a></>}
          {' '}y agendamos la cita por ti.
        </p>
      </div>
    </section>
  );
}

/* ───────────────────────── Ubicación y contacto ───────────────────────── */
function Ubicacion() {
  return (
    <section id="ubicacion" className="scroll-mt-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
        <Encabezado
          eyebrow="Ubicación y contacto"
          titulo={<>Te esperamos <em className="italic text-brand-700">en {centroMedico.ciudad.split(',')[0]}.</em></>}
        />

        <div className="mt-12 grid lg:grid-cols-[1fr_1.4fr] gap-6 [&>*]:min-w-0">
          <div className="rounded-2xl border border-line p-6 space-y-6">
            <Dato icon={MapPin} titulo="Dirección">
              {centroMedico.direccion}<br />{centroMedico.ciudad}
              {S.referencia && <><br /><span className="text-ink-500">{S.referencia}</span></>}
            </Dato>
            <Dato icon={Clock} titulo="Horario de atención">
              <ul className="space-y-1">
                {S.horarios.map(([dias, horas]) => (
                  <li key={dias} className="flex justify-between gap-4">
                    <span className="text-ink-500">{dias}</span><span className="tabular-nums">{horas}</span>
                  </li>
                ))}
              </ul>
            </Dato>
            <Dato icon={Phone} titulo="Citas e información">
              <a href={TEL_HREF} className="hover:text-brand-700">{S.telefono_citas}</a>
            </Dato>
            {WHATSAPP && (
              <Dato icon={MessageCircle} titulo="WhatsApp">
                <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="hover:text-brand-700">Escríbenos</a>
              </Dato>
            )}
            <Dato icon={Mail} titulo="Correo">
              <a href={`mailto:${CORREO}`} className="hover:text-brand-700 break-all">{CORREO}</a>
            </Dato>
            <a href={MAPA_LINK} target="_blank" rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg bg-brand-700 hover:bg-brand-800 text-white text-[14px] font-medium transition-colors">
              <Navigation size={15} /> Cómo llegar
            </a>
          </div>

          <div className="relative min-h-[320px] lg:min-h-0 rounded-2xl overflow-hidden border border-line bg-surface">
            <iframe
              title={`Mapa: ${S.nombre}`}
              src={MAPA_EMBED}
              className="absolute inset-0 w-full h-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function Dato({ icon: Icon, titulo, children }) {
  return (
    <div className="flex gap-3">
      <span className="w-9 h-9 flex-shrink-0 rounded-lg bg-surface border border-line flex items-center justify-center text-brand-700">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <div className="min-w-0 flex-1 text-[14px] text-ink-900 leading-relaxed">
        <p className="text-[11px] uppercase tracking-[0.12em] text-ink-500 mb-0.5">{titulo}</p>
        {children}
      </div>
    </div>
  );
}

/* ───────────────────────────── Preguntas ────────────────────────────── */
const FAQ = [
  ['¿Cómo pido una cita?', 'Entra al portal del paciente con tu documento y tu fecha de nacimiento y elige especialidad, médico, día y hora. También puedes llamarnos y la agendamos por ti.'],
  ['No tengo correo electrónico, ¿puedo usar el portal?', 'Sí. Para entrar sólo necesitas tu número de documento y tu fecha de nacimiento, tal como están registrados en recepción.'],
  ['Es mi primera vez, ¿qué debo hacer?', 'Acércate a recepción con tu documento de identidad para registrarte. Desde ese momento puedes agendar en línea.'],
  ['¿Cómo veo mis resultados y fórmulas?', 'En el portal, en las secciones Resultados y Documentos. Puedes descargarlos e imprimirlos.'],
  ['¿Puedo cancelar una cita?', 'Sí, desde "Mis citas" en el portal. Así liberas el espacio para otro paciente.'],
  ['¿Qué debo llevar a la consulta?', 'Tu documento de identidad y, si los tienes, exámenes, fórmulas u órdenes anteriores relacionados con el motivo de la consulta.'],
];

function Preguntas() {
  return (
    <section id="preguntas" className="bg-surface border-t border-line scroll-mt-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 lg:py-24">
        <h2 className="font-display text-[36px] sm:text-[44px] leading-[1.05] text-center">Preguntas frecuentes</h2>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {FAQ.map(([p, r]) => (
            <details key={p} className="group py-5">
              <summary className="flex items-center justify-between gap-4 cursor-pointer list-none text-[15px] font-medium [&::-webkit-details-marker]:hidden">
                {p}
                <ChevronDown size={17} className="flex-shrink-0 text-ink-500 transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-[14px] leading-relaxed text-ink-500">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────── Footer ─────────────────────────────── */
function Footer() {
  return (
    <footer className="bg-brand-900 text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 grid md:grid-cols-[1.4fr_1fr_1fr] gap-10">
        <div>
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-[15px] font-semibold">{S.nombre}</span>
          </div>
          <p className="mt-4 text-[13.5px] leading-relaxed text-white/60 max-w-xs">
            {centroMedico.direccion} · {centroMedico.ciudad}<br />
            <a href={TEL_HREF} className="hover:text-white">{S.telefono_citas}</a> · <a href={`mailto:${CORREO}`} className="hover:text-white">{CORREO}</a>
          </p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">El centro médico</p>
          <ul className="mt-4 space-y-2.5 text-[13.5px] text-white/75">
            {SECCIONES.map(([id, label]) => <li key={id}><a href={`#${id}`} className="hover:text-white">{label}</a></li>)}
          </ul>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-white/45">Accesos</p>
          <ul className="mt-4 space-y-2.5 text-[13.5px] text-white/75">
            <li><Link to={PORTAL} className="hover:text-white">Portal del paciente</Link></li>
            <li>
              <Link to="/login?modo=clave" className="inline-flex items-center gap-1.5 hover:text-white">
                <Lock size={12} /> Acceso del personal
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="max-w-6xl mx-auto px-4 sm:px-6 py-5 text-[12px] text-white/45">
          © {new Date().getFullYear()} {centroMedico.razon_social}. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}

/* ─────────────────────────────── Común ──────────────────────────────── */
function Encabezado({ eyebrow, titulo, texto, oscuro = false }) {
  return (
    <div className="max-w-2xl">
      <p className={`text-[11.5px] font-medium uppercase tracking-[0.16em] ${oscuro ? 'text-accent-300' : 'text-brand-700'}`}>{eyebrow}</p>
      <h2 className="mt-3 font-display text-[36px] sm:text-[46px] leading-[1.05] tracking-[-0.01em]">{titulo}</h2>
      {texto && <p className={`mt-4 text-[15px] leading-relaxed ${oscuro ? 'text-white/65' : 'text-ink-500'}`}>{texto}</p>}
    </div>
  );
}
