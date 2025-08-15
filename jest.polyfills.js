// Polyfill crypto.randomUUID for Node.js < 14.17.0 and test environment
import { randomUUID } from 'crypto'
import { TransformStream } from 'stream/web'

global.crypto = {
  ...global.crypto,
  randomUUID,
}

// Polyfill TransformStream for AI SDK compatibility
global.TransformStream = TransformStream