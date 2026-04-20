import React, { useContext, useMemo, useState } from "react";
import {
  App as AntdApp,
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { ReloadOutlined } from "@ant-design/icons";
import { ColorModeContext } from "../../contexts/color-mode";
import { useDirectory } from "../../contexts/directory";
import useMediaQuery from "../../hooks/useMediaQuery";
import "../grupos/styles.css";
import "./styles.css";

type Grupo = {
  id: number;
  nombre: string;
};

type Miembro = {
  id: number;
  nombre: string;
  nombres?: string;
  apellidos?: string;
  genero?: "hombre" | "mujer";
  nombramientos?: string[];
  usuarioEmail?: string;
  celular?: string;
  grupos: Array<{ id: number; nombre: string }>;
};

type Row = {
  key: string;
  grupoId?: number;
  grupoNombre: string;
  miembroId: number;
  miembroNombre: string;
  genero?: string;
  nombramientos: string[];
  email?: string;
  celular?: string;
};

const nombramientoLabels: Record<string, string> = {
  precursor_regular: "Precursor Regular",
  precursor_auxiliar: "Precursor Auxiliar",
  precursor_especial: "Precursor Especial",
  publicador: "Publicador",
  publicador_no_bautizado: "Publicador No Bautizado",
  anciano: "Anciano",
  siervo_ministerial: "Siervo Ministerial",
};

const nombramientoTagClass: Record<string, string> = {
  precursor_regular: "nombramientos-tag nombramientos-tag--precursor_regular",
  precursor_auxiliar: "nombramientos-tag nombramientos-tag--precursor_auxiliar",
  precursor_especial: "nombramientos-tag nombramientos-tag--precursor_especial",
  publicador: "nombramientos-tag nombramientos-tag--publicador",
  publicador_no_bautizado: "nombramientos-tag nombramientos-tag--publicador_no_bautizado",
  anciano: "nombramientos-tag nombramientos-tag--anciano",
  siervo_ministerial: "nombramientos-tag nombramientos-tag--siervo_ministerial",
};

export const NombramientosPorGrupo: React.FC = () => {
  const { mode } = useContext(ColorModeContext);
  const { notification } = AntdApp.useApp();
  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const {
    grupos: directoryGroups,
    miembros: directoryMembers,
    loading,
    refreshDirectory,
  } = useDirectory();

  const [grupoFilter, setGrupoFilter] = useState<number | undefined>();
  const [nombramientoFilter, setNombramientoFilter] = useState<string | undefined>();
  const [generoFilter, setGeneroFilter] = useState<string | undefined>();
  const [searchText, setSearchText] = useState("");

  const notifyError = (title: string, description?: string) => {
    notification.error({
      message: title,
      description,
      placement: "topRight",
    });
  };

  const grupos = useMemo<Grupo[]>(
    () =>
      directoryGroups.map((group) => ({
        id: group.id,
        nombre: group.nombre,
      })),
    [directoryGroups]
  );

  const miembros = useMemo<Miembro[]>(
    () =>
      directoryMembers.map((member) => ({
        id: member.id,
        nombre: member.nombre,
        nombres: member.nombres,
        apellidos: member.apellidos,
        genero: member.genero,
        nombramientos: member.nombramientos ?? [],
        usuarioEmail: member.usuarioEmail,
        celular: member.celular,
        grupos: member.grupos,
      })),
    [directoryMembers]
  );

  const handleRefresh = async () => {
    try {
      await refreshDirectory();
    } catch (error) {
      notifyError("No se pudieron cargar los datos", "Revisa el servidor o permisos.");
    }
  };

  const rows = useMemo<Row[]>(() => {
    const allRows: Row[] = [];
    miembros.forEach((miembro) => {
      if (!miembro.grupos.length) {
        allRows.push({
          key: `${miembro.id}-none`,
          grupoId: undefined,
          grupoNombre: "Sin grupo",
          miembroId: miembro.id,
          miembroNombre:
            miembro.nombre ||
            `${miembro.nombres ?? ""} ${miembro.apellidos ?? ""}`.trim(),
          genero: miembro.genero,
          nombramientos: miembro.nombramientos ?? [],
          email: miembro.usuarioEmail,
          celular: miembro.celular,
        });
        return;
      }

      miembro.grupos.forEach((grupo) => {
        allRows.push({
          key: `${miembro.id}-${grupo.id}`,
          grupoId: grupo.id,
          grupoNombre: grupo.nombre || "Sin grupo",
          miembroId: miembro.id,
          miembroNombre:
            miembro.nombre ||
            `${miembro.nombres ?? ""} ${miembro.apellidos ?? ""}`.trim(),
          genero: miembro.genero,
          nombramientos: miembro.nombramientos ?? [],
          email: miembro.usuarioEmail,
          celular: miembro.celular,
        });
      });
    });

    return allRows;
  }, [miembros]);

  const filteredRows = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return rows.filter((row) => {
      if (grupoFilter && row.grupoId !== grupoFilter) return false;
      if (generoFilter && row.genero !== generoFilter) return false;
      if (
        nombramientoFilter &&
        !row.nombramientos?.includes(nombramientoFilter)
      ) {
        return false;
      }
      if (search) {
        const haystack = `${row.miembroNombre} ${row.email ?? ""} ${row.grupoNombre}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      return true;
    });
  }, [rows, grupoFilter, generoFilter, nombramientoFilter, searchText]);

  const columns: ColumnsType<Row> = [
    {
      title: "Grupo",
      dataIndex: "grupoNombre",
      key: "grupoNombre",
      sorter: (a, b) => a.grupoNombre.localeCompare(b.grupoNombre),
      render: (value) => <span className="grupos-table__name">{value}</span>,
    },
    {
      title: "Miembro",
      dataIndex: "miembroNombre",
      key: "miembroNombre",
      sorter: (a, b) => a.miembroNombre.localeCompare(b.miembroNombre),
      render: (value) => <span className="grupos-table__name">{value}</span>,
    },
    {
      title: "Género",
      dataIndex: "genero",
      key: "genero",
      filters: [
        { text: "Hombre", value: "hombre" },
        { text: "Mujer", value: "mujer" },
      ],
      onFilter: (value, record) => record.genero === value,
      render: (value) => (value ? value === "mujer" ? "Mujer" : "Hombre" : "N/A"),
    },
    {
      title: "Nombramientos",
      dataIndex: "nombramientos",
      key: "nombramientos",
      filters: Object.entries(nombramientoLabels).map(([value, label]) => ({
        text: label,
        value,
      })),
      onFilter: (value, record) =>
        record.nombramientos?.includes(String(value)),
      render: (values: string[]) =>
        values?.length ? (
          <Space wrap>
            {values.map((value) => (
              <Tag
                key={value}
                className={nombramientoTagClass[value] ?? "nombramientos-tag"}
              >
                {nombramientoLabels[value] ?? value}
              </Tag>
            ))}
          </Space>
        ) : (
          "N/A"
        ),
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
      sorter: (a, b) => (a.email ?? "").localeCompare(b.email ?? ""),
    },
    {
      title: "Celular",
      dataIndex: "celular",
      key: "celular",
      sorter: (a, b) => (a.celular ?? "").localeCompare(b.celular ?? ""),
    },
  ];

  return (
    <section
      className={`grupos-page nombramientos-page ${
        mode === "dark"
          ? "grupos-page--dark nombramientos-page--dark"
          : "grupos-page--light nombramientos-page--light"
      }`}
    >
      <div className="grupos-page__header">
        <div>
          <Typography.Title level={3} className="grupos-page__title">
            Nombramientos por Grupo
          </Typography.Title>
          <Typography.Text className="grupos-page__subtitle">
            Filtra y analiza miembros con el mismo directorio centralizado de grupos.
          </Typography.Text>
        </div>
        <Button
          className="grupos-btn grupos-btn--ghost"
          icon={<ReloadOutlined />}
          onClick={handleRefresh}
          loading={loading}
        >
          Recargar
        </Button>
      </div>

      <Card className="grupos-card nombramientos-card" style={{ marginBottom: 16 }}>
        <div className="nombramientos-filters">
          <Select
            allowClear
            placeholder="Filtrar por grupo"
            value={grupoFilter}
            onChange={(value) => setGrupoFilter(value)}
            options={grupos.map((g) => ({ value: g.id, label: g.nombre }))}
          />
          <Select
            allowClear
            placeholder="Filtrar por nombramiento"
            value={nombramientoFilter}
            onChange={(value) => setNombramientoFilter(value)}
            options={Object.entries(nombramientoLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />
          <Select
            allowClear
            placeholder="Filtrar por género"
            value={generoFilter}
            onChange={(value) => setGeneroFilter(value)}
            options={[
              { value: "hombre", label: "Hombre" },
              { value: "mujer", label: "Mujer" },
            ]}
          />
          <Input
            placeholder="Buscar por miembro, email o grupo"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </div>
      </Card>

      <Card className="grupos-card nombramientos-card" bordered={false}>
        {isSmallScreen ? (
          filteredRows.length ? (
            <div className="nombramientos-mobile-list">
              {filteredRows.map((row) => (
                <Card
                  key={row.key}
                  className="nombramientos-card nombramientos-mobile-card"
                  bordered={false}
                >
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                    <div>
                      <Typography.Title level={5} style={{ margin: 0 }}>
                        {row.miembroNombre}
                      </Typography.Title>
                      <Typography.Text className="nombramientos-page__subtitle">
                        {row.grupoNombre}
                      </Typography.Text>
                    </div>

                    <div className="nombramientos-mobile-card__grid">
                      <div>
                        <Typography.Text strong>Genero</Typography.Text>
                        <div>{row.genero === "mujer" ? "Mujer" : row.genero === "hombre" ? "Hombre" : "N/A"}</div>
                      </div>
                      <div>
                        <Typography.Text strong>Email</Typography.Text>
                        <div>{row.email || "N/A"}</div>
                      </div>
                      <div>
                        <Typography.Text strong>Celular</Typography.Text>
                        <div>{row.celular || "N/A"}</div>
                      </div>
                    </div>

                    <div>
                      <Typography.Text strong>Nombramientos</Typography.Text>
                      <div style={{ marginTop: 8 }}>
                        {row.nombramientos?.length ? (
                          <Space wrap>
                            {row.nombramientos.map((value) => (
                              <Tag
                                key={value}
                                className={
                                  nombramientoTagClass[value] ?? "nombramientos-tag"
                                }
                              >
                                {nombramientoLabels[value] ?? value}
                              </Tag>
                            ))}
                          </Space>
                        ) : (
                          "N/A"
                        )}
                      </div>
                    </div>
                  </Space>
                </Card>
              ))}
            </div>
          ) : (
            <Typography.Text type="secondary">
              No hay miembros que coincidan con los filtros.
            </Typography.Text>
          )
        ) : (
          <Table<Row>
            className="grupos-table nombramientos-table"
            rowKey="key"
            columns={columns}
            dataSource={filteredRows}
            loading={loading}
            pagination={{ pageSize: 40, showSizeChanger: false }}
          />
        )}
      </Card>
    </section>
  );
};
