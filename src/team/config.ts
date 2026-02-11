/**
 * Configuration System for oh-my-claudecode
 *
 * Reads/writes .omc/config.json with deep merge, type coercion,
 * and environment variable overrides.
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { atomicWriteJson } from './fs-utils.js';

/** Default configuration */
export function getDefaultConfig(): OmcConfig {
  return {
    memory: { enabled: true },
    review: { backend: null },
    ralph: {
      maxIterations: 10,
      maxTurns: 200,
      maxAttemptsPerTask: 3,
      requirePlanReview: false,
      branchMode: 'new',
      debug: false,
    },
    planSync: { enabled: true, crossEpic: false },
  };
}

export interface OmcConfig {
  memory: { enabled: boolean };
  review: { backend: string | null };
  ralph: {
    maxIterations: number;
    maxTurns: number;
    maxAttemptsPerTask: number;
    requirePlanReview: boolean;
    branchMode: 'new' | 'worktree';
    debug: boolean;
  };
  planSync: { enabled: boolean; crossEpic: boolean };
  [key: string]: unknown;
}

/** Deep merge two objects (source wins) */
function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      value && typeof value === 'object' && !Array.isArray(value) &&
      result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/** Coerce string values to their intended types (safe for bounded numbers) */
function coerceValue(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  // Only coerce integers within safe range (prevent precision loss)
  if (/^\d+$/.test(value) && value.length <= 15) {
    const n = parseInt(value, 10);
    if (Number.isSafeInteger(n)) return n;
  }
  if (/^\d+\.\d+$/.test(value) && value.length <= 20) return parseFloat(value);
  return value;
}

/** Load config from .omc/config.json, merged with defaults */
export function loadConfig(projectRoot: string): OmcConfig {
  const defaults = getDefaultConfig();
  const configPath = join(projectRoot, '.omc', 'config.json');

  if (!existsSync(configPath)) return defaults;

  try {
    const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
    return deepMerge(defaults as unknown as Record<string, unknown>, raw) as unknown as OmcConfig;
  } catch {
    return defaults;
  }
}

/** Get a specific config value by dot-separated key (e.g., "ralph.maxIterations") */
export function getConfigValue(projectRoot: string, key: string): unknown {
  const config = loadConfig(projectRoot) as unknown as Record<string, unknown>;
  const parts = key.split('.');
  let current: unknown = config;

  for (const part of parts) {
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }

  return current;
}

/** Set a config value by dot-separated key */
export function setConfigValue(projectRoot: string, key: string, value: unknown): void {
  const configPath = join(projectRoot, '.omc', 'config.json');
  let config: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    try {
      config = JSON.parse(readFileSync(configPath, 'utf-8'));
    } catch (e) { process.stderr.write(`[omc] WARN: config parse failed at ${configPath}, starting fresh: ${e}\n`); }
  }

  const parts = key.split('.');
  let current = config;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!(parts[i] in current) || typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {};
    }
    current = current[parts[i]] as Record<string, unknown>;
  }
  current[parts[parts.length - 1]] = coerceValue(value);

  atomicWriteJson(configPath, config);
}

/**
 * Resolve the current actor (who is doing the work).
 * Resolution: OMC_ACTOR env → git user.email → git user.name → $USER → "unknown"
 */
export function getActor(): string {
  // 1. Environment variable
  const envActor = process.env['OMC_ACTOR']?.trim();
  if (envActor) return envActor;

  // 2. Git email
  try {
    const email = execSync('git config user.email', {
      encoding: 'utf-8', timeout: 3000,
    }).trim();
    if (email) return email;
  } catch { /* not in git or no email set */ }

  // 3. Git name
  try {
    const name = execSync('git config user.name', {
      encoding: 'utf-8', timeout: 3000,
    }).trim();
    if (name) return name;
  } catch { /* ignore */ }

  // 4. System user
  return process.env['USER'] || 'unknown';
}

/**
 * Get a config value with env var override.
 * Checks OMC_{SECTION}_{KEY} env var first, then config file.
 */
export function getConfigWithEnvOverride(projectRoot: string, key: string): unknown {
  // Convert "ralph.maxIterations" → "OMC_RALPH_MAX_ITERATIONS"
  const envKey = 'OMC_' + key
    .replace(/\./g, '_')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toUpperCase();

  const envVal = process.env[envKey];
  if (envVal !== undefined) return coerceValue(envVal);

  return getConfigValue(projectRoot, key);
}
