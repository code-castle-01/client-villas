import { useEffect, useState } from "react";
import { Select } from "antd";
import { getCollection } from "../api/client";

interface SelectSiervosProps {
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

const isLeadershipMember = (member: Member) => {
  const nombramientos = member.nombramientos ?? [];

  if (member.genero && member.genero !== "hombre") {
    return false;
  }

  if (nombramientos.includes("anciano")) {
    return true;
  }

  if (
    nombramientos.includes("siervo_ministerial") ||
    nombramientos.includes("siervo")
  ) {
    return true;
  }

  return (member.roles ?? []).includes("siervo");
};

const getBucket = (member: Member) => {
  const nombramientos = member.nombramientos ?? [];

  if (nombramientos.includes("anciano")) {
    return "anciano";
  }

  return "siervo_ministerial";
};

function SelectSiervos({
  value,
  onChange,
  placeholder = "Selecciona un hermano",
}: SelectSiervosProps) {
  const [options, setOptions] = useState<GroupedOptions>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);

      try {
        const miembros = await getCollection<Member>("miembros", {
          populate: ["usuario"],
          "pagination[pageSize]": 1000,
        });

        const groups: Record<"anciano" | "siervo_ministerial", MemberOption[]> = {
          anciano: [],
          siervo_ministerial: [],
        };

        miembros
          .filter(isLeadershipMember)
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

        const groupedOptions: GroupedOptions = [
          { label: "Ancianos", options: groups.anciano },
          { label: "Siervo Ministerial", options: groups.siervo_ministerial },
        ]
          .map((group) => ({
            ...group,
            options: [...group.options].sort((a, b) =>
              a.label.localeCompare(b.label, "es")
            ),
          }))
          .filter((group) => group.options.length > 0);

        if (mounted) {
          setOptions(groupedOptions);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, []);

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

export default SelectSiervos;
