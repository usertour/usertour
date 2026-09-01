'use strict';

const { version: platformVersion } = require('zapier-platform-core');
const { version } = require('./package.json');

const authentication = require('./authentication');
const triggers = require('./triggers');
const hidden = require('./triggers/hidden');
const upsertUser = require('./creates/upsert-user');
const upsertCompany = require('./creates/upsert-company');
const trackEvent = require('./creates/track-event');
const findUser = require('./searches/find-user');
const findCompany = require('./searches/find-company');

/**
 * Bearer auth on every request, plus URL normalization: self-hosted users
 * paste server URLs with trailing slashes, which would otherwise produce
 * `//v2/...` paths that both express and the bundled nginx 404.
 */
const prepareRequest = (request, z, bundle) => {
  if (bundle.authData.apiToken) {
    request.headers = request.headers || {};
    request.headers.Authorization = `Bearer ${bundle.authData.apiToken}`;
  }
  if (request.url) {
    request.url = request.url.replace(
      /^(https?:\/\/)(.*)$/,
      (_all, scheme, rest) => scheme + rest.replace(/\/{2,}/g, '/'),
    );
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
  beforeRequest: [prepareRequest],
  triggers: {
    [triggers.flowStarted.key]: triggers.flowStarted,
    [triggers.flowCompleted.key]: triggers.flowCompleted,
    [triggers.checklistCompleted.key]: triggers.checklistCompleted,
    [triggers.questionAnswered.key]: triggers.questionAnswered,
    [triggers.userCreated.key]: triggers.userCreated,
    [triggers.flowEnded.key]: triggers.flowEnded,
    [triggers.launcherActivated.key]: triggers.launcherActivated,
    [triggers.eventTracked.key]: triggers.eventTracked,
    [hidden.projectList.key]: hidden.projectList,
    [hidden.environmentList.key]: hidden.environmentList,
    [hidden.eventDefinitionList.key]: hidden.eventDefinitionList,
  },
  creates: {
    [upsertUser.key]: upsertUser,
    [upsertCompany.key]: upsertCompany,
    [trackEvent.key]: trackEvent,
  },
  searches: {
    [findUser.key]: findUser,
    [findCompany.key]: findCompany,
  },
};
