'use strict';

/**
 * Standalone re-implementation of the `.md` issue-template parsing path used by the
 * GitHub Pull Requests extension (github.vscode-pull-request-github) as shipped in
 * 0.175.2026110204, 0.176.1 and 0.178.0, plus the first line of the generated
 * `NewIssue.md` (which the extension then sends to GitHub verbatim as the issue title).
 *
 * Reference: src/issues/issueFeatureRegistrar.ts
 *   - getDataFromTemplate()     -> lines 1346-1368
 *   - makeNewIssueFile()        -> lines 1134-1168 (only the first line matters here)
 *   - extractMetadataFromFile() -> src/issues/issueFile.ts (title = first line)
 */

const yaml = require('js-yaml');

/** Mirrors the extension's parseYamlTemplate(); only the metadata fields are reproduced. */
function parseYamlTemplate(parsed) {
	const labels = parsed.labels && Array.isArray(parsed.labels) ? parsed.labels : undefined;
	const assignees = parsed.assignees && Array.isArray(parsed.assignees) ? parsed.assignees : undefined;

	let body = '';
	if (parsed.body && Array.isArray(parsed.body)) {
		for (const field of parsed.body) {
			if (field.type === 'markdown' && field.attributes?.value) {
				body += field.attributes.value + '\n\n';
			} else if (field.type === 'textarea' && field.attributes?.label) {
				body += `## ${field.attributes.label}\n\n`;
				if (field.attributes.description) {
					body += `${field.attributes.description}\n\n`;
				}
			}
		}
	}

	return {
		name: parsed.name,
		about: parsed.description || parsed.about,
		title: parsed.title,
		labels,
		assignees,
		body: body || undefined,
		parser: 'yaml (js-yaml)',
	};
}

/** Mirrors the extension's getDataFromTemplate(), including the regex fallback. */
function getDataFromTemplate(template) {
	// Try to parse as YAML first (YAML templates have a different structure)
	try {
		const parsed = yaml.load(template);
		// Check if it looks like a YAML issue template (has name and body fields)
		if (parsed && typeof parsed === 'object' && parsed.name && parsed.body) {
			return parseYamlTemplate(parsed);
		}
	} catch {
		// Not a valid YAML, continue to Markdown parsing
	}

	// Parse as Markdown frontmatter template
	const labelsMatch = template.match(/labels:\s*(.*)/)?.[1];
	const assigneesMatch = template.match(/assignees:\s*(.*)/)?.[1];

	return {
		title: template.match(/title:\s*(.*)/)?.[1]?.replace(/^["']|["']$/g, ''),
		name: template.match(/name:\s*(.*)/)?.[1]?.replace(/^["']|["']$/g, ''),
		about: template.match(/about:\s*(.*)/)?.[1]?.replace(/^["']|["']$/g, ''),
		labels: labelsMatch
			? labelsMatch
					.split(',')
					.map(l => l.trim())
					.filter(l => l)
			: undefined,
		assignees: assigneesMatch
			? assigneesMatch
					.split(',')
					.map(a => a.trim())
					.filter(a => a)
			: undefined,
		body: template.match(/---([\s\S]*)---([\s\S]*)/)?.[2],
		parser: 'regex fallback',
	};
}

/** First line of the NewIssue.md the extension writes; becomes the issue title. */
function newIssueFirstLine(title) {
	return `${title ?? 'Issue Title'}\n\nAssignees: \nLabels: \nMilestone: \nProjects: \n\nBODY\n<!-- -->`.split(
		'\n',
	)[0];
}

/** What a real YAML scalar parse (i.e. what GitHub web does) yields for the value. */
function yamlScalarValue(payload) {
	const value = yaml.load(`title: ${payload}`);
	return value && typeof value === 'object' ? value.title : value;
}

module.exports = { getDataFromTemplate, newIssueFirstLine, yamlScalarValue, parseYamlTemplate };
