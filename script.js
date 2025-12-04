/* ===== CONSTANTS ===== */
const STORAGE_KEY = "notesAppV1";

/* ===== STATE ===== */
let notes = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
let state = {
  search: "",
  tag: "*",
  sortRecent: true,
  pinnedOnly: false,
  editingId: null,
  theme: localStorage.getItem("notesTheme") || "light"
};

/* ===== SHORTCUTS ===== */
const $ = id => document.getElementById(id);
document.body.dataset.theme = state.theme;

/* ===== UI ELEMENTS ===== */
const UI = {
  title: $("noteTitle"),
  content: $("noteContent"),
  tags: $("noteTags"),
  add: $("addNoteBtn"),
  list: $("notesContainer"),
  search: $("globalSearch"),
  tagFilter: $("tagFilter"),
  quickTags: $("quickTags"),
  count: $("notesCount"),
  empty: $("emptyState"),
  clearAll: $("clearAll"),
  exportJSON: $("exportJSON"),
  exportTXT: $("exportTXT"),
  sort: $("sortDate"),
  showPinned: $("showPinnedOnly"),
  themeToggle: $("toggleTheme"),
  modal: $("modal"),
  editTitle: $("editTitle"),
  editContent: $("editContent"),
  editTags: $("editTags"),
  saveEdit: $("saveEdit"),
  deleteEdit: $("deleteFromModal"),
  closeModal: $("closeModal"),
  meta: $("metaInfo")
};

/* ===== UTILITIES ===== */
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const formatDate = iso => new Date(iso).toLocaleString();

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  render();
}

function cleanTags(str) {
  if (!str) return [];
  return Array.from(new Set(
    str.split(",").map(t => t.trim()).filter(Boolean)
  )).slice(0, 6);
}

