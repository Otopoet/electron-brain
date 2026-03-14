# Brain — User Guide
> v1.3 · TheBrain-style personal knowledge manager for Mac

---

## Table of Contents

1. [Interface Overview](#interface-overview)
2. [Creating Thoughts](#creating-thoughts)
3. [Navigating the Plex](#navigating-the-plex)
4. [Linking Thoughts](#linking-thoughts)
5. [Organizing with Types & Tags](#organizing-with-types--tags)
6. [Pins & History](#pins--history)
7. [Notes & Mentions](#notes--mentions)
8. [Attachments](#attachments)
9. [Search](#search)
10. [Keyboard Shortcuts](#keyboard-shortcuts)

---

## Interface Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  [⌘F  Search…]  [⚡ index]  [+ New Thought]     ← Toolbar          │
├─────────────────────────────────────────────────────────────────────┤
│  [📌 Pinned Thought A]  [Pinned Thought B]       ← Pins Bar         │
├──────────┬──────────────────────────────┬───────────────────────────┤
│ ▸ History│                              │  Thought Panel            │
│ panel    │        Plex (graph)          │  (title, notes, links…)   │
│          │                              │                           │
└──────────┴──────────────────────────────┴───────────────────────────┘
```

| Area | Purpose |
|---|---|
| **Toolbar** | Search, create thoughts, view index progress |
| **Pins Bar** | Quick-access bar for pinned thoughts (hidden when none pinned) |
| **History Panel** | Last 20 thoughts visited; collapsible with `▸/◂` button |
| **Plex** | Interactive graph showing the active thought and its relationships |
| **Thought Panel** | Edit title, notes, color, type, tags, links, and attachments |

---

## Creating Thoughts

### New Thought Modal

Press **⌘N** or click **+ New Thought**. Type a title and press a key to choose how it's connected:

| Key | Creates thought as… |
|---|---|
| `Enter` | **Child** of the active thought |
| `⇧ Enter` | **Parent** of the active thought |
| `⌃ Enter` | **Jump** link from the active thought |
| `⌃⇧ Enter` | **Orphan** (no link) |

### Batch Creation

Separate multiple titles with `;` to create them all at once as siblings:

```
Philosophy; Ethics; Epistemology
```

All three are created and linked in sequence.

### Comma Context Trick

Prefix or suffix with `,` to automatically include the active thought's name:

| You type | Active thought is | Result title |
|---|---|---|
| `, consequences` | `Ethics` | `Ethics, consequences` |
| `free will,` | `Ethics` | `free will, Ethics` |

### Creating from Search

Type in the search bar and use modifiers to create without opening the modal:

| Key | Action |
|---|---|
| `Enter` (no results) | Create child |
| `⇧ Enter` | Create parent |
| `⌃ Enter` | Create jump |
| `⌃⇧ Enter` | Create orphan |

---

## Navigating the Plex

The **Plex** is the central graph view. Every thought is surrounded by its relationships:

```
            [ Parent ]
                │
    [Jump] ─── [ Active ] ─── [Sibling]
                │
            [ Child ]
```

| Position | Relationship | Color |
|---|---|---|
| Above | Parents | White |
| Below | Children | White |
| Left | Jumps | Orange (dashed line) |
| Right | Siblings | Cyan |

**Interacting with nodes:**
- **Click** any node to navigate to it
- **Hover** to enlarge slightly
- **Scroll wheel** to zoom (0.15×–4×)
- **Click + drag background** to pan

**Gate indicators** — four small dots around each node show whether that thought has connections in that direction. Filled = connections exist; dim = none.

---

## Linking Thoughts

### Drag-to-Link

The fastest way to create links is to drag from a gate indicator:

| Gate | Position | Creates |
|---|---|---|
| ⬆ N gate | Top | Dragged-to node becomes **parent** |
| ⬇ S gate | Bottom | Dragged-to node becomes **child** |
| ⬅ W gate | Left | **Jump** link to dragged-to node |
| ➡ E gate | Right | **Jump** link to dragged-to node |

Release the drag within **60px** of a target node to create the link. A dashed preview line follows your cursor during the drag.

### Manual Link Creation

In the Thought Panel, scroll to the **Links** section and click **+ Link**:

1. Select a target thought from the dropdown
2. Choose **Child** or **Jump**
3. Optionally assign a **Link Type** (or create one)
4. Click **Link**

### Editing Links

In the **Links** section of the Thought Panel, each link shows a colored dot. Click the dot to open the edit popover:

- **Color** — Override with one of 8 preset colors (or leave default)
- **Width** — Default / Thin / Normal / Thick
- **Link Type** — Assign a named link type template
- **Label** — Add a short annotation
- **Delete link** — Remove the connection

### Link Types

Link types are reusable named templates with a color and width. Create one when adding or editing a link via the **+** button next to the link type selector.

Examples: *Inspired by*, *Contradicts*, *Evidence for*, *Part of*

---

## Organizing with Types & Tags

### Thought Types

Types classify thoughts (e.g., Person, Concept, Project). Each type has:
- A **name**
- A **color** (auto-applies to the thought on assignment)
- An optional **emoji icon** (shown inside the Plex node)

**Assign a type:** Use the dropdown in the Thought Panel header.

**Create a type:** Click **+** next to the type dropdown, fill in name + icon + color, then click **Create**.

### Tags

Tags are flexible labels — a thought can have any number of them.

- **Add a tag:** Click **+ tag** in the panel header → select from existing tags or create new
- **Create a tag:** Enter a name and pick a color
- **Remove a tag:** Click **×** on the tag chip

---

## Pins & History

### Pinning Thoughts

Click **📌** in the Thought Panel header to pin/unpin a thought.

Pinned thoughts appear in the **Pins Bar** between the toolbar and the main area. Click a pin to navigate; click **×** to unpin.

Good candidates to pin: home/hub thoughts, active projects, frequently referenced reference nodes.

### Navigation History

The **History Panel** on the left edge tracks your last 20 navigations in order. Click the `▸` arrow to expand it, `◂` to collapse.

Click any entry to jump back. The currently active thought is excluded from the list.

---

## Notes & Mentions

### Rich Text Editor

The notes area supports full rich text:
- `⌘B` Bold, `⌘I` Italic, `⌘K` Code, etc.
- Lists, headings, blockquotes (standard TipTap shortcuts)
- Notes auto-save **600ms** after you stop typing

### `[[` Mentions

Type `[[` in the notes editor to open an autocomplete dropdown of all your thoughts:

1. Type `[[` — dropdown appears
2. Continue typing to filter by title
3. Use `↑ ↓` to navigate, `Enter` or click to insert
4. Press `Esc` to dismiss

The inserted mention looks like: `[[Thought Title]]` and is styled as a purple underlined link.

**Click any mention chip** to navigate to that thought instantly.

### Backlinks / Mentions Section

At the bottom of the Thought Panel, the **Mentions** section automatically lists every other thought whose notes contain the current thought's title. This requires no manual upkeep — it's always live.

Click any backlink to navigate there.

---

## Attachments

Attach files or URLs to any thought via the **Attachments** section:

| Button | Action |
|---|---|
| **+ File** | Opens system file picker |
| **+ URL** | Enter a URL and optional label |

**Attachment actions:**
- **Click name** — Toggle inline preview (images, PDFs, text files)
- **↗ button** — Open in default app or browser
- **× button** — Remove attachment

Supported preview types: images (jpg, png, gif, webp, svg), PDF, plain text, code files.

---

## Search

### Keyword Search (FTS)

The default mode — searches thought titles and notes using full-text search.

- Focus: **⌘F**
- Results appear as you type (200ms debounce)
- Navigate results: `↑ ↓` arrow keys
- Select result: `Enter`
- Dismiss: `Esc`

### Semantic Search

Click the **≡** icon left of the search bar to toggle **⚡ semantic** mode.

Semantic search finds thoughts by *meaning* rather than exact keywords, using a local AI embedding model (no internet required).

- First use downloads the model (~23 MB, once only, stored locally)
- Each result shows a **similarity score** (`%`)
- Scores above 70% are highlighted in purple

**Index status:** While thoughts are being embedded in the background, a pill `⚡ N/M` appears in the toolbar. Semantic search works with already-indexed thoughts and improves as indexing completes.

---

## Keyboard Shortcuts

### Global

| Shortcut | Action |
|---|---|
| `⌘N` | New Thought modal |
| `⌘F` | Focus search bar |

### New Thought Modal & Search Bar

| Shortcut | Action |
|---|---|
| `Enter` | Create/navigate as **child** |
| `⇧ Enter` | Create as **parent** |
| `⌃ Enter` | Create as **jump** |
| `⌃⇧ Enter` | Create as **orphan** |
| `Esc` | Close / cancel |
| `↑ ↓` | Navigate dropdown results |

### Thought Panel

| Shortcut | Action |
|---|---|
| Click title | Enter title edit mode |
| `Enter` (in title) | Save title |
| `Esc` (in title) | Cancel edit |

### Notes Editor

| Shortcut | Action |
|---|---|
| `⌘B` | Bold |
| `⌘I` | Italic |
| `[[` | Open mention autocomplete |
| `↑ ↓` (in mention) | Navigate suggestions |
| `Enter` (in mention) | Insert selected thought |
| `Esc` (in mention) | Dismiss dropdown |

---

## Tips & Tricks

**Build a hub thought first.** Create a central "Home" or "Index" thought and pin it. Navigate back to it any time from the Pins Bar.

**Use the comma trick for sub-topics.** With "Machine Learning" active, type `, transformers` to create "Machine Learning, transformers" instantly.

**Drag gates instead of using the panel.** For quick linking while exploring the graph, drag from a node's bottom gate to a target — it's much faster than the Link form.

**Semantic search for rediscovery.** When you can't remember a keyword, switch to ⚡ semantic mode and describe the idea in plain language — e.g., *"reasons why people change their minds"*.

**Link types for context.** Create link types like *Caused by*, *Part of*, or *Supports* to add semantic meaning to relationships visible at a glance in the Plex.

**Tags for cross-cutting themes.** Use tags for attributes that cut across types — e.g., `#urgent`, `#reading`, `#needs-review`.
