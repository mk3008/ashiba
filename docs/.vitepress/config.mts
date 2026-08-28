import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Ashiba',
  description: 'Runtime-free SQL scaffolder for TypeScript applications.',
  lang: 'en-US',
  base: '/ashiba/',
  cleanUrls: true,
  lastUpdated: true,
  appearance: true,
  srcDir: '.',
  head: [
    ['link', { rel: 'icon', type: 'image/jpeg', href: '/ashiba/brand/ashiba-icon.jpg' }],
  ],
  themeConfig: {
    logo: '/brand/ashiba-icon.jpg',
    nav: [
      { text: 'API', link: '/generated/api/commands' },
      {
        text: 'Guides',
        items: [
          { text: 'Ashiba Scope', link: '/design/ashiba-scope' },
          { text: 'Guide Overview', link: '/guide/' },
          { text: 'SQL Guidelines', link: '/guide/sql-guidelines' },
          { text: 'SSSQL (current implementation)', link: '/guide/sssql' },
          { text: 'Safe Sort (current implementation)', link: '/guide/safe-sort' },
          { text: 'SQL Format', link: '/guide/sql-format' },
          { text: 'Scaffold Migration', link: '/guide/scaffold-migration' },
        ],
      },
      { text: 'Concepts', link: '/concepts/concept-map' },
    ],
    sidebar: {
      '/design/': [
        { text: 'Ashiba Scope', link: '/design/ashiba-scope' },
      ],
      '/guide/': [
        { text: 'Guide Overview', link: '/guide/' },
        { text: 'SQL Guidelines', link: '/guide/sql-guidelines' },
        { text: 'SSSQL (current implementation)', link: '/guide/sssql' },
        { text: 'Safe Sort (current implementation)', link: '/guide/safe-sort' },
        { text: 'SQL Format', link: '/guide/sql-format' },
        { text: 'Scaffold Migration', link: '/guide/scaffold-migration' },
      ],
      '/generated/api/': [
        { text: 'Command API', link: '/generated/api/commands' },
      ],
      '/concepts/': [
        { text: 'Concept Map', link: '/concepts/concept-map' },
      ],
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/mk3008/ashiba' },
    ],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright (c) 2026 Ashiba contributors',
    },
    editLink: {
      pattern: 'https://github.com/mk3008/ashiba/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },
    search: {
      provider: 'local',
    },
  },
});
