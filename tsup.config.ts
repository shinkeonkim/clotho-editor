import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  target: 'es2022',
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // The stylesheet is copied verbatim to dist/clotho-editor.css rather than bundled and
  // hashed, so the package can export a stable path.
  publicDir: 'src/styles',
  external: ['react', 'react-dom', '@shinkeonkim/clotho'],
});
