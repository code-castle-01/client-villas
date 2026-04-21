import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Button as MobileButton,
  Card as MobileCard,
  NoticeBar,
  Selector,
  Space as MobileSpace,
  Tag as MobileTag,
} from "antd-mobile";
import {
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Image,
  Input,
  InputNumber,
  message,
  Modal,
  Popconfirm,
  Table,
  Tabs as AntTabs,
  Tag,
  Typography,
  Upload,
} from "antd";
import { DeleteFilled, EditFilled, PlusOutlined } from "@ant-design/icons";
import { ColumnsType } from "antd/es/table";
import type { UploadFile } from "antd/es/upload/interface";
import dayjs from "dayjs";
import territorio_1 from "../../assets/img/territorio-1.png";
import territorio_2 from "../../assets/img/territorio-2.png";
import territorio_10 from "../../assets/img/territorio-10.png";
import {
  LayersControl,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
} from "react-leaflet";
import type { LatLngExpression, Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import { useAdaptiveUI } from "../../adaptive/useAdaptiveUI";
import {
  apiUrl,
  api,
  createEntry,
  deleteEntry,
  getCollection,
  updateEntry,
} from "../../api/client";
import SelectVarones from "../../components/select-varones";
import { ColorModeContext } from "../../contexts/color-mode";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";
import { TerritoryS12DownloadButton } from "./TerritoryS12Pdf";

const { Title, Text, Paragraph } = Typography;

const TERRITORY_ASSIGNMENTS_ENDPOINT = "territorio-asignacions";

type LugarSalida = {
  nombre: string;
  detalle?: string;
};

interface Territorio {
  id?: number;
  sitio: string;
  n: number;
  img: string;
  lugares?: LugarSalida[];
}

interface TerritorioData {
  id: number;
  n: number;
  fechaAsignado: string;
  fechaCompletado: string;
  asignadoAId: number;
  asignadoA: string;
}

type TerritorioApiResponse = {
  sitio: string;
  numero: number;
  lugares?: unknown;
  imagen?: {
    data?: {
      attributes?: {
        url?: string;
      };
    } | null;
    url?: string;
  } | null;
};

type NewTerritoryFormValues = {
  sitio: string;
  numero: number;
  lugares?: Array<{ nombre?: string; detalle?: string }>;
};

type TerritorioAsignacionResponse = {
  territorio?: { data: { id: number; attributes: { numero: number } } };
  asignadoA?: { data: { id: number; attributes: { nombre: string } } };
  fechaAsignado: string;
  fechaCompletado: string;
};

type MobileSectionKey = "territorios" | "registro" | "zona";

const fallbackTerritorios: Territorio[] = [
  {
    sitio: "Barrio Antonio Nariño (A)",
    n: 1,
    img: territorio_1,
    lugares: [{ nombre: "Cancha Techada" }],
  },
  {
    sitio: "Barrio Antonio Nariño (B)",
    n: 2,
    img: territorio_2,
    lugares: [{ nombre: "Cancha Techada" }],
  },
  {
    sitio: "La Parada",
    n: 10,
    img: territorio_10,
    lugares: [{ nombre: "Casa Miriam" }, { nombre: "Casa Solfanis" }],
  },
];

const fallbackTerritoryImageByNumber = new Map(
  fallbackTerritorios.map((territorio) => [territorio.n, territorio.img]),
);

const getMediaUrl = (url?: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${apiUrl}${url}`;
};

const normalizeLugares = (lugares: unknown): LugarSalida[] => {
  if (!Array.isArray(lugares)) return [];

  return lugares
    .map((lugar) => {
      if (typeof lugar === "string") {
        const nombre = lugar.trim();
        return nombre ? { nombre } : null;
      }
      if (
        lugar &&
        typeof lugar === "object" &&
        "nombre" in lugar &&
        typeof lugar.nombre === "string"
      ) {
        const nombre = lugar.nombre.trim();
        const detalle =
          "detalle" in lugar && typeof lugar.detalle === "string"
            ? lugar.detalle.trim()
            : "";
        return nombre ? { nombre, ...(detalle ? { detalle } : {}) } : null;
      }
      return null;
    })
    .filter((lugar): lugar is LugarSalida => Boolean(lugar));
};

const mapTerritoryRecord = (
  territorio: TerritorioApiResponse & { id: number },
): Territorio => {
  const mediaUrl =
    territorio.imagen?.data?.attributes?.url ?? territorio.imagen?.url ?? "";
  const fallbackTerritory = fallbackTerritorios.find(
    (item) => item.n === territorio.numero,
  );
  const lugares = normalizeLugares(territorio.lugares);

  return {
    id: territorio.id,
    sitio: territorio.sitio || fallbackTerritory?.sitio || "Territorio",
    n: territorio.numero,
    img:
      getMediaUrl(mediaUrl) ||
      fallbackTerritoryImageByNumber.get(territorio.numero) ||
      territorio_1,
    lugares: lugares.length ? lugares : fallbackTerritory?.lugares ?? [],
  };
};

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
const meetingSearchUrl =
  "https://apps.jw.org/ui/S/meeting-search.html#/?w=31CD5518-A3F7-48E4-AA3F-7A40EF13ED6A";

const mobileSectionOptions = [
  { label: "Territorios", value: "territorios" },
  { label: "Registro", value: "registro" },
  { label: "Zona", value: "zona" },
] satisfies Array<{ label: string; value: MobileSectionKey }>;

const territoryInfo = {
  tipo: "1-CM (Cabecera Municipal)",
  idioma: "Español",
  ultimaActualizacion: "4 de agosto de 2022",
  limites: [
    {
      label: "Norte",
      text: "Cl. 8 Norte entre Límite Oeste de la zona urbana (Mezcladora Norconcretos del Anillo Vial vía a Pamplona) y Río Táchira.",
    },
    {
      label: "Este",
      text: "Río Táchira entre Camino a La Florida y Límite Sur de la zona urbana incluyendo Puente Internacional Simón Bolívar.",
    },
    {
      label: "Sur",
      text: "Límite Sur de la zona urbana entre Río Táchira y Cr. 3a, LC. 7 entre Cr. 4 y Redoma de la Vía La Floresta del Anillo Vial vía a Pamplona.",
    },
    {
      label: "Oeste",
      text: "Límite Oeste de la zona urbana, entre la Cl. 7 y la Cl. 8 Norte.",
    },
  ],
  direccion: ["Cl. 1 # 7-29", "Brr. Fatima", "VILLA DEL ROSARIO, NORTE DE SANTANDER"],
  latitud: "7.835953",
  longitud: "-72.471225",
};

const mapAssignmentRecord = (
  assignment: TerritorioAsignacionResponse & { id: number },
): TerritorioData => ({
  id: assignment.id,
  n: assignment.territorio?.data?.attributes?.numero ?? 0,
  fechaAsignado: assignment.fechaAsignado ?? "",
  fechaCompletado: assignment.fechaCompletado ?? "",
  asignadoAId: assignment.asignadoA?.data?.id ?? 0,
  asignadoA: assignment.asignadoA?.data?.attributes?.nombre ?? "",
});

const formatDateLabel = (value?: string) =>
  value ? dayjs(value).format("DD-MM-YYYY") : "Pendiente";

export const TerritoriosTable: React.FC = () => {
  const mapRef = useRef<LeafletMap | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [newTerritoryForm] = Form.useForm<NewTerritoryFormValues>();
  const [territorioData, setTerritorioData] = useState<TerritorioData[]>([]);
  const [territorios, setTerritorios] =
    useState<Territorio[]>(fallbackTerritorios);
  const [territoriosDb, setTerritoriosDb] = useState<
    Array<{ id: number; numero: number }>
  >([]);
  const [isNewTerritoryModalOpen, setIsNewTerritoryModalOpen] = useState(false);
  const [territoryImageFile, setTerritoryImageFile] =
    useState<UploadFile | null>(null);
  const [isCreatingTerritory, setIsCreatingTerritory] = useState(false);
  const [mapPolygon, setMapPolygon] =
    useState<LatLngExpression[]>(fallbackPolygon);
  const [activeTab, setActiveTab] = useState<string>("1");
  const [mobileSection, setMobileSection] =
    useState<MobileSectionKey>("territorios");
  const [currentTerritorio, setCurrentTerritorio] = useState<Territorio | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const { resolvedMode, setOverrideMode } = useAdaptiveUI();
  const isNativeMobile = resolvedMode === "mobile";
  const isAdminApp = useIsAdminApp();
  const canEditInCurrentView = isAdminApp && !isNativeMobile;
  const { mode } = useContext(ColorModeContext);

  const loadTerritoryResources = useCallback(async () => {
    const [territoriosData, asignaciones] = await Promise.all([
      getCollection<TerritorioApiResponse>("territorios", {
        populate: ["imagen"],
        "pagination[pageSize]": 1000,
        sort: "numero:asc",
      }),
      getCollection<TerritorioAsignacionResponse>(TERRITORY_ASSIGNMENTS_ENDPOINT, {
        populate: ["territorio", "asignadoA"],
        "pagination[pageSize]": 1000,
      }),
    ]);

    const mappedTerritorios = territoriosData.map((territorio) => ({
      id: territorio.id,
      numero: territorio.numero,
    }));
    const mappedCards = territoriosData
      .map(mapTerritoryRecord)
      .sort((a, b) => a.n - b.n);

    setTerritorios(mappedCards.length ? mappedCards : fallbackTerritorios);
    setTerritoriosDb(mappedTerritorios);
    setTerritorioData(asignaciones.map(mapAssignmentRecord));
  }, []);

  useEffect(() => {
    const loadKml = async () => {
      try {
        const response = await fetch(kmlUrl);
        if (!response.ok) return;
        const text = await response.text();
        const doc = new DOMParser().parseFromString(text, "text/xml");
        const coordsNodes = Array.from(doc.getElementsByTagName("coordinates"));
        if (!coordsNodes.length) return;
        const raw = coordsNodes[0].textContent ?? "";
        const points = raw
          .trim()
          .split(/\s+/)
          .map((chunk) => chunk.split(",").map(Number))
          .filter(
            (coordinates) =>
              coordinates.length >= 2 &&
              !Number.isNaN(coordinates[0]) &&
              !Number.isNaN(coordinates[1]),
          )
          .map(([lng, lat]) => [lat, lng] as LatLngExpression);

        if (points.length > 2) {
          setMapPolygon(points);
        }
      } catch {
        // fallback polygon
      }
    };

    void loadKml();
  }, []);

  useEffect(() => {
    if (activeTab !== "3") return;
    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [activeTab]);

  useEffect(() => {
    void loadTerritoryResources();
  }, [loadTerritoryResources]);

  const sortedAssignments = useMemo(
    () => [...territorioData].sort((a, b) => a.n - b.n),
    [territorioData],
  );

  const latestAssignmentByTerritory = useMemo(() => {
    const sortedByDate = [...territorioData].sort(
      (a, b) => dayjs(b.fechaAsignado).valueOf() - dayjs(a.fechaAsignado).valueOf(),
    );
    const map = new Map<number, TerritorioData>();

    for (const item of sortedByDate) {
      if (item.n && !map.has(item.n)) {
        map.set(item.n, item);
      }
    }

    return map;
  }, [territorioData]);

  const assignmentCount = useMemo(
    () => new Set(territorioData.map((item) => item.n).filter(Boolean)).size,
    [territorioData],
  );

  const completedCount = useMemo(
    () => territorioData.filter((item) => Boolean(item.fechaCompletado)).length,
    [territorioData],
  );

  const openModal = (territorio: Territorio | TerritorioData, id?: number) => {
    if (!canEditInCurrentView) return;

    setIsModalOpen(true);

    if ("sitio" in territorio) {
      setCurrentTerritorio(territorio);
    } else {
      setCurrentTerritorio(null);
    }

    if (typeof id === "number") {
      setEditId(id);
      const itemToEdit = territorioData.find((item) => item.id === id);
      if (!itemToEdit) return;
      form.setFieldsValue({
        fechaAsignado: itemToEdit.fechaAsignado
          ? dayjs(itemToEdit.fechaAsignado, "YYYY-MM-DD")
          : null,
        fechaCompletado: itemToEdit.fechaCompletado
          ? dayjs(itemToEdit.fechaCompletado, "YYYY-MM-DD")
          : null,
        asignadoA: itemToEdit.asignadoAId,
      });
    } else {
      setEditId(null);
      form.resetFields();
    }
  };

  const handleOk = () => {
    if (!canEditInCurrentView) return;

    form.validateFields().then(async (values: Omit<TerritorioData, "n">) => {
      const territorioNumero =
        currentTerritorio?.n ??
        territorioData.find((territorio) => territorio.id === editId)?.n ??
        0;
      const territorioId =
        territoriosDb.find((territorio) => territorio.numero === territorioNumero)?.id ??
        null;

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
        await updateEntry(TERRITORY_ASSIGNMENTS_ENDPOINT, editId, payload);
      } else {
        await createEntry(TERRITORY_ASSIGNMENTS_ENDPOINT, payload);
      }

      await loadTerritoryResources();
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

  const openNewTerritoryModal = () => {
    if (!canEditInCurrentView) return;
    newTerritoryForm.resetFields();
    newTerritoryForm.setFieldsValue({ lugares: [{ nombre: "" }] });
    setTerritoryImageFile(null);
    setIsNewTerritoryModalOpen(true);
  };

  const closeNewTerritoryModal = () => {
    setIsNewTerritoryModalOpen(false);
    setTerritoryImageFile(null);
    newTerritoryForm.resetFields();
  };

  const handleCreateTerritory = async () => {
    if (!canEditInCurrentView) return;

    const values = await newTerritoryForm.validateFields();
    const lugares = (values.lugares ?? [])
      .map((lugar) => {
        const nombre = lugar.nombre?.trim() ?? "";
        const detalle = lugar.detalle?.trim() ?? "";
        return nombre ? { nombre, ...(detalle ? { detalle } : {}) } : null;
      })
      .filter((lugar): lugar is LugarSalida => Boolean(lugar));

    setIsCreatingTerritory(true);

    try {
      let imagen: number | undefined;
      const file = territoryImageFile?.originFileObj;

      if (file) {
        const formData = new FormData();
        formData.append("files", file);
        const { data } = await api.post<Array<{ id: number }>>(
          "/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );
        imagen = data[0]?.id;
      }

      await createEntry("territorios", {
        sitio: values.sitio.trim(),
        numero: values.numero,
        lugares,
        ...(imagen ? { imagen } : {}),
      });

      message.success("Territorio creado");
      closeNewTerritoryModal();
      await loadTerritoryResources();
    } catch {
      message.error("No se pudo crear el territorio");
    } finally {
      setIsCreatingTerritory(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!canEditInCurrentView) return;

    await deleteEntry(TERRITORY_ASSIGNMENTS_ENDPOINT, id);
    setTerritorioData((current) => current.filter((item) => item.id !== id));
  };

  const openDesktopView = () => setOverrideMode("desktop");

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
      render: (value: string) => formatDateLabel(value),
    },
    {
      align: "center",
      title: "Última que se completó",
      dataIndex: "fechaCompletado",
      key: "fechaCompletado",
      render: (value: string) => formatDateLabel(value),
    },
    ...(isAdminApp
      ? [
          {
            align: "center",
            title: "Menu",
            key: "menu",
            render: (_value: unknown, record: TerritorioData) => (
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
          } as ColumnsType<TerritorioData>[number],
        ]
      : []),
  ];

  const renderTerritoryInfo = () => (
    <>
      <Paragraph>
        <Text strong>Tipo: </Text>
        {territoryInfo.tipo}
      </Paragraph>
      <Paragraph>
        <Text strong>Idioma: </Text>
        {territoryInfo.idioma}
      </Paragraph>
      <Paragraph>
        <Text strong>Última actualización: </Text>
        {territoryInfo.ultimaActualizacion}
      </Paragraph>
      <Paragraph className="territorio-label">Límites</Paragraph>
      {territoryInfo.limites.map((item) => (
        <Paragraph key={item.label}>
          <Text strong>{item.label}: </Text>
          {item.text}
        </Paragraph>
      ))}
    </>
  );

  const renderMobileView = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {isAdminApp && (
        <NoticeBar
          content="La edición de territorios y el mapa completo siguen disponibles en la vista desktop."
          extra={
            <MobileButton size="mini" onClick={openDesktopView}>
              Ir a desktop
            </MobileButton>
          }
        />
      )}

      <MobileCard className="mobile-screen-card">
        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Territorio Las Villas</div>
            <div style={{ color: "var(--app-muted)" }}>
              Vista móvil simplificada para consulta rápida, seguimiento y acceso al
              mapa externo.
            </div>
          </div>

          <Selector
            columns={3}
            options={mobileSectionOptions}
            value={[mobileSection]}
            onChange={(value) =>
              setMobileSection((value[0] as MobileSectionKey) ?? "territorios")
            }
          />

          <MobileSpace wrap>
            <MobileTag color="primary" fill="outline">
              {territorios.length} territorios
            </MobileTag>
            <MobileTag color="success" fill="outline">
              {assignmentCount} asignados
            </MobileTag>
            <MobileTag color="warning" fill="outline">
              {completedCount} completados
            </MobileTag>
          </MobileSpace>
        </div>
      </MobileCard>

      {mobileSection === "territorios" &&
        territorios.map((territorio) => {
          const currentAssignment = latestAssignmentByTerritory.get(territorio.n);

          return (
            <MobileCard
              key={territorio.n}
              className="mobile-screen-card"
              title={territorio.sitio}
              extra={
                <MobileTag color="primary" fill="outline">
                  T-{territorio.n}
                </MobileTag>
              }
            >
              <MobileSpace direction="vertical" block style={{ width: "100%" }}>
                <img
                  src={territorio.img}
                  alt={territorio.sitio}
                  style={{
                    width: "100%",
                    height: 180,
                    objectFit: "cover",
                    borderRadius: 18,
                  }}
                />

                <div>
                  <strong>Lugares de salida</strong>
                  <div style={{ marginTop: 8 }}>
                    <MobileSpace wrap>
                      {(territorio.lugares ?? []).map((lugar) => (
                        <MobileTag key={lugar.nombre} fill="outline">
                          {lugar.nombre}
                        </MobileTag>
                      ))}
                    </MobileSpace>
                    {territorio.lugares?.some((lugar) => lugar.detalle) && (
                      <div className="territorio-place-details">
                        {territorio.lugares.map((lugar) =>
                          lugar.detalle ? (
                            <div key={`${lugar.nombre}-${lugar.detalle}`}>
                              <strong>{lugar.nombre}:</strong> {lugar.detalle}
                            </div>
                          ) : null,
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <strong>Asignado actualmente</strong>
                  <div style={{ marginTop: 8 }}>
                    {currentAssignment?.asignadoA || "Pendiente"}
                  </div>
                </div>

                <div style={{ display: "grid", gap: 6 }}>
                  <div>
                    Fecha de asignación: {formatDateLabel(currentAssignment?.fechaAsignado)}
                  </div>
                  <div>
                    Última completada: {formatDateLabel(currentAssignment?.fechaCompletado)}
                  </div>
                </div>

                <div className="territorio-mobile-actions">
                  <TerritoryS12DownloadButton
                    territory={territorio}
                    buttonProps={{ size: "middle" }}
                    label="Descargar S-12"
                  />
                  {isAdminApp && (
                    <MobileButton color="primary" fill="outline" onClick={openDesktopView}>
                      Llenar en desktop
                    </MobileButton>
                  )}
                </div>
              </MobileSpace>
            </MobileCard>
          );
        })}

      {mobileSection === "registro" &&
        (sortedAssignments.length === 0 ? (
          <MobileCard className="mobile-screen-card">
            <div style={{ color: "var(--app-muted)" }}>
              No hay asignaciones registradas todavía.
            </div>
          </MobileCard>
        ) : (
          sortedAssignments.map((item) => (
            <MobileCard
              key={item.id}
              className="mobile-screen-card"
              title={`Territorio ${item.n}`}
              extra={
                <MobileTag
                  color={item.fechaCompletado ? "success" : "warning"}
                  fill="outline"
                >
                  {item.fechaCompletado ? "Completado" : "Pendiente"}
                </MobileTag>
              }
            >
              <MobileSpace direction="vertical" block style={{ width: "100%" }}>
                <div>
                  <strong>Asignado a:</strong> {item.asignadoA || "Pendiente"}
                </div>
                <div>
                  <strong>Se asignó:</strong> {formatDateLabel(item.fechaAsignado)}
                </div>
                <div>
                  <strong>Se completó:</strong> {formatDateLabel(item.fechaCompletado)}
                </div>
                {isAdminApp && (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <MobileButton fill="outline" size="small" onClick={openDesktopView}>
                      Editar en desktop
                    </MobileButton>
                  </div>
                )}
              </MobileSpace>
            </MobileCard>
          ))
        ))}

      {mobileSection === "zona" && (
        <>
          <MobileCard className="mobile-screen-card" title="LAS VILLAS">
            <MobileSpace direction="vertical" block style={{ width: "100%" }}>
              <MobileSpace wrap>
                <MobileTag color="primary" fill="outline">
                  {territoryInfo.tipo}
                </MobileTag>
                <MobileTag fill="outline">{territoryInfo.idioma}</MobileTag>
              </MobileSpace>
              <div>
                <strong>Última actualización:</strong> {territoryInfo.ultimaActualizacion}
              </div>
              {territoryInfo.limites.map((item) => (
                <div key={item.label}>
                  <strong>{item.label}:</strong> {item.text}
                </div>
              ))}
            </MobileSpace>
          </MobileCard>

          <MobileCard className="mobile-screen-card" title="Dirección y mapa">
            <MobileSpace direction="vertical" block style={{ width: "100%" }}>
              {territoryInfo.direccion.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div>
                <strong>Latitud:</strong> {territoryInfo.latitud}
              </div>
              <div>
                <strong>Longitud:</strong> {territoryInfo.longitud}
              </div>
              <MobileButton
                color="primary"
                block
                onClick={() => {
                  window.open(meetingSearchUrl, "_blank", "noopener,noreferrer");
                }}
              >
                Abrir mapa completo
              </MobileButton>
            </MobileSpace>
          </MobileCard>
        </>
      )}
    </div>
  );

  return (
    <section
      className={`territorio-page ${
        mode === "dark" ? "territorio-page--dark" : "territorio-page--light"
      }`}
    >
      {isNativeMobile ? (
        renderMobileView()
      ) : (
        <AntTabs
          defaultActiveKey="1"
          type="card"
          onChange={(key) => setActiveTab(key)}
        >
          <AntTabs.TabPane tab="Territorios" key="1" icon={<span>🏔️</span>}>
            <div className="territorio-tab-toolbar">
              {canEditInCurrentView && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={openNewTerritoryModal}
                >
                  Nuevo territorio
                </Button>
              )}
            </div>
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
                    <div className="territorio-card-actions">
                      <TerritoryS12DownloadButton territory={territorio} />
                      <Button
                        size="small"
                        type="default"
                        icon={<EditFilled />}
                        onClick={() => openModal(territorio)}
                        disabled={!canEditInCurrentView}
                      >
                        Llenar
                      </Button>
                    </div>
                  }
                >
                  <Card.Meta
                    title="Lugares de salida"
                    description={
                      <>
                        {(territorio.lugares ?? []).map((lugar) => (
                          <Tag key={lugar.nombre} bordered={false} color="volcano">
                            {lugar.nombre}
                          </Tag>
                        ))}
                        {territorio.lugares?.some((lugar) => lugar.detalle) && (
                          <div className="territorio-place-details">
                            {territorio.lugares.map((lugar) =>
                              lugar.detalle ? (
                                <div key={`${lugar.nombre}-${lugar.detalle}`}>
                                  <Text strong>{lugar.nombre}: </Text>
                                  <Text>{lugar.detalle}</Text>
                                </div>
                              ) : null,
                            )}
                          </div>
                        )}
                      </>
                    }
                  />
                </Card>
              ))}
            </div>
          </AntTabs.TabPane>
          <AntTabs.TabPane tab="Registro" key="2" icon={<span>📄</span>}>
            <Card className="territorio-info-card">
              <Title level={4}>LAS VILLAS</Title>
              {renderTerritoryInfo()}
              <Paragraph>
                <Text type="secondary">
                  Delimitación aproximada en el mapa. Si tienes coordenadas exactas,
                  las ajustamos.
                </Text>
              </Paragraph>
            </Card>
            <Table
              title={() => <Title level={5}>REGISTRO DE ASIGNACIÓN DE TERRITORIO</Title>}
              columns={columns}
              dataSource={sortedAssignments}
              rowKey="id"
              className="mt-8"
              pagination={false}
              size="small"
              scroll={{ x: "max-content" }}
            />
          </AntTabs.TabPane>
          <AntTabs.TabPane tab="Mapa" key="3" icon={<span>🗺️</span>}>
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
                {renderTerritoryInfo()}
              </Card>
              <Card
                className={
                  mode === "dark"
                    ? "territorio-dark-card"
                    : "territorio-info-card"
                }
                title="Dirección"
              >
                {territoryInfo.direccion.map((line) => (
                  <Paragraph key={line}>{line}</Paragraph>
                ))}
                <Paragraph>
                  <Text strong>Latitud: </Text>
                  {territoryInfo.latitud}
                </Paragraph>
                <Paragraph>
                  <Text strong>Longitud: </Text>
                  {territoryInfo.longitud}
                </Paragraph>
                <div className="territorio-map-link">
                  <Button type="primary" href={meetingSearchUrl} target="_blank" rel="noreferrer">
                    Ver mapa
                  </Button>
                </div>
              </Card>
            </div>
          </AntTabs.TabPane>
        </AntTabs>
      )}

      {canEditInCurrentView && (
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
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value) return Promise.resolve();
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

      {canEditInCurrentView && (
        <Modal
          title="Nuevo territorio"
          open={isNewTerritoryModalOpen}
          onOk={handleCreateTerritory}
          onCancel={closeNewTerritoryModal}
          okText="Crear territorio"
          cancelText="Cancelar"
          confirmLoading={isCreatingTerritory}
          destroyOnHidden
        >
          <Form
            form={newTerritoryForm}
            layout="vertical"
            initialValues={{ lugares: [{ nombre: "" }] }}
          >
            <Form.Item
              name="sitio"
              label="Título del territorio"
              rules={[
                { required: true, message: "Ingresa el título del territorio" },
                { whitespace: true, message: "Ingresa un título válido" },
              ]}
            >
              <Input placeholder="Ej. Barrio Antonio Nariño (C)" />
            </Form.Item>

            <Form.Item
              name="numero"
              label="Número de territorio"
              rules={[
                { required: true, message: "Ingresa el número del territorio" },
                {
                  validator: async (_, value: number | undefined) => {
                    if (value === undefined || value === null) return;
                    if (territorios.some((territorio) => territorio.n === value)) {
                      throw new Error("Ya existe un territorio con ese número");
                    }
                  },
                },
              ]}
            >
              <InputNumber min={1} precision={0} style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item label="Imagen del mapa">
              <Upload
                accept="image/*"
                beforeUpload={(file) => {
                  setTerritoryImageFile({
                    uid: file.uid,
                    name: file.name,
                    status: "done",
                    originFileObj: file,
                  });
                  return false;
                }}
                fileList={territoryImageFile ? [territoryImageFile] : []}
                listType="picture"
                maxCount={1}
                onRemove={() => {
                  setTerritoryImageFile(null);
                }}
              >
                <Button icon={<PlusOutlined />}>Subir imagen</Button>
              </Upload>
            </Form.Item>

            <Form.List name="lugares">
              {(fields, { add, remove }) => (
                <div className="territorio-places-form">
                  <Text strong>Lugares de salida</Text>
                  {fields.map((field) => (
                    <Flex key={field.key} gap={8} align="baseline" wrap>
                      <Form.Item
                        {...field}
                        name={[field.name, "nombre"]}
                        rules={[
                          {
                            required: fields.length === 1,
                            message: "Agrega al menos un lugar de salida",
                          },
                        ]}
                        className="territorio-place-input"
                      >
                        <Input placeholder="Ej. Cancha Techada" />
                      </Form.Item>
                      <Form.Item
                        {...field}
                        name={[field.name, "detalle"]}
                        className="territorio-place-detail-input"
                      >
                        <Input placeholder="Detalle o dirección (opcional)" />
                      </Form.Item>
                      {fields.length > 1 && (
                        <Button danger onClick={() => remove(field.name)}>
                          Quitar
                        </Button>
                      )}
                    </Flex>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>
                    Agregar lugar
                  </Button>
                </div>
              )}
            </Form.List>
          </Form>
        </Modal>
      )}
    </section>
  );
};
