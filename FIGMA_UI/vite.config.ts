import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

function stripVersion(spec: string) {
  const m1 = spec.match(/^(?:@[^/]+\/[^@]+|[^@]+)@.+$/);
  if (!m1) return spec;
  const idx = spec.lastIndexOf("@");
  if (idx > 0 && spec.includes("/")) return spec.slice(0, idx);
  if (!spec.startsWith("@") && idx > 0) return spec.slice(0, idx);
  return spec;
}

const versionAlias = [
  "@radix-ui/react-accordion@1.2.3",
  "@radix-ui/react-alert-dialog@1.1.6",
  "@radix-ui/react-aspect-ratio@1.1.2",
  "@radix-ui/react-avatar@1.1.3",
  "@radix-ui/react-checkbox@1.1.4",
  "@radix-ui/react-collapsible@1.1.3",
  "@radix-ui/react-context-menu@2.2.6",
  "@radix-ui/react-dialog@1.1.6",
  "@radix-ui/react-dropdown-menu@2.1.6",
  "@radix-ui/react-hover-card@1.1.6",
  "@radix-ui/react-label@2.1.2",
  "@radix-ui/react-menubar@1.1.6",
  "@radix-ui/react-navigation-menu@1.2.5",
  "@radix-ui/react-popover@1.1.6",
  "@radix-ui/react-progress@1.1.2",
  "@radix-ui/react-radio-group@1.2.3",
  "@radix-ui/react-scroll-area@1.2.3",
  "@radix-ui/react-select@2.1.6",
  "@radix-ui/react-separator@1.1.2",
  "@radix-ui/react-slider@1.2.3",
  "@radix-ui/react-slot@1.1.2",
  "@radix-ui/react-switch@1.1.3",
  "@radix-ui/react-tabs@1.1.3",
  "@radix-ui/react-toggle@1.1.2",
  "@radix-ui/react-toggle-group@1.1.2",
  "@radix-ui/react-tooltip@1.1.8",
  "lucide-react@0.487.0",
  "class-variance-authority@0.7.1",
  "cmdk@1.1.1",
  "react-day-picker@8.10.1",
  "recharts@2.15.2",
  "vaul@1.1.2",
  "input-otp@1.4.2",
  "react-resizable-panels@2.1.7",
  "sonner@2.0.3",
  "next-themes@0.4.6"
];

const alias: Record<string, string> = Object.fromEntries(
  versionAlias.map((s) => [s, stripVersion(s)])
);

export default defineConfig({
  plugins: [react()],
  resolve: { alias },
  server: {
    port: 5173,
    strictPort: true,
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
    },
    proxy: {
      "/geo": {
        target: "https://nominatim.openstreetmap.org",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/geo\/reverse/, "/reverse"),
      },
    },
  },
});
