import Link from "next/link";
import Image from "next/image";
import { Course } from "@/data/courses";

const levelColors: Record<string, string> = {
  Básico: "bg-green-100 text-green-800",
  Intermedio: "bg-blue-100 text-blue-800",
  Avanzado: "bg-purple-100 text-purple-800",
  Especialización: "bg-orange-100 text-orange-800",
};

const modalityIcons: Record<string, string> = {
  Presencial: "🏫",
  Híbrido: "🔄",
  Online: "💻",
};

export default function CourseCard({ course }: { course: Course }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-[#0072CE] hover:shadow-lg transition-all duration-200 overflow-hidden group">
      {/* Course image */}
      {course.image ? (
        <div className="relative h-44 w-full overflow-hidden bg-gray-100">
          <Image
            src={course.image}
            alt={course.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          <div className="absolute top-3 left-3 flex gap-2">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${levelColors[course.level] || "bg-gray-100 text-gray-800"}`}>
              {course.level}
            </span>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-white/90 text-gray-700">
              {modalityIcons[course.modality]} {course.modality}
            </span>
          </div>
        </div>
      ) : (
        <>
          <div className="h-1 bg-[#0072CE] group-hover:bg-[#004B87] transition" />
          <div className="px-5 pt-5">
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${levelColors[course.level] || "bg-gray-100 text-gray-800"}`}>
                {course.level}
              </span>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {modalityIcons[course.modality]} {course.modality}
              </span>
            </div>
          </div>
        </>
      )}

      <div className={course.image ? "p-5" : "px-5 pb-5"}>
        {/* Title */}
        <h3 className="font-semibold text-[#003366] text-lg mb-2 group-hover:text-[#0072CE] transition line-clamp-2">
          {course.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
          {course.description}
        </p>

        {/* Meta info */}
        <div className="space-y-2 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {course.duration}
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {course.locations.join(" · ")}
          </div>
          {course.dates.length > 0 && (
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {course.dates[0]}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <Link
            href={`/cursos/${course.id}`}
            className="text-[#0072CE] hover:text-[#004B87] text-sm font-medium transition flex items-center gap-1"
          >
            Ver detalles
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
