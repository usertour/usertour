#!/usr/bin/env node

/**
 * WebSocket Throttle Test Script
 *
 * Tests the rate limiting functionality by sending rapid messages.
 *
 * Usage:
 *   node scripts/test-ws-throttle.mjs [options]
 *
 * Options:
 *   --url=<url>       WebSocket server URL (default: http://localhost:3001)
 *   --token=<token>   API token (required)
 *   --user=<userId>   External user ID (default: throttle-test-user)
 *   --rate=<n>        Messages per second to send (default: 50)
 *   --duration=<n>    Test duration in seconds (default: 5)
 */

import { io } from 'socket.io-client';

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace('--', '').split('=');
  acc[key] = value;
  return acc;
}, {});

const config = {
  url: args.url || 'http://localhost:3000',
  token: args.token,
  userId: args.user || `throttle-test-user-${Date.now()}`,
  rate: Number.parseInt(args.rate) || 50,
  duration: Number.parseInt(args.duration) || 5,
};

if (!config.token) {
  console.error('Error: --token is required');
  console.error('Usage: node scripts/test-ws-throttle.mjs --token=<your-api-token>');
  process.exit(1);
}

console.log('🚀 WebSocket Throttle Test');
console.log('='.repeat(50));
console.log(`Server:   ${config.url}`);
console.log(`User:     ${config.userId}`);
console.log(`Rate:     ${config.rate} msg/sec`);
console.log(`Duration: ${config.duration} seconds`);
console.log('='.repeat(50));

// Statistics
const stats = {
  sent: 0,
  success: 0,
  throttled: 0,
  errors: 0,
  startTime: null,
};

// Connect to WebSocket
const socket = io(`${config.url}/v2`, {
  transports: ['websocket'],
  auth: {
    token: config.token,
    externalUserId: config.userId,
    attributes: { test: true },
  },
});

socket.on('connect', () => {
  console.log(`\n✅ Connected: ${socket.id}`);
  console.log('\n📊 Starting throttle test...\n');
  stats.startTime = Date.now();
  startTest();
});

socket.on('connect_error', (error) => {
  console.error(`❌ Connection error: ${error.message}`);
  process.exit(1);
});

socket.on('disconnect', (reason) => {
  console.log(`\n🔌 Disconnected: ${reason}`);
  printResults();
  process.exit(0);
});

socket.on('exception', (error) => {
  stats.errors++;
  const message = error.message || error;

  // ThrottlerException may be returned as "Too Many Requests" or "Internal server error"
  if (
    message.includes('Rate limit') ||
    message.includes('throttl') ||
    message.includes('Too Many Requests') ||
    message.includes('Internal server error') // NestJS often converts exceptions to this
  ) {
    stats.throttled++;
    // Only log first few throttle messages to avoid spam
    if (stats.throttled <= 5) {
      console.log(`⛔ THROTTLED: ${message}`);
    } else if (stats.throttled === 6) {
      console.log('⛔ (throttle messages suppressed...)');
    }
  } else {
    console.log(`❌ Error: ${message}`);
  }
});

function sendMessage() {
  stats.sent++;
  const requestId = `req-${stats.sent}`;

  socket.emit(
    'client-message',
    {
      kind: 'track-event',
      requestId,
      payload: {
        name: 'throttle-test-event',
        attributes: { messageNumber: stats.sent },
      },
    },
    (response) => {
      if (response === true) {
        stats.success++;
      } else {
        stats.errors++;
      }
    },
  );
}

function startTest() {
  const interval = 1000 / config.rate; // ms between messages
  const endTime = Date.now() + config.duration * 1000;

  const timer = setInterval(() => {
    if (Date.now() >= endTime) {
      clearInterval(timer);
      setTimeout(() => {
        printResults();
        socket.disconnect();
      }, 1000); // Wait 1s for final responses
      return;
    }
    sendMessage();
  }, interval);

  // Progress indicator
  const progressTimer = setInterval(() => {
    const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
    process.stdout.write(
      `\r⏱️  ${elapsed}s | Sent: ${stats.sent} | Success: ${stats.success} | Throttled: ${stats.throttled} | Errors: ${stats.errors}`,
    );
    if (Date.now() >= endTime) {
      clearInterval(progressTimer);
    }
  }, 500);
}

function printResults() {
  const duration = (Date.now() - stats.startTime) / 1000;
  const actualRate = (stats.sent / duration).toFixed(1);

  console.log(`\n\n${'='.repeat(50)}`);
  console.log('📈 TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Duration:        ${duration.toFixed(1)}s`);
  console.log(`Messages sent:   ${stats.sent}`);
  console.log(`Actual rate:     ${actualRate} msg/sec`);
  console.log(`Success:         ${stats.success} (${((stats.success / stats.sent) * 100).toFixed(1)}%)`);
  console.log(`Throttled:       ${stats.throttled} (${((stats.throttled / stats.sent) * 100).toFixed(1)}%)`);
  console.log(`Other errors:    ${stats.errors - stats.throttled}`);
  console.log('='.repeat(50));

  if (stats.throttled > 0) {
    console.log('\n✅ Rate limiting is working! Some requests were throttled.');
  } else if (stats.sent > 30) {
    console.log('\n⚠️  No throttling detected. Rate limit might be set higher than test rate.');
  }
}
