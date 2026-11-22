# BMAD baseline verification

Date: November 20, 2026. Scope: published version and source verification only. No installer, application dependency install, product code, application tests or production integration was run as part of this verification.

## Official source evidence

The owner's linked main README distinguishes stable v6.12 from v7 preview. The official `V6.12` branch package.json states version `6.12.4` and the branch README documents the npm installer, Node.js 20.12+, Python 3.10+ and uv prerequisites.

- https://github.com/bmad-code-org/BMAD-METHOD/blob/main/README.md#stable-v612-recommended-if-stability-is-needed-until-v7-is-finalized-for-release
- https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/V6.12/package.json
- https://raw.githubusercontent.com/bmad-code-org/BMAD-METHOD/V6.12/README.md

## Published package evidence

Command: `npm view bmad-method@6.12.4 version dist.integrity --json`

Final result: exit 0, published version `6.12.4`.

Reported integrity: `sha512-DBVws7H1NxpSOhv2DHvLEHTceQGCv9c+gBx/1cnVF38WhlN70854SnHUUCHkTuLIalu6hq/7LRVtAWCNHmnFEw==`

An initial restricted-network query failed with DNS ENOTFOUND. A subsequent permitted read-only query succeeded; the failure was not interpreted as evidence that the version was unavailable. No global registry or proxy settings were changed.

## Remaining verification

Installed framework version/configuration, coding-tool integration, runtime compatibility and all application controls remain unverified. DeepSeek must verify these during project preflight using the pinned setup instructions. A published package check is not proof that an installer produced the intended framework or that a BGLAD wrapper is installed.
