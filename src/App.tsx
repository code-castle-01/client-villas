import { Authenticated, Refine, type AuthProvider } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";

import {
  ErrorComponent,
  ThemedLayout,
  ThemedSider,
  useNotificationProvider,
} from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";

import nestjsxCrudDataProvider from "@refinedev/nestjsx-crud";
import routerBindings, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { App as AntdApp, Typography } from "antd";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { isAxiosError } from "axios";
import { Header } from "./components/header";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { api } from "./api/client";
import { appName } from "./config/env";

import { GruposMiembrosList } from "./pages/transporte";
import { Login } from "./pages/login";
import { MiembrosList } from "./pages/pastoreo";
import { ConferenciasTable } from "./pages/conferencias";
import { TerritoriosTable } from "./pages/territorio";
import { MeetingInstructionsForm } from "./pages/presidencia";

import "./index.css";
import {
  CalendarOutlined,
  DashboardOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { DashboardPage } from "./pages/dashboard";
import { ReunionesTable } from "./pages/reuniones";
import { MeetingAssignmentUI } from "./pages/escuela";
import { ScheduleTable } from "./pages/mecanicas";
import { MigracionPage } from "./pages/migracion";
import { UsuariosList } from "./pages/usuarios";
import { GruposAdminPage } from "./pages/grupos";
import { NombramientosPorGrupo } from "./pages/nombramientos";
import { MisAsignacionesPage } from "./pages/mis-asignaciones";

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
};

const isStoredTokenValid = (token: string | null): token is string =>
  Boolean(token && token !== "undefined" && token !== "null");

const isValidAuthResponse = (value: unknown): value is { jwt: string } =>
  typeof value === "object" &&
  value !== null &&
  "jwt" in value &&
  typeof value.jwt === "string" &&
  value.jwt.trim().length > 0;

const isValidIdentity = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" &&
  value !== null &&
  !Array.isArray(value) &&
  "id" in value;

const getAuthError = (error: unknown) => {
  if (isAxiosError(error)) {
    const message = error.response?.data?.error?.message;

    if (typeof message === "string" && message.trim().length > 0) {
      return new Error(message);
    }
  }

  return error instanceof Error
    ? error
    : new Error("No se pudo iniciar sesión.");
};

const documentTitleBase = appName || "Las Villas";

