'use strict';

// Runs the shipped parsing logic over every template in ../.github/ISSUE_TEMPLATE and
// prints what line 1 of NewIssue.md (== the created issue title) will be.

const fs = require('fs');
const path = require('path');
const { getDataFromTemplate, newIssueFirstLine } = require('./shipped-template-parser');

const TEMPLATE_DIR = path.join(__dirname, '..', '.github', 'ISSUE_TEMPLATE');
const pad = (s, n) => (String(s) + ' '.repeat(n)).slice(0, n);

const rows = [];
for (const file of fs
	.readdirSync(TEMPLATE_DIR)
	.filter(f => /\.(md|ya?ml)$/i.test(f))
	.sort()) {
	const parsed = getDataFromTemplate(fs.readFileSync(path.join(TEMPLATE_DIR, file), 'utf8'));
	rows.push({
		file,
		parser: parsed.parser,
		name: parsed.name,
		title: parsed.title,
		firstLine: newIssueFirstLine(parsed.title),
	});
}

console.log(
	pad('template', 27) + pad('parser', 16) + pad('template name (shown in picker)', 44) + 'line 1 of NewIssue.md',
);
console.log('-'.repeat(150));
for (const r of rows) {
	console.log(
		pad(r.file, 27) +
			pad(r.parser, 16) +
			pad(r.name, 44) +
			JSON.stringify(r.firstLine) +
			(r.parser === 'regex fallback' && /\\/.test(r.firstLine) ? '  <-- escape leaked' : ''),
	);
}
