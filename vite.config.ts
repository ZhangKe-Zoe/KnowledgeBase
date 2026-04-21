import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  // 部署到子路径（如 GitHub Pages https://<user>.github.io/<repo>/）时，
  // 通过环境变量 BASE 传入，例如 BASE=/KnowledgeBase/ npm run build。
  // 部署到根域名（Vercel / Netlify / Cloudflare Pages）时留空即可。
  base: process.env.BASE || '/',
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'calendar.json'],
      manifest: {
        name: '基金量化',
        short_name: 'FundQuant',
        description: 'Qlib 风格基金量化回测 + 行情看盘',
        lang: 'zh-CN',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fund\.eastmoney\.com\/pingzhongdata\/.*/,
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'pingzhongdata', expiration: { maxAgeSeconds: 60 * 60 * 24 } },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
