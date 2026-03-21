import { test, expect } from 'vitest';

// Test basic imports work
test('Basic imports', async () => {
  try {
    const { AccessControl } = await import('../src/core/index');
    expect(AccessControl).toBeDefined();
    expect(typeof AccessControl.create).toBe('function');
  } catch (error) {
    expect.fail(`Import failed: ${(error as Error).message}`);
  }
});

// Test route loading functions
test('Route loading functions', async () => {
  try {
    const { loadRoutes, getRoutes, findRoute } = await import('../src/core/routes');
    expect(typeof loadRoutes).toBe('function');
    expect(typeof getRoutes).toBe('function');
    expect(typeof findRoute).toBe('function');
  } catch (error) {
    expect.fail(`Route functions import failed: ${(error as Error).message}`);
  }
});
