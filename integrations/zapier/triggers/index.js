'use strict';

const { hookTrigger } = require('./hook');
const samples = require('./samples');

/**
 * The visible triggers, one per webhook topic. Topic strings come from the
 * server's webhook vocabulary ("event.tracked.<codeName>" for behavior
 * events, "user.created" for the entity topic).
 */
const flowStarted = hookTrigger({
  key: 'flow_started',
  noun: 'Flow Start',
  label: 'Flow Started',
  description: 'Triggers when a user starts a flow.',
  topic: 'event.tracked.flow_started',
  sample: samples.flowStarted,
});

const flowCompleted = hookTrigger({
  key: 'flow_completed',
  noun: 'Flow Completion',
  label: 'Flow Completed',
  description: 'Triggers when a user completes a flow.',
  topic: 'event.tracked.flow_completed',
  sample: samples.flowCompleted,
});

const checklistCompleted = hookTrigger({
  key: 'checklist_completed',
  noun: 'Checklist Completion',
  label: 'Checklist Completed',
  description: 'Triggers when a user completes every task of a checklist.',
  topic: 'event.tracked.checklist_completed',
  sample: samples.checklistCompleted,
});

const questionAnswered = hookTrigger({
  key: 'question_answered',
  noun: 'Survey Answer',
  label: 'Survey Question Answered',
  description: 'Triggers when a user answers a survey question (NPS, scale, text, choice).',
  topic: 'event.tracked.question_answered',
  sample: samples.questionAnswered,
});

const userCreated = hookTrigger({
  key: 'user_created',
  noun: 'User',
  label: 'User Created',
  description: 'Triggers when a user is seen by Usertour for the first time.',
  topic: 'user.created',
  sample: samples.userCreated,
});

module.exports = { flowStarted, flowCompleted, checklistCompleted, questionAnswered, userCreated };
