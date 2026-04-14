import { useEffect, useState } from "react";
import { Select } from "antd";
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

const getMemberFullName = (member: Member) => {
  if (member.nombre?.trim()) return member.nombre.trim();
  return `${member.nombres ?? ""} ${member.apellidos ?? ""}`.trim() || "Sin nombre";
};

function SelectMiembrosCongregacion({
  value,
  onChange,
  placeholder = "Seleccione un miembro de la congregación",
}: SelectMiembrosCongregacionProps) {
  const [options, setOptions] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const miembros = await getCollection<Member>("miembros", {
          "pagination[pageSize]": 1000,
        });

        const nextOptions = miembros
          .map((member) => ({
            value: member.id,
            label: getMemberFullName(member),
          }))
          .filter((member) => member.label.trim().length > 0)
          .sort((a, b) => a.label.localeCompare(b.label, "es"));

        if (mounted) {
          setOptions(nextOptions);
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
      filterOption={(input, option) =>
        String(option?.label ?? "")
          .toLowerCase()
          .includes(input.toLowerCase())
      }
      onChange={onChange}
    />
  );
}

export default SelectMiembrosCongregacion;
