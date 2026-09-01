'use strict';

/**
 * Hidden triggers backing the project / environment dynamic dropdowns.
 * Both read GET /v2/me — the token's real scope — so the picker can never
 * offer something the API would later refuse.
 */
const listProjects = async (z, bundle) => {
  const response = await z.request({ url: `${bundle.authData.serverUrl}/v2/me` });
  return response.data.projects;
};

const listEnvironments = async (z, bundle) => {
  const response = await z.request({ url: `${bundle.authData.serverUrl}/v2/me` });
  const project = response.data.projects.find(
    (candidate) => candidate.id === bundle.inputData.projectId,
  );
  return project ? project.environments : [];
};

const projectList = {
  key: 'project_list',
  noun: 'Project',
  display: {
    label: 'Project List',
    description: 'Projects the connected token can act on.',
    hidden: true,
  },
  operation: { perform: listProjects },
};

const environmentList = {
  key: 'environment_list',
  noun: 'Environment',
  display: {
    label: 'Environment List',
    description: 'Environments of the chosen project the connected token can act on.',
    hidden: true,
  },
  operation: {
    inputFields: [{ key: 'projectId', type: 'string', required: true }],
    perform: listEnvironments,
  },
};

module.exports = { projectList, environmentList };
