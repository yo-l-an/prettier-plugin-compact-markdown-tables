import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as prettier from 'prettier';
import * as compactMarkdownTables from '../index.js';

const PRINT_WIDTH = 40;

/**
 * Formats Markdown with the plugin, as a project config would.
 *
 * @param {string} markdown
 * @param {import('prettier').Options} [options]
 */
function formatWithPlugin(markdown, options = {}) {
    return prettier.format(markdown, {
        parser: 'markdown',
        printWidth: PRINT_WIDTH,
        plugins: [compactMarkdownTables],
        ...options,
    });
}

/**
 * Formats Markdown with Prettier alone, to compare with its aligned tables.
 *
 * @param {string} markdown
 * @param {import('prettier').Options} [options]
 */
function formatWithoutPlugin(markdown, options = {}) {
    return prettier.format(markdown, { parser: 'markdown', printWidth: PRINT_WIDTH, ...options });
}

/**
 * Builds a two-column table whose aligned rows are exactly `rowWidth` characters wide.
 *
 * @param {number} rowWidth
 */
function buildTableWithRowWidth(rowWidth) {
    // An aligned row is "| " + key + " | " + value + " |": 7 characters around the cells.
    const valueWidth = rowWidth - 'key'.length - 7;
    return ['|key|value|', '|-|-|', `|a|${'v'.repeat(valueWidth)}|`, ''].join('\n');
}

test('a table that fits in printWidth keeps the aligned layout of Prettier', async () => {
    const markdown = ['| Name | Role |', '|-|-|', '| Ada | Engineer |', '| Grace | Admiral |', ''].join('\n');

    assert.equal(await formatWithPlugin(markdown), await formatWithoutPlugin(markdown));
});

test('a table wider than printWidth gets the compact layout', async () => {
    const markdown = [
        '| Setting | Effect |',
        '|-|-|',
        '| printWidth | Sets the maximum line length of the formatted output |',
        '| proseWrap | Wraps prose |',
        '',
    ].join('\n');

    assert.equal(
        await formatWithPlugin(markdown),
        [
            '| Setting | Effect |',
            '| --- | --- |',
            '| printWidth | Sets the maximum line length of the formatted output |',
            '| proseWrap | Wraps prose |',
            '',
        ].join('\n')
    );
});

test('a table exactly as wide as printWidth stays aligned; one more character makes it compact', async () => {
    const fittingTable = await formatWithPlugin(buildTableWithRowWidth(PRINT_WIDTH));
    const overflowingTable = await formatWithPlugin(buildTableWithRowWidth(PRINT_WIDTH + 1));

    const fittingRows = fittingTable.trimEnd().split('\n');
    assert.deepEqual(
        fittingRows.map((row) => row.length),
        fittingRows.map(() => PRINT_WIDTH)
    );
    assert.equal(overflowingTable.split('\n')[0], '| key | value |');
});

test('the indentation of a table in a list counts toward printWidth', async () => {
    const table = buildTableWithRowWidth(PRINT_WIDTH - 1);
    const nestedTable = table
        .trimEnd()
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n');

    const topLevelOutput = await formatWithPlugin(table);
    const nestedOutput = await formatWithPlugin(`- Item\n\n${nestedTable}\n`);

    assert.match(topLevelOutput, /^\| key \| value +\|$/m);
    assert.match(nestedOutput, /^ {2}\| key \| value \|$/m);
});

test('prose outside tables keeps its line breaks with proseWrap "preserve"', async () => {
    const markdown = ['First line of a paragraph', 'second line of the same paragraph.', ''].join('\n');

    assert.equal(await formatWithPlugin(markdown, { proseWrap: 'preserve' }), markdown);
});

test('markdownAlignedTableMaxWidth below printWidth makes a table that fits in printWidth compact', async () => {
    const table = buildTableWithRowWidth(PRINT_WIDTH - 10);

    const output = await formatWithPlugin(table, { markdownAlignedTableMaxWidth: PRINT_WIDTH - 11 });

    assert.equal(output.split('\n')[0], '| key | value |');
});

test('markdownAlignedTableMaxWidth above printWidth keeps a table wider than printWidth aligned', async () => {
    const table = buildTableWithRowWidth(PRINT_WIDTH + 20);

    const output = await formatWithPlugin(table, { markdownAlignedTableMaxWidth: PRINT_WIDTH + 20 });

    assert.equal(output, await formatWithoutPlugin(table));
});

test('markdownAlignedTableMaxWidth 0 makes all tables compact', async () => {
    const markdown = ['| Name | Role |', '|-|-|', '| Ada | Engineer |', ''].join('\n');

    const output = await formatWithPlugin(markdown, { markdownAlignedTableMaxWidth: 0 });

    assert.equal(output, ['| Name | Role |', '| --- | --- |', '| Ada | Engineer |', ''].join('\n'));
});

test('markdownCompactTables false gives the output of Prettier without the plugin', async () => {
    const markdown = ['| Key | Value |', '|-|-|', `| a | ${'v'.repeat(PRINT_WIDTH)} |`, ''].join('\n');

    const output = await formatWithPlugin(markdown, { markdownCompactTables: false });

    assert.equal(output, await formatWithoutPlugin(markdown));
});

test('code blocks keep their formatting in a file with compact tables', async () => {
    const markdown = [
        '```js',
        `const values = [${Array.from({ length: 12 }, (_, i) => i).join(', ')}];`,
        '```',
        '',
        buildTableWithRowWidth(PRINT_WIDTH + 1),
    ].join('\n');

    const output = await formatWithPlugin(markdown);
    const expectedCodeBlock = (await formatWithoutPlugin(markdown)).split('\n\n')[0];

    assert.ok(output.startsWith(`${expectedCodeBlock}\n\n`));
    assert.match(output, /^\| key \| value \|$/m);
});

test('the plugin formats MDX tables too', async () => {
    const markdown = ['| Key | Value |', '|-|-|', `| a | ${'v'.repeat(PRINT_WIDTH)} |`, ''].join('\n');

    const output = await formatWithPlugin(markdown, { parser: 'mdx' });

    assert.equal(output.split('\n')[1], '| --- | --- |');
});
