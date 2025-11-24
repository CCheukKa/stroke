import fs from 'fs-extra';
import Database from 'better-sqlite3';
const G6_SQLITE_DB_PATH = './installation/installed files (custom)/g6.sqlite';
const STROKE_JSON_OUTPUT_PATH = './public/g6-tcf-entries.json';
const SUGGESTION_JSON_OUTPUT_PATH = './public/g6-adb-entries.json';

/* -------------------------------------------------------------------------- */

//! FIXME: Import from Stroke.ts when module resolution issue is resolved (migrate to using bun for this script!)
const enum StrokeEmptyable {
    POSITIVE_DIAGONAL = "丿",
    NEGATIVE_DIAGONAL = "丶",
    VERTICAL = "丨",
    HORIZONTAL = "一",
    COMPOUND = "フ",
    EMPTY = "",
};

type G6TCFEntryRaw = {
    _id: number;
    Character: string;
    Frequency: number;
    Code0: StrokeEmptyable;
    Code1: StrokeEmptyable;
    Code2: StrokeEmptyable;
    Code3: StrokeEmptyable;
    Code4: StrokeEmptyable;
    Code5: StrokeEmptyable;
    Code6: StrokeEmptyable;
    Code7: StrokeEmptyable;
    Code8: StrokeEmptyable;
    Code9: StrokeEmptyable;
    Code10: StrokeEmptyable;
    Code11: StrokeEmptyable;
    Code12: StrokeEmptyable;
    Code13: StrokeEmptyable;
    Code14: StrokeEmptyable;
    Code15: StrokeEmptyable;
    Code16: StrokeEmptyable;
    Code17: StrokeEmptyable;
    Code18: StrokeEmptyable;
    Code19: StrokeEmptyable;
    Code20: StrokeEmptyable;
    Code21: StrokeEmptyable;
    Code22: StrokeEmptyable;
    Code23: StrokeEmptyable;
    Code24: StrokeEmptyable;
    Code25: StrokeEmptyable;
    Code26: StrokeEmptyable;
    Code27: StrokeEmptyable;
    Code28: StrokeEmptyable;
    Code29: StrokeEmptyable;
};
export type G6TCFEntry = {
    character: string;
    strokes: string;
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
export type G6ADBSuggestions = string[];
export type G6ADBEntry = {
    character: string;
    suggestions: G6ADBSuggestions;
}

/* -------------------------------------------------------------------------- */

const db = new Database(G6_SQLITE_DB_PATH, { readonly: true });
db.pragma('journal_mode = WAL');
const STROKE_TABLE_NAME = "G6TCF";
const strokeRowsRaw = db.prepare(`SELECT * FROM ${STROKE_TABLE_NAME};`).all() as G6TCFEntryRaw[];
const SUGGESTION_TABLE_NAME = "ADB";
const suggestionRowsRaw = db.prepare(`SELECT * FROM ${SUGGESTION_TABLE_NAME};`).all() as G6ADBEntryRaw[];
db.close();

const strokeStart = performance.now();
const strokeRows: G6TCFEntry[] = strokeRowsRaw
    .map(row => {
        let strokes: string = "";
        for (let i = 0; i <= 29; i++) {
            const stroke = row[`Code${i}` as keyof G6TCFEntryRaw] as StrokeEmptyable;
            if (!stroke) { break; }
            strokes += stroke;
        }
        return {
            character: row.Character,
            strokes: strokes,
        };
    }).sort((a, b) => a.strokes.length - b.strokes.length);
const strokeEnd = performance.now();
console.log(`Processed ${strokeRows.length} TCF entries in ${strokeEnd - strokeStart} milliseconds.`);
fs.writeJsonSync(STROKE_JSON_OUTPUT_PATH, strokeRows);

const suggestionStart = performance.now();
const suggestionRows: G6ADBEntry[] = suggestionRowsRaw
    .map(row => {
        const suggestions: string[] = [];
        for (let i = 0; i <= 62; i++) {
            const word = row[`Word${i}` as keyof G6ADBEntryRaw] as string;
            if (!word) { continue; }
            suggestions.push(word);
        }
        return {
            character: row.Code,
            suggestions: dedupeArray(suggestions),
        };
    });
const suggestionEnd = performance.now();
console.log(`Processed ${suggestionRows.length} ADB entries in ${suggestionEnd - suggestionStart} milliseconds.`);
fs.writeJsonSync(SUGGESTION_JSON_OUTPUT_PATH, suggestionRows);

/* -------------------------------------------------------------------------- */

function dedupeArray<T>(array: T[]): T[] {
    return Array.from(new Set(array));
}