<a href="https://www.usertour.io"><img src="./assets/hero.png" alt="Usertour" /></a>

<div align="center">
  <h1 align="center">
    <img alt="usertour logo" height="60" src="./assets/logo.svg">
  </h1>
  <a href="https://www.usertour.io">Usertour</a>: An alternative to: Appcues, Userpilot, Userflow, Userguiding, Chameleon , Etc...<br /><br />
  <p>Usertour is an open-source user onboarding platform. It allows you to create in-app product tours, checklists, and surveys in minutes—effortlessly and with full control.</p>
</div>
<!-- <p align="center">
<a href="https://www.producthunt.com/posts/usertour?embed=true&utm_source=badge-featured&utm_medium=badge&utm_souce=badge-usertour" target="_blank">Support with Upvote ❤️<br/><img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=839855&theme=light&t=1738576180129" alt="Usertour - open source user onboarding platform | Product Hunt" style="width: 250px; height: 60px;" width="250" height="60" /></a>
</p> -->
<p align="center">
  <a target="_blank" href="https://www.usertour.io">Website</a> | <a target="_blank" href="https://docs.usertour.io">Documentation</a> | <a target="_blank" href="https://www.usertour.io/blog/">Blog</a> | <a target="_blank" href="https://x.com/usertourio">Twitter</a> | <a target="_blank" href="https://discord.gg/WPVJPX8fJh">Discord</a>
</p>
<p align="center">
    <a href="https://www.usertour.io" target="_blank">
        <img alt="Static Badge" src="https://img.shields.io/badge/Product-F04438"></a>
    <a href="https://www.usertour.io/pricing" target="_blank">
        <img alt="Static Badge" src="https://img.shields.io/badge/free-pricing?logo=free&color=%20%23155EEF&label=pricing&labelColor=%20%23528bff"></a>
    <a href="https://discord.gg/WPVJPX8fJh" target="_blank">
        <img alt="Discord Chat" src="https://img.shields.io/discord/1331925309791932436?label=chat&logo=discord&logoColor=white&style=flat&color=5865F2"></a>
    <a href="https://x.com/usertourio" target="_blank">
        <img alt="Static Badge" src="https://img.shields.io/twitter/follow/usertourio"></a>
</p>

## Quick Start

### Self-deploy with Docker
Deploy your own feature-rich, unlimited version of Usertour using Docker.

To start deployment:

```bash
cp .env.example .env # make sure all required envs are properly set
docker compose up -d
```

Visit http://localhost:8011 to start using Usertour.

