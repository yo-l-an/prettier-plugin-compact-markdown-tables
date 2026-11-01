import { doc, util } from 'prettier';
import * as markdownPlugin from 'prettier/plugins/markdown';

const markdownPrinter = markdownPlugin.printers.mdast;

const TABLE_LABEL_KIND = 'compact-markdown-tables/table';
// Private use characters: they do not occur in the formatted text of a table.
const MARKER_START = '\uE000';
const MARKER_END = '\uE001';
const MARKER_PATTERN = new RegExp(`${MARKER_START}(\\d+)${MARKER_END}`);

const IGNORE_COMMENT_TEXT = 'prettier-plugin-compact-markdown-tables-ignore';
const IGNORE_HTML_COMMENT_PATTERN = new RegExp(`^<!--\\s*${IGNORE_COMMENT_TEXT}\\s*-->$`);

const ALIGNED_LAYOUT = { padsCells: true, extendsDelimiters: true };

/** Number of tables printed in each document, keyed by the root node. */
const tableCountByRoot = new WeakMap();

const COMPACT_CHOICES = [
    { value: 'auto', description: 'Compact in the tables wider than markdownAlignedTableMaxWidth.' },
    { value: 'always', description: 'Compact in all tables.' },
    { value: 'never', description: 'Aligned in all tables.' },
];

/** @type {import('prettier').SupportOptions} */
export const options = {
    markdownCompactTablesTextCells: {
        type: 'choice',
        category: 'Markdown',
        default: 'auto',
        description: 'Remove the padding that aligns the text cells of Markdown tables.',
        choices: COMPACT_CHOICES,
    },
    markdownCompactTablesHeadingMarkers: {
        type: 'choice',
        category: 'Markdown',
        default: 'auto',
        description: 'Write the delimiter row under the header of Markdown tables with "---" in each column.',
        choices: COMPACT_CHOICES,
    },
    markdownAlignedTableMaxWidth: {
        type: 'int',
        category: 'Markdown',
        range: { start: 0, end: Infinity, step: 1 },
        description:
            'Maximum width of an aligned table, with its indentation, for the "auto" values. Default: printWidth. 0: all tables are too wide.',
    },
};

/**
 * Tells if the node is an ignore comment: `<!-- prettier-plugin-compact-markdown-tables-ignore -->`,
 * or `{/* prettier-plugin-compact-markdown-tables-ignore *\/}` in MDX, which the parser puts in a paragraph.
 */
function isIgnoreComment(node) {
    if (node?.type === 'html') {
        return IGNORE_HTML_COMMENT_PATTERN.test(node.value);
    }
    const comment = node?.type === 'paragraph' && node.children.length === 1 ? node.children[0] : node;
    return comment?.type === 'esComment' && comment.value.trim() === IGNORE_COMMENT_TEXT;
}

/** Prints the text of each cell of the table at the path, and measures the columns as Prettier does. */
function readTable(path, options, print) {
    const columnWidths = [];
    const rows = path.map(
        () =>
            path.map(({ index }) => {
                const text = doc.printer.printDocToString(print(), options).formatted;
                const width = util.getStringWidth(text);
                columnWidths[index] = Math.max(columnWidths[index] ?? 3, width);
                return { text, width };
            }, 'children'),
        'children'
    );
    return { rows, columnWidths, columnAligns: path.node.align, isMdx: options.parser === 'mdx' };
}

/**
 * Prints a table as the Markdown printer of Prettier does, with or without the padding of the cells
 * and the full width of the delimiter row.
 */
function printTable(table, { padsCells, extendsDelimiters }) {
    const { rows, columnWidths, columnAligns } = table;

    const printRow = (row) =>
        row.map(({ text, width }, columnIndex) => {
            if (!padsCells) {
                return text;
            }
            const spaceWidth = columnWidths[columnIndex] - width;
            const columnAlign = columnAligns[columnIndex];
            const startSpaceWidth =
                columnAlign === 'right' ? spaceWidth : columnAlign === 'center' ? Math.floor(spaceWidth / 2) : 0;
            return `${' '.repeat(startSpaceWidth)}${text}${' '.repeat(spaceWidth - startSpaceWidth)}`;
        });

    const delimiterRow = columnWidths.flatMap((columnWidth, columnIndex) => {
        // Outside MDX, Prettier removes the delimiters of the columns that the header row does not have.
        if (!table.isMdx && columnIndex >= rows[0].length) {
            return [];
        }
        const columnAlign = columnAligns[columnIndex];
        const start = columnAlign === 'center' || columnAlign === 'left' ? ':' : '-';
        const end = columnAlign === 'center' || columnAlign === 'right' ? ':' : '-';
        return [`${start}${extendsDelimiters ? '-'.repeat(columnWidth - 2) : '-'}${end}`];
    });

    const lines = [printRow(rows[0]), delimiterRow, ...rows.slice(1).map(printRow)];
    return doc.builders.join(
        doc.builders.hardlineWithoutBreakParent,
        lines.map((cells) => `| ${cells.join(' | ')} |`)
    );
}

/** Replaces each table label in the document with the doc that `getTableDoc` returns for it. */
function replaceTables(documentDoc, getTableDoc) {
    return doc.utils.mapDoc(documentDoc, (part) =>
        part.type === 'label' && part.label?.kind === TABLE_LABEL_KIND ? getTableDoc(part.label) : part
    );
}

/** Tells if a part of a table is compact, for an option value and the width of the table. */
function isCompact(optionValue, isTooWide) {
    return optionValue === 'always' || (optionValue === 'auto' && isTooWide);
}

/**
 * Chooses the layout of each table. The document is printed once with all tables aligned and a marker
 * before each table, to get the width of each table on its line, indentation included.
 */
function chooseTableLayouts(documentDoc, options) {
    const maxWidth = options.markdownAlignedTableMaxWidth ?? options.printWidth;
    const markedDoc = replaceTables(documentDoc, ({ index, table }) => [
        `${MARKER_START}${index}${MARKER_END}`,
        printTable(table, ALIGNED_LAYOUT),
    ]);
    const { formatted } = doc.printer.printDocToString(markedDoc, options);

    const tooWideTableIndexes = new Set();
    for (const line of formatted.split('\n')) {
        const marker = MARKER_PATTERN.exec(line);
        if (marker && util.getStringWidth(line.replace(marker[0], '')) > maxWidth) {
            tooWideTableIndexes.add(Number(marker[1]));
        }
    }

    return replaceTables(documentDoc, ({ index, table }) => {
        const isTooWide = tooWideTableIndexes.has(index);
        const padsCells = !isCompact(options.markdownCompactTablesTextCells, isTooWide);
        // Long delimiters align with padded cells only: "auto" shortens them when the cells have no padding.
        return printTable(table, {
            padsCells,
            extendsDelimiters: !isCompact(options.markdownCompactTablesHeadingMarkers, isTooWide || !padsCells),
        });
    });
}

/** @type {import('prettier').Printer} */
const compactTablePrinter = {
    ...markdownPrinter,
    print(path, options, print, args) {
        const { node } = path;
        if (node.type === 'table') {
            const table = readTable(path, options, print);
            if (isIgnoreComment(path.previous)) {
                return [doc.builders.breakParent, printTable(table, ALIGNED_LAYOUT)];
            }
            const index = tableCountByRoot.get(path.root) ?? 0;
            tableCountByRoot.set(path.root, index + 1);
            return [
                doc.builders.breakParent,
                doc.builders.label({ kind: TABLE_LABEL_KIND, index, table }, printTable(table, ALIGNED_LAYOUT)),
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
