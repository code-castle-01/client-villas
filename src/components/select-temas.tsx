import { useEffect, useMemo, useState } from "react";
import { Select, Typography } from "antd";
import { api, getOptionalSingle } from "../api/client";

interface SelectTemasProps {
  value?: number;
  onChange?: (value?: number) => void;
}

type TemaOption = {
  id: number;
  codigo: number;
  titulo: string;
};

const mergeTemaOptions = (items: TemaOption[]) => {
  const uniqueItems = new Map<number, TemaOption>();

  items.forEach((item) => {
    if (!item?.id) {
      return;
    }

    uniqueItems.set(item.id, item);
  });

  return Array.from(uniqueItems.values()).sort((left, right) => {
    if (left.codigo !== right.codigo) {
      return left.codigo - right.codigo;
    }

    return left.titulo.localeCompare(right.titulo, "es");
  });
};

function SelectTemas({ value, onChange }: SelectTemasProps) {
  const [selectedTema, setSelectedTema] = useState<TemaOption | null>(null);
  const [searchResults, setSearchResults] = useState<TemaOption[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!value) {
      setSelectedTema(null);
      return;
    }

    if (selectedTema?.id === value) {
      return;
    }

    let mounted = true;

    const loadSelectedTema = async () => {
      const tema = await getOptionalSingle<{ codigo: number; titulo: string }>(
        `temas/${value}`
      );

      if (!mounted || !tema) {
        return;
      }

      setSelectedTema({
        id: tema.id,
        codigo: tema.codigo,
        titulo: tema.titulo,
      });
    };

    void loadSelectedTema();

    return () => {
      mounted = false;
    };
  }, [selectedTema?.id, value]);

  useEffect(() => {
    const trimmedSearchTerm = searchTerm.trim();

    if (!trimmedSearchTerm) {
      setLoading(false);
      setSearchResults([]);
      return;
    }

    let mounted = true;
    const timeoutId = window.setTimeout(async () => {
      setLoading(true);

      try {
        const { data } = await api.get<{ data: TemaOption[] }>("/temas/search", {
          params: {
            q: trimmedSearchTerm,
            limit: 20,
          },
        });

        if (!mounted) {
          return;
        }

        setSearchResults(Array.isArray(data.data) ? data.data : []);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  const options = useMemo(
    () => mergeTemaOptions([...(selectedTema ? [selectedTema] : []), ...searchResults]),
    [searchResults, selectedTema]
  );

  const selectOptions = useMemo(
    () =>
      options.map((tema) => ({
        value: tema.id,
        label: (
          <>
            <Typography.Text code>{tema.codigo}</Typography.Text> {tema.titulo}
          </>
        ),
      })),
    [options]
  );

  const handleSelectChange = (nextValue?: number) => {
    const nextSelectedTema =
      options.find((tema) => tema.id === nextValue) ?? null;

    setSelectedTema(nextSelectedTema);
    setSearchTerm("");
    setSearchResults([]);
    onChange?.(nextValue);
  };

  return (
    <Select
      allowClear
      showSearch
      style={{ width: "100%" }}
      placeholder="Escribe código o tema"
      filterOption={false}
      optionFilterProp="label"
      options={selectOptions}
      loading={loading}
      value={value}
      notFoundContent={
        loading
          ? "Buscando temas..."
          : searchTerm.trim()
            ? "No se encontraron temas"
            : "Escribe código o título para buscar"
      }
      onSearch={setSearchTerm}
      onChange={handleSelectChange}
      onDropdownVisibleChange={(open) => {
        if (!open) {
          setSearchTerm("");
          setSearchResults([]);
        }
      }}
    />
  );
}

export default SelectTemas;
