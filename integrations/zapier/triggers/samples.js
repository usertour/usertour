'use strict';

/**
 * Editor samples, mirroring the real webhook envelope with `data` spread to
 * the top level (see hook.js perform). Event payloads follow the v2 `event`
 * object; entity payloads follow the v2 `user` object.
 */

const eventSample = (codeName, attributes) => ({
  id: 'whmsg_9f1c2ab34cd56ef78ab90cd12ef34ab5',
  object: 'webhookMessage',
  type: `event.tracked.${codeName}`,
  createdAt: '2026-09-01T12:34:56.000Z',
  environmentId: 'clx0example0environment0id',
  event: {
    id: 'clx0example0event0id',
    object: 'event',
    codeName,
    eventDefinitionId: 'clx0example0definition0id',
    createdAt: '2026-09-01T12:34:56.000Z',
    userId: 'user-1234',
    companyId: 'company-42',
    sessionId: 'clx0example0session0id',
    contentId: 'clx0example0content0id',
    versionId: 'clx0example0version0id',
    attributes,
  },
});

const flowStarted = eventSample('flow_started', {
  flow_id: 'clx0example0content0id',
  flow_name: 'Onboarding tour',
  flow_version_number: 3,
  flow_start_reason: 'start_condition',
  page_url: 'https://app.example.com/dashboard',
});

const flowCompleted = eventSample('flow_completed', {
  flow_id: 'clx0example0content0id',
  flow_name: 'Onboarding tour',
  flow_version_number: 3,
  flow_step_count: 5,
  page_url: 'https://app.example.com/dashboard',
});

const checklistCompleted = eventSample('checklist_completed', {
  checklist_id: 'clx0example0content0id',
  checklist_name: 'Getting started',
  page_url: 'https://app.example.com/dashboard',
});

const questionAnswered = eventSample('question_answered', {
  flow_id: 'clx0example0content0id',
  flow_name: 'NPS survey',
  question_cvid: 'clx0example0question0id',
  question_name: 'How likely are you to recommend us?',
  question_type: 'nps',
  number_answer: 9,
  page_url: 'https://app.example.com/dashboard',
});

const userCreated = {
  id: 'whmsg_9f1c2ab34cd56ef78ab90cd12ef34ab5',
  object: 'webhookMessage',
  type: 'user.created',
  createdAt: '2026-09-01T12:34:56.000Z',
  environmentId: 'clx0example0environment0id',
  user: {
    id: 'clx0example0bizuser0id',
    object: 'user',
    userId: 'user-1234',
    createdAt: '2026-09-01T12:34:56.000Z',
    attributes: {
      email: 'ada@example.com',
      name: 'Ada Lovelace',
    },
  },
};

module.exports = { flowStarted, flowCompleted, checklistCompleted, questionAnswered, userCreated };
