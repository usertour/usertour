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
 * Bearer auth on every request. URL hygiene (trailing slashes, missing
 * scheme) lives in lib/api.js apiBase — every URL is built through it, so
 * no request-time rewriting is needed.
 */
const prepareRequest = (request, z, bundle) => {
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
  // "Find or Create": the search step grows a checkbox that runs the paired
  // action when nothing is found. The keys must match the search keys.
  searchOrCreates: {
    [findUser.key]: {
      key: findUser.key,
      display: {
        label: 'Find or Create User',
        description: 'Finds a user by their user ID, or creates the user if none exists.',
      },
      search: findUser.key,
      create: upsertUser.key,
    },
    [findCompany.key]: {
      key: findCompany.key,
      display: {
        label: 'Find or Create Company',
        description: 'Finds a company by its company ID, or creates the company if none exists.',
      },
      search: findCompany.key,
      create: upsertCompany.key,
    },
  },
};
