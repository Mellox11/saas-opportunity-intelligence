// Polyfill crypto.randomUUID for Node.js < 14.17.0 and test environment
import { randomUUID } from 'crypto'

global.crypto = {
  ...global.crypto,
  randomUUID,
}