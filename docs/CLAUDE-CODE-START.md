# Picking this project up in Claude Code

The project is set up and ready. This is what you need on the Claude Code side,
and nothing more.

---

## Where the project lives

```
~/Documents/Claude/Finanzas/coast-fire
```

Plain local disk, not iCloud — which matters if you later run `git init`.
iCloud syncs the `.git` folder file by file and can evict files it thinks are
unused, corrupting repos in ways that are confusing to recover from. This
location avoids that.

---

## Install

macOS 13 (Ventura) or later, 4 GB RAM, and a paid Claude plan — Pro, Max, Team
or Enterprise. Free accounts don't include Claude Code.

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

This is the recommended path over Homebrew because it keeps itself updated.

### Or skip the terminal entirely

There's a **desktop app** at [code.claude.com](https://code.claude.com) — a
standalone application with visual diff review and side-by-side sessions, no
terminal involved. Given that you're not looking to live in a shell, this is
probably the better starting point. There's also a VS Code extension, but that
only makes sense if you already use VS Code.

The rest of this guide is written for the terminal since the commands are the
same either way.

## First run

```bash
cd ~/Documents/Claude/Finanzas/coast-fire
claude
```

A browser window opens for login. If it doesn't, press **c** to copy the URL.
After that you'll see "Login successful" — press Enter. This is once per
device, not once per project.

---

## The five things worth knowing

**`CLAUDE.md` is already written.** Claude Code reads it at the start of every
session, so you don't have to re-explain the model, the palette, the
no-external-requests rule or what's already been fixed. Don't run `/init` — it
would offer to generate one and you'd be replacing something better with
something generic.

**Plan mode.** Press **Shift+Tab** to cycle into it. Claude reads the code and
proposes an approach *without editing anything*, and you approve before
anything changes. For a project where a wrong edit is annoying to spot, this is
the mode to default to.

**`/clear`** starts a fresh conversation. Use it between unrelated tasks —
a long session carrying irrelevant history makes answers worse, not better.

**Ask it to run the checks.** "Run the model and label checks" will do it. If
you change the maths and the anchors in `CLAUDE.md` move unexpectedly, that's
the signal something broke.

**Git is optional but worth it.** Claude Code runs fine without it. With it,
you get diffs to review before accepting, and a way back if a change goes
wrong. Ask Claude Code to set it up for you — "initialise a git repo and make
the first commit" is enough. Mostly it buys you undo.

---

## A good first prompt

The open work is listed at the bottom of `CLAUDE.md`. The next feature was
going to be the deplete-vs-maintain control, and three decisions were still
open. Something like:

> Read CLAUDE.md. I want to add the deplete-vs-maintain control described
> under Open work. Let's decide the three open questions first — give me your
> recommendation on each and your reasoning, then we'll build it.

That gets the context loaded, the decisions made deliberately, and the build
done in the right order.
