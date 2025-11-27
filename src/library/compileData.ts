import fs from "fs-extra";
import path from "path";
import { Stroke } from "./Stroke";

const baseDataDir = "data/stroke-input-data";
const outputDir = "public";

/* -------------------------------------------------------------------------- */

const enum VARIANT {
    TRADITIONAL = "traditional",
    SIMPLIFIED = "simplified",
};

/* -------------------------------------------------------------------------- */

export type CharacterStrokeData = {
    character: string;
    strokeSequences: string[];
};
type JsoniseStrokeDataResult = {
    characterStrokeData: CharacterStrokeData[];
    timeTakenMs: number;
};
async function jsoniseStrokeData(variant: VARIANT = VARIANT.TRADITIONAL): Promise<JsoniseStrokeDataResult> {
    const startTime = performance.now();

    const strokeSequenceData = path.join(baseDataDir, "codepoint-character-sequence.txt");
    const strokeDataRaw = fs.readFileSync(strokeSequenceData, "utf-8");
    const strokeData: CharacterStrokeData[] = strokeDataRaw
        .split("\n")
        .filter(line => line.startsWith("U+"))
        .map(line => line.trim())
        .map(line => {
            const [codepoint, annotatedCharacter, strokeRegex] = line.split("\t");
            const [character, annotation = ""] = [...annotatedCharacter];

            // check if codepoint matches character
            const charCodepoint = `U+${character.codePointAt(0)!.toString(16).toUpperCase()}`;
            if (charCodepoint !== codepoint) { throw new Error(`Codepoint mismatch: expected ${codepoint}, got ${charCodepoint}`); }

            //^ use num code for smaller file size and speed?
            const strokeSequences = getAllValidStrokeSequencesFromRegex(strokeRegex).map(seq => numCodeToStroke(seq));
            switch (annotation) {
                case "": {
                    // dual
                    break;
                }
                case "^": {
                    // traditional
                    if (variant !== VARIANT.TRADITIONAL) { return null; }
                    break;
                }
                case "*": {
                    // simplified
                    if (variant !== VARIANT.SIMPLIFIED) { return null; }
                    break;
                }
                default: { throw new Error(`Unknown variant annotation: ${annotation}`); }
            }

            return {
                character,
                strokeSequences,
            };
        }).filter(entry => entry !== null);

    const endTime = performance.now();
    return {
        characterStrokeData: strokeData,
        timeTakenMs: endTime - startTime,
    };
    /* -------------------------------------------------------------------------- */
    function getAllValidStrokeSequencesFromRegex(strokeRegex: string): string[] {
        // This assumes well-formed input and no nested groups
        type Group = string[];
        type Token = string | Group;
        const tokens: Token[] = [];
        const groups: Group[] = [];

        let currentIndex = 0;
        while (currentIndex < strokeRegex.length) {
            const char = strokeRegex[currentIndex];
            switch (char) {
                case "(": {
                    // start of group
                    const closingIndex = strokeRegex.indexOf(")", currentIndex);
                    const groupContent = strokeRegex.slice(currentIndex + 1, closingIndex);
                    const groupStrokes = groupContent.split("|");
                    const group = groupStrokes;
                    groups.push(group);
                    tokens.push(group);
                    currentIndex = closingIndex + 1;
                    break;
                }
                case ")": {
                    // end of group (should not happen here)
                    throw new Error("Unexpected closing parenthesis");
                }
                case "\\": {
                    // group reference
                    const nextChar = strokeRegex[currentIndex + 1];
                    const groupIndex = parseInt(nextChar, 10) - 1;
                    if (isNaN(groupIndex) || groupIndex < 0 || groupIndex >= groups.length) {
                        throw new Error(`Invalid group reference: \\${nextChar}`);
                    }
                    const group = groups[groupIndex];
                    tokens.push(group);
                    currentIndex += 2;
                    break;
                }
                default: {
                    // regular stroke character
                    // consume as many consecutive stroke characters as possible
                    let strokeChars = char;
                    currentIndex++;
                    while (currentIndex < strokeRegex.length) {
                        const nextChar = strokeRegex[currentIndex];
                        if (nextChar === "(" || nextChar === ")" || nextChar === "\\") {
                            break;
                        }
                        strokeChars += nextChar;
                        currentIndex++;
                    }
                    tokens.push(strokeChars);
                    break;
                }
            }
        }

        // Now generate all combinations
        const results: string[] = [];
        function generateCombinations(index: number, currentSequence: string) {
            if (index === tokens.length) {
                results.push(currentSequence);
                return;
            }
            const token = tokens[index];
            if (typeof token === "string") {
                generateCombinations(index + 1, currentSequence + token);
            } else {
                // token is a group
                for (const option of token) {
                    generateCombinations(index + 1, currentSequence + option);
                }
            }
        }
        generateCombinations(0, "");

        return results;
    }
}

/* -------------------------------------------------------------------------- */

type CharacterRankingData = Map<string, number>;
type JsoniseCharacterRankingResult = {
    characterRankingData: CharacterRankingData;
    timeTakenMs: number;
};
async function jsoniseCharacterRanking(variant: VARIANT = VARIANT.TRADITIONAL): Promise<JsoniseCharacterRankingResult> {
    const startTime = performance.now();

    const characterRankingData = path.join(baseDataDir, variant === VARIANT.TRADITIONAL ? "ranking-traditional.txt" : "ranking-simplified.txt");
    const rankingDataRaw = fs.readFileSync(characterRankingData, "utf-8");
    const rankingData = new Map([
        ...rankingDataRaw
            .split("\n")
            .map(line => line.trim())
            .filter(line => line && !line.startsWith("#"))
            .join("")
    ].map((character, index) => [character, index + 1]));

    const endTime = performance.now();
    return {
        characterRankingData: rankingData,
        timeTakenMs: endTime - startTime,
    };
}

