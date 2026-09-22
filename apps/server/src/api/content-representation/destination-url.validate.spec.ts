import {
  ContentDataType,
  ContentEditorElementType,
  ResourceCenterBlockType,
} from '@usertour/types';

import { collectDestinationIssues } from './destination-url.validate';

const template = (url: string) => [{ type: 'paragraph', children: [{ text: url }] }];

const step = (elements: unknown[]) => ({
  cvid: 'step-1',
  data: [
    {
      element: { type: ContentEditorElementType.GROUP },
      children: [
        {
          element: { type: ContentEditorElementType.COLUMN },
          children: elements.map((element) => ({ element, children: null })),
        },
      ],
    },
  ],
});

const flowSteps = (urls: { link?: string; image?: string; navigate?: string }) => [
  step([
    {
      type: ContentEditorElementType.TEXT,
      data: [
        {
          type: 'paragraph',
          children: [
            { text: 'See ' },
            { type: 'link', url: urls.link ?? '/docs', children: [{ text: 'the docs' }] },
          ],
        },
      ],
    },
    {
      type: ContentEditorElementType.IMAGE,
      url: 'https://cdn.example/a.png',
      link: { url: urls.image ?? '/pricing' },
    },
    {
      type: ContentEditorElementType.BUTTON,
      data: {
        text: 'Go',
        actions: [
          { id: 'a1', type: 'page-navigate', data: { value: template(urls.navigate ?? '/go') } },
        ],
      },
    },
  ]),
];

describe('collectDestinationIssues', () => {
  it('passes paths, http(s), mailto and tel wherever a destination sits', () => {
    expect(
      collectDestinationIssues({
        contentType: ContentDataType.FLOW,
        steps: flowSteps({ link: 'https://x.io', image: 'mailto:a@b.c', navigate: 'tel:+1' }),
      }),
    ).toEqual([]);
  });

  it('refuses code-running schemes in rich-text links, image links and navigate targets', () => {
    const issues = collectDestinationIssues({
      contentType: ContentDataType.FLOW,
      steps: flowSteps({
        link: 'javascript:alert(1)',
        image: 'data:text/html,x',
        navigate: 'java\tscript:alert(2)',
      }),
    });
    expect(issues.map((issue) => [issue.rule, issue.path])).toEqual([
      ['destination_url', 'steps/step-1/0.0.0:text.0.1:link.url'],
      ['destination_url', 'steps/step-1/0.0.1:image.link.url'],
      ['destination_url', 'steps/step-1/0.0.2:button.actions.0:navigate.url'],
    ]);
  });

  it('sees through a user-attribute chip — a scheme cannot hide behind one', () => {
    const steps = flowSteps({});
    (
      steps[0].data[0].children[0].children[2].element as {
        data: { actions: { data: { value: unknown } }[] };
      }
    ).data.actions[0].data.value = [
      {
        type: 'paragraph',
        children: [
          { text: 'javascript:' },
          { type: 'user-attribute', attrCode: 'plan', fallback: '', children: [{ text: '' }] },
        ],
      },
    ];
    expect(
      collectDestinationIssues({ contentType: ContentDataType.FLOW, steps }).map(
        (issue) => issue.path,
      ),
    ).toEqual(['steps/step-1/0.0.2:button.actions.0:navigate.url']);
  });

  it("covers a flow step's own action slots: click-the-target and trigger actions", () => {
    const steps = flowSteps({});
    Object.assign(steps[0], {
      target: {
        actions: [{ id: 't1', type: 'page-navigate', data: { value: template('javascript:1') } }],
      },
      trigger: [
        { conditions: [], wait: 0, actions: [{ id: 'x', type: 'flow-dismis', data: {} }] },
        {
          conditions: [],
          wait: 0,
          actions: [{ id: 'y', type: 'page-navigate', data: { value: template('data:x') } }],
        },
      ],
    });
    expect(
      collectDestinationIssues({ contentType: ContentDataType.FLOW, steps }).map(
        (issue) => issue.path,
      ),
    ).toEqual([
      'steps/step-1/target.actions.0:navigate.url',
      'steps/step-1/trigger.1.actions.0:navigate.url',
    ]);
  });

  it('covers version data: a checklist task action and a resource-center list entry', () => {
    const checklist = collectDestinationIssues({
      contentType: ContentDataType.CHECKLIST,
      data: {
        items: [
          {
            id: 'item-1',
            name: 'Invite',
            clickedActions: [
              { id: 'a1', type: 'page-navigate', data: { value: template('vbscript:x') } },
            ],
          },
        ],
      },
    });
    expect(checklist.map((issue) => issue.path)).toEqual([
      'items.item-1:clickedActions.0:navigate.url',
    ]);

    const resourceCenter = collectDestinationIssues({
      contentType: ContentDataType.RESOURCE_CENTER,
      data: {
        tabs: [
          {
            id: 'tab-1',
            name: 'Home',
            blocks: [
              {
                id: 'block-1',
                type: ResourceCenterBlockType.CONTENT_LIST,
                name: [{ text: 'Guides' }],
                contentItems: [{ contentId: 'flow-1', navigateUrl: template('javascript:1') }],
              },
            ],
          },
        ],
      },
    });
    expect(resourceCenter.map((issue) => issue.path)).toEqual([
      'tabs.tab-1.blocks.block-1.contentItems.flow-1:navigate.url',
    ]);
  });

  it('lets a value the stored version already carries through verbatim', () => {
    const legacy = flowSteps({ navigate: 'sms:+1234' });
    expect(
      collectDestinationIssues({
        contentType: ContentDataType.FLOW,
        steps: legacy,
        storedSteps: legacy,
      }),
    ).toEqual([]);
    // The exemption preserves, it does not admit: a NEW unsafe value is still refused.
    expect(
      collectDestinationIssues({
        contentType: ContentDataType.FLOW,
        steps: flowSteps({ navigate: 'sms:+9999' }),
        storedSteps: legacy,
      }),
    ).toHaveLength(1);
  });
});
