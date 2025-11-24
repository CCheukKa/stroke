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

const characterQueryResultCache = new Map<RegExp, G6TCFEntry[]>();
function getCachedCharacterQueryResult(regex: RegExp): G6TCFEntry[] {
    if (characterQueryResultCache.has(regex)) { return characterQueryResultCache.get(regex)!; }
    const result = G6TCFEntries.filter(entry => regex.test(entry.strokes));
    characterQueryResultCache.set(regex, result);
    return result;
}

type CharacterQueryResult = {
    results: G6TCFEntry[];
    timeTakenMs: number;
};
export function queryCharactersFromStroke(strokeQuery: string): CharacterQueryResult {
    if (strokeQuery === "") {
        return {
            results: [],
            timeTakenMs: 0,
        };
    }

    const start = performance.now();
    const regex = getCompiledRegex(strokeQuery);
    const searchResults = getCachedCharacterQueryResult(regex);
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
export function querySuggestionsFromCharacter(characterQuery: string): SuggestionQueryResult {
    if (characterQuery === "") {
        return {
            suggestions: [],
            timeTakenMs: 0,
        };
    }
    const start = performance.now();
    const suggestions = G6ADBMap.get(characterQuery) ?? [];
    const end = performance.now();
    return {
        suggestions: suggestions,
        timeTakenMs: end - start,
    };
}

/* -------------------------------------------------------------------------- */

//? Cache this maybe?

type StrokesQueryResult = {
    stroke: string;
    timeTakenMs: number;
};
export function queryStrokesFromCharacter(characterQuery: string): StrokesQueryResult {
    if (characterQuery === "") {
        return {
            stroke: "",
            timeTakenMs: 0,
        };
    }
    const start = performance.now();
    const entry = G6TCFEntries.find(entry => entry.character === characterQuery);
    const end = performance.now();
    return {
        stroke: entry ? entry.strokes : "",
        timeTakenMs: end - start,
    };
}