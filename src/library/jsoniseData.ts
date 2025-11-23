import fs from 'fs-extra';
import Database from 'better-sqlite3';
import { StrokeEmptyable } from './Stroke';
const G6_SQLITE_DB_PATH = './installation/installed files (custom)/g6.sqlite';
const JSON_OUTPUT_PATH = './public/g6-tcf-entries.json';

/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */

const db = new Database(G6_SQLITE_DB_PATH, { readonly: true });
db.pragma('journal_mode = WAL');
const tableName = "G6TCF";
const rowsRaw = db.prepare(`SELECT * FROM ${tableName};`).all() as G6TCFEntryRaw[];
db.close();

const start = performance.now();
const rows: G6TCFEntry[] = rowsRaw
    .map(row => {
        let strokes: string = "";
        for (let i = 0; i <= 29; i++) {
            const stroke = row[`Code${i}` as keyof G6TCFEntryRaw] as StrokeEmptyable;
            if (stroke === "") { break; }
            strokes += stroke;
        }
        return {
            character: row.Character,
            strokes: strokes,
        };
    }).sort((a, b) => a.strokes.length - b.strokes.length);
const end = performance.now();
console.log(`Processed ${rows.length} entries in ${end - start} milliseconds.`);

fs.writeJsonSync(JSON_OUTPUT_PATH, rows);