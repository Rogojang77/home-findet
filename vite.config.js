import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// inline empty PostCSS config so Vite doesn't pick up a postcss.config from a parent folder
export default defineConfig({ plugins: [react()], css: { postcss: {} } });
