import { useEffect, useState } from "react";
import { Select } from "antd";
import { getAllCollection } from "../api/client";

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

type Member = {
  id: number;
  nombre: string;
  genero?: string;
  roles?: string[];
  nombramientos?: string[];
  usuario?:
    | { id?: number; username?: string; email?: string }
    | { data?: { id?: number; attributes?: { username?: string; email?: string } } };
};

const getLinkedUserLabel = (member: Member) => {
  const nestedUsername = (member.usuario as any)?.data?.attributes?.username;
  const nestedEmail = (member.usuario as any)?.data?.attributes?.email;
  const username = (member.usuario as any)?.username ?? nestedUsername;
  const email = (member.usuario as any)?.email ?? nestedEmail;
  return username || email || "";
};

const getBucket = (member: Member) => {
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

const fetchGroupedOptions = async (): Promise<GroupedOptions> => {
  const miembros = await getAllCollection<Member>("miembros", {
    populate: ["usuario"],
    "pagination[pageSize]": 1000,
  });

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
      const linkedUser = getLinkedUserLabel(member);
      const label = linkedUser ? `${name} · ${linkedUser}` : name;

      groups[getBucket(member)].push({
        value: member.id,
        label,
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
  const [options, setOptions] = useState<GroupedOptions>([]);
  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      try {
        const groupedOptions = await fetchGroupedOptions();

        if (active) {
          setOptions(groupedOptions);
        }
      } catch (error) {
        console.error("No se pudieron cargar los hermanos disponibles.", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [reloadTick]);

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
      onOpenChange={(open) => {
        if (open) {
          setReloadTick((current) => current + 1);
        }
      }}
      onChange={handleSelectChange}
    />
  );
}

export default SelectVarones;
