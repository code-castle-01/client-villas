import React from "react";
import { act, render, screen } from "@testing-library/react";
import { AdaptiveUIProvider } from "./context";
import { useAdaptiveUI } from "./useAdaptiveUI";

const AdaptiveProbe = () => {
  const { resolvedMode, overrideMode, setOverrideMode } = useAdaptiveUI();

  return (
    <div>
      <span data-testid="resolved-mode">{resolvedMode}</span>
      <span data-testid="override-mode">{overrideMode}</span>
      <button type="button" onClick={() => setOverrideMode("desktop")}>
        desktop
      </button>
    </div>
  );
};

describe("AdaptiveUIProvider", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 390,
    });
    Object.defineProperty(window, "screen", {
      configurable: true,
      value: {
        width: 390,
        height: 844,
      },
    });
    window.matchMedia = ((query: string) => ({
      matches: query === "(pointer: coarse)",
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it("reads override mode from localStorage and updates it", () => {
    window.localStorage.setItem("uiModeOverride", "mobile");

    render(
      <AdaptiveUIProvider roleType="viewer">
        <AdaptiveProbe />
      </AdaptiveUIProvider>,
    );

    expect(screen.getByTestId("resolved-mode")).toHaveTextContent("mobile");
    expect(screen.getByTestId("override-mode")).toHaveTextContent("mobile");

    act(() => {
      screen.getByRole("button", { name: "desktop" }).click();
    });

    expect(window.localStorage.getItem("uiModeOverride")).toBe("desktop");
    expect(screen.getByTestId("resolved-mode")).toHaveTextContent("desktop");
  });
});
