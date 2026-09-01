'use strict';

const { version: platformVersion } = require('zapier-platform-core');
const { version } = require('./package.json');

const authentication = require('./authentication');
const triggers = require('./triggers');
const hidden = require('./triggers/hidden');
const upsertUser = require('./creates/upsert-user');

/** Bearer auth on every request; JSON errors surface as-is. */
const addAuthHeader = (request, z, bundle) => {
  if (bundle.authData.apiToken) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.apiToken}`;
  }
  return request;
};

module.exports = {
  version,
  platformVersion,
  authentication,
  // Hand input data to perform functions exactly as entered (Zapier's
  // recommended predictability flag for new integrations).
  flags: { cleanInputData: false },
  beforeRequest: [addAuthHeader],
  triggers: {
    [triggers.flowStarted.key]: triggers.flowStarted,
    [triggers.flowCompleted.key]: triggers.flowCompleted,
    [triggers.checklistCompleted.key]: triggers.checklistCompleted,
    [triggers.questionAnswered.key]: triggers.questionAnswered,
    [triggers.userCreated.key]: triggers.userCreated,
    [hidden.projectList.key]: hidden.projectList,
    [hidden.environmentList.key]: hidden.environmentList,
  },
  creates: {
    [upsertUser.key]: upsertUser,
  },
};
