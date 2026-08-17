Object.assign(process.env, {
  NODE_ENV: "test",
  DATABASE_URL: process.env.DATABASE_URL ?? "postgres://postgres:postgres@127.0.0.1:5432/auth_starter_test",
  APP_URL: process.env.APP_URL ?? "http://localhost:3000",
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET ?? "test-access-token-secret-at-least-32-chars",
  RATE_LIMIT_SECRET: process.env.RATE_LIMIT_SECRET ?? "test-rate-limit-secret-at-least-32-chars",
});
