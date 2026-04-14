import {
  ClockCircleOutlined,
  DollarCircleFilled,
  EditOutlined,
  EyeFilled,
  FilePdfTwoTone,
  SearchOutlined,
} from "@ant-design/icons";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { List } from "@refinedev/antd";
import {
  Button,
  Card,
  DatePicker,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
} from "antd";
import { toPng } from "html-to-image";
import moment from "moment";
import React, { useEffect, useState } from "react";
import {
  createEntry,
  deleteEntry,
  getCollection,
  getSingle,
  updateEntry,
  updateSingle,
} from "../../api/client";
import PDFDocument from "../../components/PDFDocument";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import useMediaQuery from "../../hooks/useMediaQuery";

interface Grupo {
  id: number;
  nombre: string;
  miembros: { id: number; nombre: string }[];
}

interface Pago {
  id: number;
  miembroId: number;
  miembro: string;
  monto: number;
  fecha: string;
  grupoId?: number;
}

const parsePago = (p: any): Pago => {
  const miembroId =
    p?.miembro?.data?.id ??
    p?.miembro?.id ??
    (typeof p?.miembro === "number" ? p.miembro : 0);
  const miembroNombre =
    p?.miembro?.data?.attributes?.nombre ??
    p?.miembro?.nombre ??
    p?.miembroNombre ??
    "Sin miembro";
  const grupoId =
    p?.grupo?.data?.id ??
    p?.grupo?.id ??
    (typeof p?.grupo === "number" ? p.grupo : undefined);
  const monto = Number(p?.monto ?? p?.attributes?.monto ?? 0) || 0;
  const fecha = p?.fecha ?? p?.attributes?.fecha ?? "";
  return {
    id: p.id,
    miembroId,
    miembro: miembroNombre,
    grupoId,
    monto,
    fecha,
  };
};

