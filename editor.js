import * as ui from './ui.js';
import * as storage from './storage.js';
import * as categories from './categories.js';
import { sanitizeHTML } from './utils.js';

export function openEditor(app, noteId) {
    const note = app.notes.find(n => n.id === noteId);
    if (note) {
        app.currentNoteId = noteId;
        app.elements.noteEditor.value = note.content;
        
        app.editHistory.stack = [note.content];
        app.editHistory.currentIndex = 0;
        app.editHistory.noteId = noteId;
        ui.updateUndoRedoButtons(app);
        ui.updateEditorCategoryDisplay(app);

        ui.switchView(app, 'note-editor-view');
        app.elements.noteEditor.focus();
    }
}

export function closeEditor(app) {
    app.currentNoteId = null;
    app.renderNotesList();
    ui.switchView(app, 'notes-list-view');
}

export function handleEditorInput(app) {
    const note = app.notes.find(n => n.id === app.currentNoteId);
    if (note) {
        const newContent = app.elements.noteEditor.value;
        if (note.content === newContent) return;

        note.content = newContent;
        note.lastModified = Date.now();
        storage.saveNotes(app.notes);
        
        if (app.currentNoteId === app.editHistory.noteId) {
             app.debouncedAddToHistory(newContent);
        }
    }
}

export function deleteCurrentNote(app) {
    if (app.currentNoteId === null) return;

    ui.showModal(app, {
        title: app.getTranslation('deleteLabel'),
        contentHTML: `<p>${app.getTranslation('deleteConfirm')}</p>`,
        confirmText: app.getTranslation('deleteLabel'),
        cancelText: app.getTranslation('cancel'),
        onConfirm: () => {
            if (app.currentNoteId === null) return; // a safety check
            app.playSound('delete');
            app.notes = app.notes.filter(note => note.id !== app.currentNoteId);
            storage.saveNotes(app.notes);
            closeEditor(app);
        }
    });
}

function assignCategoryToCurrentNote(app, categoryId) {
    const note = app.notes.find(n => n.id === app.currentNoteId);
    if (note) {
        // Use == to compare because categoryId from data attribute might be string "null"
        note.categoryId = categoryId == 'null' ? null : categoryId;
        note.lastModified = Date.now();
        storage.saveNotes(app.notes);
        ui.updateEditorCategoryDisplay(app);
    }
}

function handleCategoryPickerClick(app, event) {
    const target = event.target.closest('.category-selection-item');
    if (!target) return;

    ui.hideModal(app);
    
    // Cleanup listener is now handled by the modal's onClose callback

    if (target.dataset.action === 'create-new') {
        // Defer this call slightly to allow first modal to fully close
        setTimeout(() => {
            categories.handleAddCategory(app, (newCategory) => {
                assignCategoryToCurrentNote(app, newCategory.id);
            });
        }, 100);
    } else {
        const categoryId = target.dataset.categoryId;
        assignCategoryToCurrentNote(app, categoryId);
    }
}

function openCategoryPicker(app) {
    if (!app.currentNoteId) return;
    const note = app.notes.find(n => n.id === app.currentNoteId);
    if (!note) return;

    let categoryItemsHTML = `
        <button class="category-selection-item neumorphic ${note.categoryId === null ? 'active' : ''}" data-category-id="null">
            ${app.getTranslation('noCategory')}
        </button>
    `;

    const sortedCategories = [...app.categories].sort((a, b) => a.name.localeCompare(b.name));

    sortedCategories.forEach(cat => {
        categoryItemsHTML += `
            <button class="category-selection-item neumorphic ${note.categoryId === cat.id ? 'active' : ''}" data-category-id="${cat.id}">
                ${sanitizeHTML(cat.name)}
            </button>
        `;
    });

    categoryItemsHTML += `
        <button class="category-selection-item neumorphic create-new" data-action="create-new">
            ${app.getTranslation('createNewCategory')}
        </button>
    `;

    const contentHTML = `<div class="category-selection-list">${categoryItemsHTML}</div>`;

    // The modal is shown, now attach a specific listener for this interaction
    app.categoryPickerClickHandler = (event) => handleCategoryPickerClick(app, event);

    ui.showModal(app, {
        title: app.getTranslation('selectCategoryTitle'),
        contentHTML: contentHTML,
        hideActions: true,
        onClose: () => {
            // This cleanup runs whenever the modal is hidden, ensuring no memory leaks.
            if (app.categoryPickerClickHandler) {
                app.elements.modalContent.removeEventListener('click', app.categoryPickerClickHandler);
                delete app.categoryPickerClickHandler;
            }
        }
    });

    app.elements.modalActions.style.display = 'none'; // Explicitly hide actions
    
    app.elements.modalContent.addEventListener('click', app.categoryPickerClickHandler);
}

