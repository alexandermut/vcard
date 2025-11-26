import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock IndexedDB
import 'fake-indexeddb/auto';

// Mock URL.createObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Worker
global.Worker = vi.fn();

// Mock fetch
global.fetch = vi.fn();
