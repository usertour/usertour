import type { Project, UserProfile } from '@usertour/types';
import { activeProjectOf, projectsFromProfile } from '../project-memberships';

const profile = (projects: unknown): UserProfile =>
  ({ id: 'u1', name: 'U', email: 'u@example.com', projects }) as unknown as UserProfile;

describe('projectsFromProfile', () => {
  it('maps memberships onto projects, carrying role and activation', () => {
    const projects = projectsFromProfile(
      profile([
        { role: 'OWNER', actived: true, project: { id: 'p1', name: 'One' } },
        { role: 'VIEWER', actived: false, capabilities: ['content:read'], project: { id: 'p2' } },
      ]),
    );
    expect(projects).toEqual([
      {
        id: 'p1',
        name: 'One',
        role: 'OWNER',
        actived: true,
        capabilities: [],
        allowedEnvironmentIds: null,
      },
      {
        id: 'p2',
        role: 'VIEWER',
        actived: false,
        capabilities: ['content:read'],
        allowedEnvironmentIds: null,
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
  const p = (id: string, actived: boolean) => ({ id, actived }) as unknown as Project;

  it('is the actived project', () => {
    expect(activeProjectOf([p('p1', false), p('p2', true)])).toEqual(p('p2', true));
  });

  it('is null when the list is known and nothing is actived', () => {
    expect(activeProjectOf([p('p1', false)])).toBeNull();
    expect(activeProjectOf([])).toBeNull();
  });

  it('is undefined while the list is unknown', () => {
    expect(activeProjectOf(undefined)).toBeUndefined();
  });
});