async function summarizeCurrentNote(app) {
    if (!app.currentNoteId) return;
    const note = app.notes.find(n => n.id === app.currentNoteId);
    if (!note) return;

    const summarizeBtn = app.elements.summarizeNoteBtn;
    summarizeBtn.disabled = true;
    summarizeBtn.innerHTML = '...'; // Simple loading indicator

    try {
        const content = note.content.trim();
        if (!content) {
            // Don't try to summarize an empty note
            return;
        }

        const summaryPrefix = app.getTranslation('summaryPrefix');
        const summarySeparator = `\n\n---\n\n${summaryPrefix}`;

        // Check if an old summary exists and get the content without it.
        let contentToSummarize = content;
        const oldSummaryIndex = content.lastIndexOf(summarySeparator);
        if (oldSummaryIndex !== -1) {
            contentToSummarize = content.substring(0, oldSummaryIndex).trim();
        }

        if (!contentToSummarize) {
             // The note might only contain a previous summary. Nothing new to summarize.
             return;
        }

        // Add a character limit to prevent errors with very long notes.
        const MAX_SUMMARY_CHARS = 4000;
        const truncatedContent = contentToSummarize.length > MAX_SUMMARY_CHARS ? contentToSummarize.substring(0, MAX_SUMMARY_CHARS) + "..." : contentToSummarize;

        const completion = await websim.chat.completions.create({
            messages: [{
                role: "system",
                content: "You are a helpful assistant that summarizes notes concisely. Respond with only the summary text, without any preamble. The summary should be in the same language as the note."
            }, {
                role: "user",
                content: `Summarize the following note in one or two short sentences:\n\n---\n\n${truncatedContent}`
            }]
        });

        const summary = completion.content;

        if (summary) {
            // Append the new summary to the original content (without any previous summary).
            const newContent = `${contentToSummarize}\n\n---\n\n${summaryPrefix} ${summary}`;

            // Update editor and state
            app.elements.noteEditor.value = newContent;
            handleEditorInput(app); // This handles saving and adding to undo history
            app.playSound('add');
        } else {
             throw new Error("The AI returned an empty or invalid summary.");
        }

    } catch (error) {
        console.error("Summarization failed:", error);
        
        ui.showModal(app, {
            title: app.getTranslation('errorTitle'),
            contentHTML: `<p>${app.getTranslation('summaryError')}</p>`,
            confirmText: app.getTranslation('ok'),
            cancelText: ''
        });
    } finally {
        summarizeBtn.disabled = false;
        summarizeBtn.innerHTML = '✨'; // Restore icon
    }
}

export function addToHistory(app, content) {
    if (app.currentNoteId !== app.editHistory.noteId) return;
    if (app.editHistory.stack[app.editHistory.currentIndex] === content) return;

    app.editHistory.stack = app.editHistory.stack.slice(0, app.editHistory.currentIndex + 1);
    app.editHistory.stack.push(content);
    app.editHistory.currentIndex++;

    if (app.editHistory.stack.length > app.editHistory.MAX_HISTORY) {
        app.editHistory.stack.shift();
        app.editHistory.currentIndex--;
    }
    ui.updateUndoRedoButtons(app);
}

function updateNoteContentAfterUndoRedo(app, newContent) {
    const note = app.notes.find(n => n.id === app.currentNoteId);
    if (note) {
        note.content = newContent;
        note.lastModified = Date.now();
        storage.saveNotes(app.notes);
    }
}

