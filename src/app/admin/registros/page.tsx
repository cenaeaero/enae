"use client";

export default function AdminRegistrosPage() {
  // Placeholder - will connect to Supabase
  return (
    <div>
      <h1 className="text-2xl font-bold text-[#003366] mb-6">
        Registros de Cursos
      </h1>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-500">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">
                Curso
              </th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">
                Fecha
              </th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                <div className="text-3xl mb-2">📋</div>
                <p className="font-medium">No hay registros aún</p>
                <p className="text-sm mt-1">
                  Los registros aparecerán aquí cuando los estudiantes se
                  inscriban a través del formulario de registro.
                </p>
                <p className="text-xs text-gray-300 mt-3">
                  Conecta Supabase para habilitar el almacenamiento de registros
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
