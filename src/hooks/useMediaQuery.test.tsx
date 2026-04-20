import { render, screen } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import useMediaQuery from "./useMediaQuery";

const Probe = ({ query }: { query: string }) => {
  const matches = useMediaQuery(query);
  return <span>{matches ? "yes" : "no"}</span>;
};

describe("useMediaQuery", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    Object.defineProperty(window, "screen", {
      configurable: true,
      value: {
        width: 412,
        height: 915,
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

  it("falls back to real handset width when desktop site inflates viewport media queries", () => {
    render(<Probe query="(max-width: 768px)" />);
    expect(screen.getByText("yes")).toBeInTheDocument();
  });
});
