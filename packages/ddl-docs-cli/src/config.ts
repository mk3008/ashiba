import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ResolvedSchemaSettings } from './types';

interface SchemaConfigLike {
  ddl?: {
    defaultSchema?: string;
    searchPath?: string[];
  };
}

/**
 * Resolves default schema and search path from CLI options and an explicit config.
 */
export function resolveSchemaSettings(
  explicitConfigPath: string | undefined,
  cliDefaultSchema: string | undefined,
  cliSearchPath: string[] | undefined
): ResolvedSchemaSettings {
  const config = loadSchemaConfig(explicitConfigPath);
  const fileDefaultSchema = normalizeIdentifier(config?.ddl?.defaultSchema);
  const fileSearchPath = normalizeSearchPath(config?.ddl?.searchPath);
  const defaultSchema = normalizeIdentifier(cliDefaultSchema) || fileDefaultSchema || 'public';
  const searchPath = normalizeSearchPath(cliSearchPath) || fileSearchPath || [defaultSchema];
  return { defaultSchema, searchPath };
}

function loadSchemaConfig(explicitConfigPath: string | undefined): SchemaConfigLike | null {
  if (!explicitConfigPath) return null;
  const candidate = path.resolve(explicitConfigPath);
  if (!existsSync(candidate)) return null;
  const raw = readFileSync(candidate, 'utf8');
  const parsed = JSON.parse(raw) as unknown;
  return typeof parsed === 'object' && parsed !== null ? parsed as SchemaConfigLike : null;
}

function normalizeSearchPath(value: string[] | undefined): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const normalized = value.map((entry) => normalizeIdentifier(entry)).filter(Boolean) as string[];
  if (normalized.length === 0) {
    return undefined;
  }
  return Array.from(new Set(normalized));
}

function normalizeIdentifier(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.replace(/^"|"$/g, '').toLowerCase();
}
