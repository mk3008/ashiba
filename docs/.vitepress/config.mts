import { defineConfig } from 'vitepress';
import type { DefaultTheme } from 'vitepress';
import typedocSidebar from '../api/typedoc-sidebar.json' with { type: 'json' };

const apiSidebar = typedocSidebar as DefaultTheme.SidebarItem[];
const apiSidebarWithIndex: DefaultTheme.SidebarItem[] = [
  { text: 'API Overview', link: '/api/index' },
  { text: 'Commands', link: '/api/commands' },
  ...apiSidebar,
];

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
      { text: 'API', link: '/api/index' },
      { text: 'Review Guide', link: '/guide/conceptspec-review' },
      { text: 'Concepts', link: '/concepts/' },
      { text: 'Architecture', link: '/architecture/package-naming-policy' },
      { text: 'Migration', link: '/migration/status' },
    ],
    sidebar: {
      '/guide/': [
        { text: 'ConceptSpec Review', link: '/guide/conceptspec-review' },
      ],
      '/api/': [
        ...apiSidebarWithIndex,
      ],
      '/concepts/': [
        { text: 'Concept Overview', link: '/concepts/' },
        { text: 'ConceptSpec Source', link: '/concepts/ashiba-concepts' },
        { text: 'Concept Map', link: '/concepts/concept-map' },
        { text: 'Concept Inventory', link: '/concepts/ashiba-concept-inventory' },
      ],
      '/architecture/': [
        { text: 'Package Naming', link: '/architecture/package-naming-policy' },
        { text: 'Driver Adapter Plan', link: '/architecture/driver-adapter-plan' },
        { text: 'SQL Transform Plan', link: '/architecture/sql-transform-plan' },
      ],
      '/migration/': [
        { text: 'Migration Status', link: '/migration/status' },
        { text: 'Gap Analysis', link: '/migration/ztd-cli-to-ashiba-gap-analysis' },
        { text: 'Code Migration Plan', link: '/migration/ztd-cli-to-ashiba-code-migration' },
      ],
      '/issues/': [
        { text: 'Implementation Plan', link: '/issues/implementation-plan' },
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
