import type { G6ADBEntry, G6ADBSuggestions, G6TCFEntry } from './jsoniseData';
import G6TCFJson from '../../public/g6-tcf-entries.json';
import G6ADBJson from '../../public/g6-adb-entries.json';
import { Stroke } from './Stroke';
const G6TCFEntries = G6TCFJson as G6TCFEntry[];
const G6ADBMap = new Map<string, G6ADBSuggestions>();
for (const entry of G6ADBJson as G6ADBEntry[]) { G6ADBMap.set(entry.character, entry.suggestions); }

/* -------------------------------------------------------------------------- */

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
    const result = G6TCFEntries.filter(entry => regex.test(entry.strokes));
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

/* -------------------------------------------------------------------------- */

type SuggestionQueryResult = {
    suggestions: G6ADBSuggestions;
    timeTakenMs: number;
};
export function querySuggestions(character: string): SuggestionQueryResult {
    if (character === "") {
        return {
            suggestions: [],
            timeTakenMs: 0,
        };
    }
    const start = performance.now();
    const suggestions = G6ADBMap.get(character) ?? [];
    const end = performance.now();
    return {
        suggestions: suggestions,
        timeTakenMs: end - start,
    };
}