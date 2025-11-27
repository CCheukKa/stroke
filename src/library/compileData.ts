import fs from "fs-extra";
import path from "path";
import { Stroke } from "./Stroke";
import { StrokeInputDataCompiler } from "./StrokeInputDataCompiler";
import { G6Compiler } from "./G6Compiler";

const outputDir = "public";
fs.ensureDirSync(outputDir);

/* -------------------------------------------------------------------------- */

export const enum VARIANT {
    TRADITIONAL = "traditional",
    SIMPLIFIED = "simplified",
};

export type CharacterStrokeDataEntry = {
    character: string;
    strokeSequences: string[];
};
export type JsoniseStrokeDataResult = {
    characterStrokeData: CharacterStrokeDataEntry[];
    timeTakenMs: number;
};

export type CharacterRankingData = Map<string, number>;
export type JsoniseCharacterRankingResult = {
    characterRankingData: CharacterRankingData;
    timeTakenMs: number;
};

type SortCharacterDataResult = {
    sortedCharacterStrokeData: CharacterStrokeDataEntry[];
    timeTakenMs: number;
};
function sortCharacterData(strokeData: CharacterStrokeDataEntry[], rankingData: CharacterRankingData): SortCharacterDataResult {
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

export type CharacterSuggestionsData = Record<string, string[]>;
export type SuggestionsResult = {
    suggestionsData: CharacterSuggestionsData;
    timeTakenMs: number;
}

/* -------------------------------------------------------------------------- */

function mergeCharacterStrokeData(...dataSets: CharacterStrokeDataEntry[][]): CharacterStrokeDataEntry[] {
    const mergedDataMap: Map<string, Set<string>> = new Map();
    for (const dataSet of dataSets) {
        for (const entry of dataSet) {
            if (!mergedDataMap.has(entry.character)) {
                mergedDataMap.set(entry.character, new Set());
            }
            const strokeSet = mergedDataMap.get(entry.character)!;
            for (const strokeSeq of entry.strokeSequences) {
                strokeSet.add(strokeSeq);
            }
        }
    }
    const mergedData: CharacterStrokeDataEntry[] = [];
    for (const [character, strokeSet] of mergedDataMap.entries()) {
        mergedData.push({
            character,
            strokeSequences: Array.from(strokeSet),
        });
    }
    return mergedData;
}

function mergeCharacterSuggestionsData(...dataSets: CharacterSuggestionsData[]): CharacterSuggestionsData {
    const mergedData: CharacterSuggestionsData = {};
    for (const dataSet of dataSets) {
        for (const [character, suggestions] of Object.entries(dataSet)) {
            if (!mergedData[character]) {
                mergedData[character] = [];
            }
            const existingSuggestionsSet = new Set(mergedData[character]);
            for (const suggestion of suggestions) {
                existingSuggestionsSet.add(suggestion);
            }
            mergedData[character] = Array.from(existingSuggestionsSet);
        }
    }
    return mergedData;
}

/* -------------------------------------------------------------------------- */

const numToStrokeMap: Record<string, string> = {
    '1': Stroke.HORIZONTAL,
    '2': Stroke.VERTICAL,
    '3': Stroke.POSITIVE_DIAGONAL,
    '4': Stroke.NEGATIVE_DIAGONAL,
    '5': Stroke.COMPOUND,
};
export function numCodeToStroke(numCode: string): string {
    return numCode.split('').map(num => numToStrokeMap[num] ?? '').join('');
}
// const strokeToNumMap: Record<string, string> = Object.fromEntries(
//     Object.entries(numToStrokeMap).map(([num, stroke]) => [stroke, num])
// );
// function strokeToNumCode(stroke: string): string {
//     return stroke.split('').map(s => strokeToNumMap[s] ?? '').join('');
// }

/* -------------------------------------------------------------------------- */

const { characterRankingData, timeTakenMs: characterRankingTimeTaken } = await StrokeInputDataCompiler.jsoniseCharacterRanking();
console.log(`Compiled SID character ranking data with ${characterRankingData.size} entries in ${characterRankingTimeTaken.toFixed(2)} ms`);
// 
const { characterStrokeData: G6CharacterStrokeData, timeTakenMs: G6StrokeDataTimeTaken } = await G6Compiler.jsoniseStrokeData();
console.log(`Compiled G6 stroke data with ${G6CharacterStrokeData.length} entries in ${G6StrokeDataTimeTaken.toFixed(2)} ms`);
const { characterStrokeData: SIDCharacterStrokeData, timeTakenMs: SIDStrokeDataTimeTaken } = await StrokeInputDataCompiler.jsoniseStrokeData();
console.log(`Compiled SID stroke data with ${SIDCharacterStrokeData.length} entries in ${SIDStrokeDataTimeTaken.toFixed(2)} ms`);
const characterStrokeData = mergeCharacterStrokeData(G6CharacterStrokeData, SIDCharacterStrokeData);
console.log(`Stroke data merged from ${G6CharacterStrokeData.length + SIDCharacterStrokeData.length} to ${characterStrokeData.length} unique entries`);
// 
const { sortedCharacterStrokeData, timeTakenMs: sortingTimeTaken } = sortCharacterData(characterStrokeData, characterRankingData);
console.log(`Sorted character stroke data in ${sortingTimeTaken.toFixed(2)} ms`);
const outputPath = path.join(outputDir, "strokeData.json");
fs.writeFileSync(outputPath, JSON.stringify(sortedCharacterStrokeData), "utf-8");
console.log(`Wrote sorted stroke data with ${sortedCharacterStrokeData.length} entries to ${outputPath}`);
// 
const { suggestionsData: G6suggestionsData, timeTakenMs: G6SuggestionsTimeTaken } = await G6Compiler.jsoniseSuggestions();
console.log(`Compiled G6 suggestions data with ${Object.keys(G6suggestionsData).length} entries in ${G6SuggestionsTimeTaken.toFixed(2)} ms`);
const { suggestionsData: SIDSuggestionsData, timeTakenMs: SIDSuggestionsTimeTaken } = await StrokeInputDataCompiler.jsoniseSuggestions();
console.log(`Compiled SID suggestions data with ${Object.keys(SIDSuggestionsData).length} entries in ${SIDSuggestionsTimeTaken.toFixed(2)} ms`);
const suggestionsData = mergeCharacterSuggestionsData(G6suggestionsData, SIDSuggestionsData);
console.log(`Suggestions data merged from ${Object.keys(G6suggestionsData).length + Object.keys(SIDSuggestionsData).length} to ${Object.keys(suggestionsData).length} unique entries`);
const suggestionsOutputPath = path.join(outputDir, "suggestionsData.json");
fs.writeFileSync(suggestionsOutputPath, JSON.stringify(suggestionsData), "utf-8");
console.log(`Wrote suggestions data with ${Object.keys(suggestionsData).length} entries to ${suggestionsOutputPath}`);