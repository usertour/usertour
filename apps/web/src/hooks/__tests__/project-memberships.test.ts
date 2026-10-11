import type { CurrentUser } from '@usertour/hooks';
import type { Project } from '@usertour/types';
import { activeProjectOf, projectsFromProfile } from '../project-memberships';

const profile = (projects: unknown): CurrentUser =>
  ({ id: 'u1', name: 'U', email: 'u@example.com', projects }) as unknown as CurrentUser;

describe('projectsFromProfile', () => {
  it('maps memberships onto projects, carrying role, activation and capabilities', () => {
    const projects = projectsFromProfile(
      profile([
        {
          role: 'OWNER',
          actived: true,
          capabilities: [],
          allowedEnvironmentIds: null,
          project: { id: 'p1', name: 'One', logoUrl: null, subscriptionId: null, customerId: null },
        },
        {
          role: 'VIEWER',
          actived: false,
          capabilities: ['content:read'],
          allowedEnvironmentIds: ['e1'],
          project: { id: 'p2', name: 'Two', logoUrl: 'l', subscriptionId: 's', customerId: 'c' },
        },
      ]),
    );
    expect(projects).toEqual([
      {
        id: 'p1',
        name: 'One',
        logoUrl: undefined,
        subscriptionId: undefined,
        customerId: undefined,
        role: 'OWNER',
        actived: true,
        allowedEnvironmentIds: null,
        capabilities: [],
      },
      {
        id: 'p2',
        name: 'Two',
        logoUrl: 'l',
        subscriptionId: 's',
        customerId: 'c',
        role: 'VIEWER',
        actived: false,
        allowedEnvironmentIds: ['e1'],
        capabilities: ['content:read'],
      },
    ]);
  });

  it('reports a known empty list as empty', () => {
    expect(projectsFromProfile(profile([]))).toEqual([]);
  });

  it('reports a list the server did not deliver as unknown, not empty', () => {
    // `me.projects` resolved to null next to a field error (errorPolicy 'all').
    expect(projectsFromProfile(profile(null))).toBeUndefined();
    expect(projectsFromProfile(profile(undefined))).toBeUndefined();
  });

  it('reports an absent user as unknown', () => {
    expect(projectsFromProfile(null)).toBeUndefined();
    expect(projectsFromProfile(undefined)).toBeUndefined();
  });
});

describe('activeProjectOf', () => {
  const project = (id: string, actived: boolean) => ({ id, actived }) as unknown as Project;

  it('is the actived project', () => {
    expect(activeProjectOf([project('p1', false), project('p2', true)])).toEqual(
      project('p2', true),
    );
  });

  it('is null when the list is known and nothing is actived', () => {
    expect(activeProjectOf([project('p1', false)])).toBeNull();
    expect(activeProjectOf([])).toBeNull();
  });

  it('is undefined while the list is unknown', () => {
    expect(activeProjectOf(undefined)).toBeUndefined();
  });
});
