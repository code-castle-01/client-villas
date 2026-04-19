import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AdaptiveUIContext } from "../adaptive/context";
import { buildResources } from "../app/resources";
import { ColorModeContext } from "../contexts/color-mode";
import { MobileAppShell } from "./MobileAppShell";

const resources = buildResources({
  isAdminApp: false,
  isViewer: false,
});

const renderShell = (pathname: string, child?: React.ReactNode) =>
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
            isStandalone: false,
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
  it("renders supported mobile route content", () => {
    renderShell("/mis-asignaciones", <div>contenido móvil</div>);

    expect(screen.getByText("contenido móvil")).toBeInTheDocument();
  });

  it("shows desktop handoff for unsupported routes", () => {
    renderShell("/usuarios", <div>no debería verse</div>);

    expect(screen.getByText(/Usar vista de escritorio/i)).toBeInTheDocument();
    expect(screen.queryByText("no debería verse")).not.toBeInTheDocument();
  });
});
