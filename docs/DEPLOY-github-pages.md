# Putting the calculator on GitHub Pages

Everything you upload is in the `gh-pages` folder — 5 files, 263 KB. No build
step, no terminal, no git commands. All of this happens in the browser.

**Before you start:** open `privacy.html` and replace `[NAME]`, `[ANSCHRIFT]`
and `[E-MAIL]` with your details. They appear once each, under „Verantwortliche
Stelle". You can also do this on GitHub after uploading (step 6).

---

## 1. Create the repository

1. Go to <https://github.com/new> (sign in or create a free account).
2. **Repository name:** `coast-fire` — this becomes part of your URL, so pick
   something you're happy to share.
3. **Public.** Pages needs this on a free account.
4. Leave "Add a README" unticked — there's already one in the folder.
5. **Create repository.**

## 2. Upload the files

1. On the empty repo page, click **uploading an existing file**.
2. Drag in all five files from `gh-pages`:
   `index.html`, `privacy.html`, `FONT-LICENSES.txt`, `README.md`, `.nojekyll`
3. Click **Commit changes**.

> **Watch out for `.nojekyll`.** It's an empty file starting with a dot, so
> macOS Finder hides it by default. Press **Cmd+Shift+.** in the Finder window
> to show hidden files before you drag. If it doesn't make it in, see
> "Troubleshooting" below — the site will still work, but this file prevents a
> class of odd Pages behaviour, so it's worth having.

## 3. Turn on Pages

1. **Settings** (top of the repo) → **Pages** in the left sidebar, under
   "Code and automation".
2. **Source:** `Deploy from a branch`.
3. **Branch:** `main`, folder `/ (root)`. **Save.**

## 4. Wait

Give it up to 10 minutes for the first publish. The Pages settings screen shows
the URL and a green tick when it's live. Your address will be:

```
https://<your-username>.github.io/coast-fire/
```

## 5. Check it

- The calculator loads with the serif numbers (Fraunces) — if they look like
  plain Times, the fonts didn't embed, tell me.
- Drag a slider; the chart and all four readouts update.
- The "Datenschutzerklärung / Privacy notice" link at the bottom opens
  `privacy.html`, and the back link returns.
- Open the page on your phone — it should collapse to one column.

## 6. Editing later

This is the advantage over drag-and-drop hosting: the URL never changes.

- **Small text change:** click the file in GitHub, click the pencil icon, edit,
  **Commit changes**. Live in a minute or two.
- **New version from me:** open the file, click the pencil, select all, paste
  the new content. Or delete the file and re-upload.

---

## Troubleshooting

**404 after ten minutes.** Check `index.html` is at the repository root, not
inside a subfolder. The entry file has to be at the top level of whatever
folder you set as the publishing source.

**Couldn't upload `.nojekyll`.** Create it on GitHub instead: **Add file → Create
new file**, type `.nojekyll` as the name, leave the body empty, commit.

**Page loads but looks unstyled.** Usually a partial upload — confirm all five
files are listed in the repo.

**Nothing publishes at all.** GitHub requires the account that pushed to have a
verified email address. Check <https://github.com/settings/emails>.

---

## Two things to decide

**Your name will be public.** A public repo shows your GitHub username, and the
privacy notice will carry your real name and address, because Art. 13 GDPR
requires an identifiable controller. If you'd rather not publish a home
address, a c/o address or a postal box is the usual answer. This is worth a
moment's thought before you commit.

**Impressum.** A purely private, non-commercial page generally doesn't need one
under §5 DDG. The line gets blurry if the page looks institutional or
professional — and given Loopfinder sits under an ECIS 2026 banner, if this
calculator ends up presented alongside your research work, that's worth
checking with KIT first. Publishing it as a private individual is very likely
fine.

I'm not a lawyer and the privacy notice is a solid starting template rather
than vetted legal text. Read it before you publish it — particularly whether
the description of what the page does matches what you intend to run there.
