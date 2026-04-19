import { ConfigProvider, theme } from "antd";
import {
  type PropsWithChildren,
  createContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ES from "antd/locale/es_ES";

export type AppColorMode = "light" | "dark";

export const APP_THEME_TOKENS = {
  colorPrimary: "#7E2C6F",
  colorInfo: "#7E2C6F",
  colorSuccess: "#566FA3",
  colorWarning: "#F39C12",
  colorError: "#E74C3C",
  colorTextBase: "#1D1D1D",
  colorPrimaryAccent: "#4B2B76",
} as const;

type ColorModeContextType = {
  mode: AppColorMode;
  setMode: (mode: AppColorMode) => void;
  toggleMode: () => void;
};

export const ColorModeContext = createContext<ColorModeContextType>(
  {} as ColorModeContextType
);

export const ColorModeContextProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const colorModeFromLocalStorage = localStorage.getItem("colorMode");
  const isSystemPreferenceDark = window?.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;

  const systemPreference: AppColorMode = isSystemPreferenceDark ? "dark" : "light";
  const [mode, setMode] = useState<AppColorMode>(
    colorModeFromLocalStorage === "dark" || colorModeFromLocalStorage === "light"
      ? colorModeFromLocalStorage
      : systemPreference,
  );

  useEffect(() => {
    window.localStorage.setItem("colorMode", mode);
    document.documentElement.dataset.colorMode = mode;

    const themeColor =
      mode === "light" ? APP_THEME_TOKENS.colorPrimary : APP_THEME_TOKENS.colorPrimaryAccent;
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');

    if (themeColorMeta) {
      themeColorMeta.setAttribute("content", themeColor);
    }
  }, [mode]);

  const toggleMode = () => {
    setMode((current) => (current === "light" ? "dark" : "light"));
  };

  const { darkAlgorithm, defaultAlgorithm } = theme;
  const antdTheme = useMemo(
    () => ({
      algorithm: mode === "light" ? defaultAlgorithm : darkAlgorithm,
      token: {
        colorPrimary: APP_THEME_TOKENS.colorPrimary,
        colorInfo: APP_THEME_TOKENS.colorInfo,
        colorSuccess: APP_THEME_TOKENS.colorSuccess,
        colorWarning: APP_THEME_TOKENS.colorWarning,
        colorError: APP_THEME_TOKENS.colorError,
        colorTextBase:
          mode === "light" ? APP_THEME_TOKENS.colorTextBase : "#F4EFF7",
        borderRadius: 18,
        borderRadiusLG: 24,
        borderRadiusSM: 14,
        fontFamily: '"Manrope", "Segoe UI", sans-serif',
      },
      components: {
        Button: {
          colorPrimary: APP_THEME_TOKENS.colorPrimary,
          algorithm: true,
          borderRadius: 999,
        },
        Card: {
          borderRadiusLG: 24,
        },
        Layout: {
          bodyBg: "var(--app-background)",
          headerBg: "var(--app-surface)",
          siderBg: "var(--app-surface-elevated)",
        },
        Input: {
          activeBorderColor: APP_THEME_TOKENS.colorPrimary,
          hoverBorderColor: APP_THEME_TOKENS.colorPrimary,
        },
        Menu: {
          itemSelectedColor: APP_THEME_TOKENS.colorPrimary,
          itemSelectedBg: "rgba(126, 44, 111, 0.12)",
        },
      },
    }),
    [darkAlgorithm, defaultAlgorithm, mode],
  );

  return (
    <ColorModeContext.Provider
      value={{
        setMode,
        mode,
        toggleMode,
      }}>
      <ConfigProvider
        theme={antdTheme}
        locale={ES}>
        {children}
      </ConfigProvider>
    </ColorModeContext.Provider>
  );
};
