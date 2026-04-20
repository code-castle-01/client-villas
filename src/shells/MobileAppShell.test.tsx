import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdaptiveUIContext } from "../adaptive/context";
import { buildResources } from "../app/resources";
import { ColorModeContext } from "../contexts/color-mode";
import { MobileAppShell } from "./MobileAppShell";

const installPromptMock = vi.hoisted(() => ({
  canInstall: false,
  manualInstallPlatform: null as "ios" | "android-manual" | null,
  promptInstall: vi.fn(async () => true),
}));

const lifecycleMock = vi.hoisted(() => ({
  applyUpdate: null as null | (() => void),
  isOfflineReady: false,
  isUpdateReady: false,
  resetUpdateReady: vi.fn(),
}));

const logoutMock = vi.hoisted(() => vi.fn());

vi.mock("@refinedev/core", () => ({
  useLogout: () => ({
    mutate: logoutMock,
  }),
}));

vi.mock("../pwa/usePwaInstallPrompt", () => ({
  usePwaInstallPrompt: () => installPromptMock,
}));

vi.mock("../pwa/usePwaLifecycle", () => ({
  usePwaLifecycle: () => lifecycleMock,
}));

const resources = buildResources({
  isAdminApp: false,
  isViewer: false,
});
const adminResources = buildResources({
  isAdminApp: true,
  isViewer: false,
});

const renderShell = (
  pathname: string,
  {
    child,
    isStandalone = false,
    shellResources = resources,
  }: {
    child?: React.ReactNode;
    isStandalone?: boolean;
    shellResources?: ReturnType<typeof buildResources>;
  } = {},
) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <ColorModeContext.Provider
        value={{
          mode: "light",
          setMode: () => undefined,
          toggleMode: () => undefined,
        }}
      >
        <AdaptiveUIContext.Provider
          value={{
            resolvedMode: "mobile",
            overrideMode: "auto",
            isStandalone,
            isTouchLike: true,
            screenShortSide: 390,
            viewportWidth: 390,
            setOverrideMode: () => undefined,
          }}
        >
          <MobileAppShell resources={shellResources}>{child}</MobileAppShell>
        </AdaptiveUIContext.Provider>
      </ColorModeContext.Provider>
    </MemoryRouter>,
  );

describe("MobileAppShell", () => {
  beforeEach(() => {
    installPromptMock.canInstall = false;
    installPromptMock.manualInstallPlatform = null;
    installPromptMock.promptInstall.mockClear();
    lifecycleMock.applyUpdate = null;
    lifecycleMock.isOfflineReady = false;
    lifecycleMock.isUpdateReady = false;
    lifecycleMock.resetUpdateReady.mockClear();
  });

  it("renders supported mobile route content", () => {
    renderShell("/mis-asignaciones", { child: <div>contenido móvil</div> });

    expect(screen.getByText("contenido móvil")).toBeInTheDocument();
    expect(screen.getByLabelText(/Abrir ajustes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Instala la app/i)).not.toBeInTheDocument();
  });

  it("shows desktop handoff for unsupported routes", () => {
    renderShell("/usuarios", { child: <div>no debería verse</div> });

    expect(screen.getByText(/Usar vista de escritorio/i)).toBeInTheDocument();
    expect(screen.queryByText("no debería verse")).not.toBeInTheDocument();
  });

  it("shows install banner when the app can be installed and is not standalone", () => {
    installPromptMock.canInstall = true;

    renderShell("/mis-asignaciones", { child: <div>contenido móvil</div> });

    expect(screen.getByText(/Instala la app/i)).toBeInTheDocument();
    expect(screen.getAllByText("Instalar").length).toBeGreaterThan(0);
  });

  it("does not show non-actionable iOS install guidance without a native prompt", () => {
    installPromptMock.manualInstallPlatform = "ios";

    renderShell("/mis-asignaciones", { child: <div>contenido móvil</div> });

    expect(screen.queryByText(/Añadir a pantalla de inicio/i)).not.toBeInTheDocument();
  });

  it("does not show non-actionable Android guidance without a native prompt", () => {
    installPromptMock.manualInstallPlatform = "android-manual";

    renderShell("/mis-asignaciones", { child: <div>contenido móvil</div> });

    expect(screen.queryByText(/Instalar aplicación/i)).not.toBeInTheDocument();
  });

  it("hides install banner when the app is already running standalone", () => {
    installPromptMock.canInstall = true;

    renderShell("/mis-asignaciones", {
      child: <div>contenido móvil</div>,
      isStandalone: true,
    });

    expect(screen.queryByText(/Instala la app/i)).not.toBeInTheDocument();
  });

  it("includes Mecánicas in the mobile bottom menu", () => {
    renderShell("/", { child: <div>inicio</div> });

    expect(screen.getByText("Mecánicas")).toBeInTheDocument();
  });

  it("offers logout from the settings panel", () => {
    renderShell("/", { child: <div>inicio</div> });

    fireEvent.click(screen.getByLabelText(/Abrir ajustes/i));
    fireEvent.click(screen.getByText(/Cerrar sesión/i));

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it("renders admin-app mobile routes for inspection", () => {
    renderShell("/usuarios", {
      child: <div>usuarios móvil</div>,
      shellResources: adminResources,
    });

    expect(screen.getByText("usuarios móvil")).toBeInTheDocument();
  });
});
