import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  publicDir: "../assets",
  vite: {
    plugins: [tailwindcss()],
  },
});
