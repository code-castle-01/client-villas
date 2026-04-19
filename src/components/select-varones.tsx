import { useMemo } from "react";
import { Select } from "antd";
import { useDirectory } from "../contexts/directory";
import type { DirectoryMember } from "../api/groupDirectory";

interface SelectVaronesProps {
  value?: number;
  onChange?: (value?: number) => void;
  placeholder?: string;
}

type MemberOption = {
  value: number;
  label: string;
};

type GroupedOptions = Array<{
  label: string;
  options: MemberOption[];
}>;

const getBucket = (member: DirectoryMember) => {
  const nombramientos = member.nombramientos ?? [];

  if (nombramientos.includes("anciano")) {
    return "anciano";
  }

  if (
    nombramientos.includes("siervo_ministerial") ||
    nombramientos.includes("siervo")
  ) {
    return "siervo_ministerial";
  }

  return "publicador";
};

const fetchGroupedOptions = (miembros: DirectoryMember[]): GroupedOptions => {
  const groups: Record<"anciano" | "siervo_ministerial" | "publicador", MemberOption[]> =
    {
      anciano: [],
      siervo_ministerial: [],
      publicador: [],
    };

  miembros
    .filter((member) => {
      if (member.genero) {
        return member.genero === "hombre";
      }

      return (member.roles ?? []).includes("varon");
    })
    .forEach((member) => {
      const name = member.nombre?.trim();
      if (!name) return;

      groups[getBucket(member)].push({
        value: member.id,
        label: name,
      });
    });

  return [
    { label: "Ancianos", options: groups.anciano },
    { label: "Siervo Ministerial", options: groups.siervo_ministerial },
    { label: "Publicadores", options: groups.publicador },
  ]
    .map((group) => ({
      ...group,
      options: [...group.options].sort((a, b) =>
        a.label.localeCompare(b.label, "es")
      ),
    }))
    .filter((group) => group.options.length > 0);
};

function SelectVarones({
  value,
  onChange,
  placeholder = "Selecciona un hermano",
}: SelectVaronesProps) {
  const { miembros, loading } = useDirectory();
  const options = useMemo(() => fetchGroupedOptions(miembros), [miembros]);

  const handleSelectChange = (nextValue?: number) => {
    onChange?.(nextValue);
  };

  return (
    <Select
      allowClear
      showSearch
      loading={loading}
      style={{ width: "100%" }}
      placeholder={placeholder}
      optionFilterProp="label"
      options={options}
      value={value || undefined}
      dropdownStyle={{ minWidth: 280 }}
      filterOption={(input, option) =>
        String(option?.label ?? "")
          .toLowerCase()
          .includes(input.toLowerCase())
      }
      onChange={handleSelectChange}
    />
  );
}

export default SelectVarones;
