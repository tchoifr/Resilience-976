/// <reference types="vitest" />

import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  // `preview` sert le build de production : sans ce proxy, tout appel /api/*
  // echoue en 404 et l'audit Lighthouse mesure une page qui n'est pas celle
  // que verra un visiteur. Le nginx du VPS proxifie de la meme facon.
  preview: {
    proxy: {
      '/api': 'http://127.0.0.1:8787',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/unit/**/*.spec.ts'],
  },
})
