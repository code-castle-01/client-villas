import { buildResources, isMobileRouteReady } from "./resources";

describe("app resources", () => {
  const resources = buildResources({
    isAdminApp: false,
    isViewer: false,
  });

  it("keeps mecanicas available for native mobile", () => {
    expect(isMobileRouteReady("/mecanicas", resources)).toBe(true);
  });

  it("keeps territorio available for native mobile", () => {
    expect(isMobileRouteReady("/territorio", resources)).toBe(true);
  });
});
