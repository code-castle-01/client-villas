import { useEffect, useRef, useState, useContext } from "react";
import {
  Card,
  Typography,
  Image,
  Button,
  Modal,
  Form,
  Table,
  DatePicker,
  Tabs,
  Popconfirm,
  Flex,
  Tag,
} from "antd";
import dayjs from "dayjs";
import territorio_1 from "../../assets/img/territorio-1.png";
import territorio_2 from "../../assets/img/territorio-2.png";
import territorio_10 from "../../assets/img/territorio-10.png";
import {
  MapContainer,
  TileLayer,
  LayersControl,
  Polygon,
  Marker,
  Popup,
} from "react-leaflet";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";

import { EditFilled, DeleteFilled } from "@ant-design/icons";
import { ColorModeContext } from "../../contexts/color-mode";
import SelectVarones from "../../components/select-varones";
import { ColumnsType } from "antd/es/table";
import {
  apiUrl,
  createEntry,
  deleteEntry,
  getCollection,
  updateEntry,
} from "../../api/client";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";

const { Title, Text, Paragraph } = Typography;

interface Territorio {
  sitio: string;
  n: number;
  img: string;
  lugares?: any[];
}

interface TerritorioData {
  id: number;
  n: number;
  fechaAsignado: string;
  fechaCompletado: string;
  asignadoAId: number;
  asignadoA: string;
}

const territorios: Territorio[] = [
  {
    sitio: "Barrio Antonio Nariño (A)",
    n: 1,
    img: territorio_1,
    lugares: ["Cancha Techada"],
  },
  {
    sitio: "Barrio Antonio Nariño (B)",
    n: 2,
    img: territorio_2,
    lugares: ["Cancha Techada"],
  },
  {
    sitio: "La Parada",
    n: 10,
    img: territorio_10,
    lugares: ["Casa Miriam", "Casa Solfanis"],
  },
];

const mapCenter: LatLngExpression = [7.835953, -72.471225];
const fallbackPolygon: LatLngExpression[] = [
  [7.8465, -72.4885],
  [7.848, -72.462],
  [7.835, -72.4555],
  [7.823, -72.4645],
  [7.8205, -72.4805],
  [7.832, -72.493],
];
const kmlFile = "LAS VILLAS - Villa Del Rosario NDS (46177).kml";
const kmlUrl = `${apiUrl}/${encodeURIComponent(kmlFile)}`;
const lasVillasMarker: LatLngExpression = [7.835953, -72.471225];

