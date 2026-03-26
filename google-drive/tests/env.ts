import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function loadEnvFile(relativePath: string) {
  const filePath = fileURLToPath(new URL(relativePath, import.meta.url));
  if (existsSync(filePath) && typeof process.loadEnvFile === 'function') {
    process.loadEnvFile(filePath);
  }
}

function deriveTestDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get('schema');

  if (!schema || schema === 'public') {
    url.searchParams.set('schema', 'test');
    return url.toString();
  }

  if (!schema.endsWith('_test')) {
    url.searchParams.set('schema', `${schema}_test`);
  }

  return url.toString();
}

function assertIsolatedDatabaseUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const schema = url.searchParams.get('schema');
  const databaseName = url.pathname.replace(/^\/+/, '');

  if (schema && schema !== 'public') {
    return;
  }

  if (/_test$/i.test(databaseName)) {
    return;
  }

  throw new Error(
    `Tests must use an isolated PostgreSQL database or non-public schema. Received: ${databaseUrl}`,
  );
}

loadEnvFile('../.env');
loadEnvFile('../.env.test');

const configuredDatabaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

if (!configuredDatabaseUrl) {
  throw new Error('Missing DATABASE_URL or TEST_DATABASE_URL for test setup');
}

const testDatabaseUrl = process.env.TEST_DATABASE_URL ?? deriveTestDatabaseUrl(configuredDatabaseUrl);
assertIsolatedDatabaseUrl(testDatabaseUrl);

process.env.DATABASE_URL = testDatabaseUrl;
process.env.TEST_DATABASE_URL = testDatabaseUrl;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'test-secret';
