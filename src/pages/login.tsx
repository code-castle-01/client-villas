import { useLogin } from "@refinedev/core";
import { useEffect, useState } from "react";

import { Button, Card, Flex, Form, Input, Typography } from "antd";
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
  const [backgroundImage, setBackgroundImage] = useState<string>("");

  useEffect(() => {
    // Select a random image on component mount
    const randomIndex = Math.floor(Math.random() * landscapeImages.length);
    setBackgroundImage(landscapeImages[randomIndex]);
  }, []);

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
            onFinish={(values) => login(values)}
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
            <Button type="primary" htmlType="submit" block size="large">
              Entrar
            </Button>
          </Form>
        </Card>
      </Flex>
    </Flex>
  );
};
