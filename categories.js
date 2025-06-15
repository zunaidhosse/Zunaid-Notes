import * as ui from './ui.js';
import * as storage from './storage.js';

function handleAddCategory(app, onCompleteCallback) {
    ui.showModal(app, {
        title: app.getTranslation('enterCategoryName'),
        contentHTML: `<input type="text" id="category-name-input" placeholder="${app.getTranslation('enterCategoryName')}..." autocomplete="off">`,
        confirmText: app.getTranslation('save'),
        cancelText: app.getTranslation('cancel'),
        onConfirm: () => {
            const input = document.getElementById('category-name-input');
            const name = input.value.trim();
            if (name) {
                const newCategory = addCategory(app, name);
                if (onCompleteCallback) {
                    onCompleteCallback(newCategory);
                }
            }
        }
    });
}

function handleEditCategory(app, categoryId) {
    const category = app.categories.find(c => c.id === categoryId);
    if (!category) return;

    ui.showModal(app, {
        title: app.getTranslation('editCategoryLabel'),
        contentHTML: `<input type="text" id="category-name-input" value="${category.name}" autocomplete="off">`,
        confirmText: app.getTranslation('save'),
        cancelText: app.getTranslation('cancel'),
        onConfirm: () => {
            const input = document.getElementById('category-name-input');
            const newName = input.value.trim();
            if (newName && newName !== category.name) {
                updateCategory(app, categoryId, newName);
            }
        }
    });
}

function handleDeleteCategory(app, categoryId) {
    ui.showModal(app, {
        title: app.getTranslation('deleteCategoryLabel'),
        contentHTML: `<p>${app.getTranslation('deleteCategoryConfirm')}</p>`,
        confirmText: app.getTranslation('deleteLabel'),
        cancelText: app.getTranslation('cancel'),
        onConfirm: () => {
            app.playSound('delete');
            // Remove category
            app.categories = app.categories.filter(c => c.id !== categoryId);
            storage.saveCategories(app.categories);

            // Un-assign from notes
            let notesModified = false;
            app.notes.forEach(note => {
                if (note.categoryId === categoryId) {
                    note.categoryId = null;
                    notesModified = true;
                }
            });

            if (notesModified) {
                storage.saveNotes(app.notes);
            }

            ui.renderCategoriesList(app);
            // Re-render notes list in case a visible note's category was removed
            app.renderNotesList();
        }
    });
}

function addCategory(app, name) {
    const newCategory = {
        id: crypto.randomUUID(),
        name: name,
    };
    app.categories.push(newCategory);
    storage.saveCategories(app.categories);
    ui.renderCategoriesList(app);
    app.playSound('add');
    return newCategory;
}

function updateCategory(app, id, newName) {
    const category = app.categories.find(c => c.id === id);
    if (category) {
        category.name = newName;
        storage.saveCategories(app.categories);
        ui.renderCategoriesList(app);
        app.playSound('click');
    }
}

function handleCategoryListClick(app, event) {
    const editBtn = event.target.closest('.edit-category-btn');
    if (editBtn) {
        const categoryItem = event.target.closest('.category-item');
        const categoryId = categoryItem.dataset.categoryId;
        handleEditCategory(app, categoryId);
        return;
    }

    const deleteBtn = event.target.closest('.delete-category-btn');
    if (deleteBtn) {
        const categoryItem = event.target.closest('.category-item');
        const categoryId = categoryItem.dataset.categoryId;
        handleDeleteCategory(app, categoryId);
        return;
    }
}

function handleModalCancel(app, event) {
    // Also check if click is on overlay itself or the cancel button
    if (event.target === app.elements.modalOverlay || event.target === app.elements.modalCancelBtn) {
        ui.hideModal(app);
    }
}

export function setupCategoriesEventListeners(app) {
    app.elements.addCategoryBtn.addEventListener('click', () => handleAddCategory(app, null));
    app.elements.categoryList.addEventListener('click', (e) => handleCategoryListClick(app, e));
    
    // Modal listeners
    app.elements.modalOverlay.addEventListener('click', (e) => handleModalCancel(app, e));
    app.elements.modalCancelBtn.addEventListener('click', (e) => handleModalCancel(app, e));
}

export { handleAddCategory };