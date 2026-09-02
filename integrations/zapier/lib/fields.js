'use strict';

/**
 * The project + environment picker pair every scoped trigger/action/search
 * shares. One definition — six copies drifted before this existed.
 */
const scopedInputFields = [
  {
    key: 'projectId',
    label: 'Project',
    type: 'string',
    required: true,
    dynamic: 'project_list.id.name',
    altersDynamicFields: true,
  },
  {
    key: 'environmentId',
    label: 'Environment',
    type: 'string',
    required: true,
    dynamic: 'environment_list.id.name',
  },
];

module.exports = { scopedInputFields };
