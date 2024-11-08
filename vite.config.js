// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // eslint-disable-next-line no-undef
        content: resolve(__dirname, "src/content/ContentScript.jsx"),
      },
      output: {
        entryFileNames: "contentscript/[name].js",
        format: "iife",
        assetFileNames: "contentscript/[name][extname]",
      },
    },
    cssCodeSplit: false,
  },
});

// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react()],

//   build: {
//     rollupOptions: {
//       input: {
//         content: "src/content/contentScript.js",
//       },
//       output: {
//         entryFileNames: "content/[name].js", // Output to `dist/content/`
//       },
//     },
//     outDir: "dist",
//   },
// });

// export default defineConfig({
//   build: {
//     rollupOptions: {
//       input: {
//         content: 'src/contentScript.js',
//       },
//       output: {
//         entryFileNames: '[name].js',
//       },
//     },
//     outDir: 'dist',
//   },
// });
