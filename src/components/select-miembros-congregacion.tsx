import { useEffect, useMemo, useState } from "react";
import { Empty, Select, Spin } from "antd";
import { getCollection } from "../api/client";

interface SelectMiembrosCongregacionProps {
  value?: number;
  onChange?: (value?: number) => void;
  placeholder?: string;
}

type Member = {
  id: number;
  nombre: string;
  nombres?: string;
  apellidos?: string;
};

type MemberOption = {
  value: number;
  label: string;
};

const SEARCH_PAGE_SIZE = 20;

const getMemberFullName = (member: Member) => {
  if (member.nombre?.trim()) return member.nombre.trim();
  return `${member.nombres ?? ""} ${member.apellidos ?? ""}`.trim() || "Sin nombre";
};

const memberFields = {
  "fields[0]": "nombre",
  "fields[1]": "nombres",
  "fields[2]": "apellidos",
} as const;

const toOption = (member: Member): MemberOption => ({
  value: member.id,
  label: getMemberFullName(member),
});

const mergeOptions = (current: MemberOption[], incoming: MemberOption[]) =>
  Array.from(
    new Map(
      [...current, ...incoming]
        .filter((option) => option.label.trim().length > 0)
        .map((option) => [option.value, option]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label, "es"));

const fetchMembersBySearch = async (search: string) => {
  const term = search.trim();
  if (term.length < 2) {
    return [] as MemberOption[];
  }

  const miembros = await getCollection<Member>("miembros", {
    ...memberFields,
    sort: "nombre:asc",
    "pagination[pageSize]": SEARCH_PAGE_SIZE,
    "filters[$or][0][nombre][$containsi]": term,
    "filters[$or][1][nombres][$containsi]": term,
    "filters[$or][2][apellidos][$containsi]": term,
  });

  return miembros.map(toOption);
};

const fetchMemberById = async (id: number) => {
  const miembros = await getCollection<Member>("miembros", {
    ...memberFields,
    "pagination[pageSize]": 1,
    "filters[id][$eq]": id,
  });

  return miembros[0] ? toOption(miembros[0]) : null;
};

function SelectMiembrosCongregacion({
  value,
  onChange,
  placeholder = "Escriba para buscar un miembro",
}: SelectMiembrosCongregacionProps) {
  const [options, setOptions] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!value) {
      return;
    }

    if (options.some((option) => option.value === value)) {
      return;
    }

    let active = true;

    const loadSelectedMember = async () => {
      try {
        const selectedOption = await fetchMemberById(value);
        if (active && selectedOption) {
          setOptions((current) => mergeOptions(current, [selectedOption]));
        }
      } catch (error) {
        console.error("No se pudo cargar el miembro seleccionado.", error);
      }
    };

    void loadSelectedMember();

    return () => {
      active = false;
    };
  }, [options, value]);

  useEffect(() => {
    const term = search.trim();

    if (term.length < 2) {
      setLoading(false);
      setOptions((current) =>
        value ? current.filter((option) => option.value === value) : [],
      );
      return;
    }

    let active = true;
    setLoading(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const searchedOptions = await fetchMembersBySearch(term);
        if (active) {
          setOptions((current) =>
            mergeOptions(
              value
                ? current.filter((option) => option.value === value)
                : [],
              searchedOptions,
            ),
          );
        }
      } catch (error) {
        console.error("No se pudieron buscar miembros de la congregación.", error);
        if (active) {
          setOptions((current) =>
            value ? current.filter((option) => option.value === value) : [],
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [search, value]);

  const notFoundContent = useMemo(() => {
    if (loading) {
      return <Spin size="small" />;
    }

    if (search.trim().length < 2) {
      return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Escribe al menos 2 letras" />;
    }

    return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No hay datos" />;
  }, [loading, search]);

  return (
    <Select
      allowClear
      showSearch
      loading={loading}
      style={{ width: "100%" }}
      placeholder={placeholder}
      options={options}
      value={value || undefined}
      filterOption={false}
      notFoundContent={notFoundContent}
      onSearch={setSearch}
      onChange={onChange}
    />
  );
}

export default SelectMiembrosCongregacion;
