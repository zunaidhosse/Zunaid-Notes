import { DateTime } from 'luxon';
import { sanitizeHTML } from './utils.js';

export function cacheDOMElements(app) {
    app.elements = {
        notesListView: document.getElementById('notes-list-view'),
        noteEditorView: document.getElementById('note-editor-view'),
        settingsView: document.getElementById('settings-view'),
        backupRestoreView: document.getElementById('backup-restore-view'),
        categoriesView: document.getElementById('categories-view'),
        infoView: document.getElementById('info-view'),

        notesListContainer: document.getElementById('notes-list-container'),
        notesList: document.getElementById('notes-list'),
        emptyState: document.getElementById('empty-state'),
        addNoteBtn: document.getElementById('add-note-btn'),
        backBtn: document.getElementById('back-btn'),
        noteEditor: document.getElementById('note-editor'),
        searchBar: document.getElementById('search-bar'),
        deleteNoteBtn: document.getElementById('delete-note-btn'),
        
        mainMenuBtn: document.getElementById('main-menu-btn'),
        mainMenuDropdown: document.getElementById('main-menu-dropdown'),
        undoBtn: document.getElementById('undo-btn'),
        redoBtn: document.getElementById('redo-btn'),
        summarizeNoteBtn: document.getElementById('summarize-note-btn'),
        shareNoteBtn: document.getElementById('share-note-btn'),
        categoryNoteBtn: document.getElementById('category-note-btn'),
        editorCategoryDisplay: document.getElementById('editor-category-display'),

        settingsBackBtn: document.getElementById('settings-back-btn'),
        themeOptions: document.getElementById('theme-options'),
        fontSizeOptions: document.getElementById('font-size-options'),
        languageOptions: document.getElementById('language-options'),
        
        backupBackBtn: document.getElementById('backup-back-btn'),
        createBackupBtn: document.getElementById('create-backup-btn'),
        restoreBackupBtn: document.getElementById('restore-backup-btn'),

        categoriesBackBtn: document.getElementById('categories-back-btn'),
        categoryList: document.getElementById('category-list'),
        emptyCategoriesState: document.getElementById('empty-categories-state'),
        addCategoryBtn: document.getElementById('add-category-btn'),
        infoBackBtn: document.getElementById('info-back-btn'),

        // Modal
        modalOverlay: document.getElementById('modal-overlay'),
        modal: document.getElementById('modal'),
        modalTitle: document.getElementById('modal-title'),
        modalContent: document.getElementById('modal-content'),
        modalActions: document.getElementById('modal-actions'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        modalConfirmBtn: document.getElementById('modal-confirm-btn'),

        // PWA Install Banner
        installBanner: document.getElementById('install-banner'),
        installBtn: document.getElementById('install-btn'),
        installDismissBtn: document.getElementById('install-dismiss-btn'),
    };

    app.elements.addNoteBtn.classList.add('neumorphic');
    app.elements.backBtn.classList.add('neumorphic');
    app.elements.deleteNoteBtn.classList.add('neumorphic');
    app.elements.noteEditor.classList.add('neumorphic-inset');
    app.elements.searchBar.classList.add('neumorphic-inset');
    app.elements.mainMenuBtn.classList.add('neumorphic');
    app.elements.mainMenuDropdown.classList.add('neumorphic');
    app.elements.undoBtn.classList.add('neumorphic');
    app.elements.redoBtn.classList.add('neumorphic');
    app.elements.summarizeNoteBtn.classList.add('neumorphic');
    app.elements.shareNoteBtn.classList.add('neumorphic');
    app.elements.categoryNoteBtn.classList.add('neumorphic');
    app.elements.editorCategoryDisplay.addEventListener('click', () => app.elements.categoryNoteBtn.click());
    app.elements.addCategoryBtn.classList.add('neumorphic');
}

export function switchView(app, viewId) {
    const fromViewId = app.activeView;

    // Before switching, if we are leaving the notes list, save its scroll position.
    if (fromViewId === 'notes-list-view' && app.elements.notesListContainer) {
        app.notesListScrollPosition = app.elements.notesListContainer.scrollTop;
    }

    document.getElementById(app.activeView)?.classList.remove('active');
    const newView = document.getElementById(viewId);
    if (newView) {
        newView.classList.add('active');
        app.activeView = viewId;
        app.playSound('swoosh');
    }

    // After switching, if we are entering the notes list, restore its scroll position.
    if (viewId === 'notes-list-view' && app.elements.notesListContainer) {
        // Defer scroll restoration to ensure the view is painted and ready.
        setTimeout(() => {
            app.elements.notesListContainer.scrollTop = app.notesListScrollPosition;
        }, 0);
    }
}

export function updateEditorCategoryDisplay(app) {
    if (!app.currentNoteId) {
        app.elements.editorCategoryDisplay.textContent = app.getTranslation('noCategory');
        return;
    }
    const note = app.notes.find(n => n.id === app.currentNoteId);
    if (note && note.categoryId) {
        const category = app.categories.find(c => c.id === note.categoryId);
        app.elements.editorCategoryDisplay.textContent = category ? category.name : app.getTranslation('noCategory');
    } else {
        app.elements.editorCategoryDisplay.textContent = app.getTranslation('noCategory');
    }
}

export function updateUndoRedoButtons(app) {
    if (!app.elements.undoBtn || !app.elements.redoBtn) return;
    
    const canUndo = app.editHistory.currentIndex > 0 && app.editHistory.noteId === app.currentNoteId;
    const canRedo = app.editHistory.currentIndex < app.editHistory.stack.length - 1 && app.editHistory.noteId === app.currentNoteId;

    app.elements.undoBtn.disabled = !canUndo;
    app.elements.redoBtn.disabled = !canRedo;
}

export function applyTheme(app) {
    document.body.dataset.theme = app.settings.theme;
    app.elements.themeOptions.querySelector('.active')?.classList.remove('active');
    app.elements.themeOptions.querySelector(`[data-theme="${app.settings.theme}"]`)?.classList.add('active');
}

export function applyFontSize(app) {
    document.body.dataset.fontSize = app.settings.fontSize;
    app.elements.fontSizeOptions.querySelector('.active')?.classList.remove('active');
    app.elements.fontSizeOptions.querySelector(`[data-font-size="${app.settings.fontSize}"]`)?.classList.add('active');
}

export function applyLanguage(app) {
    document.documentElement.lang = app.settings.language;

    document.querySelectorAll('[data-lang-key]').forEach(el => {
        const key = el.dataset.langKey;
        el.textContent = app.getTranslation(key);
    });
    document.querySelectorAll('[data-lang-placeholder]').forEach(el => {
        const key = el.dataset.langPlaceholder;
        el.placeholder = app.getTranslation(key);
    });
    document.querySelectorAll('[data-lang-aria]').forEach(el => {
        const key = el.dataset.langAria;
        el.setAttribute('aria-label', app.getTranslation(key));
    });

    app.elements.languageOptions.querySelector('.active')?.classList.remove('active');
    app.elements.languageOptions.querySelector(`[data-lang="${app.settings.language}"]`)?.classList.add('active');
}

export function renderNotesList(app) {
    app.elements.notesList.innerHTML = '';

    let notesToRender = app.notes;

    if (app.currentSearchTerm) {
        const searchTerm = app.currentSearchTerm.toLowerCase();
        notesToRender = app.notes.filter(note => 
            note.content.toLowerCase().includes(searchTerm)
        );
    }

    if (notesToRender.length === 0) {
        app.elements.emptyState.classList.remove('hidden');
        const emptyHeader = app.elements.emptyState.querySelector('p:first-child');
        const emptyBody = app.elements.emptyState.querySelector('p:last-child');

        if (app.currentSearchTerm && app.notes.length > 0) {
             emptyHeader.textContent = app.getTranslation('searchEmptyHeader', sanitizeHTML(app.currentSearchTerm));
             emptyBody.textContent = app.getTranslation('searchEmptyBody');
        } else if (app.notes.length === 0) {
            emptyHeader.textContent = app.getTranslation('emptyStateHeader');
            emptyBody.textContent = app.getTranslation('emptyStateBody');
        }
        return;
    }

    app.elements.emptyState.classList.add('hidden');

    const sortedNotes = [...notesToRender].sort((a, b) => b.lastModified - a.lastModified);

    sortedNotes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item neumorphic';
        noteElement.dataset.noteId = note.id;

        const title = note.content.split('\n')[0] || app.getTranslation('newNoteTitle');
        const formattedDate = DateTime.fromMillis(note.lastModified).setLocale(app.settings.language).toFormat('dd MMM yyyy, hh:mm a');
        
        let categoryHTML = '';
        if (note.categoryId) {
            const category = app.categories.find(c => c.id === note.categoryId);
            if (category) {
                categoryHTML = `<div class="note-item-category">${sanitizeHTML(category.name)}</div>`;
            }
        }

        noteElement.innerHTML = `
            <div class="note-item-content">
                <div class="note-item-title">${sanitizeHTML(title)}</div>
            </div>
            <div class="note-item-footer">
                 <div class="note-item-date">${formattedDate}</div>
                 ${categoryHTML}
            </div>
        `;
        app.elements.notesList.appendChild(noteElement);
    });
}

