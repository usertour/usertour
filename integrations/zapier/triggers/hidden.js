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

const listEventDefinitions = async (z, bundle) => {
  // Walk the whole cursor-paginated collection (auto-registered definitions
  // make >100 realistic; a truncated dropdown would silently hide events).
  const definitions = [];
  let url =
    `${bundle.authData.serverUrl}/v2/projects/${bundle.inputData.projectId}` +
    '/event-definitions?limit=100';
  while (url && definitions.length < 1000) {
    const response = await z.request({ url });
    definitions.push(...response.data.results);
    url = response.data.next;
  }
  // Dropdowns key on `id`; the trigger subscribes by code name, so that IS
  // the id here. Built-in definitions are listed too — subscribing to them
  // is fine (only the write path refuses reserved names).
  return definitions.map((definition) => ({
    id: definition.codeName,
    name: definition.displayName || definition.codeName,
  }));
};

const eventDefinitionList = {
  key: 'event_definition_list',
  noun: 'Event',
  display: {
    label: 'Event Definition List',
    description: 'Event definitions of the chosen project.',
    hidden: true,
  },
  operation: {
    inputFields: [{ key: 'projectId', type: 'string', required: true }],
    perform: listEventDefinitions,
  },
};

module.exports = { projectList, environmentList, eventDefinitionList };
