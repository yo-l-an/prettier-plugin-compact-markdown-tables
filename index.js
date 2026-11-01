import { doc, util } from 'prettier';
import * as markdownPlugin from 'prettier/plugins/markdown';

const markdownPrinter = markdownPlugin.printers.mdast;

const TABLE_LABEL_KIND = 'compact-markdown-tables/table';
// Private use characters: they do not occur in the formatted text of a table.
const MARKER_START = '\uE000';
const MARKER_END = '\uE001';
const MARKER_PATTERN = new RegExp(`${MARKER_START}(\\d+)${MARKER_END}`);

/** Number of tables printed in each document, keyed by the root node. */
const tableCountByRoot = new WeakMap();

/** @type {import('prettier').SupportOptions} */
export const options = {
    markdownCompactTables: {
        type: 'boolean',
        category: 'Markdown',
        default: true,
        description: 'Print the Markdown tables that are too wide with the compact layout.',
    },
    markdownAlignedTableMaxWidth: {
        type: 'int',
        category: 'Markdown',
        range: { start: 0, end: Infinity, step: 1 },
        description:
            'Maximum width of an aligned table, with its indentation. A wider table gets the compact layout. Default: printWidth. 0: all tables get the compact layout.',
    },
};

/**
 * Gets the two layouts of a table from the markdown printer. With `proseWrap: "never"`,
 * it prints `[breakParent, group(ifBreak(compactTable, alignedTable))]`.
 *
 * @returns {{ alignedTable: import('prettier').Doc, compactTable: import('prettier').Doc } | undefined}
 */
function printTableLayouts(path, options, print, args) {
    const tableDoc = markdownPrinter.print(path, { ...options, proseWrap: 'never' }, print, args);
    const layouts = Array.isArray(tableDoc) ? tableDoc[1]?.contents : undefined;
    if (layouts?.type !== doc.builders.ifBreak('').type) {
        return undefined;
    }
    return { alignedTable: layouts.flatContents, compactTable: layouts.breakContents };
}

/** Replaces each table label in the document with the doc that `getTableDoc` returns for it. */
function replaceTables(documentDoc, getTableDoc) {
    return doc.utils.mapDoc(documentDoc, (part) =>
        part.type === 'label' && part.label?.kind === TABLE_LABEL_KIND ? getTableDoc(part.label) : part
    );
}

/**
 * Chooses the layout of each table. The document is printed once with all tables aligned and a marker
 * before each table, to get the width of each table on its line, indentation included.
 */
function chooseTableLayouts(documentDoc, options) {
    const maxWidth = options.markdownAlignedTableMaxWidth ?? options.printWidth;
    const markedDoc = replaceTables(documentDoc, (table) => [
        `${MARKER_START}${table.index}${MARKER_END}`,
        table.alignedTable,
    ]);
    const { formatted } = doc.printer.printDocToString(markedDoc, options);

    const compactTableIndexes = new Set();
    for (const line of formatted.split('\n')) {
        const marker = MARKER_PATTERN.exec(line);
        if (marker && util.getStringWidth(line.replace(marker[0], '')) > maxWidth) {
            compactTableIndexes.add(Number(marker[1]));
        }
    }

    return replaceTables(documentDoc, (table) =>
        compactTableIndexes.has(table.index) ? table.compactTable : table.alignedTable
    );
}

/** @type {import('prettier').Printer} */
const compactTablePrinter = {
    ...markdownPrinter,
    print(path, options, print, args) {
        if (!options.markdownCompactTables) {
            return markdownPrinter.print(path, options, print, args);
        }

        const { node } = path;
        if (node.type === 'table') {
            const layouts = printTableLayouts(path, options, print, args);
            if (!layouts) {
                return markdownPrinter.print(path, options, print, args);
            }
            const index = tableCountByRoot.get(path.root) ?? 0;
            tableCountByRoot.set(path.root, index + 1);
            return [
                doc.builders.breakParent,
                doc.builders.label({ kind: TABLE_LABEL_KIND, index, ...layouts }, layouts.alignedTable),
            ];
        }

        const documentDoc = markdownPrinter.print(path, options, print, args);
        return node.type === 'root' && tableCountByRoot.has(node)
            ? chooseTableLayouts(documentDoc, options)
            : documentDoc;
    },
};

// Prettier takes the printer from the plugin that supplies the parser,
// so this plugin supplies the Markdown parsers again with its own printer.
export const parsers = markdownPlugin.parsers;

export const printers = { mdast: compactTablePrinter };
