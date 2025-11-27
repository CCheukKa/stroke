import path from "path";
import { Database } from "bun:sqlite";
import { CharacterStrokeDataEntry, CharacterSuggestionsData, JsoniseStrokeDataResult, SuggestionsResult, VARIANT } from "./compileData";

type G6TCFEntryRaw = {
    _id: number;
    Character: string;
    Frequency: number;
    Code0: string;
    Code1: string;
    Code2: string;
    Code3: string;
    Code4: string;
    Code5: string;
    Code6: string;
    Code7: string;
    Code8: string;
    Code9: string;
    Code10: string;
    Code11: string;
    Code12: string;
    Code13: string;
    Code14: string;
    Code15: string;
    Code16: string;
    Code17: string;
    Code18: string;
    Code19: string;
    Code20: string;
    Code21: string;
    Code22: string;
    Code23: string;
    Code24: string;
    Code25: string;
    Code26: string;
    Code27: string;
    Code28: string;
    Code29: string;
};

type G6ADBEntryRaw = {
    _id: number;
    Code: string;
    Word0: string,
    Word1: string,
    Word2: string,
    Word3: string,
    Word4: string,
    Word5: string,
    Word6: string,
    Word7: string,
    Word8: string,
    Word9: string,
    Word10: string,
    Word11: string,
    Word12: string,
    Word13: string,
    Word14: string,
    Word15: string,
    Word16: string,
    Word17: string,
    Word18: string,
    Word19: string,
    Word20: string,
    Word21: string,
    Word22: string,
    Word23: string,
    Word24: string,
    Word25: string,
    Word26: string,
    Word27: string,
    Word28: string,
    Word29: string,
    Word30: string,
    Word31: string,
    Word32: string,
    Word33: string,
    Word34: string,
    Word35: string,
    Word36: string,
    Word37: string,
    Word38: string,
    Word39: string,
    Word40: string,
    Word41: string,
    Word42: string,
    Word43: string,
    Word44: string,
    Word45: string,
    Word46: string,
    Word47: string,
    Word48: string,
    Word49: string,
    Word50: string,
    Word51: string,
    Word52: string,
    Word53: string,
    Word54: string,
    Word55: string,
    Word56: string,
    Word57: string,
    Word58: string,
    Word59: string,
    Word60: string,
    Word61: string,
    Word62: string,
};

export class G6Compiler {
    private static baseDataDir = "data/G6";

    private static getDatabaseTable(tableName: string) {
        const databasePath = path.join(this.baseDataDir, "g6.sqlite");
        const db = new Database(databasePath, { strict: true, readonly: true });
        try {
            db.run("PRAGMA journal_mode = WAL;");
            const table = db.prepare(`SELECT * FROM ${tableName};`).all();
            return table;
        } finally {
            db.close();
        }
    }

    public static async jsoniseStrokeData(variant: VARIANT = VARIANT.TRADITIONAL): Promise<JsoniseStrokeDataResult> {
        const startTime = performance.now();

        if (variant !== VARIANT.TRADITIONAL) {
            // TODO: implement simplified variant
            throw new Error("Only traditional variant is supported for G6 data.");
        }
        const characterStrokeData: CharacterStrokeDataEntry[] = (this.getDatabaseTable("G6TCF") as G6TCFEntryRaw[])
            .map(row => {
                let strokes: string = "";
                for (let i = 0; i <= 29; i++) {
                    const stroke = row[`Code${i}` as keyof G6TCFEntryRaw] as string;
                    if (!stroke) { break; }
                    strokes += stroke;
                }
                return {
                    character: row.Character,
                    strokeSequences: [strokes],
                };
            });

        const endTime = performance.now();
        return {
            characterStrokeData,
            timeTakenMs: endTime - startTime,
        };
    }

    public static async jsoniseSuggestions(variant: VARIANT = VARIANT.TRADITIONAL): Promise<SuggestionsResult> {
        const startTime = performance.now();

        const suggestionsData: CharacterSuggestionsData = {};
        (this.getDatabaseTable(variant === VARIANT.TRADITIONAL ? "ADB" : "SADB") as G6ADBEntryRaw[])
            .forEach(row => {
                const suggestions: string[] = [];
                for (let i = 0; i <= 62; i++) {
                    const word = row[`Word${i}` as keyof G6ADBEntryRaw] as string;
                    if (!word) { continue; }
                    suggestions.push(word);
                }
                suggestionsData[row.Code] = suggestions;
            });

        const endTime = performance.now();
        return {
            suggestionsData,
            timeTakenMs: endTime - startTime,
        };
    }
}