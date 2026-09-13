# Moving Capitol Ledger to Another Machine

This guide moves the working project, the reusable filing/price cache, and access to the existing hosted site. It intentionally leaves behind local build files and old Codex conversation history.

The order matters. Steps marked **You** require an account login, a physical file transfer, or another decision only you can make. Steps marked **Codex** can be handed to Codex on the new machine.

## What is moving

- The complete source repository from GitHub.
- The committed JSON and CSV data snapshot.
- The existing Sites project reference in `.openai/hosting.json`.
- The local `work/` cache, transferred separately. It is currently about 369 MB before compression.

## What is not moving

- `node_modules/`, build output, and temporary deployment credentials. These are recreated.
- Old Codex conversation history. It is not required to run or maintain the project.
- A separate copy of the hosted database. The existing D1 database remains attached to the hosted Sites project.

## Phase 1 — Prepare the old Mac

### 1. You: create a cache archive

Open Terminal on the old Mac and run:

```bash
cd "/Users/openclawyi/.codex/.chatgpt-projects/g-p-6aa45ad452648191b9ee68e52977039f"
tar -czf ~/Desktop/capitol-ledger-work-cache.tar.gz work
shasum -a 256 ~/Desktop/capitol-ledger-work-cache.tar.gz
```

Save the checksum shown by the final command. It lets you verify that the archive arrived intact.

The archive contains downloaded House filings, extracted text, and cached market-price histories. It does not contain the website source; GitHub handles that part.

### 2. You: transfer the archive

Move `capitol-ledger-work-cache.tar.gz` from the old Mac’s Desktop to the new machine using AirDrop, iCloud Drive, an external drive, or another trusted file-transfer method.

Do not email it or upload it to the public GitHub repository. The cache is reproducible but unnecessarily large for Git.

### 3. You: confirm account access

Before leaving the old machine, confirm that you can sign in to:

- GitHub account `fangxuyi`;
- the ChatGPT account that owns the existing Capitol Ledger Site; and
- Codex on the new machine.

The live website itself does not move. It remains at <https://capitol-ledger.yeefangxu.chatgpt.site/>.

## Phase 2 — Prepare the new machine

### 4. You: install and sign in

On a new Mac, install:

- Codex desktop;
- Git;
- Node.js 22.13 or newer; and
- Poppler, which provides `pdftotext` for fresh filing extraction.

With Homebrew, the command is:

```bash
brew install git node poppler
```

Sign in to Codex with the same ChatGPT account. Sign in to GitHub when prompted.

If the new machine is Windows or Linux, ask Codex there to translate the installation commands before continuing. The project steps after installation are the same.

### 5. You: give Codex the repository destination

Create or choose a normal projects folder, such as `~/Projects`. Do not place the new clone inside Codex’s internal `.codex/.chatgpt-projects` directory.

Open that projects folder in Codex and send Codex the handoff prompt in the final section of this guide.

## Phase 3 — Let Codex restore and verify the project

### 6. Codex: clone the GitHub repository

Codex should run:

```bash
git clone https://github.com/fangxuyi/capitol-ledger.git
cd capitol-ledger
```

If the folder already exists, Codex should inspect it instead of cloning over it.

### 7. Codex: verify prerequisites

Codex should check:

```bash
git --version
node --version
npm --version
pdftotext -v
```

Node must be at least version 22.13. Codex should stop and explain what is missing rather than changing system-wide software without permission.

### 8. You: provide the transferred archive path

Tell Codex where `capitol-ledger-work-cache.tar.gz` landed on the new machine—for example, `~/Downloads/capitol-ledger-work-cache.tar.gz`.

Also provide the checksum saved in Phase 1.

### 9. Codex: verify and restore the cache

Codex should:

1. calculate the archive’s SHA-256 checksum and compare it with your saved value;
2. list the archive contents and confirm that its top-level directory is `work/`;
3. confirm that the cloned repository does not already contain a `work/` directory with data that could be overwritten; and
4. extract the archive into the repository root.

Typical commands are:

