// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0

type WeightedItem<T> = {
	value: T;
	weight: number;
};

export function weightedShuffle<T>(arr: WeightedItem<T>[]): T[] {
	return arr
		.map(({ value, weight }) => ({
			value,
			weight: Math.pow(Math.random(), 1 / weight),
		}))
		.sort((a, b) => b.weight - a.weight)
		.map((item) => item.value);
}

export function shuffle<T>(arr: T[]): T[] {
	const result = [...arr];

	for (let i = result.length - 1; i > 0; i -= 1) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}

	return result;
}
