import { AuthBindings, Authenticated, Refine } from "@refinedev/core";
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
import { Header } from "./components/header";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { api } from "./api/client";

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

function App() {
  const API_URL = "https://api.nestjsx-crud.refine.dev";
  const dataProvider = nestjsxCrudDataProvider(API_URL);

  const authProvider: AuthBindings = {
    login: async (values: { identifier: string; password: string }) => {
      try {
        const { data } = await api.post("/auth/local", {
          identifier: values.identifier,
          password: values.password,
        });

        localStorage.setItem("token", data.jwt);
        const { data: me } = await api.get("/users/me", {
          params: { populate: "role" },
        });
        localStorage.setItem("user", JSON.stringify(me));

        return {
          success: true,
          redirectTo: "/",
        };
      } catch (error) {
        return {
          success: false,
          error,
        };
      }
    },
    logout: async () => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return {
        success: true,
        redirectTo: "/login",
      };
    },
    onError: async (error) => {
      console.error(error);
      return { error };
    },
    check: async () => {
      const token = localStorage.getItem("token");
      if (!token) {
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
      if (cached) return JSON.parse(cached);

      try {
        const { data } = await api.get("/users/me", {
          params: { populate: "role" },
        });
        localStorage.setItem("user", JSON.stringify(data));
        return data;
      } catch {
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
                  useNewQueryKeys: true,
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
                <DocumentTitleHandler />
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
