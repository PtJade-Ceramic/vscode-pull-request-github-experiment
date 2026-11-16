# `.md` issue templates: frontmatter YAML escapes are not decoded

Minimal reproduction for a bug in the **GitHub Pull Requests** extension
(`github.vscode-pull-request-github`).

When a Markdown issue template (`.github/ISSUE_TEMPLATE/*.md`) writes its frontmatter values
with YAML escape sequences — e.g. `title: "\U0001F41B[BUG] 请输入标题"` — the extension keeps the
raw escape instead of decoding it. Line 1 of the generated `NewIssue.md` (which becomes the
issue title) ends up containing the literal text `\U0001F41B[BUG] 请输入标题`.

GitHub web parses the same file with a real YAML parser and shows `🐛[BUG] 请输入标题`.

|                           |                                                                             |
| ------------------------- | --------------------------------------------------------------------------- |
| Extension versions tested | `0.175.2026110204` (stable), `0.176.1`, `0.178.0`                           |
| VS Code                   | `1.145.3`                                                                   |
| OS                        | Windows 11 x64 (independent of LF/CRLF line endings)                        |
| Affected format           | `.md` templates only — `.yml` issue forms go through `js-yaml` and are fine |
| Affected since            | at least `v0.80.0` (when issue templates were introduced)                   |

## Feedback

Issues are disabled to keep the repository spam-free; community feedback lives in Discussions:

https://github.com/PtJade-Ceramic/vscode-pull-request-github-experiment/discussions/1

If this bug hits your repository, reply there with the extension version, VS Code version, the
`title:` line of your template and what line 1 of `NewIssue.md` contained.

## Reproduce in VS Code (no tooling required)

1. Open this repository in VS Code with the **GitHub Pull Requests** extension installed.
2. Run `GitHub Pull Requests: Create an Issue`.
3. Choose the template `(Simplified Chinese)Bug Report \U0001F41B`.

**Actual:** the picker description _and_ line 1 of `NewIssue.md` contain `\U0001F41B[BUG] 请输入标题`,
and that is what gets sent to GitHub as the issue title.

**Expected:** `🐛[BUG] 请输入标题`.

