import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import {
  fetchGroupDirectory,
  type DirectoryGroup,
  type DirectoryMember,
} from "../../api/groupDirectory";

type DirectoryContextValue = {
  grupos: DirectoryGroup[];
  miembros: DirectoryMember[];
  loading: boolean;
  loaded: boolean;
  refreshDirectory: () => Promise<void>;
};

const DirectoryContext = createContext<DirectoryContextValue | undefined>(
  undefined,
);

type DirectoryContextProviderProps = PropsWithChildren<{
  enabled?: boolean;
}>;

export const DirectoryContextProvider: React.FC<
  DirectoryContextProviderProps
> = ({ children, enabled = true }) => {
  const [grupos, setGrupos] = useState<DirectoryGroup[]>([]);
  const [miembros, setMiembros] = useState<DirectoryMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refreshDirectory = async () => {
    if (!enabled) {
      setGrupos([]);
      setMiembros([]);
      setLoaded(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const directory = await fetchGroupDirectory();
      setGrupos(directory.grupos);
      setMiembros(directory.miembros);
      setLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!enabled) {
      setGrupos([]);
      setMiembros([]);
      setLoaded(false);
      setLoading(false);
      return;
    }

    if (!loaded && !loading) {
      void refreshDirectory();
    }
  }, [enabled, loaded, loading]);

  return (
    <DirectoryContext.Provider
      value={{
        grupos,
        miembros,
        loading,
        loaded,
        refreshDirectory,
      }}
    >
      {children}
    </DirectoryContext.Provider>
  );
};

export const useDirectory = () => {
  const context = useContext(DirectoryContext);

  if (!context) {
    throw new Error("useDirectory debe usarse dentro de DirectoryContextProvider.");
  }

  return context;
};
