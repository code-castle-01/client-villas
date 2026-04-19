import { Authenticated, Refine, type AuthProvider } from "@refinedev/core";
import { DevtoolsPanel, DevtoolsProvider } from "@refinedev/devtools";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import { ErrorComponent, useNotificationProvider } from "@refinedev/antd";
import "@refinedev/antd/dist/reset.css";
import nestjsxCrudDataProvider from "@refinedev/nestjsx-crud";
import routerBindings, {
  CatchAllNavigate,
  DocumentTitleHandler,
  NavigateToResource,
  UnsavedChangesNotifier,
} from "@refinedev/react-router";
import { App as AntdApp, Spin } from "antd";
import { isAxiosError } from "axios";
import { Suspense, useEffect, useMemo, useState } from "react";
import { BrowserRouter, Outlet, Route, Routes } from "react-router";
import { AdaptiveUIProvider } from "./adaptive/context";
import { useAdaptiveUI } from "./adaptive/useAdaptiveUI";
import { lazyNamed } from "./app/lazyNamed";
import { buildResources, type AppResource } from "./app/resources";
import { api } from "./api/client";
import { ColorModeContextProvider } from "./contexts/color-mode";
import { DirectoryContextProvider } from "./contexts/directory";
import { appName } from "./config/env";
import { DesktopAppShell } from "./shells/DesktopAppShell";
import { MobileAppShell } from "./shells/MobileAppShell";
import "./index.css";

type AuthIdentity = {
  id: number | string;
  role?: {
    type?: string;
  };
  [key: string]: unknown;
};

const DashboardPage = lazyNamed(() => import("./pages/dashboard"), "DashboardPage");
const MisAsignacionesPage = lazyNamed(
  () => import("./pages/mis-asignaciones"),
  "MisAsignacionesPage",
);
const RevisitasPage = lazyNamed(() => import("./pages/revisitas"), "RevisitasPage");
const MiembrosList = lazyNamed(() => import("./pages/pastoreo"), "MiembrosList");
const ConferenciasTable = lazyNamed(
  () => import("./pages/conferencias"),
  "ConferenciasTable",
);
const ReunionesTable = lazyNamed(() => import("./pages/reuniones"), "ReunionesTable");
const MeetingAssignmentUI = lazyNamed(
  () => import("./pages/escuela"),
  "MeetingAssignmentUI",
);
const ScheduleTable = lazyNamed(() => import("./pages/mecanicas"), "ScheduleTable");
const TerritoriosTable = lazyNamed(
  () => import("./pages/territorio"),
  "TerritoriosTable",
);
const MeetingInstructionsForm = lazyNamed(
  () => import("./pages/presidencia"),
  "MeetingInstructionsForm",
);
const GruposMiembrosList = lazyNamed(
  () => import("./pages/transporte"),
  "GruposMiembrosList",
);
const GruposAdminPage = lazyNamed(() => import("./pages/grupos"), "GruposAdminPage");
const UsuariosList = lazyNamed(() => import("./pages/usuarios"), "UsuariosList");
const NombramientosPorGrupo = lazyNamed(
  () => import("./pages/nombramientos"),
  "NombramientosPorGrupo",
);
const Login = lazyNamed(() => import("./pages/login"), "Login");
const MigracionPage = lazyNamed(() => import("./pages/migracion"), "MigracionPage");

const AUTH_STORAGE_EVENT = "auth-storage-changed";

const RouteLoader = () => (
  <div
    style={{
      minHeight: "40vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Spin size="large" />
  </div>
);

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

const AdaptiveAuthenticatedShell: React.FC<{
  resources: AppResource[];
}> = ({ resources }) => {
  const { resolvedMode } = useAdaptiveUI();

  if (resolvedMode === "mobile") {
    return (
      <MobileAppShell resources={resources}>
        <Outlet />
      </MobileAppShell>
    );
  }

  return <DesktopAppShell />;
};

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

  const roleType = authUser?.role?.type;
  const isAdminApp = roleType === "admin-app";
  const isViewer = roleType === "viewer";
  const resources = useMemo(
    () =>
      buildResources({
        isAdminApp,
        isViewer,
      }),
    [isAdminApp, isViewer],
  );

  return (
    <BrowserRouter>
      <RefineKbarProvider>
        <ColorModeContextProvider>
          <AdaptiveUIProvider roleType={roleType}>
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
                    <Suspense fallback={<RouteLoader />}>
                      <Routes>
                        <Route
                          element={
                            <Authenticated
                              key="authenticated-inner"
                              fallback={<CatchAllNavigate to="/login" />}
                            >
                              <AdaptiveAuthenticatedShell resources={resources} />
                            </Authenticated>
                          }
                        >
                          <Route index element={<DashboardPage />} />
                          <Route path="/mis-asignaciones" element={<MisAsignacionesPage />} />
                          <Route path="/pastoreo" element={<MiembrosList />} />
                          <Route path="/revisitas" element={<RevisitasPage />} />
                          <Route path="/conferencias" element={<ConferenciasTable />} />
                          <Route path="/reuniones" element={<ReunionesTable />} />
                          <Route path="/escuela" element={<MeetingAssignmentUI />} />
                          <Route path="/mecanicas" element={<ScheduleTable />} />
                          <Route path="/territorio" element={<TerritoriosTable />} />
                          <Route path="/presidencia" element={<MeetingInstructionsForm />} />
                          <Route path="/transporte" element={<GruposMiembrosList />} />
                          <Route path="/grupos" element={<GruposAdminPage />} />
                          <Route path="/usuarios" element={<UsuariosList />} />
                          <Route path="/nombramientos" element={<NombramientosPorGrupo />} />
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
                    </Suspense>

                    <RefineKbar />
                    <UnsavedChangesNotifier />
                    <DocumentTitleHandler
                      handler={({ autoGeneratedTitle }) => {
                        if (!autoGeneratedTitle || autoGeneratedTitle === "Refine") {
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
          </AdaptiveUIProvider>
        </ColorModeContextProvider>
      </RefineKbarProvider>
    </BrowserRouter>
  );
}

export default App;
