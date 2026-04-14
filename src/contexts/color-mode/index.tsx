import { RefineThemes } from "@refinedev/antd";
import { ConfigProvider, theme } from "antd";
import { type PropsWithChildren, createContext, useEffect, useState } from "react";
import ES from "antd/locale/es_ES";

type ColorModeContextType = {
  mode: string;
  setMode: (mode: string) => void;
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

  const systemPreference = isSystemPreferenceDark ? "dark" : "light";
  const [mode, setMode] = useState(colorModeFromLocalStorage || systemPreference);

  useEffect(() => {
    window.localStorage.setItem("colorMode", mode);
  }, [mode]);

  const setColorMode = () => {
    if (mode === "light") {
      setMode("dark");
    } else {
      setMode("light");
    }
  };

  const { darkAlgorithm, defaultAlgorithm } = theme;

  return (
    <ColorModeContext.Provider
      value={{
        setMode: setColorMode,
        mode,
      }}>
      <ConfigProvider
        theme={{
          ...RefineThemes.Blue,
          algorithm: mode === "light" ? defaultAlgorithm : darkAlgorithm,
          components: {
            Button: {
              // Aquí puedes ajustar propiedades específicas del botón
              // Por ejemplo:
              colorPrimary: "#16a34a", // color azul de Tailwind
              algorithm: true, // habilita el algoritmo de tema para este componente
            },
            // Puedes añadir más componentes aquí
          },
        }}
        locale={ES}>
        {children}
      </ConfigProvider>
    </ColorModeContext.Provider>
  );
};
