import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/',
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/lib/database-config": path.resolve(__dirname, "./src/lib/database-config-browser.ts"),
      "@/lib/database": path.resolve(__dirname, "./src/lib/database-browser"),
      "@/lib/database/adapters/sqlite": path.resolve(__dirname, "./src/lib/database-browser/adapters/sqlite.ts"),
      "@/lib/database/core/connection.manager": path.resolve(__dirname, "./src/lib/database-browser/core/connection.manager.ts"),
      "@/lib/database/index": path.resolve(__dirname, "./src/lib/database-browser/index.ts"),
      "./database/adapters/sqlite": path.resolve(__dirname, "./src/lib/database-browser/adapters/sqlite.ts"),
    },
  },
  optimizeDeps: {
    exclude: ['better-sqlite3']
  },
  build: {
    rollupOptions: {
      external: ['better-sqlite3'],
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  define: {
    global: 'globalThis',
  },
  server: {
    host: "::",
    port: 8080,
    fs: {
      allow: ['..', '../..', '../../..'],
      deny: ['**/src/server/**']
    }
  }
}));
