# prettier-plugin-compact-markdown-tables

A Prettier plugin for Markdown and MDX tables:

- A table that fits in `printWidth` keeps the aligned layout of Prettier.
- A table that is wider than `printWidth` gets the compact layout: no padding in the cells, `---` in the delimiter row.

Aligned columns make small tables easy to read. In a wide table, the alignment adds many spaces to each row, so the rows wrap in the editor, and a change to one cell changes all the rows of the diff. The compact layout prevents this.

```md
| Name  | Role     |
| ----- | -------- |
| Ada   | Engineer |
| Grace | Admiral  |

| Setting | Effect |
| --- | --- |
| printWidth | Sets the maximum line length of the formatted output, also for the rows of aligned Markdown tables, with their indentation |
| proseWrap | Wraps prose |
```

The column alignment markers (`:--`, `:-:`, `--:`) stay in the compact layout.

## Installation

```sh
npm install --save-dev prettier-plugin-compact-markdown-tables
```

```js
// prettier.config.js
export default {
    plugins: ['prettier-plugin-compact-markdown-tables'],
};
```

Prettier 3 is necessary.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `markdownAlignedTableMaxWidth` | Same as `printWidth` | Maximum width of an aligned table. A wider table gets the compact layout. `0`: all tables get the compact layout. |
| `markdownCompactTables` | `true` | `false` disables the plugin: all tables keep the aligned layout of Prettier. Use it to compare the two outputs, or to disable the plugin for some files with `overrides`. |

```js
// prettier.config.js
export default {
    plugins: ['prettier-plugin-compact-markdown-tables'],
    markdownAlignedTableMaxWidth: 160,
    overrides: [{ files: 'CHANGELOG.md', options: { markdownCompactTables: false } }],
};
```

On the command line, the plugin must also be in `--plugin`, else Prettier does not know its options:

```sh
prettier --plugin prettier-plugin-compact-markdown-tables --no-markdown-compact-tables --check "**/*.md"
```

The width of a table is the width of one row of the aligned table, plus the indentation of the table (in a list or a block quote). All the rows of an aligned table have the same width.

## Keep one table aligned

Put this comment immediately before a table to keep its aligned layout, whatever its width:

```md
<!-- prettier-plugin-compact-markdown-tables-ignore -->

| Name | Description |
| ---- | ----------- |
```

In MDX, the comment is `{/* prettier-plugin-compact-markdown-tables-ignore */}`. The comment has an effect on the next table only. Prettier puts an empty line between the comment and the table.

Different from `<!-- prettier-ignore -->`, Prettier continues to format the table.

## How it works

Prettier already contains the two layouts. With `proseWrap: "never"`, it prints a table aligned when the table fits in `printWidth`, and compact when it does not. With the other `proseWrap` values, it always aligns tables.

The plugin gets the two layouts of each table from the Markdown printer of Prettier, with `proseWrap: "never"` for the table nodes only. The paragraphs, lists and other nodes keep the `proseWrap` value of your configuration. Then the plugin prints the document one time with all tables aligned, to find the width of each table with its indentation, and keeps the aligned layout of the tables that are not too wide.

## Limits

The plugin supplies the `markdown`, `mdx` and `remark` parsers and the `mdast` printer of Prettier with one change. Prettier uses one printer for each file. Thus if another plugin also replaces the `mdast` printer, only one of the two plugins has an effect.
