// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

export type HeadersLike = Record<string, string | string[] | undefined> | RequestInit['headers'];

export function mergeHeaders(...headers: (HeadersLike | undefined)[]): Headers {
	const mergedHeaders = new Headers();

	for (const header of headers) {
		if (!header || typeof header !== 'object') {
			continue;
		}

		for (const [key, value] of Object.entries(header)) {
			if (value === null) {
				mergedHeaders.delete(key);
			} else if (Array.isArray(value)) {
				for (const v of value) {
					mergedHeaders.append(key, v as string);
				}
			} else if (value !== undefined) {
				mergedHeaders.set(key, value);
			}
		}
	}

	return mergedHeaders;
}
