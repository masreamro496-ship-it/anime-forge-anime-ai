// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// fabric v5 ships a Node build that requires the native "canvas" module (and jsdom),
// which breaks bundling for the Cloudflare SSR build. Force the browser bundle and
// stub out the Node-only deps so they are never resolved at build time.
const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const fabricBrowserBundle = path.resolve(projectRoot, "node_modules/fabric/dist/fabric.min.js");
const emptyStub = path.resolve(projectRoot, "stubs/empty.js");

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    resolve: {
      alias: [
        { find: /^fabric$/, replacement: fabricBrowserBundle },
        { find: /^fabric\/dist\/fabric\.min\.js$/, replacement: fabricBrowserBundle },
        { find: /^jsdom$/, replacement: emptyStub },
        { find: /^canvas$/, replacement: emptyStub },
      ],
    },
  },
});