export function renderCategoriesList(app) {
    app.elements.categoryList.innerHTML = '';
    
    if (app.categories.length === 0) {
        app.elements.emptyCategoriesState.classList.remove('hidden');
    } else {
        app.elements.emptyCategoriesState.classList.add('hidden');
    }

    const sortedCategories = [...app.categories].sort((a, b) => a.name.localeCompare(b.name));
    
    sortedCategories.forEach(category => {
        const categoryElement = document.createElement('div');
        categoryElement.className = 'category-item neumorphic';
        categoryElement.dataset.categoryId = category.id;

        categoryElement.innerHTML = `
            <span class="category-item-name">${sanitizeHTML(category.name)}</span>
            <div class="category-item-actions">
                <button class="icon-btn neumorphic edit-category-btn" aria-label="${app.getTranslation('editCategoryLabel')}">✏️</button>
                <button class="icon-btn neumorphic delete-category-btn" aria-label="${app.getTranslation('deleteCategoryLabel')}">🗑️</button>
            </div>
        `;
        app.elements.categoryList.appendChild(categoryElement);
    });
}

let modalConfirmCallback = null;
let modalCloseCallback = null;

export function showModal(app, { title, contentHTML, confirmText, cancelText, onConfirm, onClose, hideActions = false }) {
    app.elements.modalTitle.textContent = title;
    app.elements.modalContent.innerHTML = contentHTML;
    
    const showConfirm = !!confirmText;
    const showCancel = !!cancelText;

    if (hideActions || (!showConfirm && !showCancel)) {
        app.elements.modalActions.style.display = 'none';
    } else {
        app.elements.modalActions.style.display = 'flex';
        app.elements.modalConfirmBtn.textContent = confirmText;
        app.elements.modalCancelBtn.textContent = cancelText;

        app.elements.modalConfirmBtn.style.display = showConfirm ? 'inline-block' : 'none';
        app.elements.modalCancelBtn.style.display = showCancel ? 'inline-block' : 'none';
    }

    app.elements.modalOverlay.classList.remove('hidden');
    app.playSound('open_modal');
    
    const input = app.elements.modalContent.querySelector('input');
    if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
    }
    
    modalConfirmCallback = (e) => {
        if (onConfirm) onConfirm(e);
        hideModal(app);
    };

    modalCloseCallback = onClose;
    
    app.elements.modalConfirmBtn.addEventListener('click', modalConfirmCallback);
}

export function hideModal(app) {
    if (app.elements.modalOverlay.classList.contains('hidden')) return;

    app.playSound('close_modal');

    if (modalConfirmCallback) {
        app.elements.modalConfirmBtn.removeEventListener('click', modalConfirmCallback);
        modalConfirmCallback = null;
    }
    if (modalCloseCallback) {
        modalCloseCallback();
        modalCloseCallback = null;
    }
    app.elements.modalOverlay.classList.add('hidden');
}