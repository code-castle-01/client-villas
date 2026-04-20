import {
  buildResources,
  isKnownResourcePath,
  isMobileRouteReady,
} from "./resources";

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

  it("exposes organigrama as a routed mobile-ready resource", () => {
    expect(isKnownResourcePath("/organigrama")).toBe(true);
    expect(isMobileRouteReady("/organigrama", resources)).toBe(true);
  });

  it("recognizes protected routes even when a role cannot access them", () => {
    const viewerResources = buildResources({
      isAdminApp: false,
      isViewer: true,
    });

    expect(isKnownResourcePath("/usuarios")).toBe(true);
    expect(isMobileRouteReady("/usuarios", viewerResources)).toBe(false);
  });

  it("lets admin-app inspect admin routes from mobile", () => {
    const adminResources = buildResources({
      isAdminApp: true,
      isViewer: false,
    });

    expect(isMobileRouteReady("/grupos", adminResources)).toBe(true);
    expect(isMobileRouteReady("/usuarios", adminResources)).toBe(true);
  });
});
