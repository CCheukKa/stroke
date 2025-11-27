import characterStrokeJson from '../../public/strokeData.json';
import characterSuggestionsJson from '../../public/suggestionsData.json';
import { Stroke } from './Stroke';
import { CharacterStrokeDataEntry, CharacterSuggestionsData } from './compileData';
const characterStrokeData = characterStrokeJson as CharacterStrokeDataEntry[];
const characterSuggestionsData = characterSuggestionsJson as CharacterSuggestionsData;

/* -------------------------------------------------------------------------- */

const regexCache = new Map<string, RegExp>();
function getCompiledRegex(query: string): RegExp {
    if (regexCache.has(query)) { return regexCache.get(query)!; }
    const regex = new RegExp(`^${query.replaceAll(Stroke.WILDCARD, '.')}`);
    regexCache.set(query, regex);
    return regex;
}

const characterQueryResultCache = new Map<RegExp, string[]>();
function getCachedCharacterQueryResult(regex: RegExp): string[] {
    if (characterQueryResultCache.has(regex)) { return characterQueryResultCache.get(regex)!; }
    const queryResult = characterStrokeData.filter(entry => entry.strokeSequences.some(sequence => regex.test(sequence))).map(entry => entry.character);
    characterQueryResultCache.set(regex, queryResult);
    return queryResult;
}

type CharacterQueryResult = {
    characters: string[];
    timeTakenMs: number;
};
export function queryCharactersFromStroke(strokeQuery: string): CharacterQueryResult {
    if (strokeQuery === "") {
        return {
            characters: [],
            timeTakenMs: 0,
        };
    }

    const start = performance.now();
    const regex = getCompiledRegex(strokeQuery);
    const characters = getCachedCharacterQueryResult(regex);
    const end = performance.now();
    return {
        characters,
        timeTakenMs: end - start,
    };
}

/* -------------------------------------------------------------------------- */

type SuggestionQueryResult = {
    suggestions: string[];
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
    const suggestions = characterSuggestionsData[characterQuery] || [];
    const end = performance.now();
    return {
        suggestions: suggestions,
        timeTakenMs: end - start,
    };
}

/* -------------------------------------------------------------------------- */

//? Cache this maybe?
type StrokesQueryResult = {
    strokes: string;
    timeTakenMs: number;
};
export function queryStrokesFromCharacter(characterQuery: string): StrokesQueryResult {
    if (characterQuery === "") {
        return {
            strokes: "",
            timeTakenMs: 0,
        };
    }
    const start = performance.now();
    const entry = characterStrokeData.find(entry => entry.character === characterQuery);
    const end = performance.now();

    // TODO: set a canonical stroke sequence instead of a random one
    const strokes = entry ? entry.strokeSequences[Math.floor(Math.random() * entry.strokeSequences.length)] : "";
    return {
        strokes,
        timeTakenMs: end - start,
    };
}