View details in [Self-hosting](https://docs.usertour.io/open-source/self-hosting/).

### One Click Deployment

[![Deploy on Railway](https://railway.com/button.svg)](https://railway.com/deploy/usertour-1?referralCode=npdaK5&utm_medium=integration&utm_source=template&utm_campaign=generic)

### Local Development
View details in [CONTRIBUTING](./CONTRIBUTING.md).

## ✨ Build Your Onboarding with AI

Usertour ships a built-in [MCP server](https://docs.usertour.io/api-reference-v2/mcp): connect an AI assistant like Claude Code, Cursor or Codex, describe the experience you want, and it builds production-ready onboarding directly in your project — reading your app's design system to match the styling, and even wiring up the SDK on its own if it isn't installed yet.

Connecting takes two commands (Claude Code shown; every MCP client works):

```text
/plugin marketplace add usertour/skills
/plugin install usertour@usertour
```

**Self-hosting?** Point the plugin at your own instance before connecting — your exact URL is shown in **Settings → MCP**:

```bash
export USERTOUR_MCP_URL="https://<your-usertour-host>/mcp"
```

Below: real prompts and the unedited results. Full walkthrough with every prompt — including AI-driven analytics — in [Build Your Onboarding with AI](https://docs.usertour.io/build-onboarding-with-ai).

### 🪄 "Build an onboarding flow for the Create Task feature"

```text
Using Usertour, build a user onboarding flow for the Create Task feature.

Requirements:
1. The visual theme must match the website's existing design.
2. The flow must be production-ready and suitable for launch.
3. Every step should provide genuine value to users. Avoid adding steps
   simply for the sake of having a flow—the experience should help users
   understand and successfully use the feature.
```

<p align="center">
  <video src="https://github.com/user-attachments/assets/b83ce65e-901c-47ec-afc6-8f4713295eb6" width="100%" />
</p>

### 📋 "Create a product feedback survey"

```text
Create a survey to collect user feedback about the product's different
features, including:

* Feature ratings
* Overall satisfaction
* Usability feedback
* Suggestions for improvement
* Open-ended comments

The survey should be thoughtfully structured and suitable for production use.
```

<p align="center">
  <video src="https://github.com/user-attachments/assets/20ad7c9f-6f93-4059-8f05-feb50944ecf9" width="100%" />
</p>

### 🎬 "A modal that plays this YouTube video"

```text
Create a one-step flow containing a modal that displays this YouTube video:

https://www.youtube.com/watch?v=ZIaOBAjvc38

Add supporting copy based on the theme:

Sam Altman: "Never a Better Time to Do a Startup"

The copy should briefly introduce the video, explain why it is relevant,
and encourage users to watch it.
```

<p align="center">
  <video src="https://github.com/user-attachments/assets/86c7a0f3-0777-4e46-be64-317f705a7756" width="100%" />
</p>

## Features

Usertour makes it easy to design in-app product tours, checklists, launchers, and surveys, enabling anyone to craft effective onboarding experiences. Our team is dedicated to consistently improving Usertour with frequent updates that include new features, bug fixes, and performance enhancements.

### Easy Onboarding: Build Flows Fast with Simple Integration and Smart Targeting

- 🌐 **Compatible with all frameworks**: If your app runs in a browser, it seamlessly integrates with Usertour.
- 📄 **Supports multi-page apps**: Whether it's a single-page application or spans across multiple pages, Usertour fits perfectly.
- 🎯 **Advanced user targeting**: Define custom user attributes and track events to segment and engage your audience effectively.
<p align="center">
  <video src="https://github.com/user-attachments/assets/24d87d35-8238-463e-8be9-eac659ba818a" width="100%" />
</p>

### Built for professional workflows with version control and environments

- 🛠️ **Multiple environments supported**: Manage environments like Production and Staging within a single Usertour account.
- 🔄 **Version tracking**: Monitor every change in your flows, including who made adjustments and when.

<p align="center">
  <video src="https://github.com/user-attachments/assets/eaa81019-57a1-429f-8a05-72428915de05" width="100%" />
</p>

### Fully customizable appearance

- 🎨 **Tailor your design**: Adjust text, button colors, font family, and size to match your branding.
- 🖌️ **Support for multiple themes**: Create unique themes for different flows, offering flexibility for varied use cases.

<p align="center">
  <video src="https://github.com/user-attachments/assets/052e87e0-c064-4306-a6e9-0568ff2fb127" width="100%" />
</p>

### Gain actionable insights with powerful analytics

- 📊 **Performance metrics**: Track the effectiveness of your flows with detailed data on views and completion rates.
- 🚨 **Identify problem areas**: Pinpoint steps causing user confusion or drop-offs and address the issues seamlessly.

<p align="center">
  <video src="https://github.com/user-attachments/assets/98a88a60-495c-4090-a7e3-4dde7f64714c" width="100%" />
</p>

## How to Use?

- **Cloud**
  - We've deployed a Usertour Cloud version that allows zero-configuration usage, offering all capabilities of the self-hosted version. Visit [https://www.usertour.io/](https://www.usertour.io/) to get started.
- **Self-hosting Usertour Community Edition**
  - Get started quickly with our [Self-hosting Guide](https://docs.usertour.io/open-source/self-hosting/) to run Usertour in your environment. For more detailed references and in-depth instructions, please refer to our documentation.
- **Usertour for enterprise / organizations**
  - Please contact us at [support@usertour.io](mailto:support@usertour.io) for private deployment solutions.

## Contributing Guidelines

| Bug Reports                                                                 | Feature Requests                                                     | Issues/Discussions                                                          | Usertour Community                                           |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [Create Bug Report](https://github.com/usertour/usertour/issues/new/choose) | [Submit Feature Request](https://github.com/usertour/usertour/pulls) | [View GitHub Discussions](https://github.com/usertour/usertour/discussions) | [Visit Usertour Community](https://docs.usertour.io/faq) |
| Something isn't working as expected                                         | Ideas for new features or improvements                               | Discuss and raise questions                                                 | A place to ask questions, learn, and connect with others     |

Calling all developers, testers, tech writers and more! Contributions of all types are more than welcome, please feel free to browse our [GitHub issues](https://github.com/usertour/usertour/issues) to show us what you can do.

For bug reports, feature requests, and other suggestions, you can also [create a new issue](https://github.com/usertour/usertour/issues/new/choose) and choose the most appropriate template to provide feedback.

If you have any questions, feel free to reach out to us. One of the best places to get more information and learn is the [Usertour Community](https://discord.gg/WPVJPX8fJh), where you can connect with other like-minded individuals.

## Community and Contact

- [GitHub Discussion](https://github.com/usertour/usertour/discussions): Best for sharing feedback and asking questions.
- [GitHub Issues](https://github.com/usertour/usertour/issues): Best for reporting bugs and suggesting features when using Usertour. Please refer to our contribution guidelines.
- [Discord](https://discord.gg/WPVJPX8fJh): Best for sharing your applications and interacting with the community.
- [X(Twitter)](https://x.com/usertourio): Best for sharing your applications and staying connected with the community.

## Security Issues

To protect your privacy, please avoid posting security-related issues on GitHub. Instead, send your questions to [support@usertour.io](mailto:support@usertour.io), and we will provide you with a more detailed response.

## Credits

Some icons are provided by Remix Icon (https://remixicon.com), licensed under the Apache License.

## License 

Community code is licensed under the MIT license. See [LICENSE](./LICENSE).

Enterprise-licensed code for self-hosted Business and Enterprise plans is governed by [LICENSE.enterprise](./LICENSE.enterprise).
