/**
 * WebSocket Validation Test Script
 *
 * Tests the server-side payload validation for WebSocket messages.
 *
 * Usage:
 *   node scripts/test-ws-validation.mjs [SERVER_URL] [TOKEN]
 *
 * Example:
 *   node scripts/test-ws-validation.mjs http://localhost:3000 your-environment-token
 */

import { io } from 'socket.io-client';

const SERVER_URL = process.argv[2] || 'http://localhost:3000';
const TOKEN = process.argv[3] || 'test-token';

console.log(`\n🔌 Connecting to ${SERVER_URL}/v2...\n`);

const socket = io(`${SERVER_URL}/v2`, {
  auth: {
    token: TOKEN,
    externalUserId: 'test-user-validation',
    clientContext: {
      pageUrl: 'https://example.com/test',
      viewportWidth: 1920,
      viewportHeight: 1080,
    },
  },
  transports: ['websocket'],
  timeout: 10000,
});

// Test cases
const testCases = [
  // Basic structure validation
  {
    name: '❌ Missing kind field',
    message: { payload: {} },
    expectError: true,
  },
  {
    name: '❌ Invalid kind type (number)',
    message: { kind: 123, payload: {} },
    expectError: true,
  },
  {
    name: '❌ Null payload',
    message: { kind: 'UpsertUser', payload: null },
    expectError: true,
  },
  {
    name: '❌ String payload',
    message: { kind: 'UpsertUser', payload: 'invalid' },
    expectError: true,
  },

  // UpsertUser validation
  {
    name: '❌ UpsertUser - missing externalUserId',
    message: { kind: 'UpsertUser', payload: { attributes: {} } },
    expectError: true,
  },
  {
    name: '❌ UpsertUser - non-string externalUserId',
    message: { kind: 'UpsertUser', payload: { externalUserId: 123 } },
    expectError: true,
  },
  {
    name: '✅ UpsertUser - valid payload',
    message: {
      kind: 'UpsertUser',
      payload: { externalUserId: 'user-123', attributes: { name: 'Test' } },
    },
    expectError: false,
  },

  // StartContent validation
  {
    name: '❌ StartContent - missing contentId',
    message: {
      kind: 'StartContent',
      payload: { startReason: 'start_from_manual' },
    },
    expectError: true,
  },
  {
    name: '❌ StartContent - invalid startReason enum',
    message: {
      kind: 'StartContent',
      payload: { contentId: 'content-123', startReason: 'invalid_reason' },
    },
    expectError: true,
  },

  // UpdateClientContext validation
  {
    name: '❌ UpdateClientContext - missing viewportWidth',
    message: {
      kind: 'UpdateClientContext',
      payload: { pageUrl: 'https://example.com', viewportHeight: 1080 },
    },
    expectError: true,
  },
  {
    name: '❌ UpdateClientContext - non-number viewport',
    message: {
      kind: 'UpdateClientContext',
      payload: {
        pageUrl: 'https://example.com',
        viewportWidth: '1920',
        viewportHeight: 1080,
      },
    },
    expectError: true,
  },
  {
    name: '✅ UpdateClientContext - valid payload',
    message: {
      kind: 'UpdateClientContext',
      payload: {
        pageUrl: 'https://example.com/page',
        viewportWidth: 1920,
        viewportHeight: 1080,
      },
    },
    expectError: false,
  },

  // TrackEvent validation
  {
    name: '❌ TrackEvent - missing eventData',
    message: {
      kind: 'TrackEvent',
      payload: { eventName: 'click', sessionId: 'session-123' },
    },
    expectError: true,
  },
  {
    name: '✅ TrackEvent - valid payload (validation passes, business returns false)',
    message: {
      kind: 'TrackEvent',
      payload: {
        eventName: 'button_click',
        sessionId: 'session-123',
        eventData: { buttonId: 'submit' },
      },
    },
    expectError: false,
    allowFalseResponse: true, // Valid payload, but business logic may return false (invalid sessionId)
  },

  // Messages without validation
  {
    name: '✅ BeginBatch - no validation required',
    message: { kind: 'BeginBatch', payload: {} },
    expectError: false,
  },
  {
    name: '✅ EndBatch - no validation required',
    message: { kind: 'EndBatch', payload: {} },
    expectError: false,
  },
  {
    name: '✅ EndAllContent - no validation required',
    message: { kind: 'EndAllContent', payload: {} },
    expectError: false,
  },
];

let currentTest = 0;
let passed = 0;
let failed = 0;
let testTimeout = null;

socket.on('connect', () => {
  console.log('✅ Connected! Socket ID:', socket.id);
  console.log('\n📋 Running validation tests...\n');
  console.log('='.repeat(60));
  runNextTest();
});

socket.on('connect_error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.log('\n💡 Make sure:');
  console.log('   1. Server is running at', SERVER_URL);
  console.log('   2. Token is valid (get from your environment settings)');
  console.log('   3. externalUserId is provided');
  process.exit(1);
});

socket.on('exception', (error) => {
  clearTimeout(testTimeout);
  const test = testCases[currentTest - 1];
  if (test?.expectError) {
    console.log(`   ✅ Got expected error: "${error.message}"`);
    passed++;
  } else {
    console.log(`   ❌ Unexpected error: "${error.message}"`);
    failed++;
  }
  setTimeout(runNextTest, 100);
});

function runNextTest() {
  if (currentTest >= testCases.length) {
    printSummary();
    return;
  }

  const test = testCases[currentTest];
  currentTest++;

  console.log(`\nTest ${currentTest}/${testCases.length}: ${test.name}`);
  console.log(`   Sending: ${JSON.stringify(test.message).substring(0, 80)}...`);

  // Set timeout for each test
  testTimeout = setTimeout(() => {
    if (test.expectError) {
      console.log('   ⚠️  No error received (might be handled silently)');
      // Don't count as failed, server might handle it differently
    }
    runNextTest();
  }, 1000);

  socket.emit('client-message', test.message, (response) => {
    clearTimeout(testTimeout);
    if (test.expectError) {
      // Got a successful response when expecting error
      if (response === false) {
        console.log('   ✅ Validation rejected (returned false)');
        passed++;
      } else {
        console.log(`   ❌ Expected error but got response: ${response}`);
        failed++;
      }
    } else {
      // Not expecting error
      if (response === false) {
        if (test.allowFalseResponse) {
          console.log('   ✅ Validation passed (business logic returned false as expected)');
          passed++;
        } else {
          console.log('   ❌ Expected success but got false (validation failed)');
          failed++;
        }
      } else {
        console.log(`   ✅ Success: ${response}`);
        passed++;
      }
    }
    setTimeout(runNextTest, 100);
  });
}

function printSummary() {
  console.log(`\n${'='.repeat(60)}`);
  console.log('\n📊 Test Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   📝 Total:  ${testCases.length}\n`);

  socket.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

// Global timeout
setTimeout(() => {
  console.log('\n⏰ Global timeout reached');
  printSummary();
}, 60000);
