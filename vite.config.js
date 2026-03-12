import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicRoot = path.resolve(__dirname, "public");
const assetsRoot = path.resolve(__dirname, "assets");

const collectHtmlEntries = (dir, entries = {}) => {
  const items = readdirSync(dir, { withFileTypes: true });

  items.forEach((item) => {
    const absolutePath = path.join(dir, item.name);

    if (item.isDirectory()) {
      collectHtmlEntries(absolutePath, entries);
      return;
    }

    if (!item.name.endsWith(".html")) {
      return;
    }

    const relativePath = path.relative(publicRoot, absolutePath);
    const entryName = relativePath.replace(/\\/g, "/").replace(/\.html$/, "");
    entries[entryName] = absolutePath;
  });

  return entries;
};

const copyAssetsPlugin = () => ({
  name: "copy-root-assets",
  closeBundle() {
    if (!existsSync(assetsRoot)) {
      return;
    }

    const distAssetsRoot = path.resolve(__dirname, "dist", "assets");
    mkdirSync(distAssetsRoot, { recursive: true });
    cpSync(assetsRoot, distAssetsRoot, { recursive: true, force: true });
  },
});

export default defineConfig({
  appType: "mpa",
  publicDir: false,
  server: {
    host: true,
    open: "/public/index.html",
  },
  preview: {
    host: true,
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: collectHtmlEntries(publicRoot),
    },
  },
  plugins: [copyAssetsPlugin()],
});
