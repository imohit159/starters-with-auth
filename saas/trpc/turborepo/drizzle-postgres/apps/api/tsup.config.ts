import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/server.ts", "./src/migrate.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  outDir: "./dist",
  clean: true,
  minify: true,
  sourcemap: true,
  dts: false,
  env: {
    NODE_ENV: "production",
  },
  noExternal: [/^@repo\//],
  external: ["argon2"],
});
