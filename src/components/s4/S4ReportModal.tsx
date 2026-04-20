import { SaveOutlined } from "@ant-design/icons";
import {
  Button,
  Checkbox,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Space,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import React, { useEffect } from "react";
import {
  S4PdfDownloadButton,
  type S4PdfData,
} from "../PastoreoPublisherFormsPDF";
import {
  buildS4FileName,
  emptyS4FormValues,
  findS4ReportForMemberMonth,
  formatS4MonthLabel,
  getS4FormValuesFromReport,
  type S4FormValues,
  type S4MemberSummary,
  type S4ReportRecord,
} from "./s4Reports";
import "./styles.css";

type S4ReportModalProps = {
  open: boolean;
  member: S4MemberSummary | null;
  month: Dayjs;
  reports: S4ReportRecord[];
  isSmallScreen?: boolean;
  readOnly?: boolean;
  saving?: boolean;
  onMonthChange: (month: Dayjs) => void;
  onCancel: () => void;
  onSubmit: (values: S4FormValues) => void | Promise<void>;
};

export const S4ReportModal: React.FC<S4ReportModalProps> = ({
  open,
  member,
  month,
  reports,
  isSmallScreen = false,
  readOnly = false,
  saving = false,
  onMonthChange,
  onCancel,
  onSubmit,
}) => {
  const [form] = Form.useForm<S4FormValues>();

  useEffect(() => {
    if (!open || !member) {
      return;
    }

    form.setFieldsValue(
      getS4FormValuesFromReport(
        findS4ReportForMemberMonth(reports, member.id, month),
      ),
    );
  }, [form, member?.id, month, open, reports]);

  const watchedParticipoMinisterio = Form.useWatch(
    "participoMinisterio",
    form,
  );
  const watchedCursosBiblicos = Form.useWatch("cursosBiblicos", form);
  const watchedHoras = Form.useWatch("horas", form);
  const watchedComentarios = Form.useWatch("comentarios", form);

  const s4PdfData: S4PdfData | null = member
    ? {
        memberName: member.nombre,
        monthLabel: formatS4MonthLabel(month.format("YYYY-MM-DD")),
        participated: Boolean(watchedParticipoMinisterio),
        bibleStudies: watchedCursosBiblicos ?? 0,
        hours: watchedHoras ?? "",
        comments: watchedComentarios ?? "",
      }
    : null;

  const handleClose = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={handleClose}
      footer={
        <Flex justify="space-between" wrap="wrap" gap={12}>
          <Space>
            {s4PdfData ? (
              <S4PdfDownloadButton
                data={s4PdfData}
                fileName={buildS4FileName(member?.nombre ?? "publicador", month)}
              />
            ) : null}
          </Space>
          <Space>
            <Button onClick={handleClose} disabled={saving}>
              Cerrar
            </Button>
            {!readOnly ? (
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={() => form.submit()}
                loading={saving}
                disabled={!member}
              >
                Guardar S-4
              </Button>
            ) : null}
          </Space>
        </Flex>
      }
      width={isSmallScreen ? "100%" : 640}
      className="s4-report-modal"
    >
      <div className="s4-report-sheet-tools">
        <DatePicker
          picker="month"
          value={month}
          format="MMMM YYYY"
          disabled={saving}
          onChange={(value) => {
            onMonthChange((value ?? dayjs()).startOf("month"));
          }}
        />
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        initialValues={emptyS4FormValues}
      >
        <div className="s4-report-form-sheet">
          <h2 className="s4-report-form-sheet__title">
            Informe de predicación
          </h2>

          <div className="s4-report-row">
            <span className="s4-report-row__label">Nombre:</span>
            <div className="s4-report-row__value">{member?.nombre ?? ""}</div>
          </div>

          <div className="s4-report-row">
            <span className="s4-report-row__label">Mes:</span>
            <div className="s4-report-row__value">
              {formatS4MonthLabel(month.format("YYYY-MM-DD"))}
            </div>
          </div>

          <div className="s4-report-block">
            <div className="s4-report-block__row">
              <div className="s4-report-block__label">
                Marque la casilla si participó en alguna faceta de la
                predicación durante el mes
              </div>
              <div className="s4-report-block__value">
                <Form.Item
                  name="participoMinisterio"
                  valuePropName="checked"
                  style={{ margin: 0 }}
                >
                  <Checkbox />
                </Form.Item>
              </div>
            </div>

            <div className="s4-report-block__row">
              <div className="s4-report-block__label">
                Número de diferentes cursos bíblicos dirigidos
              </div>
              <div className="s4-report-block__value">
                <Form.Item name="cursosBiblicos" style={{ margin: 0 }}>
                  <InputNumber
                    min={0}
                    controls={false}
                    style={{ width: "100%" }}
                  />
                </Form.Item>
              </div>
            </div>

            <div className="s4-report-block__row">
              <div className="s4-report-block__label">
                Horas (para precursores auxiliares, regulares y especiales, o
                misioneros en el campo)
              </div>
              <div className="s4-report-block__value">
                <Form.Item name="horas" style={{ margin: 0 }}>
                  <Input placeholder="0" />
                </Form.Item>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            <Form.Item
              name="precursorAuxiliar"
              valuePropName="checked"
              style={{ marginBottom: 0 }}
            >
              <Checkbox>Sirvió como precursor auxiliar este mes</Checkbox>
            </Form.Item>
          </div>

          <div className="s4-report-comments">
            <div className="s4-report-comments__label">Comentarios:</div>
            <div className="s4-report-comments__value">
              <Form.Item name="comentarios" style={{ margin: 0 }}>
                <Input.TextArea
                  autoSize={{ minRows: 4, maxRows: 6 }}
                  bordered={false}
                  style={{
                    background: "transparent",
                    boxShadow: "none",
                    padding: 0,
                    resize: "none",
                  }}
                />
              </Form.Item>
            </div>
          </div>

          <div className="s4-report-footer">
            <span>S-4-S</span>
            <span>11/23</span>
          </div>
        </div>
      </Form>
    </Modal>
  );
};
