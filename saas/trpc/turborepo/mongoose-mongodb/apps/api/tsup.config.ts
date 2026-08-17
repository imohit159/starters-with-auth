import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["./src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  splitting: false,
  outDir: "./dist",
  clean: true,
  minify: true,
  sourcemap: true,
  dts: false,
  env: {
    NODE_ENV: "production",
  },
  // Workspace packages ship TypeScript sources; compile them into dist.
  noExternal: [/^@repo\//],
  // Native addon — bundling argon2 breaks at runtime.
  // Leave other npm packages external so CJS packages (mongoose) keep working.
  external: ["argon2"],
});
