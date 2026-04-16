import { useEffect, useState } from "react";
import { Select } from "antd";
import { getAllCollection } from "../api/client";

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

const fetchMemberOptions = async (): Promise<MemberOption[]> => {
  const miembros = await getAllCollection<Member>("miembros", {
    "pagination[pageSize]": 1000,
  });

  return miembros
    .map((member) => ({
      value: member.id,
      label: getMemberFullName(member),
    }))
    .filter((member) => member.label.trim().length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
};

function SelectMiembrosCongregacion({
  value,
  onChange,
  placeholder = "Seleccione un miembro de la congregación",
}: SelectMiembrosCongregacionProps) {
  const [options, setOptions] = useState<MemberOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      try {
        const nextOptions = await fetchMemberOptions();

        if (active) {
          setOptions(nextOptions);
        }
      } catch (error) {
        console.error("No se pudieron cargar los miembros de la congregación.", error);
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
      onOpenChange={(open) => {
        if (open) {
          setReloadTick((current) => current + 1);
        }
      }}
      onChange={onChange}
    />
  );
}

export default SelectMiembrosCongregacion;
