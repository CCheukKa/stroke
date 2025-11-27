import fs from "fs-extra";
import path from "path";
import { CharacterStrokeDataEntry, CharacterSuggestionsData, JsoniseCharacterRankingResult, JsoniseStrokeDataResult, numCodeToStroke, SuggestionsResult, VARIANT } from "./compileData";

export class StrokeInputDataCompiler {
    private static baseDataDir = "data/stroke-input-data";

    public static async jsoniseStrokeData(variant: VARIANT = VARIANT.TRADITIONAL): Promise<JsoniseStrokeDataResult> {
        const startTime = performance.now();

        const strokeSequenceData = path.join(this.baseDataDir, "codepoint-character-sequence.txt");
        const strokeDataRaw = fs.readFileSync(strokeSequenceData, "utf-8");
        const strokeData: CharacterStrokeDataEntry[] = strokeDataRaw
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

    public static async jsoniseSuggestions(variant: VARIANT = VARIANT.TRADITIONAL): Promise<SuggestionsResult> {
        const startTime = performance.now();

        const suggestionsDataPath = path.join(this.baseDataDir, variant === VARIANT.TRADITIONAL ? "phrases-traditional.txt" : "phrases-simplified.txt");
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

    public static async jsoniseCharacterRanking(variant: VARIANT = VARIANT.TRADITIONAL): Promise<JsoniseCharacterRankingResult> {
        const startTime = performance.now();

        const characterRankingData = path.join(this.baseDataDir, variant === VARIANT.TRADITIONAL ? "ranking-traditional.txt" : "ranking-simplified.txt");
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
}