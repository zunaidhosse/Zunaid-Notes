import * as editor from './editor.js';
import * as storage from './storage.js';

export function createNewNote(app) {
    const newNote = {
        id: crypto.randomUUID(),
        content: '',
        lastModified: Date.now(),
        categoryId: null,
    };
    app.notes.unshift(newNote);
    storage.saveNotes(app.notes);
    app.playSound('add');
    return newNote;
}

export function handleNoteClick(app, event) {
    const noteItem = event.target.closest('.note-item');
    if (noteItem) {
        return noteItem.dataset.noteId;
    }
    return null;
}

export function handleSearchInput(app, event) {
    app.currentSearchTerm = event.target.value;
    app.renderNotesList();
}

export function setupNotesEventListeners(app) {
    app.elements.addNoteBtn.addEventListener('click', () => {
        const newNote = createNewNote(app);
        editor.openEditor(app, newNote.id);
    });
    app.elements.notesList.addEventListener('click', (event) => {
        const noteId = handleNoteClick(app, event);
        if (noteId) {
            editor.openEditor(app, noteId);
        }
    });
    app.elements.searchBar.addEventListener('input', (event) => handleSearchInput(app, event));
}