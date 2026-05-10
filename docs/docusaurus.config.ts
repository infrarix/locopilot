import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'LocoPilot',
  tagline: 'Run AI locally. Scale globally.',
  favicon: 'img/favicon.svg',

  future: {
    v4: true,
  },

  url: 'https://infrarix.github.io',
  baseUrl: '/locopilot/',

  organizationName: 'Infrarix',
  projectName: 'locopilot',

  onBrokenLinks: 'warn',
  onBrokenAnchors: 'ignore',
  markdown: {
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  plugins: [
    function tailwindPlugin() {
      return {
        name: 'tailwind-plugin',
        configurePostCss(postcssOptions) {
          postcssOptions.plugins.push(require('tailwindcss'), require('autoprefixer'));
          return postcssOptions;
        },
      };
    },
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: 'docs',
          editUrl: 'https://github.com/Infrarix/locopilot/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'LocoPilot',
      logo: {
        alt: 'LocoPilot',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/cli/init',
          label: 'CLI',
          position: 'left',
        },
        {
          to: '/docs/api/chat-completions',
          label: 'API',
          position: 'left',
        },
        {
          to: '/docs/training/configuration',
          label: 'Training',
          position: 'left',
        },
        {
          href: 'https://github.com/Infrarix/locopilot',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Product',
          items: [
            { label: 'Get started', to: '/docs/intro' },
            { label: 'Quickstart', to: '/docs/getting-started/quickstart' },
            { label: 'Architecture', to: '/docs/architecture/overview' },
          ],
        },
        {
          title: 'Reference',
          items: [
            { label: 'CLI reference', to: '/docs/cli/init' },
            { label: 'API reference', to: '/docs/api/chat-completions' },
            { label: 'Training guide', to: '/docs/training/configuration' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'GitHub', href: 'https://github.com/Infrarix/locopilot' },
            { label: 'Issues', href: 'https://github.com/Infrarix/locopilot/issues' },
            { label: 'Discord', href: 'https://discord.gg/locopilot' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} LocoPilot. CLI and API are MIT licensed.`,
    },
    prism: {
      theme: prismThemes.oneLight,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'json', 'typescript', 'python', 'yaml'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
