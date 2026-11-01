import * as markdownPlugin from 'prettier/plugins/markdown';

const markdownPrinter = markdownPlugin.printers.mdast;

/**
 * Prettier prints a table aligned, or compact when the aligned table is wider than printWidth,
 * but only with `proseWrap: "never"`. This printer gives that option to table nodes only,
 * so the prose keeps the `proseWrap` value of the project.
 *
 * @type {import('prettier').Printer}
 */
const compactTablePrinter = {
    ...markdownPrinter,
    print(path, options, print, args) {
        if (path.node.type === 'table') {
            return markdownPrinter.print(path, { ...options, proseWrap: 'never' }, print, args);
        }
        return markdownPrinter.print(path, options, print, args);
    },
};

// Prettier takes the printer from the plugin that supplies the parser,
// so this plugin supplies the Markdown parsers again with its own printer.
export const parsers = markdownPlugin.parsers;

export const printers = { mdast: compactTablePrinter };