/* -------------------------------------------------------------------------- */

type SortCharacterDataResult = {
    sortedCharacterStrokeData: CharacterStrokeData[];
    timeTakenMs: number;
};
function sortCharacterData(strokeData: CharacterStrokeData[], rankingData: CharacterRankingData): SortCharacterDataResult {
    const startTime = performance.now();

    const shortestStrokeLengths: Map<string, number> = new Map(
        strokeData.map(entry => [
            entry.character,
            Math.min(...entry.strokeSequences.map(seq => seq.length))
        ])
    );
    const sortedCharacterStrokeData = strokeData.toSorted((a, b) => {
        const aRank = rankingData.get(a.character) ?? Number.MAX_SAFE_INTEGER;
        const bRank = rankingData.get(b.character) ?? Number.MAX_SAFE_INTEGER;
        const aShortestStrokeLength = shortestStrokeLengths.get(a.character)!;
        const bShortestStrokeLength = shortestStrokeLengths.get(b.character)!;
        return aRank !== bRank
            ? aRank - bRank
            : aShortestStrokeLength !== bShortestStrokeLength
                ? aShortestStrokeLength - bShortestStrokeLength
                : a.character.codePointAt(0)! - b.character.codePointAt(0)!;
    });

    const endTime = performance.now();
    return {
        sortedCharacterStrokeData,
        timeTakenMs: endTime - startTime,
    };
}

/* -------------------------------------------------------------------------- */

export type CharacterSuggestionsData = Record<string, string[]>;
type SuggestionsResult = {
    suggestionsData: CharacterSuggestionsData;
    timeTakenMs: number;
}
async function jsoniseSuggestions(variant: VARIANT = VARIANT.TRADITIONAL): Promise<SuggestionsResult> {
    const startTime = performance.now();

    const suggestionsDataPath = path.join(baseDataDir, variant === VARIANT.TRADITIONAL ? "phrases-traditional.txt" : "phrases-simplified.txt");
    const suggestionsDataRaw = fs.readFileSync(suggestionsDataPath, "utf-8");
    const suggestionsData: CharacterSuggestionsData = {};
    suggestionsDataRaw
        .split("\n")
        .map(line => line.trim())
        .filter(line => line && !line.startsWith("#"))
        .forEach(line => {
            const character = [...line][0];
            const suggestion = [...line].slice(1).join('');
            if (suggestionsData[character] === undefined) { suggestionsData[character] = []; }
            suggestionsData[character].push(suggestion);
        });

    const endTime = performance.now();
    return {
        suggestionsData,
        timeTakenMs: endTime - startTime,
    };
}

/* -------------------------------------------------------------------------- */

const numToStrokeMap: Record<string, string> = {
    '1': Stroke.HORIZONTAL,
    '2': Stroke.VERTICAL,
    '3': Stroke.POSITIVE_DIAGONAL,
    '4': Stroke.NEGATIVE_DIAGONAL,
    '5': Stroke.COMPOUND,
};
function numCodeToStroke(numCode: string): string {
    return numCode.split('').map(num => numToStrokeMap[num] ?? '').join('');
}
// const strokeToNumMap: Record<string, string> = Object.fromEntries(
//     Object.entries(numToStrokeMap).map(([num, stroke]) => [stroke, num])
// );
// function strokeToNumCode(stroke: string): string {
//     return stroke.split('').map(s => strokeToNumMap[s] ?? '').join('');
// }

/* -------------------------------------------------------------------------- */

const { characterStrokeData, timeTakenMs: strokeDataTimeTaken } = await jsoniseStrokeData();
console.log(`Compiled stroke data with ${characterStrokeData.length} entries in ${strokeDataTimeTaken.toFixed(2)} ms`);

const { characterRankingData, timeTakenMs: characterRankingTimeTaken } = await jsoniseCharacterRanking();
console.log(`Compiled character ranking data with ${characterRankingData.size} entries in ${characterRankingTimeTaken.toFixed(2)} ms`);

const { sortedCharacterStrokeData, timeTakenMs: sortingTimeTaken } = sortCharacterData(characterStrokeData, characterRankingData);
console.log(`Sorted character stroke data in ${sortingTimeTaken.toFixed(2)} ms`);

const outputPath = path.join(outputDir, "strokeData.json");
fs.writeFileSync(outputPath, JSON.stringify(sortedCharacterStrokeData), "utf-8");
console.log(`Wrote sorted stroke data with ${sortedCharacterStrokeData.length} entries to ${outputPath}`);

const { suggestionsData, timeTakenMs: suggestionsTimeTaken } = await jsoniseSuggestions();
console.log(`Compiled suggestions data with ${Object.keys(suggestionsData).length} entries in ${suggestionsTimeTaken.toFixed(2)} ms`);

const suggestionsOutputPath = path.join(outputDir, "suggestionsData.json");
fs.writeFileSync(suggestionsOutputPath, JSON.stringify(suggestionsData), "utf-8");
console.log(`Wrote suggestions data with ${Object.keys(suggestionsData).length} entries to ${suggestionsOutputPath}`);