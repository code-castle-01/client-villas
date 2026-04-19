import type { ReactNode } from "react";
import {
  BookOutlined,
  CalendarOutlined,
  DashboardOutlined,
  TeamOutlined,
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
    },
  },
  {
    name: "Revisitas",
    list: "/revisitas",
    meta: {
      canDelete: false,
      icon: <BookOutlined />,
      label: "Revisitas",
      mobileStatus: "planned",
    },
  },
  {
    name: "Pastoreo",
    list: "/pastoreo",
    meta: {
      canDelete: false,
      icon: <span>🐑</span>,
      label: "Pastoreo",
      mobileStatus: "planned",
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
      mobileOrder: 3,
      mobileStatus: "ready",
      mobileTab: true,
    },
  },
  {
    name: "Escuela",
    list: "/escuela",
    meta: {
      canDelete: false,
      icon: <span>📑</span>,
      label: "Escuela",
      mobileStatus: "planned",
    },
  },
  {
    name: "Mecánicas",
    list: "/mecanicas",
    meta: {
      canDelete: false,
      icon: <span>🧰</span>,
      label: "Mecánicas",
      mobileLabel: "Mecánicas",
      mobileStatus: "ready",
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
    },
  },
  {
    name: "Presidencia",
    list: "/presidencia",
    meta: {
      canDelete: false,
      icon: <span>📄</span>,
      label: "Presidencia",
      mobileStatus: "planned",
    },
  },
  {
    name: "Transporte",
    list: "/transporte",
    meta: {
      canDelete: false,
      icon: <span>🚙</span>,
      label: "Transporte",
      mobileStatus: "planned",
    },
  },
  {
    name: "Nombramientos",
    list: "/nombramientos",
    meta: {
      canDelete: false,
      icon: <TeamOutlined />,
      label: "Nombramientos",
      mobileStatus: "planned",
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
    },
  },
];

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
