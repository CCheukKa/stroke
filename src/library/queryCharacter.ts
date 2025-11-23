import type { G6TCFEntry } from './jsoniseData';
import json from './../../public/data/g6-tcf-entries.json';
const G6Entries = json as G6TCFEntry[];

const regexCache = new Map<string, RegExp>();
function getCompiledRegex(query: string): RegExp {
    if (!regexCache.has(query)) {
        regexCache.set(query, new RegExp(`^${query.replace(/\*/g, '.')}`));
    }
    return regexCache.get(query)!;
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
    const searchResults = G6Entries.filter(entry => regex.test(entry.strokes));
    const end = performance.now();
    return {
        results: searchResults,
        timeTakenMs: end - start,
    };
}