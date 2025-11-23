import type { G6TCFEntry } from './jsoniseData';
import json from './../../public/data/g6-tcf-entries.json';
import { Stroke } from './Stroke';
const G6Entries = json as G6TCFEntry[];

const regexCache = new Map<string, RegExp>();
function getCompiledRegex(query: string): RegExp {
    if (regexCache.has(query)) { return regexCache.get(query)!; }
    const regex = new RegExp(`^${query.replaceAll(Stroke.WILDCARD, '.')}`);
    regexCache.set(query, regex);
    return regex;
}

const queryResultCache = new Map<RegExp, G6TCFEntry[]>();
function getCachedQueryResult(regex: RegExp): G6TCFEntry[] {
    if (queryResultCache.has(regex)) { return queryResultCache.get(regex)!; }
    const result = G6Entries.filter(entry => regex.test(entry.strokes));
    queryResultCache.set(regex, result);
    return result;
}

type QueryResult = {
    results: G6TCFEntry[];
    timeTakenMs: number;
};
export function queryCharacters(query: string): QueryResult {
    if (query === "") {
        return {
            results: [],
            timeTakenMs: 0,
        };
    }

    const start = performance.now();
    const regex = getCompiledRegex(query);
    const searchResults = getCachedQueryResult(regex);
    const end = performance.now();
    return {
        results: searchResults,
        timeTakenMs: end - start,
    };
}