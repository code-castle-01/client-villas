import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AdaptiveUIContext } from "../adaptive/context";
import { buildResources } from "../app/resources";
import { DashboardPage } from "./dashboard";

const renderDashboard = (
  resources = buildResources({
    isAdminApp: false,
    isViewer: false,
  }),
) =>
  render(
    <MemoryRouter>
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
        <DashboardPage resources={resources} />
      </AdaptiveUIContext.Provider>
    </MemoryRouter>,
  );

describe("DashboardPage", () => {
  it("only shows resources allowed for a viewer profile", () => {
    renderDashboard(
      buildResources({
        isAdminApp: false,
        isViewer: true,
      }),
    );

    expect(screen.getByText("Asignaciones")).toBeInTheDocument();
    expect(screen.getByText("Conferencias")).toBeInTheDocument();
    expect(screen.queryByText("Pastoreo")).not.toBeInTheDocument();
    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
    expect(screen.queryByText("Disponible en desktop")).not.toBeInTheDocument();
  });

  it("separates desktop-only sections from mobile-ready sections", () => {
    renderDashboard();

    expect(screen.getByText("Listo para celular")).toBeInTheDocument();
    expect(screen.getByText("Disponible en desktop")).toBeInTheDocument();
    expect(screen.getByText("Pastoreo")).toBeInTheDocument();
    expect(screen.getAllByText("Abrir en desktop").length).toBeGreaterThan(0);
  });
});
