import {
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import MeetingPDF from "../../components/MeetingPDF";
import SelectSiervos from "../../components/select-siervos";
import SelectVarones from "../../components/select-varones";
import SelectTemas from "../../components/select-temas";
import { getCollection, getSingle, updateSingle } from "../../api/client";
import { useDirectory } from "../../contexts/directory";
import { useIsAdminApp } from "../../hooks/useIsAdminApp";

const { Title } = Typography;
const { TextArea } = Input;

type ConferenceSummary = {
  id: number;
  fecha: string;
  orador: string;
  cong: string;
  cancion: number;
  tema?: {
    id: number;
    titulo: string;
  } | null;
};

type MeetingSummary = {
  id: number;
  fecha: string;
  presidente?: {
    id: number;
    nombre: string;
  } | null;
};

export const MeetingInstructionsForm = () => {
  const [form] = Form.useForm();
  const isAdminApp = useIsAdminApp();
  const isReadOnly = !isAdminApp;

  const [conferencias, setConferencias] = useState<any>({});
  const [conferenceRows, setConferenceRows] = useState<ConferenceSummary[]>([]);
  const [meetingRows, setMeetingRows] = useState<MeetingSummary[]>([]);
  const [temasById, setTemasById] = useState<Record<number, string>>({});
  const { miembros, loaded: directoryLoaded } = useDirectory();
  const miembrosById = useMemo(
    () =>
      miembros.reduce<Record<number, string>>((accumulator, member) => {
        accumulator[member.id] = member.nombre;
        return accumulator;
      }, {}),
    [miembros],
  );

  useEffect(() => {
    if (!directoryLoaded) {
      return;
    }

    let mounted = true;
    const load = async () => {
      const [temas, conferenceData, meetingData, data] = await Promise.all([
        getCollection<{ titulo: string }>("temas", {
          "pagination[pageSize]": 1000,
        }),
        getCollection<{
          fecha: string;
          orador: string;
          cong: string;
          cancion: number;
          tema?: {
            id: number;
            titulo: string;
          } | null;
        }>("conferencias", {
          "pagination[pageSize]": 1000,
          sort: "fecha:asc",
        }),
        getCollection<{
          fecha: string;
          presidente?: {
            id: number;
            nombre: string;
          } | null;
        }>("reunions", {
          "pagination[pageSize]": 1000,
          sort: "fecha:asc",
        }),
        getSingle<{
          presidente?: { data: { id: number } };
          fecha?: string;
          discursoTema?: { data: { id: number } };
          numeroCancion?: number;
          preguntasOpcionales?: string;
          orador?: string;
          congregacion?: string;
          proximoTema?: { data: { id: number } };
          conductorAtalaya?: { data: { id: number } };
        }>("presidencia", {
          populate: [
            "presidente",
            "discursoTema",
            "proximoTema",
            "conductorAtalaya",
          ],
        }),
      ]);
      const temasMap: Record<number, string> = {};
      temas.forEach((t) => {
        temasMap[t.id] = t.titulo;
      });

      if (!mounted) return;
      setTemasById(temasMap);
      setConferenceRows(
        conferenceData
          .map((conference) => ({
            id: conference.id,
            fecha: conference.fecha,
            orador: conference.orador,
            cong: conference.cong,
            cancion: conference.cancion,
            tema: conference.tema ?? null,
          }))
          .sort((a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf())
      );
      setMeetingRows(
        meetingData
          .map((meeting) => ({
            id: meeting.id,
            fecha: meeting.fecha,
            presidente: meeting.presidente ?? null,
          }))
          .sort((a, b) => dayjs(a.fecha).valueOf() - dayjs(b.fecha).valueOf())
      );

      if (data) {
        const formValues = {
          president: data.presidente?.data?.id,
          date: data.fecha ? dayjs(data.fecha) : null,
          discourseTopic: data.discursoTema?.data?.id,
          songNumber: data.numeroCancion,
          optionalQuestions: data.preguntasOpcionales,
          speaker: data.orador,
          congregation: data.congregacion,
          nextWeekTitle: data.proximoTema?.data?.id,
          watchtowerConductor: data.conductorAtalaya?.data?.id,
        };

        form.setFieldsValue(formValues);
        setConferencias({
          president: miembrosById[data.presidente?.data?.id ?? 0] ?? "Sin presidente",
          date: data.fecha ?? "",
          discourseTopic: temasMap[data.discursoTema?.data?.id ?? 0] ?? "",
          songNumber: data.numeroCancion ?? 0,
          optionalQuestions: data.preguntasOpcionales ?? "",
          speaker: data.orador ?? "",
          congregation: data.congregacion ?? "",
          nextWeekTitle: temasMap[data.proximoTema?.data?.id ?? 0] ?? "",
          watchtowerConductor:
            miembrosById[data.conductorAtalaya?.data?.id ?? 0] ?? "",
        });
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [directoryLoaded, form, miembrosById]);

  const applyConferenceValuesForDate = (dateValue?: dayjs.Dayjs | null) => {
    if (!dateValue) {
      form.setFieldsValue({
        discourseTopic: undefined,
        songNumber: undefined,
        speaker: undefined,
        congregation: undefined,
        nextWeekTitle: undefined,
      });
      return;
    }

    const selectedDate = dateValue.format("YYYY-MM-DD");
    const currentMeeting =
      meetingRows.find((meeting) => meeting.fecha === selectedDate) ?? null;
    const currentConference =
      conferenceRows.find((conference) => conference.fecha === selectedDate) ?? null;
    const nextConference =
      conferenceRows.find(
        (conference) => dayjs(conference.fecha).isAfter(dateValue, "day")
      ) ?? null;

    form.setFieldsValue({
      president: currentMeeting?.presidente?.id,
      discourseTopic: currentConference?.tema?.id,
      songNumber: currentConference?.cancion,
      speaker: currentConference?.orador,
      congregation: currentConference?.cong,
      nextWeekTitle: nextConference?.tema?.id,
    });
  };

  useEffect(() => {
    if (conferenceRows.length === 0 && meetingRows.length === 0) return;

    const currentDate = form.getFieldValue("date") as dayjs.Dayjs | null | undefined;
    if (!currentDate) return;

    applyConferenceValuesForDate(currentDate);
  }, [conferenceRows, meetingRows, form]);

  const onFinish = async (values: any) => {
    if (isReadOnly) return;
    const formattedValues = {
      presidente: values.president,
      fecha: values.date?.format("YYYY-MM-DD"),
      discursoTema: values.discourseTopic,
      numeroCancion: values.songNumber,
      preguntasOpcionales: values.optionalQuestions,
      orador: values.speaker,
      congregacion: values.congregation,
      proximoTema: values.nextWeekTitle,
      conductorAtalaya: values.watchtowerConductor,
    };

    await updateSingle("presidencia", formattedValues);

    setConferencias({
      president: miembrosById[values.president] ?? "",
      date: values.date?.format("YYYY-MM-DD"),
      discourseTopic: temasById[values.discourseTopic] ?? "",
      songNumber: values.songNumber,
      optionalQuestions: values.optionalQuestions,
      speaker: values.speaker,
      congregation: values.congregation,
      nextWeekTitle: temasById[values.nextWeekTitle] ?? "",
      watchtowerConductor: miembrosById[values.watchtowerConductor] ?? "",
    });
  };

  const handleReset = () => {
    form.resetFields();
  };

  const handleValuesChange = (changedValues: { date?: dayjs.Dayjs | null }) => {
    if ("date" in changedValues) {
      applyConferenceValuesForDate(changedValues.date);
    }
  };

  return (
    <Card style={{ maxWidth: 800, margin: "0 auto" }}>
      <Title level={2} style={{ textAlign: "center", marginBottom: 24 }}>
        Presidencia de la Reunión Pública
      </Title>

      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        onValuesChange={handleValuesChange}
        disabled={isReadOnly}
        autoComplete="off"
        style={{ gap: "16px" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "16px",
          }}>
          <Form.Item
            label="Presidente"
            name="president"
            rules={[
              {
                required: true,
                message: "Por favor ingrese el nombre del presidente",
              },
            ]}>
            <SelectVarones />
          </Form.Item>

          <Form.Item
            label="Fecha"
            name="date"
            rules={[{ required: true, message: "Por favor seleccione la fecha" }]}>
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "16px",
          }}>
          <Form.Item
            label="Título del Discurso"
            name="discourseTopic"
            rules={[
              {
                required: true,
                message: "Por favor ingrese el título del discurso",
              },
            ]}>
            <SelectTemas />
          </Form.Item>
          <Form.Item
            label="N° Canción"
            name="songNumber"
            rules={[
              {
                required: true,
                message: "Por favor ingrese el número de la canción",
              },
            ]}>
            <InputNumber
              min={1}
              style={{ width: "100%" }}
              placeholder="Número de canción"
            />
          </Form.Item>
        </div>

        <Form.Item label="Preguntas Opcionales" name="optionalQuestions">
          <TextArea
            rows={4}
            placeholder="Ingrese las preguntas opcionales"
            style={{ resize: "none" }}
          />
        </Form.Item>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Form.Item
            label="Orador"
            name="speaker"
            rules={[
              { required: true, message: "Por favor ingrese el nombre del orador" },
            ]}>
            <Input placeholder="Nombre del orador" />
          </Form.Item>

          <Form.Item
            label="Congregación"
            name="congregation"
            rules={[
              {
                required: true,
                message: "Por favor ingrese el nombre de la congregación",
              },
            ]}>
            <Input placeholder="Nombre de la congregación" />
          </Form.Item>
        </div>

        <Form.Item
          label="Título del Discurso de la Próxima Semana"
          name="nextWeekTitle"
        >
          <SelectTemas />
        </Form.Item>

        <Form.Item
          label="Conductor de La Atalaya"
          name="watchtowerConductor"
          rules={[
            { required: true, message: "Por favor ingrese el nombre del conductor" },
          ]}>
          <SelectSiervos />
        </Form.Item>

        <Form.Item>
          <Flex wrap gap={16} justify="end" style={{ marginTop: 24 }}>
            {isAdminApp && (
              <>
                <Button onClick={handleReset} icon={<span>🗑️</span>}>
                  Limpiar
                </Button>
                <Button type="primary" htmlType="submit" icon={<span>💾</span>}>
                  Guardar
                </Button>
              </>
            )}
            <MeetingPDF data={conferencias} />
          </Flex>
        </Form.Item>
      </Form>
    </Card>
  );
};
