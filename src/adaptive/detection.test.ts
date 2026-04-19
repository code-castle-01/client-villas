import {
  resolveAdaptiveMode,
  writeAdaptiveOverrideMode,
  readAdaptiveOverrideMode,
} from "./detection";

describe("adaptive detection", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("prefers mobile when viewport is small and device is touch-like", () => {
    expect(
      resolveAdaptiveMode({
        overrideMode: "auto",
        roleType: "viewer",
        isStandalone: false,
        isTouchLike: true,
        viewportWidth: 390,
      }),
    ).toBe("mobile");
  });

  it("stays on desktop for admin-app in auto mode", () => {
    expect(
      resolveAdaptiveMode({
        overrideMode: "auto",
        roleType: "admin-app",
        isStandalone: true,
        isTouchLike: true,
        viewportWidth: 390,
      }),
    ).toBe("desktop");
  });

  it("honors explicit override", () => {
    expect(
      resolveAdaptiveMode({
        overrideMode: "desktop",
        roleType: "viewer",
        isStandalone: true,
        isTouchLike: true,
        viewportWidth: 390,
      }),
    ).toBe("desktop");
  });

  it("persists override mode in localStorage", () => {
    writeAdaptiveOverrideMode("mobile");
    expect(readAdaptiveOverrideMode()).toBe("mobile");
  });
});
