# Security policy

## Supported versions

Security fixes are made to the latest minor release of each `@axon/*` package.

## Reporting a vulnerability

Please don't open a public issue for a security problem. Use GitHub's private reporting instead: on the repository's **Security** tab choose **Report a vulnerability**. Include what you found, the package and version, and the smallest example that shows it.

You can expect an acknowledgement within a few days and a fix or a plan within a few weeks, depending on severity. When a fix is released, the advisory credits the reporter unless they prefer not to be named.

## Scope

Axon UI is a set of front-end components. The kinds of issue most likely to matter are cross-site scripting through a component that renders content it was given (the chat package renders markdown, which is sanitised by not allowing raw HTML), unsafe handling of URLs, CSV export injection in the data grid, and supply-chain problems in the published packages.

The packages call no network services themselves. The chat package holds no API keys and includes no AI provider code; where an example shows a request to a back end, that back end is yours.
