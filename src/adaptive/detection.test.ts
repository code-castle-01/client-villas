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
        screenShortSide: 390,
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
        screenShortSide: 390,
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
        screenShortSide: 390,
        viewportWidth: 390,
      }),
    ).toBe("desktop");
  });

  it("keeps mobile on phones even when desktop site inflates the viewport", () => {
    expect(
      resolveAdaptiveMode({
        overrideMode: "auto",
        roleType: "authenticated",
        isStandalone: false,
        isTouchLike: true,
        screenShortSide: 412,
        viewportWidth: 980,
      }),
    ).toBe("mobile");
  });

  it("persists override mode in localStorage", () => {
    writeAdaptiveOverrideMode("mobile");
    expect(readAdaptiveOverrideMode()).toBe("mobile");
  });
});
