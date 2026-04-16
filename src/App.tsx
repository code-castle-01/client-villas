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
import { useEffect, useState } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { isAxiosError } from "axios";
import { Header } from "./components/header";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { DirectoryContextProvider } from "./contexts/directory";
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

type AuthIdentity = {
  id: number | string;
  role?: {
    type?: string;
  };
  [key: string]: unknown;
};

const AUTH_STORAGE_EVENT = "auth-storage-changed";

const emitAuthStorageChanged = () => {
  window.dispatchEvent(new Event(AUTH_STORAGE_EVENT));
};

const clearAuthStorage = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  emitAuthStorageChanged();
};

const storeAuthUser = (user: Record<string, unknown>) => {
  localStorage.setItem("user", JSON.stringify(user));
  emitAuthStorageChanged();
};

const readStoredUser = (): AuthIdentity | null => {
  const cached = localStorage.getItem("user");
  if (!cached) return null;

  try {
    const parsed = JSON.parse(cached);
    return isValidIdentity(parsed) ? (parsed as AuthIdentity) : null;
  } catch {
    return null;
  }
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
  const [authUser, setAuthUser] = useState<AuthIdentity | null>(() =>
    readStoredUser(),
  );

  useEffect(() => {
    const syncAuthUser = () => {
      setAuthUser(readStoredUser());
    };

    window.addEventListener(AUTH_STORAGE_EVENT, syncAuthUser);
    window.addEventListener("storage", syncAuthUser);
    return () => {
      window.removeEventListener(AUTH_STORAGE_EVENT, syncAuthUser);
      window.removeEventListener("storage", syncAuthUser);
    };
  }, []);

  const authProvider: AuthProvider = {
    login: async (values: { identifier: string; password: string }) => {
      clearAuthStorage();
      setAuthUser(null);

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

        storeAuthUser(me);
        setAuthUser(me as AuthIdentity);

        return {
          success: true,
          redirectTo: "/",
        };
      } catch (error) {
        clearAuthStorage();
        setAuthUser(null);

        return {
          success: false,
          error: getAuthError(error),
        };
      }
    },
    logout: async () => {
      clearAuthStorage();
      setAuthUser(null);
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
        setAuthUser(null);

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
        const { data } = await api.get("/users/me", {
          params: { populate: "role" },
        });
        if (isValidIdentity(data)) {
          storeAuthUser(data);
          setAuthUser(data as AuthIdentity);
        }
        return { authenticated: true };
      } catch {
        clearAuthStorage();
        setAuthUser(null);

        return {
          authenticated: false,
          logout: true,
          redirectTo: "/login",
        };
      }
    },
    getPermissions: async () => null,
    getIdentity: async () => {
      const cachedUser = readStoredUser();
      if (cachedUser) {
        return cachedUser;
      }

      try {
        const { data } = await api.get("/users/me", {
          params: { populate: "role" },
        });

        if (!isValidIdentity(data)) {
          clearAuthStorage();
          setAuthUser(null);
          return null;
        }

        storeAuthUser(data);
        setAuthUser(data as AuthIdentity);
        return data;
      } catch {
        clearAuthStorage();
        setAuthUser(null);
        return null;
      }
    },
  };
  const isAdminApp = authUser?.role?.type === "admin-app";

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
          <DirectoryContextProvider enabled={Boolean(authUser)}>
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
          </DirectoryContextProvider>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
