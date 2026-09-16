# Security Policy

[简体中文](SECURITY.md) · **English**

agent-isles can access local project files and perform actions through AI tools. Do not disclose vulnerability details, API keys, access tokens, local paths, or other sensitive information in public Issues, Discussions, pull requests, or logs.

## Supported versions

The project is in early development and has not published a stable release.

| Version | Security updates |
| --- | --- |
| Default branch and latest preview | Supported |
| Older previews, historical commits, and modified builds | Not guaranteed |

## Privately report a vulnerability

Open the repository's **Security** page, choose **Report a vulnerability**, and submit through GitHub Private Vulnerability Reporting. The maintainer must enable this feature in repository settings before the repository is made public.

Include as much of the following as possible:

- affected version or commit;
- vulnerability class, impact, and required preconditions;
- minimal reproduction steps or proof of concept;
- known mitigations;
- whether the issue has also been reported to a third party or upstream project.

Do not include real credentials, personal data, or unrelated project files. Use a minimal fictional example when necessary.

The maintainer will acknowledge the report as soon as practical and share an impact assessment and remediation plan after initial reproduction. This early-stage project does not promise a fixed response time or bug bounty. Do not publicly disclose details until a fix has been released and the maintainer confirms disclosure is appropriate.

If an issue affects only `deepseek-harness/` or another third-party dependency, follow that project's security reporting process as well. You may still notify agent-isles privately so the impact on its pinned version can be assessed.
