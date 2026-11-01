# prettier-plugin-compact-markdown-tables

A Prettier plugin for Markdown and MDX tables:

- A table that fits in `printWidth` keeps the aligned layout of Prettier.
- A table that is wider than `printWidth` gets the compact layout: no padding in the cells, `---` in the delimiter row.

Aligned columns make small tables easy to read. In a wide table, the alignment adds many spaces to each row, so the rows wrap in the editor, and a change to one cell changes all the rows of the diff. The compact layout prevents this.

<!-- prettier-ignore -->
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

The package is on GitHub. `semver:*` installs the latest version tag:

```sh
npm install --save-dev "github:yo-l-an/prettier-plugin-compact-markdown-tables#semver:*"
```

```js
// prettier.config.js
export default {
    plugins: ['prettier-plugin-compact-markdown-tables'],
};
```

Prettier 3 is necessary.

## Options

The compact layout has two parts: the cells without padding, and the delimiter row with `---`. An option sets each part:

| Option | Default | Description |
| --- | --- | --- |
| `markdownCompactTablesTextCells` | `"auto"` | Removes the padding that aligns the text cells. |
| `markdownCompactTablesHeadingMarkers` | `"auto"` | Writes the delimiter row under the header with `---` in each column. |
| `markdownAlignedTableMaxWidth` | Same as `printWidth` | Maximum width of an aligned table, for the `"auto"` values. `0`: all tables are too wide. |

The values of the two first options:

- `"auto"`: compact in the tables wider than `markdownAlignedTableMaxWidth`, aligned in the other tables. For `markdownCompactTablesHeadingMarkers`, `"auto"` also writes `---` when the cells have no padding: long delimiters align with padded cells only.
- `"always"`: compact in all tables.
- `"never"`: aligned in all tables. With `"never"` for the two options, all tables keep the aligned layout of Prettier, as without the plugin.

```js
// prettier.config.js
export default {
    plugins: ['prettier-plugin-compact-markdown-tables'],
    markdownCompactTablesHeadingMarkers: 'always',
    markdownAlignedTableMaxWidth: 160,
    overrides: [
        {
            files: 'CHANGELOG.md',
            options: { markdownCompactTablesTextCells: 'never', markdownCompactTablesHeadingMarkers: 'never' },
        },
    ],
};
```

On the command line, the plugin must also be in `--plugin`, else Prettier does not know its options:

```sh
prettier --plugin prettier-plugin-compact-markdown-tables --markdown-compact-tables-text-cells never --check "**/*.md"
```

The width of a table is the width of one row of the aligned table, plus the indentation of the table (in a list or a block quote). All the rows of an aligned table have the same width.

## Combinations of the options

These examples use `markdownAlignedTableMaxWidth: 30`: the first table (20 characters wide when aligned) fits, the second table (36 characters) is too wide. Each title gives the value of `markdownCompactTablesTextCells`, then the value of `markdownCompactTablesHeadingMarkers`.

### `"auto"`, `"auto"` (default)

<!-- prettier-ignore -->
```md
| Name  | Role     |
| ----- | -------- |
| Ada   | Engineer |
| Grace | Admiral  |

| Setting | Effect |
| --- | --- |
| printWidth | Maximum line length |
| proseWrap | Wraps prose |
```

### `"auto"`, `"always"`

<!-- prettier-ignore -->
```md
| Name  | Role     |
| --- | --- |
| Ada   | Engineer |
| Grace | Admiral  |

| Setting | Effect |
| --- | --- |
| printWidth | Maximum line length |
| proseWrap | Wraps prose |
```

### `"auto"`, `"never"`

<!-- prettier-ignore -->
```md
| Name  | Role     |
| ----- | -------- |
| Ada   | Engineer |
| Grace | Admiral  |

| Setting | Effect |
| ---------- | ------------------- |
| printWidth | Maximum line length |
| proseWrap | Wraps prose |
```

### `"always"`, `"auto"`

<!-- prettier-ignore -->
```md
| Name | Role |
| --- | --- |
| Ada | Engineer |
| Grace | Admiral |

| Setting | Effect |
| --- | --- |
| printWidth | Maximum line length |
| proseWrap | Wraps prose |
```

### `"always"`, `"always"`

<!-- prettier-ignore -->
```md
| Name | Role |
| --- | --- |
| Ada | Engineer |
| Grace | Admiral |

| Setting | Effect |
| --- | --- |
| printWidth | Maximum line length |
| proseWrap | Wraps prose |
```

### `"always"`, `"never"`

<!-- prettier-ignore -->
```md
| Name | Role |
| ----- | -------- |
| Ada | Engineer |
| Grace | Admiral |

| Setting | Effect |
| ---------- | ------------------- |
| printWidth | Maximum line length |
| proseWrap | Wraps prose |
```

### `"never"`, `"auto"`

<!-- prettier-ignore -->
```md
| Name  | Role     |
| ----- | -------- |
| Ada   | Engineer |
| Grace | Admiral  |

| Setting    | Effect              |
| --- | --- |
| printWidth | Maximum line length |
| proseWrap  | Wraps prose         |
```

### `"never"`, `"always"`

<!-- prettier-ignore -->
```md
| Name  | Role     |
| --- | --- |
| Ada   | Engineer |
| Grace | Admiral  |

| Setting    | Effect              |
| --- | --- |
| printWidth | Maximum line length |
| proseWrap  | Wraps prose         |
```

### `"never"`, `"never"`

<!-- prettier-ignore -->
```md
| Name  | Role     |
| ----- | -------- |
| Ada   | Engineer |
| Grace | Admiral  |

| Setting    | Effect              |
| ---------- | ------------------- |
| printWidth | Maximum line length |
| proseWrap  | Wraps prose         |
```

## Keep one table aligned

Put this comment immediately before a table to keep its aligned layout, whatever its width and the options:

```md
<!-- prettier-plugin-compact-markdown-tables-ignore -->

| Name | Description |
| ---- | ----------- |
```

In MDX, the comment is `{/* prettier-plugin-compact-markdown-tables-ignore */}`. The comment has an effect on the next table only. Prettier puts an empty line between the comment and the table.

Different from `<!-- prettier-ignore -->`, Prettier continues to format the table.

## How it works

The plugin prints the tables with the rules of the Markdown printer of Prettier: the same text in the cells, the same column widths, the same alignment of the cells. Only the padding of the cells and the length of the delimiters change. The other nodes are printed by the Markdown printer of Prettier, with the options of your configuration.

To find the width of each table with its indentation, the plugin prints the document one time with all tables aligned. Then it prints each table with the layout that the options give for its width.

## Limits

The plugin supplies the `markdown`, `mdx` and `remark` parsers and the `mdast` printer of Prettier with one change. Prettier uses one printer for each file. Thus if another plugin also replaces the `mdast` printer, only one of the two plugins has an effect.
