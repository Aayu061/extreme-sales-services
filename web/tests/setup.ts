import { vi } from 'vitest';

// 'server-only' throws outside a React Server environment; tests import server modules directly.
vi.mock('server-only', () => ({}));