function App() {
  const API_URL = "https://api.nestjsx-crud.refine.dev";
  const dataProvider = nestjsxCrudDataProvider(API_URL);

  const authProvider: AuthProvider = {
    login: async (values: { identifier: string; password: string }) => {
      clearAuthStorage();

      try {
        const { data } = await api.post("/auth/local", {
          identifier: values.identifier,
          password: values.password,
        });

        if (!isValidAuthResponse(data)) {
          throw new Error("La respuesta del servidor no contiene un token válido.");
        }

        localStorage.setItem("token", data.jwt);
        const { data: me } = await api.get("/users/me", {
          params: { populate: "role" },
        });

        if (!isValidIdentity(me)) {
          throw new Error("No se pudo cargar el usuario autenticado.");
        }

        localStorage.setItem("user", JSON.stringify(me));

        return {
          success: true,
          redirectTo: "/",
        };
      } catch (error) {
        clearAuthStorage();

        return {
          success: false,
          error: getAuthError(error),
        };
      }
    },
    logout: async () => {
      clearAuthStorage();
      return {
        success: true,
        redirectTo: "/login",
      };
    },
    onError: async (error: unknown) => {
      console.error(error);
      return {
        error:
          error instanceof Error
            ? error
            : new Error("Ocurrió un error inesperado."),
      };
    },
    check: async () => {
      const token = localStorage.getItem("token");
      if (!isStoredTokenValid(token)) {
        clearAuthStorage();

        return {
          authenticated: false,
          error: {
            message: "Token not found",
            name: "Token not found",
          },
          logout: true,
          redirectTo: "/login",
        };
      }

      try {
        await api.get("/users/me", { params: { populate: "role" } });
        return { authenticated: true };
      } catch {
        clearAuthStorage();

        return {
          authenticated: false,
          logout: true,
          redirectTo: "/login",
        };
      }
    },
    getPermissions: async () => null,
    getIdentity: async () => {
      const cached = localStorage.getItem("user");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);

          if (isValidIdentity(parsed)) {
            return parsed;
          }
        } catch {
          clearAuthStorage();
        }
      }

      try {
        const { data } = await api.get("/users/me", {
          params: { populate: "role" },
        });

        if (!isValidIdentity(data)) {
          clearAuthStorage();
          return null;
        }

        localStorage.setItem("user", JSON.stringify(data));
        return data;
      } catch {
        clearAuthStorage();
        return null;
      }
    },
  };

  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();
  const isAdminApp = currentUser?.role?.type === "admin-app";

  const resources = [
    {
      name: "dashboard",
      list: "/",
      meta: {
        label: "Dashboard",
        icon: <DashboardOutlined />,
      },
    },
    {
      name: "mis-asignaciones",
      list: "/mis-asignaciones",
      meta: {
        canDelete: false,
        icon: <CalendarOutlined />,
        label: "Mis Asignaciones",
      },
    },
    {
      name: "Pastoreo",
      list: "/pastoreo",
      meta: {
        canDelete: false,
        icon: <span>🐑</span>,
        label: "Pastoreo",
      },
    },
    {
      name: "Conferencias",
      list: "/conferencias",
      meta: { canDelete: false, icon: <span>👔</span> },
    },
    {
      name: "Reuniones",
      list: "/reuniones",
      meta: { canDelete: false, icon: <span>🏠</span> },
    },
    {
      name: "Escuela",
      list: "/escuela",
      meta: { canDelete: false, icon: <span>📑</span> },
    },
    {
      name: "Mecánicas",
      list: "/mecanicas",
      meta: { canDelete: false, icon: <span>🧰</span> },
    },
    {
      name: "Territorios",
      list: "/territorio",
      meta: { canDelete: false, icon: <span>🗺️</span> },
    },
    {
      name: "Presidencia",
      list: "/presidencia",
      meta: { canDelete: false, icon: <span>📄</span> },
    },
    {
      name: "Transporte",
      list: "/transporte",
      meta: { canDelete: false, icon: <span>🚙</span> },
    },
    {
      name: "Nombramientos",
      list: "/nombramientos",
      meta: { canDelete: false, icon: <TeamOutlined /> },
    },
    ...(isAdminApp
      ? [
          {
            name: "Grupos",
            list: "/grupos",
            meta: { canDelete: false, icon: <span>🧩</span> },
          },
          {
            name: "Usuarios",
            list: "/usuarios",
            meta: { canDelete: false, icon: <UserOutlined /> },
          },
        ]
      : []),
  ];

  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AntdApp>
            <DevtoolsProvider>
              <Refine
                dataProvider={dataProvider}
                notificationProvider={useNotificationProvider}
                routerProvider={routerBindings}
                authProvider={authProvider}
                resources={resources}
                options={{
                  syncWithLocation: true,
                  warnWhenUnsavedChanges: true,
                  projectId: "zTrlv4-BzCRqD-cdj2mG",
                }}
              >
                <Routes>
                  <Route
                    element={
                      <Authenticated
                        key="authenticated-inner"
                        fallback={<CatchAllNavigate to="/login" />}
                      >
                        <ThemedLayout
                          Header={Header}
                          Sider={(props) => (
                            <ThemedSider
                              {...props}
                              fixed
                              Title={() => (
                                <Typography.Title type="success" level={4}>
                                  CONGREGACIÓN
                                </Typography.Title>
                              )}
                            />
                          )}
                        >
                          <Outlet />
                        </ThemedLayout>
                      </Authenticated>
                    }
                  >
                    <Route index element={<DashboardPage />} />
                    <Route
                      index
                      element={<NavigateToResource resource="transporte" />}
                    />
                    <Route path="/mis-asignaciones">
                      <Route index element={<MisAsignacionesPage />} />
                    </Route>

                    <Route path="/pastoreo">
                      <Route index element={<MiembrosList />} />
                    </Route>
                    <Route path="/conferencias">
                      <Route index element={<ConferenciasTable />} />
                    </Route>
                    <Route path="/reuniones">
                      <Route index element={<ReunionesTable />} />
                    </Route>
                    <Route path="/escuela">
                      <Route index element={<MeetingAssignmentUI />} />
                    </Route>
                    <Route path="/mecanicas">
                      <Route index element={<ScheduleTable />} />
                    </Route>
                    <Route path="/territorio">
                      <Route index element={<TerritoriosTable />} />
                    </Route>
                    <Route path="/presidencia">
                      <Route index element={<MeetingInstructionsForm />} />
                    </Route>
                    <Route path="/transporte">
                      <Route index element={<GruposMiembrosList />} />
                    </Route>
                    <Route path="/grupos">
                      <Route index element={<GruposAdminPage />} />
                    </Route>
                    <Route path="/usuarios">
                      <Route index element={<UsuariosList />} />
                    </Route>
                    <Route path="/nombramientos">
                      <Route index element={<NombramientosPorGrupo />} />
                    </Route>
                    <Route path="*" element={<ErrorComponent />} />
                  </Route>
                  <Route
                    element={
                      <Authenticated key="authenticated-outer" fallback={<Outlet />}>
                        <NavigateToResource />
                      </Authenticated>
                    }
                  >
                    <Route path="/login" element={<Login />} />
                  </Route>
                  <Route path="/migracion" element={<MigracionPage />} />
                </Routes>

                <RefineKbar />
                <UnsavedChangesNotifier />
                <DocumentTitleHandler
                  handler={({ autoGeneratedTitle }) => {
                    if (
                      !autoGeneratedTitle ||
                      autoGeneratedTitle === "Refine"
                    ) {
                      return documentTitleBase;
                    }

                    return autoGeneratedTitle.replace(
                      /\s\|\sRefine$/,
                      ` | ${documentTitleBase}`,
                    );
                  }}
                />
              </Refine>
              <DevtoolsPanel />
            </DevtoolsProvider>
          </AntdApp>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
