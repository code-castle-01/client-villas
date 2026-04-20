import type { ReactNode } from "react";
import {
  BookOutlined,
  CalendarOutlined,
  DashboardOutlined,
  TeamOutlined,
  ToolOutlined,
  UserOutlined,
} from "@ant-design/icons";

export type MobileResourceStatus = "ready" | "planned" | "desktop-only";

export type MobileResourceMeta = {
  canDelete?: boolean;
  icon: ReactNode;
  label: string;
  mobileIcon?: ReactNode;
  mobileLabel?: string;
  mobileOrder?: number;
  mobileStatus?: MobileResourceStatus;
  mobileTab?: boolean;
  mobileTabLabel?: string;
  summary?: string;
};

export type AppResource = {
  name: string;
  list: string;
  meta: MobileResourceMeta;
};

const viewerVisibleResources = new Set([
  "dashboard",
  "mis-asignaciones",
  "Conferencias",
  "Reuniones",
  "Mecánicas",
  "Territorios",
]);

const baseResources: AppResource[] = [
  {
    name: "dashboard",
    list: "/",
    meta: {
      icon: <DashboardOutlined />,
      label: "Dashboard",
      mobileIcon: <DashboardOutlined />,
      mobileLabel: "Inicio",
      mobileOrder: 0,
      mobileStatus: "ready",
      mobileTab: true,
      summary: "Vista general de la congregación y accesos rápidos.",
    },
  },
  {
    name: "mis-asignaciones",
    list: "/mis-asignaciones",
    meta: {
      canDelete: false,
      icon: <CalendarOutlined />,
      label: "Mis Asignaciones",
      mobileIcon: <CalendarOutlined />,
      mobileLabel: "Asignaciones",
      mobileOrder: 1,
      mobileStatus: "ready",
      mobileTab: true,
      mobileTabLabel: "Agenda",
      summary: "Tu agenda y perfil personal.",
    },
  },
  {
    name: "Revisitas",
    list: "/revisitas",
    meta: {
      canDelete: false,
      icon: <BookOutlined />,
      label: "Revisitas",
      mobileLabel: "Revisitas",
      mobileStatus: "ready",
      summary: "Seguimiento de revisitas y visitas.",
    },
  },
  {
    name: "Pastoreo",
    list: "/pastoreo",
    meta: {
      canDelete: false,
      icon: <span>🐑</span>,
      label: "Pastoreo",
      mobileLabel: "Pastoreo",
      mobileStatus: "ready",
      summary: "Seguimiento pastoral y formulario S-4.",
    },
  },
  {
    name: "Conferencias",
    list: "/conferencias",
    meta: {
      canDelete: false,
      icon: <span>👔</span>,
      label: "Conferencias",
      mobileIcon: <span>👔</span>,
      mobileLabel: "Conferencias",
      mobileOrder: 2,
      mobileStatus: "ready",
      mobileTab: true,
      mobileTabLabel: "Conf.",
      summary: "Agenda pública y oradores.",
    },
  },
  {
    name: "Reuniones",
    list: "/reuniones",
    meta: {
      canDelete: false,
      icon: <span>🏠</span>,
      label: "Reuniones",
      mobileIcon: <span>🏠</span>,
      mobileLabel: "Reuniones",
      mobileOrder: 4,
      mobileStatus: "ready",
      mobileTab: true,
      summary: "Lectores, oración y envío.",
    },
  },
  {
    name: "Escuela",
    list: "/escuela",
    meta: {
      canDelete: false,
      icon: <span>📑</span>,
      label: "Escuela",
      mobileLabel: "Escuela",
      mobileStatus: "ready",
      summary: "Programa y asignaciones de la escuela.",
    },
  },
  {
    name: "Mecánicas",
    list: "/mecanicas",
    meta: {
      canDelete: false,
      icon: <ToolOutlined />,
      label: "Mecánicas",
      mobileIcon: <ToolOutlined />,
      mobileLabel: "Mecánicas",
      mobileOrder: 3,
      mobileStatus: "ready",
      mobileTab: true,
      summary: "Asignaciones operativas de la reunión.",
    },
  },
  {
    name: "Territorios",
    list: "/territorio",
    meta: {
      canDelete: false,
      icon: <span>🗺️</span>,
      label: "Territorios",
      mobileLabel: "Territorios",
      mobileStatus: "ready",
      summary: "Mapas, registros y seguimiento del territorio.",
    },
  },
  {
    name: "Presidencia",
    list: "/presidencia",
    meta: {
      canDelete: false,
      icon: <span>📄</span>,
      label: "Presidencia",
      mobileLabel: "Presidencia",
      mobileStatus: "ready",
      summary: "Discursos, preguntas y notas para presidencia.",
    },
  },
  {
    name: "Transporte",
    list: "/transporte",
    meta: {
      canDelete: false,
      icon: <span>🚙</span>,
      label: "Transporte",
      mobileLabel: "Transporte",
      mobileStatus: "ready",
      summary: "Traslados, grupos y coordinación logística.",
    },
  },
  {
    name: "Nombramientos",
    list: "/nombramientos",
    meta: {
      canDelete: false,
      icon: <TeamOutlined />,
      label: "Nombramientos",
      mobileLabel: "Nombramientos",
      mobileStatus: "ready",
      summary: "Seguimiento de nombramientos por grupo.",
    },
  },
];

const adminResources: AppResource[] = [
  {
    name: "Grupos",
    list: "/grupos",
    meta: {
      canDelete: false,
      icon: <span>🧩</span>,
      label: "Grupos",
      mobileStatus: "desktop-only",
      summary: "Administración de grupos y miembros.",
    },
  },
  {
    name: "Usuarios",
    list: "/usuarios",
    meta: {
      canDelete: false,
      icon: <UserOutlined />,
      label: "Usuarios",
      mobileStatus: "desktop-only",
      summary: "Roles, permisos y control de acceso.",
    },
  },
];

const allResources: AppResource[] = [...baseResources, ...adminResources];

export const buildResources = ({
  isAdminApp,
  isViewer,
}: {
  isAdminApp: boolean;
  isViewer: boolean;
}): AppResource[] => [
  ...baseResources.filter(
    (resource) => !isViewer || viewerVisibleResources.has(resource.name),
  ),
  ...(isAdminApp ? adminResources : []),
];

export const isKnownResourcePath = (pathname: string) =>
  Boolean(getActiveResource(pathname, allResources));

export const getActiveResource = (
  pathname: string,
  resources: AppResource[],
): AppResource | undefined =>
  resources.find((resource) => {
    if (resource.list === "/") {
      return pathname === "/";
    }

    return pathname === resource.list || pathname.startsWith(`${resource.list}/`);
  });

export const getMobileTabResources = (resources: AppResource[]) =>
  resources
    .filter((resource) => resource.meta.mobileTab && resource.meta.mobileStatus === "ready")
    .sort((a, b) => (a.meta.mobileOrder ?? 999) - (b.meta.mobileOrder ?? 999));

export const isMobileRouteReady = (pathname: string, resources: AppResource[]) => {
  if (pathname === "/login" || pathname === "/migracion") {
    return true;
  }

  return getActiveResource(pathname, resources)?.meta.mobileStatus === "ready";
};