export const TerritoriosTable: React.FC = () => {
  const mapRef = useRef<LeafletMap | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [territorioData, setTerritorioData] = useState<TerritorioData[]>([]);
  const [territoriosDb, setTerritoriosDb] = useState<
    Array<{ id: number; numero: number }>
  >([]);
  const [mapPolygon, setMapPolygon] =
    useState<LatLngExpression[]>(fallbackPolygon);
  const [activeTab, setActiveTab] = useState<string>("1");
  const [currentTerritorio, setCurrentTerritorio] = useState<Territorio | null>(
    null,
  );
  const [editId, setEditId] = useState<number | null>(null);
  const isAdminApp = useIsAdminApp();
  const isReadOnly = !isAdminApp;
  const { mode } = useContext(ColorModeContext);

  useEffect(() => {
    const loadKml = async () => {
      try {
        const res = await fetch(kmlUrl);
        if (!res.ok) return;
        const text = await res.text();
        const doc = new DOMParser().parseFromString(text, "text/xml");
        const coordsNodes = Array.from(doc.getElementsByTagName("coordinates"));
        if (!coordsNodes.length) return;
        const raw = coordsNodes[0].textContent ?? "";
        const points = raw
          .trim()
          .split(/\s+/)
          .map((chunk) => chunk.split(",").map(Number))
          .filter(
            (arr) =>
              arr.length >= 2 && !Number.isNaN(arr[0]) && !Number.isNaN(arr[1]),
          )
          .map(([lng, lat]) => [lat, lng] as LatLngExpression);
        if (points.length > 2) {
          setMapPolygon(points);
        }
      } catch {
        // Fallback to default polygon
      }
    };
    loadKml();
  }, []);

  useEffect(() => {
    if (activeTab !== "3") return;
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      const territoriosData = await getCollection<{
        numero: number;
      }>("territorios", { "pagination[pageSize]": 1000 });
      const mappedTerritorios = territoriosData.map((t) => ({
        id: t.id,
        numero: t.numero,
      }));

      const asignaciones = await getCollection<{
        territorio?: { data: { id: number; attributes: { numero: number } } };
        asignadoA?: { data: { id: number; attributes: { nombre: string } } };
        fechaAsignado: string;
        fechaCompletado: string;
      }>("territorio-asignaciones", {
        populate: ["territorio", "asignadoA"],
        "pagination[pageSize]": 1000,
      });
      const mappedAsignaciones = asignaciones.map((a) => ({
        id: a.id,
        n: a.territorio?.data?.attributes?.numero ?? 0,
        fechaAsignado: a.fechaAsignado ?? "",
        fechaCompletado: a.fechaCompletado ?? "",
        asignadoAId: a.asignadoA?.data?.id ?? 0,
        asignadoA: a.asignadoA?.data?.attributes?.nombre ?? "",
      }));

      if (!mounted) return;
      setTerritoriosDb(mappedTerritorios);
      setTerritorioData(mappedAsignaciones);
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const openModal = (territorio: Territorio | TerritorioData, id?: number) => {
    if (isReadOnly) return;
    setIsModalOpen(true);

    if ("sitio" in territorio) {
      setCurrentTerritorio(territorio as Territorio);
    } else {
      setCurrentTerritorio(null);
    }

    if (typeof id === "number") {
      setEditId(id);
      const itemToEdit = territorioData.find((item) => item.id === id);
      if (!itemToEdit) return;
      form.setFieldsValue({
        fechaAsignado: itemToEdit.fechaAsignado
          ? dayjs(itemToEdit.fechaAsignado, "DD-MM-YYYY")
          : null,
        fechaCompletado: itemToEdit.fechaCompletado
          ? dayjs(itemToEdit.fechaCompletado, "DD-MM-YYYY")
          : null,
        asignadoA: itemToEdit.asignadoAId,
      });
    } else {
      form.resetFields();
    }
  };

  const handleOk = () => {
    if (isReadOnly) return;
    form.validateFields().then(async (values: Omit<TerritorioData, "n">) => {
      const territorioNumero =
        currentTerritorio?.n ??
        territorioData.find((t) => t.id === editId)?.n ??
        0;
      const territorioId =
        territoriosDb.find((t) => t.numero === territorioNumero)?.id ?? null;

      const payload = {
        territorio: territorioId,
        asignadoA: values.asignadoA,
        fechaAsignado: values.fechaAsignado
          ? dayjs(values.fechaAsignado).format("YYYY-MM-DD")
          : null,
        fechaCompletado: values.fechaCompletado
          ? dayjs(values.fechaCompletado).format("YYYY-MM-DD")
          : null,
      };

      if (editId !== null) {
        await updateEntry("territorio-asignaciones", editId, payload);
      } else {
        await createEntry("territorio-asignaciones", payload);
      }

      const asignaciones = await getCollection<{
        territorio?: { data: { id: number; attributes: { numero: number } } };
        asignadoA?: { data: { id: number; attributes: { nombre: string } } };
        fechaAsignado: string;
        fechaCompletado: string;
      }>("territorio-asignaciones", {
        populate: ["territorio", "asignadoA"],
        "pagination[pageSize]": 1000,
      });
      setTerritorioData(
        asignaciones.map((a) => ({
          id: a.id,
          n: a.territorio?.data?.attributes?.numero ?? 0,
          fechaAsignado: a.fechaAsignado ?? "",
          fechaCompletado: a.fechaCompletado ?? "",
          asignadoAId: a.asignadoA?.data?.id ?? 0,
          asignadoA: a.asignadoA?.data?.attributes?.nombre ?? "",
        })),
      );

      setIsModalOpen(false);
      form.resetFields();
      setEditId(null);
    });
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    form.resetFields();
    setEditId(null);
  };

  const handleDelete = async (id: number) => {
    if (isReadOnly) return;
    await deleteEntry("territorio-asignaciones", id);
    const updatedData = territorioData.filter((item) => item.id !== id);
    setTerritorioData(updatedData);
  };

  const columns: ColumnsType<TerritorioData> = [
    {
      fixed: true,
      align: "center",
      title: "Núm",
      dataIndex: "n",
      key: "n",
    },
    {
      align: "center",
      title: "Asignado",
      dataIndex: "asignadoA",
      key: "asignadoA",
    },
    {
      align: "center",
      title: "Fecha que se asignó",
      dataIndex: "fechaAsignado",
      key: "fechaAsignado",
    },
    {
      align: "center",
      title: "Última que se completó",
      dataIndex: "fechaCompletado",
      key: "fechaCompletado",
    },
    ...(isAdminApp
      ? [
          {
            align: "center",
            title: "Menu",
            key: "menu",
            render: (_: ColumnsType, record: TerritorioData) => (
              <Flex gap={4} wrap justify="space-evenly" align="center">
                <Button
                  ghost
                  size="small"
                  shape="circle"
                  type="primary"
                  icon={<EditFilled />}
                  onClick={() => openModal(record, record.id)}
                />

                <Popconfirm
                  title="¿Seguro que quieres eliminar este territorio?"
                  onConfirm={() => handleDelete(record.id)}
                  okText="Sí"
                  cancelText="No"
                >
                  <Button
                    ghost
                    danger
                    size="small"
                    shape="circle"
                    icon={<DeleteFilled />}
                  />
                </Popconfirm>
              </Flex>
            ),
          } as any,
        ]
      : []),
  ];

  return (
    <section
      className={`territorio-page ${
        mode === "dark" ? "territorio-page--dark" : "territorio-page--light"
      }`}
    >
      <Tabs
        defaultActiveKey="1"
        type="card"
        onChange={(key) => setActiveTab(key)}
      >
        <Tabs.TabPane tab="Territorios" key="1" icon={<span>🏔️</span>}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
            {territorios.map((territorio) => (
              <Card
                key={territorio.n}
                title={
                  <Title level={4}>
                    {territorio.sitio} <Text code>{territorio.n}</Text>
                  </Title>
                }
                cover={<Image src={territorio.img} width="auto" height={300} />}
                extra={
                  <Button
                    size="small"
                    type="default"
                    icon={<EditFilled />}
                    onClick={() => openModal(territorio)}
                    disabled={isReadOnly}
                  >
                    Llenar
                  </Button>
                }
              >
                <Card.Meta
                  title="Lugares de salida"
                  description={territorio.lugares?.map((lugar: string) => (
                    <Tag bordered={false} color="volcano">
                      {lugar}
                    </Tag>
                  ))}
                />
              </Card>
            ))}
          </div>
        </Tabs.TabPane>
        <Tabs.TabPane tab="Registro" key="2" icon={<span>📄</span>}>
          <Card className="territorio-info-card">
            <Title level={4}>LAS VILLAS</Title>
            <Paragraph>
              <Text strong>Tipo: </Text>1-CM (Cabecera Municipal)
            </Paragraph>
            <Paragraph>
              <Text strong>Idioma: </Text>Español
            </Paragraph>
            <Paragraph>
              <Text strong>Última actualización: </Text>4 de agosto de 2022
            </Paragraph>
            <Paragraph className="territorio-label">Límites</Paragraph>
            <Paragraph>
              <Text strong>Norte: </Text>
              Cl. 8 Norte entre Límite Oeste de la zona urbana (Mezcladora
              Norconcretos del Anillo Vial vía a Pamplona) y Río Táchira.
            </Paragraph>
            <Paragraph>
              <Text strong>Este: </Text>
              Río Táchira entre Camino a La Florida y Límite Sur de la zona
              urbana incluyendo Puente Internacional Simón Bolívar.
            </Paragraph>
            <Paragraph>
              <Text strong>Sur: </Text>
              Límite Sur de la zona urbana entre Río Táchira y Cr. 3a, LC. 7
              entre Cr. 4 y Redoma de la Vía La Floresta del Anillo Vial vía a
              Pamplona.
            </Paragraph>
            <Paragraph>
              <Text strong>Oeste: </Text>
              Límite Oeste de la zona urbana, entre la Cl. 7, y la Cl. 8 Norte.
            </Paragraph>
            <Paragraph>
              <Text type="secondary">
                Delimitación aproximada en el mapa. Si tienes coordenadas
                exactas, las ajustamos.
              </Text>
            </Paragraph>
          </Card>
          <Table
            title={() => (
              <Title level={5}>REGISTRO DE ASIGNACIÓN DE TERRITORIO</Title>
            )}
            columns={columns}
            dataSource={territorioData}
            rowKey="n"
            className="mt-8"
            pagination={false}
            size="small"
            scroll={{ x: "max-content" }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane tab="Mapa" key="3" icon={<span>🗺️</span>}>
          <Card className="territorio-map-card">
            <div className="territorio-map-header">
              <Title level={3} className="territorio-map-title">
                Mapa completo de LAS VILLAS
              </Title>
              <Text className="territorio-map-subtitle">
                Vista amplia del territorio con delimitación oficial.
              </Text>
            </div>
            <div className="territorio-map territorio-map--full">
              <MapContainer
                ref={mapRef}
                center={mapCenter}
                zoom={13}
                scrollWheelZoom
              >
                <LayersControl position="topright">
                  <LayersControl.BaseLayer checked name="Mapa">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satélite">
                    <TileLayer
                      attribution="Tiles &copy; Esri"
                      url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    />
                  </LayersControl.BaseLayer>
                </LayersControl>
                <Polygon
                  positions={mapPolygon}
                  pathOptions={{
                    color: "#22b45a",
                    weight: 3,
                    fillColor: "#22b45a",
                    fillOpacity: 0.2,
                  }}
                />
                <Marker position={lasVillasMarker}>
                  <Popup>
                    LAS VILLAS
                    <br />
                    Cl. 1 # 7-29, Brr. Fátima
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </Card>
          <div className="territorio-info-grid">
            <Card
              className={
                mode === "dark"
                  ? "territorio-dark-card"
                  : "territorio-info-card"
              }
              title="LAS VILLAS"
            >
              <Paragraph>
                <Text strong>Tipo: </Text>1-CM (Cabecera Municipal)
              </Paragraph>
              <Paragraph>
                <Text strong>Idioma: </Text>Español
              </Paragraph>
              <Paragraph>
                <Text strong>Última actualización: </Text>4 de agosto de 2022
              </Paragraph>
              <Paragraph className="territorio-label">Límites</Paragraph>
              <Paragraph>
                <Text strong>Norte: </Text>
                Cl. 8 Norte entre Límite Oeste de la zona urbana (Mezcladora
                Norconcretos del Anillo Vial vía a Pamplona) y Río Táchira.
              </Paragraph>
              <Paragraph>
                <Text strong>Este: </Text>
                Río Táchira entre Camino a La Florida y Límite Sur de la zona
                urbana incluyendo Puente Internacional Simón Bolívar.
              </Paragraph>
              <Paragraph>
                <Text strong>Sur: </Text>
                Límite Sur de la zona urbana entre Río Táchira y Cr. 3a, LC. 7
                entre Cr. 4 y Redoma de la Vía La Floresta del Anillo Vial vía a
                Pamplona.
              </Paragraph>
              <Paragraph>
                <Text strong>Oeste: </Text>
                Límite Oeste de la zona urbana, entre la Cl. 7, y la Cl. 8
                Norte.
              </Paragraph>
            </Card>
            <Card
              className={
                mode === "dark"
                  ? "territorio-dark-card"
                  : "territorio-info-card"
              }
              title="Dirección"
            >
              <Paragraph>Cl. 1 # 7-29</Paragraph>
              <Paragraph>Brr. Fatima</Paragraph>
              <Paragraph>VILLA DEL ROSARIO, NORTE DE SANTANDER</Paragraph>
              <Paragraph>
                <Text strong>Latitud: </Text>7.835953
              </Paragraph>
              <Paragraph>
                <Text strong>Longitud: </Text>-72.471225
              </Paragraph>
              <div className="territorio-map-link">
                <Button
                  type="primary"
                  href="https://apps.jw.org/ui/S/meeting-search.html#/?w=31CD5518-A3F7-48E4-AA3F-7A40EF13ED6A"
                  target="_blank"
                  rel="noreferrer"
                >
                  Ver mapa
                </Button>
              </div>
            </Card>
          </div>
        </Tabs.TabPane>
      </Tabs>

      {isAdminApp && (
        <Modal
          title="Asignación de Territorio"
          open={isModalOpen}
          onOk={handleOk}
          onCancel={handleCancel}
          okText="Guardar"
          cancelText="Cancelar"
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="asignadoA"
              label="Asignado a"
              rules={[{ required: true, message: "Este campo es requerido" }]}
            >
              <SelectVarones />
            </Form.Item>
            <Form.Item
              label="Fecha en que se asignó"
              name="fechaAsignado"
              rules={[
                { required: true, message: "Por favor ingrese la fecha" },
              ]}
            >
              <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
            </Form.Item>
            <Form.Item
              label="Fecha en que se completó"
              name="fechaCompletado"
              rules={[
                { required: false },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value) return Promise.resolve(); // Allow empty value
                    const fechaAsignado = getFieldValue("fechaAsignado");
                    if (fechaAsignado && dayjs(value).isBefore(fechaAsignado)) {
                      return Promise.reject(
                        new Error(
                          "La fecha de completado no puede ser menor a la fecha de asignación",
                        ),
                      );
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <DatePicker style={{ width: "100%" }} format="DD-MM-YYYY" />
            </Form.Item>
          </Form>
        </Modal>
      )}
    </section>
  );
};
