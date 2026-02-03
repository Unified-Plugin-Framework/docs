import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/overview',
        'architecture/plugin-system',
        'architecture/communication',
        'architecture/ui-federation',
        'architecture/deployment',
      ],
    },
    {
      type: 'category',
      label: 'Specifications',
      items: [
        'specifications/plugin-manifest',
        'specifications/interfaces',
        'specifications/grpc-contracts',
        'specifications/ui-contracts',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      items: [
        'guides/getting-started',
        'guides/plugin-development',
        'guides/deployment-guide',
        'guides/contributing',
      ],
    },
    {
      type: 'category',
      label: 'Architecture Decisions',
      items: [
        'decisions/adr-001-bun-typescript',
        'decisions/adr-002-grpc-communication',
        'decisions/adr-003-react-native-repack',
        'decisions/adr-004-interface-first-design',
        'decisions/adr-005-message-bus-abstraction',
      ],
    },
  ],
};

export default sidebars;
