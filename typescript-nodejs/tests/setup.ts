// Global test setup for Architecture.Core
// This file is run once before all tests

// Configure Jest timeout for async operations
jest.setTimeout(10000);

// Custom Jest matchers for functional types
expect.extend({
  toBeSuccess(received: { isSuccess: boolean }) {
    const pass = received.isSuccess === true;
    return {
      message: () =>
        pass
          ? `Expected Result to not be success`
          : `Expected Result to be success but was failure`,
      pass,
    };
  },

  toBeFailure(received: { isSuccess: boolean }) {
    const pass = received.isSuccess === false;
    return {
      message: () =>
        pass
          ? `Expected Result to not be failure`
          : `Expected Result to be failure but was success`,
      pass,
    };
  },

  toHaveValue(received: { hasValue: boolean }) {
    const pass = received.hasValue === true;
    return {
      message: () =>
        pass
          ? `Expected Maybe to not have value`
          : `Expected Maybe to have value but was None`,
      pass,
    };
  },

  toBeNone(received: { hasValue: boolean }) {
    const pass = received.hasValue === false;
    return {
      message: () =>
        pass
          ? `Expected Maybe to not be None`
          : `Expected Maybe to be None but had value`,
      pass,
    };
  },
});

// Suppress console logs during tests unless explicitly testing them
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});