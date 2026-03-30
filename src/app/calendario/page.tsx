import { courses } from "@/data/courses";
import Link from "next/link";

const months = [
  "Abril", "Mayo", "Junio", "Julio", "Agosto",
  "Septiembre", "Octubre",
];

const monthAbbr = ["Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct"];

function getCoursesForMonth(monthAbbrev: string) {
  return courses.filter((c) =>
    c.dates.some((d) => d.includes(monthAbbrev))
  );
}

export default function CalendarioPage() {
  return (
    <>
      <section className="bg-[#003366] text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-2">Calendario 2026</h1>
          <p className="text-blue-200">
            Programación de cursos por semestre
          </p>
        </div>
      </section>

      <section className="bg-[#F8F9FA] py-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="space-y-8">
            {months.map((month, i) => {
              const monthCourses = getCoursesForMonth(monthAbbr[i]);
              if (monthCourses.length === 0) return null;
              return (
                <div key={month}>
                  <h2 className="text-xl font-bold text-[#003366] mb-4 flex items-center gap-3">
                    <span className="w-10 h-10 bg-[#003366] text-white rounded-lg flex items-center justify-center text-sm font-bold">
                      {monthAbbr[i]}
                    </span>
                    {month} 2026
                  </h2>
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50 text-left text-sm text-gray-500">
                          <th className="px-6 py-3 font-medium">Curso</th>
                          <th className="px-6 py-3 font-medium hidden md:table-cell">
                            Área
                          </th>
                          <th className="px-6 py-3 font-medium hidden sm:table-cell">
                            Modalidad
                          </th>
                          <th className="px-6 py-3 font-medium">Fechas</th>
                          <th className="px-6 py-3 font-medium hidden lg:table-cell">
                            Sede
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {monthCourses.map((course) => (
                          <tr
                            key={course.id + month}
                            className="hover:bg-blue-50/50 transition"
                          >
                            <td className="px-6 py-4">
                              <Link
                                href={`/cursos#${course.id}`}
                                className="text-[#003366] font-medium hover:text-[#0072CE] transition"
                              >
                                {course.title}
                              </Link>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {course.duration}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 hidden md:table-cell">
                              {course.area}
                            </td>
                            <td className="px-6 py-4 text-sm hidden sm:table-cell">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  course.modality === "Presencial"
                                    ? "bg-green-100 text-green-700"
                                    : course.modality === "Híbrido"
                                      ? "bg-blue-100 text-blue-700"
                                      : "bg-purple-100 text-purple-700"
                                }`}
                              >
                                {course.modality}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">
                              {course.dates
                                .filter((d) => d.includes(monthAbbr[i]))
                                .join(", ")}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 hidden lg:table-cell">
                              {course.locations.join(", ")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
