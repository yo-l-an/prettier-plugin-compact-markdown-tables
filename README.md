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

The plugin has no options. The column alignment markers (`:--`, `:-:`, `--:`) stay in the compact layout.

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

## How it works

Prettier already contains the two layouts. With `proseWrap: "never"`, it prints a table aligned when the table fits in `printWidth`, and compact when it does not. With the other `proseWrap` values, it always aligns tables.

The plugin gives `proseWrap: "never"` to the table nodes only. The paragraphs, lists and other nodes keep the `proseWrap` value of your configuration. If your configuration already sets `proseWrap: "never"`, the plugin changes nothing.

The width is that of the aligned table, plus its indentation (in a list or a block quote). All the rows of an aligned table have the same width.

## Limits

The plugin supplies the `markdown`, `mdx` and `remark` parsers and the `mdast` printer of Prettier with one change. Prettier uses one printer for each file. Thus if another plugin also replaces the `mdast` printer, only one of the two plugins has an effect.
