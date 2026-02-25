import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

let alreadyLoaded = false;

/**
 * Loads backend environment variables from `.env` when present.
 * Existing process env values are preserved so shell/exported values still win.
 */
export const loadBackendEnv = (fileName = '.env') => {
  if (alreadyLoaded) {
    return;
  }

  const envFilePath = resolve(process.cwd(), fileName);
  if (!existsSync(envFilePath)) {
    alreadyLoaded = true;
    return;
  }

  // Prefer Node's built-in env loader when available.
  const nativeLoadEnvFile = (process as any).loadEnvFile;
  if (typeof nativeLoadEnvFile === 'function') {
    try {
      nativeLoadEnvFile(envFilePath);
      alreadyLoaded = true;
      return;
    } catch {
      // Fall through to the lightweight parser below.
    }
  }

  const contents = readFileSync(envFilePath, 'utf8');
  const lines = contents.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmed.indexOf('=');
    if (equalIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, equalIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(equalIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    } else {
      const inlineCommentIndex = value.indexOf(' #');
      if (inlineCommentIndex >= 0) {
        value = value.slice(0, inlineCommentIndex).trim();
      }
    }

    process.env[key] = value;
  }

  alreadyLoaded = true;
};
