/* eslint-disable */

import { entries, remove, action, toJS, isObservableObject } from 'mobx';
import { diffObject, diffObjectToTopLevel } from './util';
import 'reflect-metadata';

export interface MobxStoreMutableIface<U> {
	mutate(obj: Partial<U>): void;
	mutate<T extends keyof U>(prop: T, val: U[T]): void;
	mutate<T extends keyof U>(varidic: T | Partial<U>, val?: U[T]): void;
	hmrRestore?: (objectData: Partial<U>) => void;
	toJson(): string;
	toJsonExperimental(): string;
	fromJson(jsonStr: string): void;
}

export abstract class MobxStoreMutable<U> implements MobxStoreMutableIface<U> {

	mutate(obj: Partial<U>): void;
	mutate<T extends keyof U>(prop: T, val: U[T]): void;
	@action.bound
	mutate<T extends keyof U>(varidic: T | Partial<U>, val?: U[T]): void {
		const obj: Partial<U> = (typeof varidic === 'object' ? varidic : { [varidic]: val } as Partial<U>);
		Object.entries(obj).forEach(([prop, value]) => {
			const thisProp = this[prop];
			if (prop === 'rootStore' || prop === 'parentStore') {
				// We really don't want to be handling recursive references and rootStore is one instance of that.
				// REVIEW: This can probably be handled more elegantly but for now this'll do since rootStore is part of this paradigm.
				return true;
			}
			else if (thisProp && typeof thisProp === 'object') {
				if (thisProp === value) {
					// We're assigning ourselves to ourselves. An example of how this could happen is:
					//     store.mutate({ myProp: ( store.myProp || [] ) })
					// There is no need to proceed with this assignment as it may actually screw things up to do the transformation we want
					return true;
				}
				else if (typeof thisProp.clear === 'function') {
					// observable.array type
					thisProp.clear();
				}
				else if (isObservableObject(thisProp)) {
					// observable.object type
					entries(thisProp).forEach(([key]) => remove(this[prop], key));
				}
				else {
					// Non-observable object
					Object.entries(thisProp).forEach(([key]) => delete thisProp[key]);
				}
			}
			this[prop] = value;
			return true;
		});
	}

	toJson(useExperimental: boolean = true): string {

		if (useExperimental) {
			return this.toJsonExperimental();
		}

		const encounteredObjects: Object[] = [];

		const foo = (obj: Object) => {

			encounteredObjects.push(obj);

			const newObj = { ...obj };

			for (const key in newObj) {

				if (!newObj.hasOwnProperty(key)) {
					// Does this happen even if we use spread?
					delete newObj[key];
					continue;
				}

				if (typeof newObj[key] === 'function') {
					delete newObj[key];
					continue;
				}
				else if (newObj[key] && typeof newObj[key] === 'object' && 'length' in newObj[key]) {
					// This is an array; treat it as such
					newObj[key] = (newObj[key] as Object[]).map(v => foo(v));
					continue; // No need for further execution on this array
				}

				if (newObj[key] instanceof MobxStoreMutable) {
					// This is a mutable store. Copy this as if it were an empty obj.
					newObj[key] = {};
				}

				if (newObj[key] && typeof newObj[key] === 'object' && !('length' in newObj[key])) {
					if (!encounteredObjects.includes(obj[key])) {
						newObj[key] = foo(obj[key]);
					}
					else {
						// This is a cyclic property; drop it entirely
						delete newObj[key];
					}
				}

			}

			return newObj;
		};

		const bar = foo(this);

		return JSON.stringify(bar);
	}

	/**
	 * This is planned to replace {@link toJson} but is still in the evaluation phase.
	 * The primary difference is this uses mobx.toJS before running the recursiveDereferenceFunc.
	 * It also better handles recursing through arrays with non-object contents (eg. `number[]`).
	 */
	toJsonExperimental(): string {
		return MobxStoreMutable.objToJsonExperimental(this);
	}

