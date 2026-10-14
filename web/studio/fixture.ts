export const QUESTIONS = [
  "Where is authenticate defined?",
  "What calls loadSession?",
];
export const SOURCES: [string, string][] = [
  [
    "src/auth.ts",
    `import { loadSession } from './session';\nexport function authenticate(token: string) { return loadSession(token); }\n`,
  ],
  [
    "src/session.ts",
    `export function loadSession(token: string) { return { user: token, authenticated: true }; }\n`,
  ],
  [
    "src/routes.ts",
    `import { authenticate } from './auth';\nexport function handleRequest(token: string) { return authenticate(token); }\n`,
  ],
  [
    "src/cache.ts",
    `const cache = new Map();\nexport function invalidateCache(key: string) { return cache.delete(key); }\n`,
  ],
  [
    "src/mail.ts",
    `export function sendMail(address: string) { return 'Message for ' + address; }\n`,
  ],
];
// Authored vectors and judgments exercise replay; they are not provider outputs.
export const VECTORS: Record<string, number[]> = {
  "src/auth.ts": [1, 0, 0],
  "src/session.ts": [0.8, 0.6, 0],
  "src/routes.ts": [0.6, 0.8, 0],
  "src/cache.ts": [0, 0, 1],
  "src/mail.ts": [0, 0.2, 0.98],
};
export const JUDGMENTS: Record<string, number> = {
  "src/auth.ts": 0.95,
  "src/session.ts": 0.7,
  "src/routes.ts": 0.5,
  "src/cache.ts": 0.05,
  "src/mail.ts": 0.01,
};
