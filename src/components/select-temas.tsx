import { useEffect, useState } from "react";
import { Select, Typography } from "antd";
import { getCollection } from "../api/client";

interface SelectTemasProps {
  value?: number;
  onChange?: (value: number) => void;
}

function SelectTemas({ value, onChange }: SelectTemasProps) {
  const [temas, setTemas] = useState<{ id: number; codigo: number; titulo: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const data = await getCollection<{ codigo: number; titulo: string }>(
        "temas",
        { "pagination[pageSize]": 1000, sort: "codigo:asc" }
      );
      if (mounted) setTemas(data);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectChange = (value: number) => {
    if (onChange) {
      onChange(value);
    }
  };

  return (
    <Select
      allowClear
      showSearch
      style={{ width: "100%" }}
      placeholder="Selecciona un tema"
      optionFilterProp="children"
      filterOption={(input, option) => {
        const optionValue = option?.children?.toString().toLowerCase();
        return optionValue ? optionValue.includes(input.toLowerCase()) : false;
      }}
      value={value}
      onChange={handleSelectChange}>
      {temas.map((tema) => (
        <Select.Option key={tema.id} value={tema.id}>
          <Typography.Text code>{tema.codigo}</Typography.Text>
          {tema.titulo}
        </Select.Option>
      ))}
    </Select>
  );
}

export default SelectTemas;
