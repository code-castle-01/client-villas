import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Login } from "./login";

const loginMock = vi.hoisted(() => vi.fn());
const installPromptMock = vi.hoisted(() => ({
  canInstall: true,
  promptInstall: vi.fn(async () => true),
}));

vi.mock("@refinedev/core", () => ({
  useLogin: () => ({
    mutate: loginMock,
  }),
}));

vi.mock("../adaptive/useAdaptiveUI", () => ({
  useAdaptiveUI: () => ({
    isStandalone: false,
    resolvedMode: "mobile",
  }),
}));

vi.mock("../pwa/usePwaInstallPrompt", () => ({
  usePwaInstallPrompt: () => installPromptMock,
}));

describe("Login mobile", () => {
  beforeEach(() => {
    installPromptMock.canInstall = true;
    installPromptMock.promptInstall.mockClear();
    loginMock.mockClear();
  });

  it("shows the JW mark and actionable install CTA", async () => {
    render(<Login />);

    expect(screen.getByText("JW")).toBeInTheDocument();
    expect(screen.getByText("Instala la app")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Instalar"));

    await waitFor(() => {
      expect(installPromptMock.promptInstall).toHaveBeenCalledTimes(1);
    });
  });
});
