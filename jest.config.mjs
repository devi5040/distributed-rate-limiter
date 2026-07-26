// jest.config.mjs
export default {
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    // Configure ts-jest to use ESM
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true,
      },
    ],
  },
  moduleNameMapper: {
    // Fixes mandatory .js extension imports inside TypeScript ESM
    "^(\\..*)\\.js$": "$1",
  },

  // 👇 Only run tests from source
  testMatch: ["**/__tests__/**/*.test.ts"],

  // 👇 Ignore compiled output
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
};
