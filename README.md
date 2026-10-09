# LaTeX Copy Selection

[Русская версия](README.ru.md)

Chrome extension. Select text on a page where formulas are already rendered, then copy. The clipboard gets normal text, and the formulas become LaTeX: `$...$` and `$$...$$` (or `\(...\)` / `\[...\]` if you choose that style).

Paste into Obsidian, Markdown, Overleaf, Telegram, or any editor that understands those formulas.

This is not a hover button that copies one formula. The whole selection is copied: a paragraph, several formulas, captions.

Ready build **1.3.5** is in [`release/`](release/). Load that folder in Chrome. The same folder as a zip: [download the Release](https://github.com/Ildarg2k/latex-copy-selection/releases/latest).

## Install

1. Download the [Release zip](https://github.com/Ildarg2k/latex-copy-selection/releases/latest) and unzip it, **or** use the [`release/`](release/) folder in this repository.
2. Open `chrome://extensions` (Chrome menu → Extensions → Manage extensions).
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Choose the folder that contains `manifest.json` directly inside it.

**LaTeX Copy Selection** appears in the list. Its switch must be on.

Pin the icon: the puzzle button on the Chrome toolbar → pin next to “LaTeX Copy Selection”.

## How to copy

1. Open a page where formulas are already drawn.
2. Select a passage (a whole paragraph is fine).
3. Copy with the extension icon → **Copy selection**, or with **Ctrl+C** / **Cmd+C** when **Allow Ctrl+C** is on.
4. Paste where you need it. Formulas become `$...$` or `$$...$$`.

**Copy selection** always works and closes the popup after a successful copy. When **Allow Ctrl+C** is off, keyboard copy stays Chrome’s normal copy, and the button still puts the selection on the clipboard by itself.

If the selection has no recognized formula, the clipboard still receives the cleaned selection text. Sites cannot append their own attribution tail.

## Extension popup

Click the icon to open the popup. Labels in the program are English.

- **Copy selection** — copy the current selection.
- **Allow copy on this site** — allow selecting text and the right-click menu on this site when the page blocks them. You can also copy text from disabled fields (for example Stepik quiz answers). While this is on, the icon shows a green `ON` badge. It does not work in Canvas or Google Docs.
- **Allow Ctrl+C** — on: Ctrl+C / Cmd+C puts the selection on the clipboard the same way as the button. Off: Ctrl+C is Chrome’s normal copy.
- **Clipboard target**
  - **Markdown / LaTeX** (default) — text with `$...$` / `$$...$$`. For Obsidian, Overleaf, Telegram. Images in the selection stay in the HTML clipboard part.
  - **Rich / Office** — formulas are not rewritten as LaTeX. The clipboard gets the original selection, as for LibreOffice or Word, without text injected by the site.
- **Delimiter style** — `$...$` / `$$...$$` or `\(...\)` / `\[...\]`.

Settings are saved immediately (the popup says Saved).

## Where formulas are recognized

The page must keep the TeX source in the HTML, not only a picture.

- KaTeX
- MathJax 2 and 3
- MathML, including Wikipedia
- arXiv / LaTeXML HTML
- Gemini (formulas with `data-xpm-latex`)
- attributes `data-math`, `data-latex`, `data-tex`, `data-formula`, `data-equation`

`\tag{...}` marks are removed from the copied TeX. KaTeX thin spaces (`\,` `\:` `\;`) are restored when possible.

## What this extension does not do

- Notion and Google Docs keep equations in their own format.
- PDFs and picture-only formulas have no TeX in the page, so there is nothing to copy as LaTeX.
- Copying from the Telegram app itself is outside this extension. Copy from the page in Chrome, then paste into Telegram. That chat’s client has to support formulas.
- This build does not install in Firefox. Use Chrome, or another browser that runs Chrome Manifest V3 extensions.

**LibreOffice / Word.** A normal paste often takes plain text. In Markdown / LaTeX mode that plain text is `$...$`, and Writer will not turn it into its own equation. For a look close to the page, choose **Clipboard target → Rich / Office**. For the LaTeX source itself, leave Markdown / LaTeX.

## Update and remove

New version: `chrome://extensions` → the reload button on the extension card (Developer mode), or remove the old one and load the folder again.

Remove: `chrome://extensions` → Remove on “LaTeX Copy Selection”.

## If it did not work

- Is the extension enabled on `chrome://extensions`?
- Did you load the folder that contains `manifest.json`?
- Is **Allow Ctrl+C** off? Use the **Copy selection** button.
- Does the page block copying? Turn on **Allow copy on this site** and reload the tab.
- Are the formulas only pictures? There is no LaTeX to take.
- After changing settings, reload the tab and copy again.
- Does the extension card show an error?

## Privacy

- No account, analytics, ads, or upload of your text to the author’s server.
- The extension does not download its logic from the internet.
- Chrome storage holds only settings: Allow Ctrl+C, clipboard mode, delimiter style, and the list of sites where Allow copy is on.
- If Chrome Sync is on, Chrome itself syncs those settings. The extension does not send them anywhere else.
- The script on the page handles your copy and, when you turn on Allow copy, lifts the selection block on that site.

## License

MIT — see [LICENSE](LICENSE).
