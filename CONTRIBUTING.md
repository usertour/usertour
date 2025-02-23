# CONTRIBUTING

We need to be nimble and ship fast given where we are, but we also want to make sure that contributors like you get as smooth an experience at contributing as possible. We've assembled this contribution guide for that purpose, aiming at getting you familiarized with the codebase & how we work with contributors, so you could quickly jump to the fun part.

This guide, like Usertour itself, is a constant work in progress. We highly appreciate your understanding if at times it lags behind the actual project, and welcome any feedback for us to improve.

In terms of licensing, please take a minute to read our short [License and Contributor Agreement](./LICENSE). 

## Before you jump in

[Find](https://github.com/usertour/usertour/issues?q=is:issue+is:open) an existing issue, or [open](https://github.com/usertour/usertour/issues/new/choose) a new one. We categorize issues into 2 types:

### Feature requests

- If you're opening a new feature request, we'd like you to explain what the proposed feature achieves, and include as much context as possible about how it enhances the onboarding experience.

- If you want to pick one up from the existing issues, simply drop a comment below it saying so.

  A team member working in the related direction will be looped in. If all looks good, they will give the go-ahead for you to start coding. We ask that you hold off working on the feature until then, so none of your work goes to waste should we propose changes.

  Depending on whichever area the proposed feature falls under, you might talk to different team members. Here's rundown of the areas each our team members are working on at the moment:

  | Member               | Scope                                                |
  | -------------------- | ---------------------------------------------------- |
  | Frontend Experience  | UI/UX, canvas interactions                           |
  | Developer Experience | API, SDK, developer tools                            |
  | Core Architecture    | Overall system design and scalability                |

  How we prioritize:

  | Feature Type                              | Priority        |
  | ----------------------------------------- | --------------- |
  | Core features and SDK development         | High Priority   |
  | Frontend features and UI/UX improvements  | Medium Priority |
  | Experimental features and future ideas    | Future-Feature  |

### Anything else (e.g. bug report, performance optimization, typo correction)

- Start coding right away.

  How we prioritize:

  | Issue Type                                       | Priority        |
  | ------------------------------------------------ | --------------- |
  | Bugs in core features          | Critical        |
  | Performance issues affecting user experience     | Medium Priority |
  | Minor UI fixes and documentation updates         | Low Priority    |

## Installing

Here are the steps to set up Usertour for development:

### 1. Fork this repository

### 2. Clone the repo

Clone the forked repository from your terminal:

```shell
git clone git@github.com:<github_username>/usertour.git
```

### 3. Verify dependencies

Usertour requires the following dependencies to build:

- [Redis](https://redis.io/)
- [Postgres](https://www.postgresql.org/)

### 4. Installation

Usertour consists of multiple packages managed in a monorepo structure. The main components are:

1. Web Application (`apps/web/`): The main web interface
2. API Server (`apps/server/`): The backend server
3. SDK (`apps/sdk/`): The SDK for the web application

Follow these steps to install:

1. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables for both API and web:

```bash
cp apps/web/.env.example apps/web/.env
# Replace redis and postgres config in apps/server/.env
cp apps/server/.env.example apps/server/.env
cp apps/sdk/.env.example apps/sdk/.env
```

4. Start developing:

```bash
# Start the server
pnpm dev:server

# Start the web application
pnpm dev:web

# Start the SDK
pnpm dev:sdk

```

You can visit [http://localhost:5174](http://localhost:5174/) to start developing Usertour.

## Developing

To help you quickly navigate where your contribution fits, here's a brief outline of Usertour's structure:

## Project Structure
```text
apps/
├── server/        // Backend server
├── web/           // Main web application
├── sdk/           // Usertour.js SDK
│
packages/          // Shared packages
├── components/    // UI components
├── radix/         // Radix UI components
└── shared/        // Shared components and utils
```

## Submitting your PR

When you're ready to submit your contribution:

1. Make sure your code follows our style guidelines
2. Add tests if applicable
3. Update documentation if needed
4. Create a pull request to the `main` branch

For major features, we first merge them into the `develop` branch for testing before they go into the `main` branch.

And that's it! Once your PR is merged, you will be featured as a contributor in our [README](https://github.com/usertour/usertour/blob/main/README.md).

## Getting Help

If you ever get stuck or have questions while contributing, you can:

- Join our [Discord](https://discord.gg/WPVJPX8fJh)
- Check [Documentation](https://docs.usertour.io)
- Ask in [GitHub Discussions](https://github.com/usertour/usertour/discussions)
- Follow us on [Twitter](https://x.com/usertourio)
