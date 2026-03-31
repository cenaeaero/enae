"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { courses as staticCourses } from "@/data/courses";
import Link from "next/link";

type SessionInfo = {
  sessionId: string;
  courseId: string;
  courseTitle: string;
  courseCode: string | null;
  courseArea: string;
  courseDuration: string;
  courseAreaSlug: string;
  dates: string;
  location: string;
  modality: string;
  fee: string | null;
};

export default function RegistroPage() {
  const params = useParams();
  const id = params.id as string;

  const [session, setSession] = useState<SessionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [sameAddress, setSameAddress] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    async function load() {
      // Try loading from Supabase first (session UUID)
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id
        );

      if (isUuid) {
        const { data } = await supabase
          .from("sessions")
          .select(
            "id, dates, location, modality, fee, course_id, courses(title, code, area, area_slug, duration)"
          )
          .eq("id", id)
          .single();

        if (data) {
          const s = data as any;
          setSession({
            sessionId: s.id,
            courseId: s.course_id,
            courseTitle: s.courses?.title || "",
            courseCode: s.courses?.code || null,
            courseArea: s.courses?.area || "",
            courseDuration: s.courses?.duration || "",
            courseAreaSlug: s.courses?.area_slug || "",
            dates: s.dates,
            location: s.location,
            modality: s.modality,
            fee: s.fee,
          });
          setLoading(false);
          return;
        }
      }

      // Fallback: try static course data (legacy slugs like "uas-basico")
      const staticCourse = staticCourses.find((c) => c.id === id);
      if (staticCourse) {
        const firstSession = staticCourse.sessions?.[0];
        setSession({
          sessionId: "",
          courseId: staticCourse.id,
          courseTitle: staticCourse.title,
          courseCode: staticCourse.code || null,
          courseArea: staticCourse.area,
          courseDuration: staticCourse.duration,
          courseAreaSlug: staticCourse.areaSlug,
          dates: firstSession?.dates || staticCourse.dates[0] || "Por confirmar",
          location: firstSession?.location || staticCourse.locations[0] || "",
          modality: staticCourse.modality,
          fee: firstSession?.fee || null,
        });
      }

      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="text-center py-20 text-gray-400">Cargando...</div>
    );
  }

  if (!session) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold text-gray-500">
          Curso no encontrado
        </h1>
        <Link href="/calendario" className="text-[#0072CE] mt-4 inline-block">
          Volver al calendario
        </Link>
      </div>
    );
  }

  const areaEmoji =
    session.courseAreaSlug === "uas-rpas"
      ? "🛩️"
      : session.courseAreaSlug === "atm-navegacion"
        ? "🗼"
        : session.courseAreaSlug === "seguridad-avsec"
          ? "🛡️"
          : session.courseAreaSlug === "simuladores"
            ? "🖥️"
            : session.courseAreaSlug === "safety-ffhh"
              ? "⚕️"
              : "📋";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError("");

    const form = e.currentTarget as HTMLFormElement;
    const get = (name: string): string => {
      const el = form.querySelector(
        `[data-field="${name}"]`
      ) as HTMLInputElement | null;
      return el ? el.value : "";
    };

    const body = {
      courseId: session!.courseId,
      courseTitle: session!.courseTitle,
      courseCode: session!.courseCode,
      sessionDates: session!.dates,
      title: get("title"),
      firstName: get("firstName"),
      lastName: get("lastName"),
      email: get("email"),
      ageGroup: get("ageGroup"),
      jobTitle: get("jobTitle"),
      organization: get("organization"),
      organizationType: get("organizationType"),
      supervisorName: get("supervisorName"),
      supervisorEmail: get("supervisorEmail"),
      address: get("address"),
      city: get("city"),
      state: get("state"),
      postalCode: get("postalCode"),
      country: get("country"),
      phone: get("phone"),
      secondaryPhone: get("secondaryPhone"),
      billingName: sameAddress ? "" : get("billingName"),
      billingAddress: sameAddress ? "" : get("billingAddress"),
      billingCity: sameAddress ? "" : get("billingCity"),
      billingCountry: sameAddress ? "" : get("billingCountry"),
      howFound: get("howFound"),
      comments: get("comments"),
    };

    try {
      const res = await fetch("/api/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setSubmitError(data.error || "Error al procesar el registro.");
      }
    } catch {
      setSubmitError("Error de conexión. Intenta nuevamente.");
    }
    setSubmitting(false);
  }

  return (
    <>
      {/* Header */}
      <section className="bg-[#003366] text-white py-8">
        <div className="max-w-4xl mx-auto px-4">
          <nav className="text-sm text-blue-200 mb-3 flex items-center gap-2">
            <Link href="/calendario" className="hover:text-white transition">
              Calendario
            </Link>
            <span>/</span>
            <span>Registro</span>
          </nav>
          <h1 className="text-2xl font-bold">Registro de Curso</h1>
        </div>
      </section>

      <section className="bg-[#F8F9FA] py-10">
        <div className="max-w-4xl mx-auto px-4">
          {/* Course summary card */}
          <div className="bg-white rounded-lg border border-gray-200 p-5 mb-8 flex flex-col sm:flex-row gap-5">
            <div className="sm:w-32 h-24 sm:h-auto bg-gradient-to-br from-[#003366] to-[#004B87] rounded-lg flex items-center justify-center shrink-0">
              <span className="text-3xl">{areaEmoji}</span>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-[#003366]">
                {session.courseTitle}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {session.courseArea}
                {session.courseCode && ` | ${session.courseCode}`}
              </p>
              <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  {session.dates}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {session.location}
                </span>
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {session.courseDuration}
                </span>
                {session.fee && (
                  <span className="font-semibold text-[#003366] flex items-center gap-1">
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {session.fee}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Success message */}
          {submitted && (
            <div className="bg-white rounded-lg border border-green-200 p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-[#003366] mb-2">
                Registro exitoso
              </h2>
              <p className="text-gray-600 mb-2">
                Hemos enviado tus credenciales de acceso a tu correo electrónico.
              </p>
              <p className="text-gray-600 mb-6">
                Ingresa al portal de alumnos para completar el <strong>pago</strong> y acceder al curso cuando inicie ({session.dates}).
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/tpems/login"
                  className="inline-block bg-[#0072CE] hover:bg-[#005fa3] text-white font-medium px-6 py-3 rounded-lg transition"
                >
                  Ir al Portal de Alumnos
                </Link>
                <Link
                  href="/calendario"
                  className="inline-block border border-gray-300 text-gray-700 font-medium px-6 py-3 rounded-lg hover:bg-gray-50 transition"
                >
                  Volver al calendario
                </Link>
              </div>
            </div>
          )}

          {/* Registration form */}
          {!submitted && (
            <form onSubmit={handleSubmit}>
              <div className="space-y-8">
                {/* Personal Information */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-[#003366] mb-5 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#0072CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Información Personal
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Título <span className="text-red-500">*</span></label>
                      <select required data-field="title" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]">
                        <option value="">Seleccionar</option>
                        <option>Sr.</option>
                        <option>Sra.</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rango de Edad</label>
                      <select data-field="ageGroup" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]">
                        <option value="">Seleccionar</option>
                        <option>18-24</option><option>25-34</option><option>35-44</option><option>45-54</option><option>55-64</option><option>65+</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nombres <span className="text-red-500">*</span></label>
                      <input type="text" required data-field="firstName" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" placeholder="Nombres" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos <span className="text-red-500">*</span></label>
                      <input type="text" required data-field="lastName" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" placeholder="Apellidos" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
                      <input type="email" required data-field="email" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" placeholder="correo@ejemplo.com" />
                    </div>
                  </div>
                </div>

                {/* Employment */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-[#003366] mb-5 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#0072CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Información Laboral
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label><input type="text" data-field="jobTitle" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Organización</label><input type="text" data-field="organization" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Organización</label>
                      <select data-field="organizationType" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]">
                        <option value="">Seleccionar</option>
                        <option>Autoridad Aeronáutica Civil</option><option>Aeropuerto / Operador Aeroportuario</option><option>Aerolínea</option><option>Empresa de servicios aeronáuticos</option><option>Fuerzas Armadas / Defensa</option><option>Empresa de drones / UAS</option><option>Consultoría</option><option>Institución educativa</option><option>Independiente</option><option>Otro</option>
                      </select>
                    </div>
                  </div>
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-sm font-medium text-gray-500 mb-3">Datos del Supervisor (opcional)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre Supervisor</label><input type="text" data-field="supervisorName" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Email Supervisor</label><input type="email" data-field="supervisorEmail" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-[#003366] mb-5 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#0072CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Información de Contacto
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Dirección <span className="text-red-500">*</span></label><input type="text" required data-field="address" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" placeholder="Calle y número" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Ciudad <span className="text-red-500">*</span></label><input type="text" required data-field="city" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Región / Estado</label><input type="text" data-field="state" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label><input type="text" data-field="postalCode" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">País <span className="text-red-500">*</span></label>
                      <select required data-field="country" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]">
                        <option value="">Seleccionar</option>
                        <option>Chile</option><option>Colombia</option><option>España</option><option>Argentina</option><option>Brasil</option><option>México</option><option>Perú</option><option>Ecuador</option><option>Bolivia</option><option>Paraguay</option><option>Uruguay</option><option>Venezuela</option><option>Otro</option>
                      </select>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono <span className="text-red-500">*</span></label><input type="tel" required data-field="phone" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" placeholder="+56 9 1234 5678" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Teléfono secundario</label><input type="tel" data-field="secondaryPhone" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                  </div>
                </div>

                {/* Billing */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-[#003366] mb-5 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#0072CE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
                    </svg>
                    Información de Facturación
                  </h3>
                  <label className="flex items-center gap-2 text-sm text-gray-600 mb-4 cursor-pointer">
                    <input type="checkbox" checked={sameAddress} onChange={(e) => setSameAddress(e.target.checked)} className="rounded border-gray-300 text-[#0072CE] focus:ring-[#0072CE]" />
                    Misma dirección que la información de contacto
                  </label>
                  {!sameAddress && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Nombre destinatario</label><input type="text" data-field="billingName" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                      <div className="sm:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Dirección facturación</label><input type="text" data-field="billingAddress" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label><input type="text" data-field="billingCity" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" /></div>
                      <div><label className="block text-sm font-medium text-gray-700 mb-1">País</label><select data-field="billingCountry" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]"><option value="">Seleccionar</option><option>Chile</option><option>Colombia</option><option>España</option><option>Otro</option></select></div>
                    </div>
                  )}
                </div>

                {/* Additional */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-bold text-[#003366] mb-5">Información Adicional</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">¿Cómo se enteró de este curso?</label>
                      <select data-field="howFound" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]">
                        <option value="">Seleccionar</option><option>Sitio web ENAE</option><option>Redes sociales</option><option>Email / Newsletter</option><option>Recomendación</option><option>Evento / Feria</option><option>Buscador (Google)</option><option>Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios adicionales</label>
                      <textarea rows={3} data-field="comments" className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0072CE]" placeholder="¿Alguna consulta o necesidad especial?" />
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" required className="rounded border-gray-300 text-[#0072CE] focus:ring-[#0072CE] mt-1" />
                    <span className="text-sm text-gray-600">
                      Acepto los <a href="/terminos" target="_blank" rel="noopener noreferrer" className="text-[#0072CE] underline">términos y condiciones</a> de ENAE y autorizo el tratamiento de mis datos personales conforme a la <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="text-[#0072CE] underline">política de privacidad</a>. <span className="text-red-500">*</span>
                    </span>
                  </label>
                </div>

                {/* Submit */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                  <Link href="/calendario" className="text-[#0072CE] hover:text-[#004B87] font-medium flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    Volver al calendario
                  </Link>
                  {submitError && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{submitError}</div>
                  )}
                  <button type="submit" disabled={submitting} className="px-10 py-3.5 bg-[#0072CE] text-white font-semibold rounded-lg hover:bg-[#005fa3] disabled:bg-blue-300 transition shadow-md">
                    {submitting ? "Procesando..." : "Enviar Registro"}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
