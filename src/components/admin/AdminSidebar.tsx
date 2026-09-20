"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SIDEBAR_COLLAPSED_COOKIE } from "@/lib/admin-sidebar";
import { GoToAttendanceLink } from "./GoToAttendanceLink";
import { SidebarIcon, SidebarIconName } from "./SidebarIcon";

type NavItem = { href: string; label: string; icon: SidebarIconName; badge?: number };
type NavGroup = { id: string; label: string; icon: SidebarIconName; items: NavItem[] };

const DASHBOARD_LINK: NavItem = { href: "/admin", label: "Resumen", icon: "dashboard" };
const ITINERANCIAS_LINK: NavItem = { href: "/admin/itinerancias", label: "Itinerancias", icon: "calendar" };
const BILLING_LINK: NavItem = { href: "/admin/facturacion", label: "Facturación", icon: "credit-card" };

// Botón cuadrado de solo ícono para la versión contraída de la barra (el texto va en el tooltip).
function RailLink({ item, active }: { item: NavItem; active: boolean }) {
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-label={item.label}
      className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-all duration-150 active:scale-95 ${
        active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      <SidebarIcon name={item.icon} className="h-5 w-5" />
      {item.badge !== undefined && item.badge > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-none text-white">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

export function AdminSidebar({
  displayName,
  username,
  role,
  schoolSlug,
  pendingAdminCount = 0,
  itineranciasEnabled = false,
  defaultCollapsed = false,
}: {
  displayName: string;
  username: string;
  role: string;
  schoolSlug?: string | null;
  pendingAdminCount?: number;
  itineranciasEnabled?: boolean;
  defaultCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  // Solo aplica en md+ (en mobile la barra siempre es el menú deslizable completo).
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COLLAPSED_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  // El super-admin no tiene acceso a datos de escuela: solo ve la gestión de cuentas.
  const isSuperAdmin = role === "SUPER_ADMIN";

  const groups: NavGroup[] = isSuperAdmin
    ? [
        {
          id: "cuentas",
          label: "Administración",
          icon: "shield",
          items: [
            { href: "/admin/admins", label: "Administradores", icon: "users", badge: pendingAdminCount },
            { href: "/admin/backups", label: "Copias de seguridad", icon: "database" },
            { href: "/admin/dos-factores", label: "Seguridad", icon: "shield" },
          ],
        },
      ]
    : [
        {
          id: "gestion",
          label: "Gestión",
          icon: "layers",
          items: [
            { href: "/admin/alumnos", label: "Alumnos", icon: "users" },
            { href: "/admin/orientadores", label: "Orientadores", icon: "user-check" },
            { href: "/admin/horarios", label: "Horarios", icon: "clock" },
            { href: "/admin/asignaciones", label: "Asignaciones", icon: "clipboard-list" },
          ],
        },
        {
          id: "informes",
          label: "Informes",
          icon: "bar-chart",
          items: [
            { href: "/admin/exportaciones", label: "Exportaciones", icon: "download" },
            { href: "/admin/estadisticas", label: "Estadísticas", icon: "bar-chart" },
          ],
        },
        {
          id: "configuracion",
          label: "Configuración",
          icon: "sliders",
          items: [
            { href: "/admin/ubicacion", label: "Ubicación", icon: "crosshair" },
            { href: "/admin/mi-cuenta", label: "Mi cuenta", icon: "user" },
          ],
        },
      ];

  function isActive(href: string) {
    return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  }

  const activeGroupId = groups.find((group) => group.items.some((item) => isActive(item.href)))?.id;
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(activeGroupId ? [activeGroupId] : []),
  );

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Cerrar el menú al cambiar de página (incluye navegación programática, no solo clicks).
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Al entrar a una página, el grupo que la contiene se despliega solo (sin cerrar los demás).
  useEffect(() => {
    if (!activeGroupId) return;
    setOpenGroups((prev) => (prev.has(activeGroupId) ? prev : new Set(prev).add(activeGroupId)));
  }, [activeGroupId]);

  // Bloquear el scroll de fondo mientras el menú está abierto en mobile.
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  // Itinerancias es un evento trimestral (solo aparece en los meses habilitados): va como
  // tarjeta propia junto al Resumen, no dentro de un grupo.
  const primaryLinks: NavItem[] = isSuperAdmin
    ? []
    : itineranciasEnabled
      ? [DASHBOARD_LINK, ITINERANCIAS_LINK]
      : [DASHBOARD_LINK];
  const billingActive = isActive(BILLING_LINK.href);

  return (
    <>
      {/* Barra superior solo en mobile: logo + botón hamburguesa. En md+ no se muestra, la
          barra lateral queda siempre visible y fija (se puede contraer a una columna de íconos). */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface p-4 md:hidden">
        <Image
          src="/logo.png"
          alt="Pakua"
          width={1554}
          height={514}
          priority
          className="h-8 w-auto dark:invert"
        />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          aria-expanded={mobileOpen}
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg transition hover:bg-surface-2"
        >
          <span className="h-0.5 w-5 rounded-full bg-foreground" />
          <span className="h-0.5 w-5 rounded-full bg-foreground" />
          <span className="h-0.5 w-5 rounded-full bg-foreground" />
        </button>
      </header>

      {/* Fondo oscuro detrás del menú, solo visible (y clickeable) en mobile mientras está abierto. */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-black/50 transition-opacity duration-300 md:hidden ${
          mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] shrink-0 flex-col overflow-hidden rounded-r-2xl border-r border-border bg-surface shadow-drawer transition-transform duration-300 ease-in-out md:sticky md:top-0 md:z-20 md:h-dvh md:max-w-none md:translate-x-0 md:rounded-none md:shadow-none md:transition-none ${
          collapsed ? "md:w-[4.5rem]" : ""
        } ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Versión contraída (solo md+): columna angosta con íconos y tooltips. */}
        <div className={`hidden min-h-0 flex-1 flex-col items-center ${collapsed ? "md:flex" : ""}`}>
          <div className="flex w-full shrink-0 flex-col items-center gap-2 border-b border-border py-3">
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Expandir barra lateral"
              title="Expandir barra lateral"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            >
              <SidebarIcon name="chevrons-right" className="h-5 w-5" />
            </button>
            <div
              title={`${displayName} · ${username}`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2"
            >
              <SidebarIcon name="user" className="h-5 w-5" />
            </div>
          </div>

          <nav className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-2 py-2">
            {primaryLinks.map((item) => (
              <RailLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
            {groups.map((group, index) => (
              <div
                key={group.id}
                className={`flex w-full flex-col items-center gap-1 ${
                  primaryLinks.length > 0 || index > 0 ? "mt-1.5 border-t border-border pt-2" : ""
                }`}
              >
                {group.items.map((item) => (
                  <RailLink key={item.href} item={item} active={isActive(item.href)} />
                ))}
              </div>
            ))}
          </nav>

          <div className="flex w-full shrink-0 flex-col items-center gap-1 border-t border-border px-2 py-2">
            {!isSuperAdmin && <RailLink item={BILLING_LINK} active={billingActive} />}
            <GoToAttendanceLink
              href={schoolSlug ? `/escuela/${schoolSlug}` : "/"}
              title="Ir a toma de asistencia"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            >
              <SidebarIcon name="clipboard-check" className="h-5 w-5" />
              <span className="sr-only">Ir a toma de asistencia</span>
            </GoToAttendanceLink>
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              title="Cerrar sesión"
              aria-label="Cerrar sesión"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-danger transition hover:bg-surface-2 disabled:opacity-50"
            >
              <SidebarIcon name="power" className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Versión completa: es la única en mobile, y en md+ cuando la barra no está contraída. */}
        <div className={`flex min-h-0 flex-1 flex-col ${collapsed ? "md:hidden" : ""}`}>
          <div className="hidden items-start justify-between px-5 pt-5 md:flex">
            <div>
              <Image
                src="/logo.png"
                alt="Pakua"
                width={1554}
                height={514}
                priority
                className="h-9 w-auto dark:invert"
              />
              <p className="mt-1 text-xs text-muted-foreground">Panel de administración</p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-label="Contraer barra lateral"
              title="Contraer barra lateral"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
            >
              <SidebarIcon name="chevrons-left" className="h-5 w-5" />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-5 md:py-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 md:h-10 md:w-10">
              <SidebarIcon name="user" className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">{displayName}</p>
              <p className="truncate text-base font-semibold">Hola, {username}</p>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 md:py-3">
            {primaryLinks.length > 0 && (
              <div className="mb-2 flex flex-col gap-2">
                {primaryLinks.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition-all duration-150 active:scale-[0.98] md:py-2.5 ${
                        active ? "bg-accent text-accent-foreground" : "bg-surface-2 hover:bg-surface-2/70"
                      }`}
                    >
                      <span
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                          active ? "bg-accent-foreground/15" : "bg-background/60"
                        }`}
                      >
                        <SidebarIcon name={item.icon} className="h-5 w-5" />
                      </span>
                      <span className="flex-1 text-sm font-semibold">{item.label}</span>
                      <SidebarIcon
                        name="chevron-right"
                        className={`h-4 w-4 ${active ? "text-accent-foreground/70" : "text-muted-foreground"}`}
                      />
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col gap-1">
              {groups.map((group) => {
                const open = openGroups.has(group.id);
                const optionCount = group.items.length;
                const collapsedBadge = group.items.reduce((sum, item) => sum + (item.badge ?? 0), 0);
                return (
                  <div key={group.id}>
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={open}
                      aria-controls={`nav-group-${group.id}`}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-surface-2 md:py-2.5"
                    >
                      <SidebarIcon name={group.icon} className="h-6 w-6 shrink-0" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">{group.label}</span>
                        <span className="block text-xs text-muted-foreground">
                          {optionCount === 1 ? "1 opción disponible" : `${optionCount} opciones disponibles`}
                        </span>
                      </span>
                      {!open && collapsedBadge > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold text-white">
                          {collapsedBadge}
                        </span>
                      )}
                      <SidebarIcon
                        name={open ? "chevron-up" : "chevron-down"}
                        className="h-4 w-4 shrink-0 text-muted-foreground"
                      />
                    </button>

                    <div
                      id={`nav-group-${group.id}`}
                      className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="min-h-0 overflow-hidden" inert={!open}>
                        <ul className="flex flex-col gap-0.5 pb-1 pl-3">
                          {group.items.map((item) => {
                            const active = isActive(item.href);
                            return (
                              <li key={item.href}>
                                <Link
                                  href={item.href}
                                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.97] md:py-2 ${
                                    active
                                      ? "bg-accent text-accent-foreground"
                                      : "text-foreground hover:bg-surface-2"
                                  }`}
                                >
                                  <SidebarIcon
                                    name={item.icon}
                                    className={`h-5 w-5 shrink-0 ${active ? "" : "text-muted-foreground"}`}
                                  />
                                  {item.label}
                                  {item.badge !== undefined && item.badge > 0 && (
                                    <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-semibold text-white">
                                      {item.badge}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </nav>

          <div className="shrink-0 border-t border-border">
            {!isSuperAdmin && (
              <Link
                href={BILLING_LINK.href}
                className={`flex items-center gap-3 border-b border-border px-5 py-4 transition md:py-3 ${
                  billingActive ? "bg-accent text-accent-foreground" : "hover:bg-surface-2"
                }`}
              >
                <SidebarIcon name={BILLING_LINK.icon} className="h-6 w-6 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{BILLING_LINK.label}</span>
                  <span
                    className={`block text-xs ${billingActive ? "text-accent-foreground/70" : "text-muted-foreground"}`}
                  >
                    Ver plan, pagos y suscripción
                  </span>
                </span>
                <SidebarIcon
                  name="chevron-right"
                  className={`h-4 w-4 shrink-0 ${billingActive ? "text-accent-foreground/70" : "text-muted-foreground"}`}
                />
              </Link>
            )}

            <GoToAttendanceLink
              href={schoolSlug ? `/escuela/${schoolSlug}` : "/"}
              className="flex flex-col items-center gap-1 border-b border-border px-5 py-3 text-xs text-muted-foreground transition hover:bg-surface-2 hover:text-foreground md:py-2"
            >
              <SidebarIcon name="clipboard-check" className="h-6 w-6" />
              Ir a toma de asistencia
            </GoToAttendanceLink>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 px-5 py-4 text-sm font-medium text-danger transition hover:bg-surface-2 disabled:opacity-50 md:py-3"
            >
              <SidebarIcon name="power" className="h-5 w-5 shrink-0" />
              Cerrar sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