export const GruposMiembrosList: React.FC = () => {
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [visibleRegistrarPago, setVisibleRegistrarPago] = useState(false);
  const [visibleVerDetalles, setVisibleVerDetalles] = useState(false);
  /* Gestión de miembros movida fuera de Transporte; esta escena solo maneja pagos */
  const [miembroSeleccionado, setMiembroSeleccionado] = useState<{
    id: number;
    nombre: string;
  } | null>(null);
  const [grupoSeleccionadoParaEdicion, setGrupoSeleccionadoParaEdicion] =
    useState<number | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [monto, setMonto] = useState<number | undefined>(undefined);
  const [fecha, setFecha] = useState<string | undefined>(undefined);
  const [pagoEditando, setPagoEditando] = useState<Pago | null>(null);
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<number | null>(
    null,
  );
  const [estadoPagoFiltro, setEstadoPagoFiltro] = useState<string | null>(null);
  const [busquedaNombre, setBusquedaNombre] = useState<string>("");
  const [totalAPagar, setTotalAPagar] = useState<number>(30000);
  const [editingTotal, setEditingTotal] = useState(false);
  const [form] = Form.useForm();

  const isSmallScreen = useMediaQuery("(max-width: 768px)");
  const isAdminApp = useIsAdminApp();
  const isReadOnly = !isAdminApp;

  useEffect(() => {
    let mounted = true;

    const fetchPagos = async () => {
      const pagosData = await getCollection<{
        miembro?: { data: { id: number; attributes: { nombre: string } } };
        grupo?: { data: { id: number } };
        monto: number;
        fecha: string;
      }>("pagos", {
        populate: ["miembro", "grupo"],
        "pagination[pageSize]": 1000,
      });
      return pagosData.map(parsePago);
    };

    const buildGruposFromMiembros = (
      gruposData: Array<{ id: number; nombre: string }>,
      miembrosData: any[],
    ) => {
      return gruposData.map((grupo) => ({
        id: grupo.id,
        nombre: grupo.nombre,
        miembros:
          miembrosData
            .filter((m) => {
              const gruposRaw = (m.grupos as any)?.data ?? m.grupos ?? [];
              const grupoIds = gruposRaw.map((g: any) => g.id ?? g);
              return grupoIds.includes(grupo.id);
            })
            .map((m) => ({ id: m.id, nombre: m.nombre })) ?? [],
      }));
    };

    const load = async () => {
      const [gruposData, miembrosData, pagosMapped, config] = await Promise.all(
        [
          getCollection<{ nombre: string }>("grupos", {
            "pagination[pageSize]": 1000,
          }),
          getCollection<any>("miembros", {
            populate: ["grupos"],
            "pagination[pageSize]": 1000,
          }),
          fetchPagos(),
          getSingle<{ totalAPagar: number }>("transporte-config"),
        ],
      );

      if (!mounted) return;
      const mappedGrupos = buildGruposFromMiembros(gruposData, miembrosData);
      setGrupos(mappedGrupos);
      setPagos(pagosMapped);
      if (config?.totalAPagar) setTotalAPagar(config.totalAPagar);
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshGroups = async () => {
    const gruposData = await getCollection<{ nombre: string }>("grupos", {
      "pagination[pageSize]": 1000,
    });
    const miembrosData = await getCollection<any>("miembros", {
      populate: ["grupos"],
      "pagination[pageSize]": 1000,
    });
    const mappedGrupos = gruposData.map((grupo) => ({
      id: grupo.id,
      nombre: grupo.nombre,
      miembros:
        miembrosData
          .filter((m) => {
            const gruposRaw = (m.grupos as any)?.data ?? m.grupos ?? [];
            const grupoIds = gruposRaw.map((g: any) => g.id ?? g);
            return grupoIds.includes(grupo.id);
          })
          .map((m) => ({ id: m.id, nombre: m.nombre })) ?? [],
    }));
    setGrupos(mappedGrupos);
  };

  const handleTotalChange = async (value: number | null) => {
    if (isReadOnly) {
      setEditingTotal(false);
      return;
    }
    if (value !== null) {
      setTotalAPagar(value);
      await updateSingle("transporte-config", { totalAPagar: value });
    }
    setEditingTotal(false);
  };

  const handleRegistrarPago = async () => {
    if (isReadOnly) return;
    if (!monto || !fecha) {
      return;
    }
    if (miembroSeleccionado && monto && fecha) {
      const payload = {
        miembro: miembroSeleccionado.id,
        grupo: grupoSeleccionadoParaEdicion ?? undefined,
        monto,
        fecha,
      };

      if (pagoEditando) {
        await updateEntry("pagos", pagoEditando.id, payload);
      } else {
        await createEntry("pagos", payload);
      }

      const pagosData = await getCollection<{
        miembro?: { data: { id: number; attributes: { nombre: string } } };
        grupo?: { data: { id: number } };
        monto: number;
        fecha: string;
      }>("pagos", {
        populate: ["miembro", "grupo"],
        "pagination[pageSize]": 1000,
      });
      setPagos(pagosData.map(parsePago));

      setVisibleRegistrarPago(false);
      setMonto(undefined);
      setFecha(undefined);
      setPagoEditando(null);
    }
  };

  const handleVerDetalles = (miembro: { id: number; nombre: string }) => {
    setMiembroSeleccionado({ id: miembro.id, nombre: miembro.nombre });
    setVisibleVerDetalles(true);
  };

  const handleCloseModal = () => {
    setVisibleVerDetalles(false);
    setVisibleRegistrarPago(false);
    setPagoEditando(null);
    setMiembroSeleccionado(null);
    setGrupoSeleccionadoParaEdicion(null);
    form.resetFields();
  };

  const pagosMiembro = (miembroId: number) =>
    pagos.filter((pago) => pago.miembroId === miembroId);

  const handleEditPago = (pago: Pago) => {
    if (isReadOnly) return;
    setPagoEditando(pago);
    setMonto(pago.monto);
    setFecha(pago.fecha);
    setGrupoSeleccionadoParaEdicion(pago.grupoId ?? null);
    setVisibleRegistrarPago(true);
  };

  const handleDeletePago = async (pago: Pago) => {
    if (isReadOnly) return;
    await deleteEntry("pagos", pago.id);
    const pagosData = await getCollection<{
      miembro?: { data: { id: number; attributes: { nombre: string } } };
      grupo?: { data: { id: number } };
      monto: number;
      fecha: string;
    }>("pagos", {
      populate: ["miembro", "grupo"],
      "pagination[pageSize]": 1000,
    });
    setPagos(pagosData.map(parsePago));
  };

  // Gestión de miembros ahora se realiza en la escena de Grupos; Transporte solo procesa pagos.

  const expandedRowRender = (record: Grupo) => {
    const totalPagosGrupo = record.miembros.reduce((acc, miembro) => {
      const pagosDelMiembro = pagosMiembro(miembro.id);
      const totalPagos = pagosDelMiembro.reduce(
        (accPago, pago) => accPago + pago.monto,
        0,
      );
      return acc + totalPagos;
    }, 0);

    const pagosMiembros = record.miembros.map((miembro) => ({
      miembro: miembro.nombre,
      pagos: pagosMiembro(miembro.id),
    }));

    const filteredMiembros = record.miembros.filter((miembro) => {
      const pagosDelMiembro = pagosMiembro(miembro.id);
      const totalPagos = pagosDelMiembro.reduce(
        (acc, pago) => acc + pago.monto,
        0,
      );
      const completo = totalPagos >= totalAPagar;

      const cumpleEstadoPago =
        !estadoPagoFiltro ||
        (estadoPagoFiltro === "completo" && completo) ||
        (estadoPagoFiltro === "pendiente" && !completo);

      const cumpleBusquedaNombre = miembro.nombre
        .toLowerCase()
        .includes(busquedaNombre.toLowerCase());

      return cumpleEstadoPago && cumpleBusquedaNombre;
    });

    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Flex
          justify="space-between"
          align="baseline"
          style={{ marginBottom: 16 }}
          wrap={isSmallScreen ? "wrap" : "nowrap"}
        >
          <Input
            placeholder="Buscar por nombre"
            prefix={<SearchOutlined />}
            style={{
              width: isSmallScreen ? "100%" : 200,
              marginBottom: isSmallScreen ? 8 : 0,
            }}
            onChange={(e) => setBusquedaNombre(e.target.value)}
          />
          <PDFDownloadLink
            document={
              <PDFDocument
                nombreGrupo={record.nombre}
                totalPagado={totalPagosGrupo}
                pagosMiembros={pagosMiembros}
              />
            }
            fileName={`reporte-pagos-${record.nombre}.pdf`}
          >
            <Button
              type="primary"
              style={{
                marginBottom: isSmallScreen ? 8 : 10,
                width: isSmallScreen ? "100%" : "auto",
              }}
              icon={<FilePdfTwoTone twoToneColor={"red"} />}
            >
              Descargar Total en PDF
            </Button>
          </PDFDownloadLink>
          <Select
            style={{ width: isSmallScreen ? "100%" : 150 }}
            placeholder="Estado de pago"
            onChange={setEstadoPagoFiltro}
            allowClear
          >
            <Select.Option value="completo">Pago Completo</Select.Option>
            <Select.Option value="pendiente">Pago Pendiente</Select.Option>
          </Select>
        </Flex>
        {filteredMiembros.map((miembro, index) => {
          const pagosDelMiembro = pagosMiembro(miembro.id);
          const totalPagos = pagosDelMiembro.reduce(
            (acc, pago) => acc + pago.monto,
            0,
          );
          const completo = totalPagos >= totalAPagar;

          return (
            <Flex
              key={index}
              justify="space-between"
              align="center"
              gap={24}
              wrap={isSmallScreen ? "wrap" : "nowrap"}
            >
              <Typography.Text
                strong
                type={completo ? "success" : "secondary"}
                style={{ fontSize: 18 }}
              >
                <Typography.Text code>{index + 1}</Typography.Text>{" "}
                {miembro.nombre}
              </Typography.Text>
              <Flex
                gap={12}
                justify="flex-end"
                style={{
                  width: isSmallScreen ? "100%" : "300px",
                  maxWidth: 300,
                }}
                align="baseline"
              >
                <Button
                  shape="circle"
                  onClick={() => handleVerDetalles(miembro)}
                  size="small"
                  icon={<EyeFilled />}
                />
                <Button
                  shape="circle"
                  ghost
                  type="primary"
                  onClick={() => {
                    if (isReadOnly) return;
                    setMiembroSeleccionado({
                      id: miembro.id,
                      nombre: miembro.nombre,
                    });
                    setGrupoSeleccionadoParaEdicion(record.id);
                    setVisibleRegistrarPago(true);
                  }}
                  size="small"
                  disabled={completo || isReadOnly}
                  icon={<DollarCircleFilled />}
                />
                {/* Edición/eliminación de miembros removida en transporte (solo pagos) */}
                <div style={{ width: isSmallScreen ? "100%" : "100px" }}>
                  <Tag
                    color={completo ? "green" : "magenta"}
                    style={{
                      width: isSmallScreen ? "100%" : "100px",
                      textAlign: "center",
                      marginBottom: isSmallScreen ? 8 : 0,
                      maxWidth: 100,
                    }}
                  >
                    {completo ? "Pago Completo" : "Pago Pendiente"}
                  </Tag>
                </div>
              </Flex>
            </Flex>
          );
        })}
      </Space>
    );
  };

  const handleDownloadImage = async () => {
    const node = document.getElementById("detalle-pago");
    if (node) {
      const dataUrl = await toPng(node);
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `detalle-pago-${
        miembroSeleccionado?.nombre ?? "miembro"
      }.png`;
      link.click();
    }
  };

  // Funciones de edición/eliminación de miembros removidas de Transporte.

  const filteredGrupos = grupoSeleccionado
    ? grupos.filter((grupo) => grupo.id === grupoSeleccionado)
    : grupos;

  return (
    <List
      title={
        <Typography.Title
          level={4}
          style={{
            width: "100%",
            textAlign: "center",
            marginTop: 24,
            wordBreak: "break-word",
          }}
        >
          Arreglo de transporte
        </Typography.Title>
      }
    >
      <Table<Grupo>
        title={() => (
          <Flex
            justify="space-between"
            align="baseline"
            style={{ marginBottom: 16 }}
            wrap={isSmallScreen ? "wrap" : "nowrap"}
          >
            <Typography.Title
              level={5}
              style={{
                width: isSmallScreen ? "100%" : "auto",
                marginBottom: isSmallScreen ? 8 : 0,
              }}
            >
              Filtrar por Grupo
            </Typography.Title>
            <Select
              style={{ width: isSmallScreen ? "100%" : 200 }}
              placeholder="Seleccionar Grupo"
              onChange={setGrupoSeleccionado}
              allowClear
            >
              {grupos.map((grupo) => (
                <Select.Option key={grupo.id} value={grupo.id}>
                  {grupo.nombre}
                </Select.Option>
              ))}
            </Select>
            <Flex
              justify="space-between"
              align="center"
              style={{ marginBottom: 16 }}
              wrap={isSmallScreen ? "wrap" : "nowrap"}
            >
              <Typography.Title
                level={4}
                style={{
                  width: isSmallScreen ? "100%" : "auto",
                  marginBottom: isSmallScreen ? 8 : 0,
                }}
              >
                Precio del pasaje
              </Typography.Title>
              {editingTotal ? (
                <InputNumber
                  defaultValue={totalAPagar}
                  onPressEnter={(e) =>
                    handleTotalChange(
                      Number((e.target as HTMLInputElement).value),
                    )
                  }
                  onBlur={(e) => handleTotalChange(Number(e.target.value))}
                  style={{ width: isSmallScreen ? "100%" : "auto" }}
                />
              ) : (
                <Tag
                  color="green"
                  style={{
                    fontSize: 24,
                    width: isSmallScreen ? "100%" : "auto",
                    textAlign: isSmallScreen ? "center" : "left",
                    marginLeft: 12,
                  }}
                >
                  ${totalAPagar}{" "}
                  {isAdminApp && (
                    <EditOutlined
                      onClick={() => setEditingTotal(true)}
                      style={{ cursor: "pointer" }}
                    />
                  )}
                </Tag>
              )}
            </Flex>
            {/* El manejo de miembros no debe realizarse desde Transporte; solo pagos */}
          </Flex>
        )}
        dataSource={filteredGrupos}
        rowKey="nombre"
        expandable={{
          expandedRowRender,
          rowExpandable: (record) => record.miembros.length > 0,
        }}
        pagination={false}
        scroll={{ x: true }}
      >
        <Table.Column<Grupo> dataIndex="nombre" title="GRUPOS" width={100} />
      </Table>

      <Modal
        title={`Registrar Pago para ${miembroSeleccionado?.nombre ?? ""}`}
        open={visibleRegistrarPago}
        onOk={handleRegistrarPago}
        onCancel={handleCloseModal}
        okButtonProps={{ disabled: isReadOnly }}
        width={isSmallScreen ? "100%" : 520}
        style={{ top: isSmallScreen ? 0 : 100 }}
      >
        <Flex
          gap={12}
          justify="space-evenly"
          wrap="wrap"
          align="center"
          style={{ width: "100%" }}
        >
          <Input
            type="number"
            placeholder="Monto"
            value={monto}
            onChange={(e) => setMonto(Number(e.target.value))}
            style={{
              width: isSmallScreen ? "100%" : "45%",
              marginBottom: isSmallScreen ? 12 : 0,
            }}
          />
          <DatePicker
            placeholder="Fecha"
            value={fecha ? moment(fecha) : null}
            onChange={(date) => setFecha(date?.format("YYYY-MM-DD"))}
            style={{ width: isSmallScreen ? "100%" : "45%" }}
          />
        </Flex>
      </Modal>

      <Modal
        open={visibleVerDetalles}
        onCancel={handleCloseModal}
        footer={false}
        width={isSmallScreen ? "100%" : 600}
        style={{ top: isSmallScreen ? 0 : 20 }}
      >
        <Card
          title="Detalles de Pagos"
          extra={
            <Typography.Title level={4} style={{ margin: 0 }}>
              Total: $
              {pagosMiembro(miembroSeleccionado?.id ?? 0).reduce(
                (acc, pago) => acc + pago.monto,
                0,
              )}
            </Typography.Title>
          }
          bordered={false}
        >
          <div id="detalle-pago">
            <Card.Meta
              title={miembroSeleccionado?.nombre}
              description={
                <Timeline style={{ padding: isSmallScreen ? "12px 0" : 12 }}>
                  {pagosMiembro(miembroSeleccionado?.id ?? 0).map(
                    (pago, index) => (
                      <Timeline.Item
                        style={{ marginLeft: isSmallScreen ? 0 : 12 }}
                        key={index}
                        color="green"
                        dot={<ClockCircleOutlined />}
                      >
                        <Flex
                          align="center"
                          justify="space-between"
                          wrap={isSmallScreen ? "wrap" : "nowrap"}
                        >
                          <Typography.Text style={{ marginRight: 8 }}>
                            {pago.fecha}
                          </Typography.Text>
                          {!isSmallScreen && <Divider type="vertical" />}
                          <Typography.Text
                            code
                            strong
                            style={{
                              fontSize: isSmallScreen ? 16 : 20,
                              margin: isSmallScreen ? "8px 0" : 0,
                            }}
                          >
                            ${pago.monto}
                          </Typography.Text>

                          <Flex
                            justify="flex-end"
                            gap={8}
                            style={{
                              marginLeft: isSmallScreen ? 0 : 12,
                              width: isSmallScreen ? "100%" : "auto",
                            }}
                          >
                            {isAdminApp && (
                              <>
                                <Button
                                  type="link"
                                  size="small"
                                  onClick={() => handleEditPago(pago)}
                                >
                                  Editar
                                </Button>
                                <Button
                                  type="link"
                                  size="small"
                                  danger
                                  onClick={() => handleDeletePago(pago)}
                                >
                                  Borrar
                                </Button>
                              </>
                            )}
                          </Flex>
                        </Flex>
                      </Timeline.Item>
                    ),
                  )}
                </Timeline>
              }
            />
          </div>
        </Card>

        <Flex justify="end" style={{ marginTop: 16 }}>
          <Button
            type="primary"
            onClick={handleDownloadImage}
            style={{ width: isSmallScreen ? "100%" : "auto" }}
          >
            Descargar Detalles
          </Button>
        </Flex>
      </Modal>

      {/* Modales de gestión de miembros removidos en Transporte */}
    </List>
  );
};
