import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting started',
      collapsed: false,
      items: ['getting-started/installation', 'getting-started/quickstart', 'getting-started/configuration'],
    },
    {
      type: 'category',
      label: 'CLI reference',
      collapsed: false,
      items: [
        'cli/init',
        'cli/start',
        'cli/doctor',
        'cli/models',
        'cli/train',
        'cli/logs',
        'cli/expose',
        'cli/login',
        'cli/logout',
        'cli/whoami',
        'cli/usage',
      ],
    },
    {
      type: 'category',
      label: 'API reference',
      collapsed: false,
      items: ['api/chat-completions', 'api/models', 'api/health', 'api/training'],
    },
    {
      type: 'category',
      label: 'Training',
      collapsed: false,
      items: ['training/configuration', 'training/datasets', 'training/adapters'],
    },
    {
      type: 'category',
      label: 'Architecture',
      items: ['architecture/overview'],
    },
  ],
};

export default sidebars;