> Issues, wiki and projects are disabled on this repository on purpose, and pull requests are
> limited to collaborators. That only affects step 3: the reproduction stops at the local
> `NewIssue.md`, whose first line is exactly the string the extension would send as the issue
> title. Feedback is collected in
> [Discussions](https://github.com/PtJade-Ceramic/vscode-pull-request-github-experiment/discussions/1).

Control cases in the same folder:

| Template                                                                  | Line 1 of `NewIssue.md`                     |        |
| ------------------------------------------------------------------------- | ------------------------------------------- | ------ |
| `bug-report.md`, `bug-report.en.md`, `question*.md`, `feature-request.md` | `\U0001F41B…`, `\U0001F9D0…`, `\U0001F451…` | broken |
| `milestone.md` (no escapes)                                               | `vTBD Milestone`                            | fine   |
| `control-literal-emoji.md` (literal `🐛`)                                 | `🐛[BUG] 请输入标题`                        | fine   |
| `control-escaped-emoji.yml` (YAML issue form)                             | `🐛[BUG] 请输入标题`                        | fine   |

The templates other than the two `control-*` ones are copied verbatim from
[`BeyondDimension/SteamTools@9b66636`](https://github.com/BeyondDimension/SteamTools/tree/9b66636a0ce528a4819da298ef71fb76ff8fe208/.github/ISSUE_TEMPLATE)
to keep the reproduction realistic.

## Reproduce headlessly

```bash
npm install
npm run scope     # every template in .github/ISSUE_TEMPLATE -> line 1 of NewIssue.md
npm run escapes   # escape matrix: bug output vs. correct YAML output
```

Formatting: Prettier is the default formatter for this repo (`.vscode/settings.json` +
`.prettierrc.json`: tabs, single quotes, 120 columns, LF). Use `Format Document`, or
`npx prettier --write .` for everything.

`harness/shipped-template-parser.js` re-implements the extension's
[`getDataFromTemplate()`](https://github.com/microsoft/vscode-pull-request-github/blob/1315a8985118afe1843b2fbb7765a71f1ae4e625/src/issues/issueFeatureRegistrar.ts#L1346-L1368)
(both the `js-yaml` path and the regex fallback) and the first line of `makeNewIssueFile()`'s
template, so the output matches the shipped bundles.

## Root cause

[`getDataFromTemplate()`](https://github.com/microsoft/vscode-pull-request-github/blob/1315a8985118afe1843b2fbb7765a71f1ae4e625/src/issues/issueFeatureRegistrar.ts#L1346-L1368) in
[`issueFeatureRegistrar.ts`](https://github.com/microsoft/vscode-pull-request-github/blob/1315a8985118afe1843b2fbb7765a71f1ae4e625/src/issues/issueFeatureRegistrar.ts)
first tries `yaml.load(<entire file>)`. For a Markdown template the frontmatter _plus_ the Markdown
body is not a single YAML document, so that always throws
(`expected a single document in the stream` / `bad indentation of a sequence entry`), and the code
falls back to regexes that only strip surrounding quotes:

https://github.com/microsoft/vscode-pull-request-github/blob/1315a8985118afe1843b2fbb7765a71f1ae4e625/src/issues/issueFeatureRegistrar.ts#L1360-L1367

```ts
const title = template.match(/title:\s*(.*)/)?.[1]?.replace(/^["']|["']$/g, '');
const name = template.match(/name:\s*(.*)/)?.[1]?.replace(/^["']|["']$/g, '');
const about = template.match(/about:\s*(.*)/)?.[1]?.replace(/^["']|["']$/g, '');
const labelsMatch = template.match(/labels:\s*(.*)/)?.[1];
const assigneesMatch = template.match(/assignees:\s*(.*)/)?.[1];
const body = template.match(/---([\s\S]*)---([\s\S]*)/)?.[2];
```

A regex cannot decode YAML escapes, so nothing is unescaped, and `makeNewIssueFile()` writes the
raw string to line 1 of `NewIssue.md`:

https://github.com/microsoft/vscode-pull-request-github/blob/1315a8985118afe1843b2fbb7765a71f1ae4e625/src/issues/issueFeatureRegistrar.ts#L1160

Line 1 is then used verbatim as the issue title:

[`extractMetadataFromFile()`](https://github.com/microsoft/vscode-pull-request-github/blob/9934ff2d8d725b8023048a1d72b3bba0f985e157/src/issues/issueFile.ts#L172-L210) in
[`issueFile.ts`](https://github.com/microsoft/vscode-pull-request-github/blob/9934ff2d8d725b8023048a1d72b3bba0f985e157/src/issues/issueFile.ts)

https://github.com/microsoft/vscode-pull-request-github/blob/9934ff2d8d725b8023048a1d72b3bba0f985e157/src/issues/issueFile.ts#L210

```ts
const title = text.substring(0, indexOfEmptyLine);
```

It is not emoji-specific — **every** escape leaks, including plain ASCII (`\x41` stays `\x41`
instead of becoming `A`), and the same code path also mishandles trailing quotes, single-quoted
values, inline `#` comments, empty values and bodies containing `---`.

## Suggested fix

Parse just the frontmatter block with YAML, and take the body as "everything after the second
`---`", inside
[`getDataFromTemplate()`](https://github.com/microsoft/vscode-pull-request-github/blob/1315a8985118afe1843b2fbb7765a71f1ae4e625/src/issues/issueFeatureRegistrar.ts#L1346-L1368):

```ts
const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---/.exec(template)?.[1];
const meta = (frontmatter ? yaml.load(frontmatter) : undefined) as IssueTemplate | undefined;
const body = /^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/.exec(template)?.[1];
```

## Related

- [`#8277`](https://github.com/microsoft/vscode-pull-request-github/pull/8277) added `.yml`
  issue form support via `js-yaml` (merged 2025-12) — `.yml` is unaffected by this bug.
- [`#8263`](https://github.com/microsoft/vscode-pull-request-github/pull/8263) extended the
  same regex path to `labels`/`assignees`.