	static objToJsonExperimental(sourceObj: Object): string {

		const encounteredObjects: Object[] = [];
		const encounteredObjectPaths: (string | number)[][] = [];

		const recursiveDereferenceFunc = (input: any, treePos: (string | number)[] = []) => {

			if (typeof input !== 'object') {
				return input;
			}

			const obj: Object = input;

			encounteredObjects.push(obj);
			encounteredObjectPaths.push(treePos);

			const newObj = { ...obj };

			for (const key in newObj) {

				if (!newObj.hasOwnProperty(key)) {
					// Does this happen even if we use spread?
					delete newObj[key];
					continue;
				}

				if (typeof newObj[key] === 'function') {
					delete newObj[key];
					continue;
				}
				else if (newObj[key] && typeof newObj[key] === 'object' && 'length' in newObj[key] && 'map' in newObj[key] && obj[key].map === Array.prototype.map) {
					// This is an array; treat it as such
					newObj[key] = (newObj[key] as Object[]).map((v, i) => recursiveDereferenceFunc(v, [...treePos, key, i]));
					continue; // No need for further execution on this array
				}

				if (newObj[key] && typeof newObj[key] === 'object' && !('length' in newObj[key])) {
					if (!encounteredObjects.includes(obj[key])) {
						newObj[key] = recursiveDereferenceFunc(obj[key], [...treePos, key]);
					}
					else {
						// This is a cyclic property; drop it entirely
						delete newObj[key];
						// Experimental - add ref pointing back to original object
						newObj[key] = { $refId: encounteredObjects.indexOf(obj[key]) };
					}
				}

			}

			return newObj;
		};

		const dereferencedTree = recursiveDereferenceFunc(toJS(sourceObj, { recurseEverything: true }));

		dereferencedTree.$refs = encounteredObjectPaths.map(p => ({ $loc: p }));

		return JSON.stringify(dereferencedTree);
	}

	@action
	fromJson(jsonStr: string) {
		//this.mutate(JSON.parse(jsonStr));
		const dehydratedParsedData = JSON.parse(jsonStr);

		const getPointerFromMappedPath = (base: Object, pathMap: (string | number)[]): any => {
			if (pathMap.length === 0) {
				return base;
			}
			const [nextKey, ...remainingPathMap] = pathMap;
			return getPointerFromMappedPath(base[nextKey], remainingPathMap || []);
		};

		// Experimental recursive rehydrating function
		const recursiveRehydratingFunc = (input: any, treePos: (string | number)[] = []) => {

			if (typeof input !== 'object') {
				return input;
			}

			const obj: Object = input;

			for (const key in obj) {

				if (!obj.hasOwnProperty(key) || typeof obj[key] === 'function') {
					// I'm not sure if this is possible / this should not happen
					delete obj[key];
					continue;
				}
				else if (obj[key] && typeof obj[key] === 'object' && 'length' in obj[key] && 'map' in obj[key] && obj[key].map === Array.prototype.map) {
					// This is an array; treat it as such
					obj[key] = (obj[key] as Object[]).map((v, i) => recursiveRehydratingFunc(v, [...treePos, key, i]));
					continue; // No need for further execution on this array
				}

				if (obj[key] && typeof obj[key] === 'object' && !('length' in obj[key])) {
					if ('$refId' in obj[key]) {
						// Rehydrate
						const $refId = JSON.parse(JSON.stringify(obj[key].$refId));
						const pathMap = dehydratedParsedData.$refs[$refId].$loc;
						// Get pointer from mapped path
						delete obj[key];
						obj[key] = getPointerFromMappedPath(dehydratedParsedData, pathMap);
						continue; // This is already a pointer that has been traversed so we do not need to dehydrate this
					}
					else {
						// Need to recurse further
						obj[key] = recursiveRehydratingFunc(obj[key], [...treePos, key]);
					}
				}

			}

			return obj;
		};

		const parsedData = recursiveRehydratingFunc(dehydratedParsedData, []);
		delete parsedData.$refs;

		if ('hmrRestore' in this) {
			const _this = (this as MobxStoreMutableIface<U>);

			const getPropDatatypes = (store: MobxStoreMutableIface<U>): string =>
				JSON.stringify(
					Object.keys(store)
						.filter(k => store.hasOwnProperty(k))
						.map(k => [k, typeof store[k]])
				);

			const thisJsonBefore = _this.toJson();
			const thisDatatypesBefore = getPropDatatypes(_this);


			// Custom restore logic for top-level (RootStore) store (helpful for top-level AbortControllers and such)
			// NOTE: This is the line that is actually needed - the other stuff in this block is for dev-friendly hints
			(_this.hmrRestore || ((_) => { }))(parsedData);

			const thisJsonAfter = _this.toJson();
			const thisDatatypesAfter = getPropDatatypes(_this);

			if (thisJsonBefore !== thisJsonAfter || thisDatatypesBefore !== thisDatatypesAfter) {
				// NOTE: The conditions that cause this may need to be refined. The key thing we're trying
				// to prevent is having Store classes within `this` be replaced by Objects resulting from JSON.parse.
				// console.warn(
				// 	'A mutation appears to have been performed within an implementation of MobxStoreMutable.hmrRestore on the top level.'
				// 	+ ' This may lead to bugs and should probably be avoided.'
				// 	+ `\n\n${formatStackTraceJestOutput((new Error()).stack)}`
				// );
			}
		}

		for (let key in parsedData) {

			if (!this.hasOwnProperty(key) || !parsedData.hasOwnProperty(key)) {
				continue;
			}

			const val = parsedData[key];

			if (this[key] instanceof MobxStoreMutable) {
				if ('hmrRestore' in this[key]) {
					// Custom restore logic for this class (can be helpful for arrays of Stores)
					this[key].hmrRestore(val);
				} else {
					this[key].mutate(val);
				}
				continue;
			}

			const VariadicClass = getStoreList(this, key);

			if (Array.isArray(this[key]) && VariadicClass) {

				// parsedData[key] === [{storePropA, storePropB}, {storePropA, storePropB}, {storePropA, storePropB}] (in POJO)
				// storeData === {storePropA, storePropB}

				parsedData[key].forEach((storeData: any, index: number) => {
					// @ts-ignore
					const myThing = new VariadicClass(this.rootStore);
					myThing.hmrRestore ? myThing.hmrRestore(storeData) : myThing.mutate(storeData);
					this[key][index] = myThing;
				});
				continue;
			}

			// @ts-ignore
			this.mutate(key, val);

		}

	}

}

