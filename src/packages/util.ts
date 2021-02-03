/* eslint-disable */

import { diff } from 'deep-diff';

export const diffObject = <T1 extends {}, T2 extends T1>(mutObj: T1, sourceObj: T2): null|Partial<T1> => {
	const diffRes = diff(sourceObj, mutObj);

	if (typeof diffRes === 'undefined') {
		// This is undefined if there were no differences but unfortunately it's not in the @types definition
		return null;
	}
	return diffObjectReassemblePath(diffRes);
};

interface IDiff {
	// This is taken from the deepDiff declaration file
	kind: string;
	path: (string | number)[];
	lhs: any;
	rhs: any;
	index?: number;
	item?: IDiff;
}

const diffObjectReassemblePath = (iDiff: IDiff[]) => {
    /*
    INPUT: [ {kind: 'E', path: ['flags', 'repeat_order'], lhs: false, rhs: true} ]
    OUTPUT: { flags: { repeat_order: { prev: false, curr: true } } }
    */

	let ret = {};

	iDiff.forEach(diff => {
		let path = diff.path.slice(0);
		const { item, index } = diff;

		if (typeof(index) !== 'undefined') {
			path.push(index);
		}

		let obj = path.reduce((obj, prop, idx) => {
			if (idx === path.length - 1) {
				return obj;
			}
			if (typeof(obj[prop]) === 'undefined') {
				obj[prop] = Object.create(null);
			}
			return obj[prop];
		}, ret);

		let { lhs, rhs } = diff;
		if (typeof(item) !== 'undefined') {
			lhs = item.lhs;
			rhs = item.rhs;
		}

		obj[path[path.length - 1]] = { prev: lhs, curr: rhs };
	});

	return ret;
}

/** @description Converts output from diffObject() to tuple of [curr, prev] */
// export function diffObjectToTopLevel<T1>(diffObj: Partial<T1>): [Omit<T1, 'prev'|'curr'>, Omit<T1, 'prev'|'curr'>];
// export function diffObjectToTopLevel(diffObj: null): [null, null];
export function diffObjectToTopLevel<T1>(diffObj: null | Partial<T1>): [null | Omit<T1, 'prev'|'curr'>, null | Omit<T1, 'prev'|'curr'>] {

	if (diffObj === null) {
		return [null, null];
	}

	const [curr, prev] = [{}, {}];

	const recursiveFunc = (input: any, treePos: (string|number)[] = [], curr: any, prev: any) => {

		if (typeof input !== 'object') {
			return [input, curr, prev];
		}
		else if ('prev' in input && 'curr' in input && Object.keys(input).length === 2) {
			// This is bottom-level
			return [input, input.curr, input.prev];
		}

		const obj: Object = input;

		for (const key in obj) {

			if ('hasOwnProperty' in obj && !obj.hasOwnProperty(key)) {
				// Does this happen even if we use spread?
				// delete obj[key];
				continue;
			}

			if (obj[key] && typeof obj[key] === 'object' && 'length' in obj[key]) {
				// This is an array; treat it as such
				// obj[key] = (obj[key] as Object[]).map((v, i) => {
				// 	if (!(key in curr)) { curr[key] = []; }
				// 	if (!(key in prev)) { prev[key] = []; }
				// 	if (typeof curr[key][i] === 'undefined') { curr[key][i] = []; }
				// 	if (typeof prev[key][i] === 'undefined') { prev[key][i] = []; }
				// 	return recursiveDereferenceFunc(v, [...treePos, key, i], curr[key][i], prev[key][i]);
				// });
				throw new Error('Arrays are not yet supported');
				// continue; // No need for further execution on this array
			}

			if (obj[key] && typeof obj[key] === 'object' && !('length' in obj[key])) {
				// This is an object; check if this is the bottom-level object
				if (!(key in curr)) { curr[key] = {}; }
				if (!(key in prev)) { prev[key] = {}; }
				const [ret, newCurr, newPrev] = recursiveFunc(obj[key], [...treePos, key], curr[key], prev[key]);
				obj[key] = ret;
				curr[key] = newCurr;
				prev[key] = newPrev;
			}

		}

		return [obj, curr, prev];
	};

	recursiveFunc(diffObj, [], curr, prev);

	return [curr as any, prev as any];
};
