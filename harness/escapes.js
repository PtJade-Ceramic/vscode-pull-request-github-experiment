'use strict';

// Escape-by-escape comparison: what the `.md` regex path produces vs. what a real YAML
// scalar parse (GitHub web) produces for the same `title:` value.

const { getDataFromTemplate, newIssueFirstLine, yamlScalarValue } = require('./shipped-template-parser');

const R = String.raw;
const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);

console.log(pad('case', 44) + pad('title: value', 30) + pad('bug output', 30) + 'correct (YAML)');
console.log('-'.repeat(140));
for (const [label, payload] of [
	['escaped emoji (SteamTools)', R`"\U0001F41B[BUG]"`, '\\U0001F41B[BUG]'],
	['literal emoji', '"🐛[BUG]"', '🐛[BUG]'],
	['literal emoji (unquoted)', '🐛[BUG] 请输入标题', '🐛[BUG] 请输入标题'],
	['literal emoji (single quotes)', "'🐛[BUG]'", '🐛[BUG]'],
	['escaped emoji as surrogate pair', R`"\uD83D\uDC1B[BUG]"`],
	['escaped astral CJK', R`"\U00020BB7"`],
	['literal astral CJK', '"𠮷"'],
	['escaped CJK', R`"\u4F60\u597D"`],
	['literal CJK', '"你好"'],
	['escaped accented latin', R`"caf\u00e9"`],
	['literal accented latin', '"café"'],
	['escaped VS16 / NBSP', R`"a\uFE0Fb"`],
	['escaped ASCII (\\x41 == A)', R`"\x41BC"`],
	['escaped newline', R`"a\nb"`],
	['escaped tab', R`"a\tb"`],
	['escaped quote', R`"a\"b"`],
	['escaped backslash', R`"C:\\temp"`],
	['escaped slash', R`"a\/b"`],
	['YAML line separator escapes', R`"a\Nb\_c\Ld\Pe"`],
	['escaped space', R`"a\ b"`],
	['JS-style \\u{...} (not valid YAML either)', R`"\u{1F41B}"`],
	['double quoted + trailing space', '"a b" '],
	['unquoted ending with apostrophe', "what's this'"],
	['single quoted with doubled quote', "'it''s'"],
	['quoted + inline comment', '"a b" # note'],
	['empty value', ''],
]) {
	const actual = newIssueFirstLine(getDataFromTemplate(`---\nname: t\ntitle: ${payload}\n---\n\nbody\n`).title);
	let expected;
	try {
		expected = yamlScalarValue(payload);
	} catch (e) {
		expected = `<invalid YAML: ${e.message.split('\n')[0]}>`;
	}
	console.log(
		pad(label, 44) +
			pad(payload, 30) +
			pad(JSON.stringify(actual), 30) +
			JSON.stringify(expected) +
			(actual === expected ? '' : '  <-- differs'),
	);
}
