import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdaptiveUIContext } from "../adaptive/context";
import { buildResources } from "../app/resources";
import { ColorModeContext } from "../contexts/color-mode";
import { MobileAppShell } from "./MobileAppShell";

const installPromptMock = vi.hoisted(() => ({
  canInstall: false,
  manualInstallPlatform: null as "ios" | null,
  promptInstall: vi.fn(async () => true),
}));

const lifecycleMock = vi.hoisted(() => ({
  applyUpdate: null as null | (() => void),
  isOfflineReady: false,
  isUpdateReady: false,
  resetUpdateReady: vi.fn(),
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

const renderShell = (
  pathname: string,
  {
    child,
    isStandalone = false,
  }: {
    child?: React.ReactNode;
    isStandalone?: boolean;
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
            viewportWidth: 390,
            setOverrideMode: () => undefined,
          }}
        >
          <MobileAppShell resources={resources}>{child}</MobileAppShell>
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

  it("shows manual install guidance for iOS Safari when there is no native prompt", () => {
    installPromptMock.manualInstallPlatform = "ios";

    renderShell("/mis-asignaciones", { child: <div>contenido móvil</div> });

    expect(screen.getByText(/Añadir a pantalla de inicio/i)).toBeInTheDocument();
  });

  it("hides install banner when the app is already running standalone", () => {
    installPromptMock.canInstall = true;

    renderShell("/mis-asignaciones", {
      child: <div>contenido móvil</div>,
      isStandalone: true,
    });

    expect(screen.queryByText(/Instala la app/i)).not.toBeInTheDocument();
  });
});
