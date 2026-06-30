# TikTok Auto Friend Tool

English | [简体中文](README.zh-CN.md)

A desktop tool for TikTok account management, outreach messages, and AI-assisted replies.

It brings account import, login, user search, message sending, AI replies, proxy settings, logs, and task control into one local desktop panel. It is useful for people who manage multiple TikTok accounts, study TikTok web automation, or want a clearer workflow for private message outreach.

> This project is for learning, research, and compliant operations only. Please follow TikTok platform rules and local laws. Do not use it for harassment, spam, bypassing platform limits, or any illegal activity.

## Features

- Import, export, and deduplicate multiple accounts
- Login one account or login accounts in batches
- Restore saved sessions when possible
- Separate window and session for each account
- Search TikTok users by keyword
- Send message templates with `{username}` support
- Pause, resume, stop, and track task progress
- AI auto-reply with OpenAI-compatible APIs
- Multiple AI providers as a fallback pool
- Global proxy and per-slot proxy settings
- Account health check
- Warm-up browsing after login
- Local logs and chat record export

## Screenshots

![Settings and proxy](images/10a9aba3a04fb190fd2dd1e47658810b.png)

![AI auto-reply settings](images/37a3b8ead913b9b38125a4ead40f8792.png)

![Screenshot 3](images/94691706b92d40ecc4ee096a5c3d2c6a.png)

![Screenshot 4](images/d00ba2eb659372b6fdbd913ba44c96f8.png)

![Screenshot 5](images/f38ac71a8e223302f5400b7b3fcab326.png)

## Who This Is For

- People learning Electron desktop apps and browser automation
- People studying TikTok web login, search, and DM workflows
- People who need to manage multiple TikTok accounts
- People who want a local panel for repeated TikTok outreach tasks
- People who want to connect AI replies to TikTok conversations

## What Not To Do

Please do not use this project for:

- Harassing users
- Spam or mass unsolicited messages
- Bypassing platform restrictions or CAPTCHA
- Violating TikTok terms of service
- Any activity that violates local laws

Automation can reduce repetitive work, but it cannot remove account risk or compliance responsibility.

## Install and Run

Install dependencies:

```bash
npm install
```

Start in development mode:

```bash
npm run dev
```

Start normally:

```bash
npm start
```

Run syntax checks:

```bash
npm run check
```

Build a Windows portable package:

```bash
npm run build
```

Build output will be placed in the `dist-build` directory.

## Account Format

For batch import, use one account per line:

```text
TikTokUsername----TikTokPassword----OutlookEmail----OutlookPassword----2FASecret
```

Example:

```text
my_tiktok_user----password123----example@outlook.com----mail_password----TOTP_SECRET
```

Notes:

- The first two fields are the TikTok username and password.
- The Outlook email is used to receive TikTok email verification codes.
- The 2FA secret field is reserved. Actual support depends on the current login flow.
- If TikTok shows CAPTCHA or extra verification, manual action is required.

## Basic Workflow

1. Open the app.
2. Import accounts in the account management page.
3. Configure proxy, login concurrency, warm-up time, and other settings.
4. Click "Login All" or login a single account.
5. Enter search keywords in the outreach message page.
6. Write a message template, for example:

```text
Hi {username}, nice to meet you!
```

7. Set the maximum number of users for each keyword.
8. Click "Start".
9. Check progress in the task control page. Pause or stop when needed.

## AI Auto Reply

The app supports OpenAI-compatible APIs. You need to provide:

- API Base URL
- API Key
- Model name

You can also configure multiple providers as a provider pool. When enabled, the app checks messages for online accounts, finds new incoming messages, calls the AI API, and sends replies through the TikTok page.

Notes:

- No API is included by default.
- AI replies will not work until an API is configured.
- Use the test chat button before enabling it for real conversations.
- The system prompt can be edited in the settings page.

## Proxy Settings

The app supports:

- Global HTTP proxy
- Per-slot proxy for binding different accounts to different proxies

If you manage multiple accounts, use stable and clean network environments. Proxy quality directly affects login, search, messaging, and account health.

## Data and Logs

Settings, account information, logs, and chat records are stored locally in the app user data directory. You can open these folders from the settings page:

- Config directory
- User data directory
- Log directory

Account passwords are not stored as plain text, but the local protection is mainly intended to avoid casual exposure. Do not treat it as strong security encryption. Avoid saving important accounts on untrusted computers.

## FAQ

### Why does login fail?

Check whether the username, password, network, and proxy are correct. If TikTok shows CAPTCHA, human verification, or suspicious login prompts, you need to handle them manually.

### Why does message sending fail?

TikTok changes its web page often. If buttons, inputs, or page structure change, the automation may not find the right element. Open the account window and check the current page state, then read the logs.

### Why does session restore fail?

TikTok sessions may expire. Some login cookies may also be unavailable to page scripts. If restore fails, log in again.

### Why does AI auto reply not respond?

Check:

- Whether auto reply is enabled
- Whether API Base URL, API Key, and model are configured
- Whether there is an online account
- Whether there are new incoming messages
- Whether the logs show API errors

### Can this get accounts restricted?

Yes. Any batch automation has account risk. High frequency, repeated content, poor proxy quality, new accounts, and unusual behavior may trigger restrictions. Use low frequency, small batches, and follow platform rules.

## Project Structure

```text
.
├── main.js                 # Desktop app entry
├── preload.js              # Bridge between UI and main process
├── index.html              # Main app UI
├── src
│   ├── main                # Accounts, tasks, TikTok page control, AI replies
│   ├── renderer            # UI interactions
│   └── shared              # Shared definitions
├── images                  # Screenshots, contact image, donation image
├── scripts                 # Check and build scripts
└── package.json
```

Some early Chrome extension files are still kept for reference. The current desktop version uses `main.js`, `preload.js`, `index.html`, and the `src` directory as the main entry points.

## Open Source Notes

You are welcome to learn from it, fork it, and improve it. You can:

- Open issues for bugs
- Submit updates for new TikTok page changes
- Improve documentation
- Share safer usage experience

If you plan to use it for a long time, test with small accounts, small batches, and low frequency first.

## Private Customization, Contact, and Support

For private customization, feature discussion, deployment help, or support, you can scan the contact image or donation image below.

Contact:

![Contact](images/wx.jpg)

Support:

![Donation](images/zhanshang.png)

## Disclaimer

This project is provided for technical learning, research, and compliant operations only. Any account restriction, data loss, platform penalty, legal risk, or other consequence caused by using this project is the user's own responsibility. The author does not encourage or support any activity that violates platform rules or laws.
