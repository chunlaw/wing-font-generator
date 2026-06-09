import { ConfigEnv, defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({mode}: ConfigEnv) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    __APP_ENV__: env.VITE_VITE_ENV ?? "development",
    define: {
      global: 'globalThis',
    },
    plugins: [react(), basicSsl()],
    server: {
      https: false,
      host: true,
      // port: parseInt(env.PORT ?? "9100", 10),
      // strictPort: true,
    },
  }
});