```bash
shasum -a 256 /path/to/capitol-ledger-work-cache.tar.gz
tar -tzf /path/to/capitol-ledger-work-cache.tar.gz | sed -n '1,20p'
tar -xzf /path/to/capitol-ledger-work-cache.tar.gz
```

If `work/` already exists, Codex should pause and inspect it. It should not overwrite or delete that directory automatically.

### 10. Codex: install project dependencies

From the repository root, Codex should run:

```bash
npm ci
```

`npm ci` recreates `node_modules/` from the committed lockfile.

### 11. Codex: verify the recovered project

Codex should run:

```bash
npm run check
git status --short
```

The data verification, production build, test, and lint steps must all pass. A clean `git status` confirms that restoring the ignored cache did not alter committed source files.

Codex should also verify that `.openai/hosting.json` contains this existing Sites project ID:

```text
appgprj_6aa4605583d8819199463984cf2edac9
```

Codex must reuse that project. It must not create a replacement Site.

### 12. Codex: verify GitHub and hosting behavior

Codex should confirm that `origin` points to:

```text
https://github.com/fangxuyi/capitol-ledger.git
```

The private Sites source remote may not be present in a fresh GitHub clone. That is expected. When you later ask Codex to publish, the Sites workflow should obtain a fresh short-lived credential and target the project ID in `.openai/hosting.json`. No deployment token should be copied from the old machine or saved in Git configuration.

The production D1 database remains attached to the existing hosted Site. Do not create a new production database during this move.

## Phase 4 — Confirm the daily monitor

### 13. You: check the automation once

In Codex or ChatGPT on the new machine, open the automations/tasks view and look for `pelosi-disclosure-monitor`.

- If it is present and active, do nothing. Creating another would produce duplicate checks.
- If it is missing, ask Codex to recreate the same once-daily House Clerk monitor from the original task instructions.

The monitor is account/task state, not Git repository state. Cloning the repository neither transfers it nor proves that it is absent.

## Phase 5 — Optional local use

### 14. Codex: refresh data only when requested

The committed data and restored cache are enough to verify the project. A full refresh is optional and should run only when you want a new disclosure snapshot:

```bash
npm run data:refresh
npm run data:verify
```

Review resulting data changes before committing them.

### 15. You and Codex: be aware of local authentication

The production website receives Sign in with ChatGPT headers from the Sites hosting environment. A plain local development server may redirect to the sign-in path without those production headers.

Do not remove production authentication just to make local testing convenient. If local interactive testing is needed, ask Codex to propose a development-only authentication mode that cannot activate in production, then review that change separately.

## Ready-to-paste prompt for Codex on the new machine

Copy the following message to Codex after opening the destination projects folder:

> Restore my Capitol Ledger project on this machine. Clone `https://github.com/fangxuyi/capitol-ledger.git` into this folder if it is not already present. Inspect before changing anything. Verify Git, Node.js 22.13+, npm, and `pdftotext`; do not install or change system-wide software without telling me. I will give you the path and original SHA-256 checksum for `capitol-ledger-work-cache.tar.gz`. Verify its checksum and contents, make sure extraction will not overwrite an existing populated `work/` directory, and restore it into the repository. Then run `npm ci` and `npm run check`, confirm the Git worktree is clean, and confirm that `.openai/hosting.json` points to existing Sites project `appgprj_6aa4605583d8819199463984cf2edac9`. Do not create a new Site, database, or automation. Confirm `origin` is `https://github.com/fangxuyi/capitol-ledger.git`. Finally, tell me whether the project is ready, whether the live site remains connected, and whether I need to do anything manually.

## Completion checklist

- [ ] Cache archive created on old Mac.
- [ ] Archive checksum saved.
- [ ] Archive transferred to new machine.
- [ ] Same ChatGPT and GitHub accounts available.
- [ ] Repository cloned into a normal projects folder.
- [ ] Cache checksum verified and `work/` restored safely.
- [ ] `npm ci` completed.
- [ ] `npm run check` passed.
- [ ] Git worktree clean.
- [ ] Existing Sites project ID confirmed; no replacement Site created.
- [ ] Daily monitor checked once; no duplicate automation created.
