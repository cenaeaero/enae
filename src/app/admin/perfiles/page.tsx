"use client";

export default function AdminPerfilesPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#003366]">
          Perfiles de Usuarios
        </h1>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">
            Exportar CSV
          </button>
        </div>
      </div>

      {/* Role filter tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
        {["Todos", "Estudiantes", "Instructores", "Admins"].map((tab) => (
          <button
            key={tab}
            className={`px-4 py-1.5 text-sm rounded-md transition ${
              tab === "Todos"
                ? "bg-white shadow text-[#003366] font-medium"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-sm text-gray-500">
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">
                Organización
              </th>
              <th className="px-4 py-3 font-medium hidden sm:table-cell">
                País
              </th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                <div className="text-3xl mb-2">👥</div>
                <p className="font-medium">No hay perfiles registrados</p>
                <p className="text-sm mt-1">
                  Los perfiles se crearán automáticamente cuando los usuarios se
                  registren o un admin los agregue manualmente.
                </p>
                <p className="text-xs text-gray-300 mt-3">
                  Conecta Supabase para habilitar la gestión de perfiles
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