function download(name, content, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeHTML(s = "") {
  return s.replace(/[&<>"]/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])
  ).replace(/\n/g, "<br>");
}

/* ===== ADD NOTE ===== */
UI.add.addEventListener("click", () => {
  const title = UI.title.value.trim();
  const content = UI.content.value.trim();
  const tags = cleanTags(UI.tags.value);

  if (!title && !content) return alert("Write something!");

  const time = new Date().toISOString();
  notes.unshift({
    id: uid(),
    title,
    content,
    tags,
    pinned: false,
    createdISO: time,
    updatedISO: time
  });

  UI.title.value = "";
  UI.content.value = "";
  UI.tags.value = "";

  save();
});

/* ===== SEARCH / FILTERS ===== */
UI.search.addEventListener("input", e => {
  state.search = e.target.value.toLowerCase();
  render();
});

UI.tagFilter.addEventListener("change", e => {
  state.tag = e.target.value;
  render();
});

UI.sort.addEventListener("click", () => {
  state.sortRecent = !state.sortRecent;
  UI.sort.textContent = state.sortRecent ? "Sort: Recent" : "Sort: Oldest";
  render();
});

UI.showPinned.addEventListener("click", () => {
  state.pinnedOnly = !state.pinnedOnly;
  UI.showPinned.textContent = state.pinnedOnly ? "Showing pinned" : "Show pinned";
  render();
});

/* ===== THEME ===== */
UI.themeToggle.textContent = state.theme === "light" ? "Dark" : "Light";
UI.themeToggle.addEventListener("click", () => {
  state.theme = state.theme === "light" ? "dark" : "light";
  document.body.dataset.theme = state.theme;
  UI.themeToggle.textContent = state.theme === "light" ? "Dark" : "Light";
  localStorage.setItem("notesTheme", state.theme);
});

/* ===== EXPORT ===== */
UI.exportJSON.addEventListener("click", () =>
  download("notes.json", JSON.stringify(notes, null, 2), "application/json")
);

UI.exportTXT.addEventListener("click", () => {
  const text = notes.map(n =>
    `# ${n.title}\nTags: ${n.tags.join(", ")}\nUpdated: ${formatDate(n.updatedISO)}\n\n${n.content}\n---\n`
  ).join("\n");

  download("notes.txt", text, "text/plain");
});

/* ===== CLEAR ALL ===== */
UI.clearAll.addEventListener("click", () => {
  if (!confirm("Delete ALL notes?")) return;
  notes = [];
  save();
  localStorage.removeItem(STORAGE_KEY);
});

/* ===== MODAL ===== */
function openModal(n) {
  state.editingId = n.id;
  UI.editTitle.value = n.title;
  UI.editContent.value = n.content;
  UI.editTags.value = n.tags.join(", ");
  UI.meta.textContent = `Created: ${formatDate(n.createdISO)} • Updated: ${formatDate(n.updatedISO)}`;
  UI.modal.dataset.active = "true";
}

function closeModal() {
  UI.modal.dataset.active = "false";
  state.editingId = null;
}

UI.closeModal.addEventListener("click", closeModal);

UI.saveEdit.addEventListener("click", () => {
  let id = state.editingId;
  let note = notes.find(n => n.id === id);
  if (!note) return closeModal();

  note.title = UI.editTitle.value.trim();
  note.content = UI.editContent.value.trim();
  note.tags = cleanTags(UI.editTags.value);
  note.updatedISO = new Date().toISOString();

  save();
  closeModal();
});

UI.deleteEdit.addEventListener("click", () => {
  if (!confirm("Delete this note?")) return;
  notes = notes.filter(n => n.id !== state.editingId);
  save();
  closeModal();
});

/* ===== RENDER ===== */
function renderTagUI() {
  const tags = Array.from(new Set(notes.flatMap(n => n.tags))).sort();
  UI.tagFilter.innerHTML = `<option value="*">All tags</option>` +
    tags.map(t => `<option value="${t}">${t}</option>`).join("");
  UI.quickTags.innerHTML = tags
    .slice(0, 8)
    .map(t => `<button data-tag="${t}" class="tag">${t}</button>`)
    .join("");
}

function matchesSearch(n) {
  let q = state.search;
  return (
    !q ||
    n.title.toLowerCase().includes(q) ||
    n.content.toLowerCase().includes(q) ||
    n.tags.some(t => t.toLowerCase().includes(q))
  );
}

function render() {
  renderTagUI();

  let list = notes.filter(n =>
    (!state.pinnedOnly || n.pinned) &&
    (state.tag === "*" || n.tags.includes(state.tag)) &&
    matchesSearch(n)
  );

  list.sort((a, b) =>
    a.pinned !== b.pinned
      ? (a.pinned ? -1 : 1)
      : state.sortRecent
      ? new Date(b.updatedISO) - new Date(a.updatedISO)
      : new Date(a.updatedISO) - new Date(b.updatedISO)
  );

  UI.list.innerHTML = list.map(n => `
    <div class="note-card ${n.pinned ? "pinned" : ""}" data-id="${n.id}">
      <div class="meta">
        <div>
          <div class="note-title">${escapeHTML(n.title || "(no title)")}</div>
          <div class="muted small">${formatDate(n.updatedISO)}</div>
        </div>
        <div class="meta-actions">
          <button class="pin">${n.pinned ? "📌" : "📍"}</button>
          <button class="edit">✏️</button>
        </div>
      </div>

      <div class="note-content">${escapeHTML(n.content)}</div>
      <div class="note-tags">${n.tags.map(t => `<span class="tag" data-tag="${t}">${t}</span>`).join("")}</div>

      <div class="note-actions">
        <button class="btn edit">Edit</button>
        <button class="btn clone">Clone</button>
        <button class="btn danger delete">Delete</button>
      </div>
    </div>
  `).join("");

  UI.empty.style.display = list.length ? "none" : "block";
  UI.count.textContent = `${notes.length} note${notes.length !== 1 ? "s" : ""}`;
}

/* ===== CARD EVENTS ===== */
UI.list.addEventListener("click", e => {
  const card = e.target.closest(".note-card");
  if (!card) return;

  const id = card.dataset.id;
  const note = notes.find(n => n.id === id);

  if (e.target.classList.contains("delete")) {
    if (confirm("Delete this note?")) {
      notes = notes.filter(n => n.id !== id);
      save();
    }
  }

  if (e.target.classList.contains("clone")) {
    const copy = { ...note, id: uid(), createdISO: new Date().toISOString(), updatedISO: new Date().toISOString() };
    notes.unshift(copy);
    save();
  }

  if (e.target.classList.contains("edit")) openModal(note);
  if (e.target.classList.contains("pin")) {
    note.pinned = !note.pinned;
    note.updatedISO = new Date().toISOString();
    save();
  }

  if (e.target.classList.contains("tag")) {
    state.tag = e.target.dataset.tag;
    UI.tagFilter.value = state.tag;
    render();
  }
});

/* ===== SHORTCUTS ===== */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") closeModal();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    UI.search.focus();
  }
});

/* ===== INIT ===== */
render();
