//! TODO: CNS database is terrible with many inconsistencies and errors. Find a better source!

import fs from 'fs-extra';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import extract from 'extract-zip';

const dataDir = 'data/cns11643/';
const outputDir = 'public';
const MAPPING_TABLES_URL = 'https://www.cns11643.gov.tw/opendata/MapingTables.zip';
const PROPERTIES_URL = 'https://www.cns11643.gov.tw/opendata/Properties.zip';

async function downloadFile(url: string, dest: string) {
    const res = await fetch(url);
    if (res.status !== 200 || !res.body) {
        throw new Error(`Failed to download ${url}: ${res.statusText}`);
    }
    const destStream = fs.createWriteStream(dest);
    const nodeStream = Readable.fromWeb(res.body as any);
    await pipeline(nodeStream, destStream);
    console.log(`Download completed: ${path.basename(dest)}`);
}

async function processMappingTables(dir: string) {
    console.log(`Processing mapping tables in ${dir}`);
    const unicodeDir = path.join(dir, 'Unicode');
    const files = await fs.readdir(unicodeDir);

    const mappingEntries: Map<string, string> = new Map();
    const filePromises = files.map(async (file) => {
        const filePath = path.join(unicodeDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim() !== '');
        lines.forEach(line => {
            const [cns, unicode] = line.split('\t');
            mappingEntries.set(cns, String.fromCodePoint(parseInt(unicode, 16)));
        });
        console.log(`Processed file: ${file}, entries: ${lines.length}`);
        return mappingEntries;
    });

    await Promise.all(filePromises);
    console.log(`Total mapping entries processed: ${mappingEntries.size}`);
    return mappingEntries;
}

async function processProperties(dir: string) {
    const strokeMap: Record<string, string> = {
        "1": "一",
        "2": "丨",
        "3": "丿",
        "4": "丶",
        "5": "フ",
    };
    console.log(`Processing properties in ${dir}`);
    const filePath = path.join(dir, "CNS_strokes_sequence.txt");
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    const properties: Map<string, string> = new Map();
    lines.forEach(line => {
        const [cns, strokeSeq] = line.split('\t');
        const strokes = strokeSeq.split('').map(s => strokeMap[s] || '').join('');
        properties.set(cns, strokes);
    });
    console.log(`Processed properties file: ${filePath}, entries: ${lines.length}`);
    return properties;
}

async function main() {
    await fs.ensureDir(dataDir);

    // clear existing files
    console.log('Clearing existing files in data directory...');
    const files = await fs.readdir(dataDir);
    await Promise.all(files.map(file => fs.remove(path.join(dataDir, file))));
    console.log('Cleared existing files in data directory.');

    // Download files
    console.log('Starting downloads...');
    await Promise.all([
        downloadFile(MAPPING_TABLES_URL, path.join(dataDir, 'MapingTables.zip')),
        downloadFile(PROPERTIES_URL, path.join(dataDir, 'Properties.zip')),
    ]);
    console.log('All downloads completed.');

    // Extract files
    console.log('Starting extraction...');
    await Promise.all([
        extract(path.join(dataDir, 'MapingTables.zip'), { dir: path.resolve(dataDir, 'MapingTables') }),
        extract(path.join(dataDir, 'Properties.zip'), { dir: path.resolve(dataDir, 'Properties') }),
    ]);
    console.log('All files extracted.');

    // Process extracted data
    console.log('Starting data processing...');
    const cnsToUnicodeEntries = await processMappingTables(path.join(dataDir, 'MapingTables'));
    const cnsToStrokesEntries = await processProperties(path.join(dataDir, 'Properties'));
    console.log('Data processing completed.');

    // Combine data and write to JSON
    const unicodeToStrokesEntries: { character: string, strokes: string }[] = [];
    cnsToStrokesEntries.forEach((strokes, cns) => {
        const unicodeChar = cnsToUnicodeEntries.get(cns);
        if (unicodeChar) { unicodeToStrokesEntries.push({ character: unicodeChar, strokes }); }
    });
    unicodeToStrokesEntries.sort((a, b) => a.strokes.length - b.strokes.length);
    const outputPath = path.join(outputDir, 'cns-unicode-to-strokes.json');
    await fs.writeJson(outputPath, unicodeToStrokesEntries, { spaces: 4 });
    console.log(`Combined data written to ${outputPath}, total entries: ${unicodeToStrokesEntries.length}`);
}

main().catch(console.error);