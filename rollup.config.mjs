// rollup.config.js
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import postcss from "rollup-plugin-postcss";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/index.js",
  output: [
    {
      file: "dist/components.js",
      format: "umd",
      name: "ATComponents", // global name
      sourcemap: true,
    },
    {
      file: "dist/components.min.js",
      format: "umd",
      name: "ATComponents",
      plugins: [terser()],
      sourcemap: false,
    },
  ],
  plugins: [
    resolve(),
    commonjs(),
    postcss({
      extract: "dist/components.css", // writes CSS file
      minimize: true,
      modules: false,
    }),
  ],
};