export abstract class MobxDomainStoreMutable<U, S = /* RootStore */ any /* maybe `typeof MobxStoreMutable` */> extends MobxStoreMutable<U> {
	constructor(public rootStore: S) { super(); }
}

export abstract class MobxDomainTreeStoreMutable<U, R = MobxStoreMutable<any>, P = MobxStoreMutable<any>> extends MobxStoreMutable<U> {
	constructor(public rootStore: R, public parentStore: P, _options?: {}) { super(); }
}

export class SnapshotController {

	snapshot(store: Object): string {
		return MobxStoreMutable.objToJsonExperimental(store);
	}

	/** @example SnapshotController.diffSnapshot(snapshot, snapshotController.snapshot(store)) */
	static diffSnapshot<T extends ReturnType<SnapshotController['snapshot']>>(prevSnapshotJson: T, currSnapshotJson: T) {
		const [prevSnapshot, currSnapshot] = [JSON.parse(prevSnapshotJson), JSON.parse(currSnapshotJson)];
		delete prevSnapshot.$refs;
		delete currSnapshot.$refs;
		const diff = diffObject({ root: prevSnapshot }, { root: currSnapshot });
		return (diff === null ? null : diff.root);
	}

}

export class MobxSnapshotController<U /* extends MobxStoreMutable<any> */> extends SnapshotController {

	initialState: null | ReturnType<SnapshotController['snapshot']> = null;

	constructor(private store: U, public ignoreProps: (keyof U)[] = []) {
		super();
	}

	startChangeTracking(): boolean {
		if (this.isTrackingChanges()) {
			return false;
		}
		this.initialState = this.snapshotStore();
		return true;
	}

	restartChangeTracking(): boolean {
		if (!this.isTrackingChanges()) {
			// Can't restart unless we're already tracking changes.
			return false;
		}
		this.initialState = this.snapshotStore();
		return true;
	}

	endChangeTracking(): void {
		this.initialState = null;
	}

	/** @alias endChangeTracking */
	stopChangeTracking(): void {
		return this.endChangeTracking();
	}

	isTrackingChanges(): boolean {
		return this.initialState !== null;
	}

	private snapshotStore(): ReturnType<SnapshotController['snapshot']> {
		// TODO: Clean up the typings in here as there are too many overrides for comfort
		const shallowDereferencedDomainStore: MobxDomainStoreMutable<U> = { ...this.store } as any;
		if (shallowDereferencedDomainStore) {
			if (shallowDereferencedDomainStore.rootStore) { delete shallowDereferencedDomainStore.rootStore; }
			// @ts-ignore
			if (shallowDereferencedDomainStore.parentStore) { delete shallowDereferencedDomainStore.parentStore; }
		}
		for (const key in shallowDereferencedDomainStore) {
			if (shallowDereferencedDomainStore[key] === this) {
				// This is an instance of ourself - remove so we don't have skewed tracking
				delete shallowDereferencedDomainStore[key];
				continue;
			}
			// @ts-ignore
			if (this.ignoreProps.includes(key)) {
				// The consumer requested we ignore this prop when storing / computing the diff
				delete shallowDereferencedDomainStore[key];
				continue;
			}
		}
		return this.snapshot(shallowDereferencedDomainStore);
	}

	getChanges(diffOutputVariant?: 'top'): null | [Partial<U>, Partial<U>];
	getChanges(diffOutputVariant: 'bottom'): null | any;
	getChanges(diffOutputVariant: 'top' | 'bottom' = 'top'): null | [Partial<U>, Partial<U>] {
		if (this.initialState === null) {
			return null;
		}
		const [prevSnapshot, currSnapshot] = [JSON.parse(this.initialState), JSON.parse(this.snapshotStore())];
		delete prevSnapshot.$refs;
		delete currSnapshot.$refs;
		const diff = diffObject({ root: currSnapshot }, { root: prevSnapshot });

		if (diff === null) {
			return null;
		}

		if (diffOutputVariant === 'bottom') {
			return diff.root;
		}

		const easierToUserDiff = diffObjectToTopLevel(diff);
		return [easierToUserDiff[0]?.root, easierToUserDiff[1]?.root];
	}

