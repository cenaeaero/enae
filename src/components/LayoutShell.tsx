"use client";

import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function LayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isTpems = pathname.startsWith("/tpems");
  const isAdminLogin = pathname === "/admin/login";
  const isAdmin = pathname.startsWith("/admin");
  const isInstructor = pathname.startsWith("/instructor");
  const isSupervisor = pathname.startsWith("/supervisor");
  const isPortal = pathname.startsWith("/portal");
  const isSimulador = pathname.startsWith("/simulador");

  // Portales con su propio chrome (sin Header/Footer público)
  if (isTpems || isAdminLogin || isInstructor || isSupervisor || isPortal || isSimulador) {
    return <>{children}</>;
  }

  return (
    <>
      {!isAdmin && <Header />}
      <main className="flex-1">{children}</main>
      {!isAdmin && <Footer />}
    </>
  );
}