export function undoEdit(app) {
    if (app.currentNoteId !== app.editHistory.noteId) return;
    if (app.editHistory.currentIndex > 0) {
        app.playSound('click');
        app.editHistory.currentIndex--;
        const contentToRestore = app.editHistory.stack[app.editHistory.currentIndex];
        app.elements.noteEditor.value = contentToRestore;
        updateNoteContentAfterUndoRedo(app, contentToRestore);
        ui.updateUndoRedoButtons(app);
    }
}

export function redoEdit(app) {
    if (app.currentNoteId !== app.editHistory.noteId) return;
    if (app.editHistory.currentIndex < app.editHistory.stack.length - 1) {
        app.playSound('click');
        app.editHistory.currentIndex++;
        const contentToRestore = app.editHistory.stack[app.editHistory.currentIndex];
        app.elements.noteEditor.value = contentToRestore;
        updateNoteContentAfterUndoRedo(app, contentToRestore);
        ui.updateUndoRedoButtons(app);
    }
}

export function shareCurrentNote(app) {
    app.playSound('click');
    if (app.currentNoteId === null) return;
    const note = app.notes.find(n => n.id === app.currentNoteId);

    // Check if the note is empty or just whitespace
    if (!note || !note.content.trim()) {
        ui.showModal(app, {
            title: app.getTranslation('errorTitle'),
            contentHTML: `<p>${app.getTranslation('shareEmptyNote')}</p>`,
            confirmText: app.getTranslation('ok'),
            cancelText: ''
        });
        return;
    }

    const noteContent = note.content;
    const noteTitle = (noteContent.split('\n')[0].trim() || app.getTranslation('newNoteTitle')).substring(0, 100);

    // The Web Share API is the modern web equivalent of Android's ACTION_SEND Intent.
    if (navigator.share) {
        navigator.share({
            title: noteTitle,
            text: noteContent,
        })
        .then(() => {
            console.log('Successful share');
        })
        .catch((error) => {
            // AbortError is thrown when the user dismisses the share sheet. This is not an application error.
            if (error.name !== 'AbortError') {
                console.error("Share failed:", error);
                // Show a simple, user-friendly error message instead of technical details.
                ui.showModal(app, {
                    title: app.getTranslation('errorTitle'),
                    contentHTML: `<p>${app.getTranslation('shareError')}</p>`,
                    confirmText: app.getTranslation('ok'),
                    cancelText: ''
                });
            }
        });
    } else {
        // Fallback for environments that don't support the Web Share API (e.g., desktop browsers).
        try {
            navigator.clipboard.writeText(noteContent);
            ui.showModal(app, {
                title: app.getTranslation('shareSuccess'),
                contentHTML: `<p>${app.getTranslation('shareFallback')}</p>`,
                confirmText: app.getTranslation('ok'),
                cancelText: ''
            });
        } catch (err) {
            console.error("Clipboard fallback failed:", err);
            // Show a simple, user-friendly error message for the fallback.
            ui.showModal(app, {
                title: app.getTranslation('errorTitle'),
                contentHTML: `<p>${app.getTranslation('shareFallbackError')}</p>`,
                confirmText: app.getTranslation('ok'),
                cancelText: ''
            });
        }
    }
}

export function setupEditorEventListeners(app) {
    app.elements.backBtn.addEventListener('click', () => closeEditor(app));
    app.elements.noteEditor.addEventListener('input', () => handleEditorInput(app));
    app.elements.deleteNoteBtn.addEventListener('click', () => deleteCurrentNote(app));
    app.elements.undoBtn.addEventListener('click', () => undoEdit(app));
    app.elements.redoBtn.addEventListener('click', () => redoEdit(app));
    app.elements.summarizeNoteBtn.addEventListener('click', () => summarizeCurrentNote(app));
    app.elements.shareNoteBtn.addEventListener('click', () => shareCurrentNote(app));
    app.elements.categoryNoteBtn.addEventListener('click', () => openCategoryPicker(app));
    app.elements.editorCategoryDisplay.addEventListener('click', () => openCategoryPicker(app));
}