	/** @description Takes the current changes and applies them as the snapshot base */
	applyChanges() {
		// This is really just an alias to restart change tracking
		if (this.isTrackingChanges()) {
			this.endChangeTracking();
		}
		this.startChangeTracking();
	}

	/** @description Rolls back changes made to this store since we started tracking changes */
	@action revertChanges(): boolean {
		if (!this.isTrackingChanges()) {
			return false;
		}
		const store: MobxStoreMutable<any> = this.store as any;
		const [, orig] = this.getChanges('top') ?? [];
		if (!orig) {
			return false;
		}

		const actualOrig = this.initialState !== null ? JSON.parse(this.initialState) : null;

		const deepKeyExists = (obj: Object, path: (string | number)[]): boolean => {

			if (obj === null || typeof obj !== 'object') {
				return true;
			}

			// This is an object of some sort
			const [nextKey, ...remainingPath] = path;

			if (!(nextKey in obj)) {
				return false;
			}

			if (obj[nextKey] === null || obj[nextKey] === undefined) {
				return true;
			}

			if (remainingPath.length === 0) {
				// I'm not sure how to handle this so we'll have to wait we hit this to know what to do
				throw new Error('TODO: Handle this when this condition is hit');
			}

			const subObj = obj[nextKey];
			return deepKeyExists(subObj, remainingPath);
		};

		/**
		 *
		 * @param targetObj A store property or a descendant
		 * @param dataObj Patch data
		 * @param path The keys we have traversed so far in the tree
		 * @param removeArrayKeys For instances where arrays are added to and we need to restore the length to it's original value
		 */
		const recursiveFunc = <T extends {}>(targetObj: T, dataObj: Partial<T>, path: (string | number)[], removeArrayKeys: (string | number)[] = []) => {
			// Only deep mutate the props that we need to touch

			Object.keys(dataObj).forEach((mutKey): any => {
				if (typeof dataObj[mutKey] === 'undefined') {
					// Check if the original value was actually 'undefined' or whether the key didn't exist previously
					if (deepKeyExists(actualOrig, [...path, mutKey])) {
						// Undefined was actually the value here (as opposed to key not existing)
						targetObj[mutKey] = undefined;
					}
					else {
						// This key was newly added so we need to remove it from the reverted data
						delete targetObj[mutKey];
						removeArrayKeys.push(mutKey);
					}
					return true;
				}
				else if (typeof dataObj[mutKey] !== 'object') {
					if (targetObj === null || typeof targetObj !== 'object') {
						targetObj = {} as T;
					}
					targetObj[mutKey] = dataObj[mutKey];
					return true;
				}
				else if (dataObj[mutKey] && 'length' in dataObj[mutKey]) {
					// TODO: Encounter an instance where we need this and implement it
					// if (!Array.isArray(targetObj[mutKey])) {
					// 	targetObj[mutKey] = dataObj[mutKey];
					// }
					// debugger;
					// return true;
					throw new Error(`Reverting arrays is not yet supported (on key '${mutKey}')`);
				}
				else if (dataObj[mutKey] === null) {
					// TODO: Figure out how to handle this. In light testing it didn't do what we wanted.
					throw new Error(`Reverting null is not yet supported (on key '${mutKey}')`);
				}
				else if (Array.isArray(targetObj) && !(mutKey in targetObj) && mutKey in dataObj) {
					// Restore this whole branch
					targetObj[mutKey] = dataObj[mutKey];
					return true;
				}

				const removeArrayKeysPointer: (string | number)[] = []; // This is for the children and is purposely a pointer
				recursiveFunc(targetObj[mutKey], dataObj[mutKey], [...path, mutKey], removeArrayKeysPointer);

				// Post-processing
				if ('length' in targetObj[mutKey] && Array.isArray(targetObj[mutKey]) && removeArrayKeysPointer.length > 0) {
					targetObj[mutKey] = targetObj[mutKey].filter((_el: any, i: string | number) => !removeArrayKeysPointer.includes(i));
				}
			});
		};

		recursiveFunc(store, orig, []);

		return true;
	}

	restoreFromHmr(previousSnapshotControllerInstance: Partial<this>) {
		if (typeof previousSnapshotControllerInstance.initialState !== 'undefined') {
			this.initialState = previousSnapshotControllerInstance.initialState;
		}
	}

}

const formatMetadataKey = Symbol("storeList");

export function storeList(formatString: typeof MobxDomainStoreMutable) {
	return Reflect.metadata(formatMetadataKey, formatString);
}

function getStoreList(target: any, propertyKey: string): null | typeof MobxDomainStoreMutable {
	return Reflect.getMetadata(formatMetadataKey, target, propertyKey);
}
