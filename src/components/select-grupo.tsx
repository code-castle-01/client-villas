import React, { useEffect, useState } from "react";
import { SmileOutlined } from "@ant-design/icons";
import { TreeSelect } from "antd";
import { getCollection } from "../api/client";

interface SelectGrupoProps {
  value?: number;
  onChange?: (value: number) => void;
}

export const SelectGrupo: React.FC<SelectGrupoProps> = ({
  value,
  onChange,
}) => {
  const [treeData, setTreeData] = useState<
    Array<{
      value: string;
      title: string;
      selectable: boolean;
      children: Array<{ value: number; title: string }>;
    }>
  >([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const grupos = await getCollection<{ nombre: string; miembros?: { data: Array<{ id: number; attributes: { nombre: string } }> } }>(
        "grupos",
        { populate: "miembros", "pagination[pageSize]": 1000 }
      );
      const mapped = grupos.map((grupo) => ({
        value: grupo.nombre,
        title: grupo.nombre,
        selectable: false,
        children:
          grupo.miembros?.data?.map((miembro) => ({
            value: miembro.id,
            title: miembro.attributes.nombre,
          })) ?? [],
      }));
      if (mounted) setTreeData(mapped);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleChange = (newValue: number) => {
    if (onChange) {
      onChange(newValue);
    }
  };

  return (
    <TreeSelect
      showSearch
      suffixIcon={<SmileOutlined />}
      style={{ width: "100%" }}
      value={value}
      dropdownStyle={{ maxHeight: 400, overflow: "auto" }}
      placeholder="Seleccione un grupo o miembro"
      allowClear
      treeDefaultExpandAll
      onChange={handleChange}
      treeData={treeData}
    />
  );
};
