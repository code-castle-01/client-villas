/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vite/client" />
/// <reference types="vitest/globals" />

declare module "*.docx" {
  const src: string;
  export default src;
}
