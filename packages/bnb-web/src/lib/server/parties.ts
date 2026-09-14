/**
 * Shared party path resolution.
 *
 * Everything party-scoped on disk hangs off one root directory, so both
 * character files and DM metadata resolve their paths through here and share
 * the same slug validation.
 */

import { join } from 'node:path';

const DEFAULT_PARTIES_DIR = join(import.meta.dirname, '../../../../../data/parties');

/**
 * Root directory holding one subdirectory per party. Read lazily so tests can
 * point BNB_PARTIES_DIR at a fixture directory after this module is imported.
 */
export function getPartiesDir(): string {
	return process.env.BNB_PARTIES_DIR ?? DEFAULT_PARTIES_DIR;
}

/** Party and character slugs come from URLs, so keep them to plain path-safe names. */
export const SLUG_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export function isSafeSlug(value: string): boolean {
	return SLUG_PATTERN.test(value) && !value.includes('..');
}

export function assertSafeSlug(kind: 'party' | 'character', value: string): string {
	if (!isSafeSlug(value)) {
		throw new Error(`Invalid ${kind} slug "${value}"`);
	}
	return value;
}

export function partyDir(party: string): string {
	return join(getPartiesDir(), assertSafeSlug('party', party));
}
