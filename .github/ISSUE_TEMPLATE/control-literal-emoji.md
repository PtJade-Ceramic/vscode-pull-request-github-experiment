---
name: "Control: literal emoji (expected to work)"
about: Control case for the \U escape bug
title: "🐛[BUG] 请输入标题"
labels: bug
assignees: ''

---

Every other template in this folder writes the emoji as a YAML `\U0001F41B`
escape inside a double-quoted scalar. This one uses the literal character so
that the two cases can be compared in the template picker and in NewIssue.md.
