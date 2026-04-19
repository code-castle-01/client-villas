import { useLogin } from "@refinedev/core";
import { useEffect, useState } from "react";
import {
  AutoCenter,
  Button as MobileButton,
  Card as MobileCard,
  Input as MobileInput,
  NoticeBar,
  SafeArea,
  Toast,
} from "antd-mobile";
import { Button, Card, Flex, Form, Input, Typography } from "antd";
import { useAdaptiveUI } from "../adaptive/useAdaptiveUI";
import { appName } from "../config/env";

// Array of landscape image URLs from Pixabay
const landscapeImages = [
  "https://cdn.pixabay.com/photo/2015/04/23/22/00/tree-736885_1280.jpg",
  "https://cdn.pixabay.com/photo/2016/05/05/02/37/sunset-1373171_1280.jpg",
  "https://cdn.pixabay.com/photo/2018/01/14/23/12/nature-3082832_1280.jpg",
  "https://cdn.pixabay.com/photo/2015/12/01/20/28/road-1072823_1280.jpg",
  "https://cdn.pixabay.com/photo/2013/07/18/20/26/sea-164989_1280.jpg",
];

export const Login: React.FC = () => {
  const { mutate: login } = useLogin<{
    identifier: string;
    password: string;
  }>();
  const { resolvedMode } = useAdaptiveUI();
  const [backgroundImage, setBackgroundImage] = useState<string>("");
  const [mobileValues, setMobileValues] = useState({
    identifier: "",
    password: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Select a random image on component mount
    const randomIndex = Math.floor(Math.random() * landscapeImages.length);
    setBackgroundImage(landscapeImages[randomIndex]);
  }, []);

  const handleSubmit = (values: { identifier: string; password: string }) => {
    setIsSubmitting(true);
    login(values, {
      onError: (error) => {
        Toast.show({
          content:
            error instanceof Error ? error.message : "No se pudo iniciar sesión.",
        });
      },
      onSettled: () => {
        setIsSubmitting(false);
      },
    });
  };

  if (resolvedMode === "mobile") {
    return (
      <div
        style={{
          minHeight: "100vh",
          padding: "0 16px 16px",
          background:
            "radial-gradient(circle at top, rgba(126, 44, 111, 0.24), transparent 28%), linear-gradient(180deg, #f7f2f8 0%, #efe7f4 100%)",
          color: "var(--app-color-text)",
        }}
      >
        <SafeArea position="top" />
        <div style={{ paddingTop: 28, display: "grid", gap: 18 }}>
          <AutoCenter>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 24,
                display: "grid",
                placeItems: "center",
                background:
                  "linear-gradient(160deg, var(--app-color-primary), var(--app-color-primary-accent))",
                color: "#fff",
                fontSize: 32,
                boxShadow: "var(--app-shadow)",
              }}
            >
              ⛪
            </div>
          </AutoCenter>

          <div style={{ textAlign: "center", display: "grid", gap: 8 }}>
            <Typography.Title
              level={2}
              style={{ margin: 0, fontFamily: '"Space Grotesk", sans-serif' }}
            >
              {appName}
            </Typography.Title>
            <Typography.Text type="secondary">
              Una experiencia tipo app, optimizada para usarla desde tu celular.
            </Typography.Text>
          </div>

          <NoticeBar content="Instálala como PWA para abrirla a pantalla completa." />

          <MobileCard className="mobile-screen-card">
            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Email</span>
                <MobileInput
                  value={mobileValues.identifier}
                  placeholder="correo@ejemplo.com"
                  clearable
                  onChange={(value) =>
                    setMobileValues((current) => ({
                      ...current,
                      identifier: value,
                    }))
                  }
                />
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 700 }}>Contraseña</span>
                <MobileInput
                  value={mobileValues.password}
                  placeholder="••••••••"
                  clearable
                  type="password"
                  onChange={(value) =>
                    setMobileValues((current) => ({
                      ...current,
                      password: value,
                    }))
                  }
                />
              </label>

              <MobileButton
                block
                color="primary"
                loading={isSubmitting}
                onClick={() => handleSubmit(mobileValues)}
              >
                Entrar
              </MobileButton>
            </div>
          </MobileCard>
        </div>
        <SafeArea position="bottom" />
      </div>
    );
  }

  return (
    <Flex
      className="h-screen flex justify-center items-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5)), url(${backgroundImage})`,
      }}
    >
      <Flex justify="center" align="center" vertical gap={12}>
        <Typography.Title level={1} className="text-sky-300">
          {appName}
        </Typography.Title>
        <Card size="small">
          <Form
            size="large"
            layout="vertical"
            onFinish={handleSubmit}
            style={{ width: 320 }}
          >
            <Form.Item
              label="Email"
              name="identifier"
              rules={[{ required: true, message: "Ingresa tu email" }]}
            >
              <Input placeholder="correo@ejemplo.com" size="large" />
            </Form.Item>
            <Form.Item
              label="Contraseña"
              name="password"
              rules={[{ required: true, message: "Ingresa tu contraseña" }]}
            >
              <Input.Password placeholder="••••••••" size="large" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
              Entrar
            </Button>
          </Form>
        </Card>
      </Flex>
    </Flex>
  );
};
