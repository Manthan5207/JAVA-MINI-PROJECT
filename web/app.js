/**
 * ContactVault - Client Application Logic
 * Communicates with Java WebServer REST API with offline demo fallback
 */

(function () {
  'use strict';

  // Application State
  const state = {
    contacts: [],
    filteredContacts: [],
    selectedCategory: 'ALL',
    searchQuery: '',
    currentView: 'cards', // 'cards' or 'table'
    isServerConnected: false,
    contactPendingDelete: null,
  };

  // Seed data for standalone / offline preview mode
  const FALLBACK_DATA = [
    {
      id: 1,
      name: 'Rahul Sharma',
      phone: '9876543210',
      email: 'rahul.sharma@example.com',
      address: 'Mumbai, Maharashtra',
      category: 'Friend'
    },
    {
      id: 2,
      name: 'Aman Patel',
      phone: '9876501234',
      email: 'aman.patel@example.com',
      address: 'Ahmedabad, Gujarat',
      category: 'Work'
    },
    {
      id: 3,
      name: 'Priya Singh',
      phone: '9123456780',
      email: 'priya.singh@example.com',
      address: 'Bengaluru, Karnataka',
      category: 'Family'
    }
  ];

  // DOM Elements
  const elements = {
    connectionBadge: document.getElementById('connectionStatusBadge'),
    connectionText: document.getElementById('connectionStatusText'),
    totalCount: document.getElementById('totalContactsCount'),
    workCount: document.getElementById('workContactsCount'),
    familyCount: document.getElementById('familyContactsCount'),
    friendCount: document.getElementById('friendContactsCount'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    categoryPills: document.getElementById('categoryPills'),
    viewCardsBtn: document.getElementById('viewCardsBtn'),
    viewTableBtn: document.getElementById('viewTableBtn'),
    contactsGrid: document.getElementById('contactsGrid'),
    contactsTableWrapper: document.getElementById('contactsTableWrapper'),
    contactsTableBody: document.getElementById('contactsTableBody'),
    loadingState: document.getElementById('loadingState'),
    emptyState: document.getElementById('emptyState'),
    emptyAddBtn: document.getElementById('emptyAddBtn'),
    openAddModalBtn: document.getElementById('openAddModalBtn'),
    addModal: document.getElementById('addModal'),
    addForm: document.getElementById('addContactForm'),
    editModal: document.getElementById('editModal'),
    editForm: document.getElementById('editContactForm'),
    deleteModal: document.getElementById('deleteModal'),
    deleteNameText: document.getElementById('deleteContactName'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    toastContainer: document.getElementById('toastContainer'),
  };

  // Avatar Gradient Colors
  const AVATAR_GRADIENTS = [
    'linear-gradient(135deg, #6366f1, #8b5cf6)',
    'linear-gradient(135deg, #3b82f6, #06b6d4)',
    'linear-gradient(135deg, #10b981, #059669)',
    'linear-gradient(135deg, #f59e0b, #d97706)',
    'linear-gradient(135deg, #ec4899, #be185d)',
    'linear-gradient(135deg, #8b5cf6, #6d28d9)',
  ];

  function getAvatarGradient(name) {
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_GRADIENTS.length;
    return AVATAR_GRADIENTS[index];
  }

  function getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Toast System
  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"></path></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    } else {
      iconSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <span class="toast-msg">${escapeHtml(message)}</span>
    `;

    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // Escape HTML to prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Connection & Data Service
  async function checkServerConnection() {
    try {
      const response = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        state.isServerConnected = true;
        elements.connectionBadge.className = 'status-badge status-connected';
        elements.connectionText.textContent = data.dbConnected ? 'MySQL Connected' : 'Server Live (No DB)';
        return true;
      }
    } catch (e) {
      // Server is offline or opened via file:// protocol
    }

    state.isServerConnected = false;
    elements.connectionBadge.className = 'status-badge status-offline';
    elements.connectionText.textContent = 'Offline Demo Mode';
    return false;
  }

  async function loadContacts() {
    elements.loadingState.style.display = 'flex';
    elements.contactsGrid.style.display = 'none';
    elements.contactsTableWrapper.style.display = 'none';
    elements.emptyState.style.display = 'none';

    await checkServerConnection();

    if (state.isServerConnected) {
      try {
        const response = await fetch('/api/contacts', { method: 'GET', cache: 'no-store' });
        if (response.ok) {
          state.contacts = await response.json();
        } else {
          showToast('Failed to fetch from MySQL database', 'error');
          loadLocalContacts();
        }
      } catch (err) {
        showToast('Network error, using local data', 'error');
        loadLocalContacts();
      }
    } else {
      loadLocalContacts();
    }

    elements.loadingState.style.display = 'none';
    applyFilterAndRender();
  }

  function loadLocalContacts() {
    const stored = localStorage.getItem('contactvault_data');
    if (stored) {
      try {
        state.contacts = JSON.parse(stored);
      } catch (e) {
        state.contacts = [...FALLBACK_DATA];
      }
    } else {
      state.contacts = [...FALLBACK_DATA];
      saveLocalContacts();
    }
  }

  function saveLocalContacts() {
    localStorage.setItem('contactvault_data', JSON.stringify(state.contacts));
  }

  // Metric calculation
  function updateMetrics() {
    elements.totalCount.textContent = state.contacts.length;
    elements.workCount.textContent = state.contacts.filter(c => (c.category || '').toLowerCase() === 'work').length;
    elements.familyCount.textContent = state.contacts.filter(c => (c.category || '').toLowerCase() === 'family').length;
    elements.friendCount.textContent = state.contacts.filter(c => (c.category || '').toLowerCase() === 'friend').length;
  }

  // Filtering & Rendering
  function applyFilterAndRender() {
    const query = state.searchQuery.toLowerCase().trim();
    const category = state.selectedCategory;

    state.filteredContacts = state.contacts.filter(c => {
      const matchesCategory = category === 'ALL' || (c.category || '').toLowerCase() === category.toLowerCase();
      const matchesSearch = !query ||
        (c.name && c.name.toLowerCase().includes(query)) ||
        (c.phone && c.phone.toLowerCase().includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.address && c.address.toLowerCase().includes(query));

      return matchesCategory && matchesSearch;
    });

    updateMetrics();
    renderContacts();
  }

  function renderContacts() {
    const list = state.filteredContacts;

    if (list.length === 0) {
      elements.contactsGrid.style.display = 'none';
      elements.contactsTableWrapper.style.display = 'none';
      elements.emptyState.style.display = 'flex';
      return;
    }

    elements.emptyState.style.display = 'none';

    if (state.currentView === 'cards') {
      elements.contactsTableWrapper.style.display = 'none';
      elements.contactsGrid.style.display = 'grid';
      renderCardView(list);
    } else {
      elements.contactsGrid.style.display = 'none';
      elements.contactsTableWrapper.style.display = 'block';
      renderTableView(list);
    }
  }

  function getCategoryBadgeClass(category) {
    const cat = (category || 'Other').toLowerCase();
    if (cat === 'work') return 'badge-category badge-work';
    if (cat === 'family') return 'badge-category badge-family';
    if (cat === 'friend') return 'badge-category badge-friend';
    return 'badge-category badge-other';
  }

  function renderCardView(contacts) {
    elements.contactsGrid.innerHTML = contacts.map(c => {
      const gradient = getAvatarGradient(c.name);
      const initials = getInitials(c.name);
      const badgeClass = getCategoryBadgeClass(c.category);
      const categoryText = escapeHtml(c.category || 'Other');
      const name = escapeHtml(c.name);
      const phone = escapeHtml(c.phone);
      const email = escapeHtml(c.email || '');
      const address = escapeHtml(c.address || '');

      return `
        <article class="contact-card" data-id="${c.id}">
          <div>
            <div class="card-header">
              <div class="contact-avatar-meta">
                <div class="contact-avatar" style="background: ${gradient};">
                  ${initials}
                </div>
                <div class="contact-name-box">
                  <h3 class="contact-name" title="${name}">${name}</h3>
                  <span class="contact-id-tag">#${c.id}</span>
                </div>
              </div>
              <span class="${badgeClass}">${categoryText}</span>
            </div>

            <div class="card-details">
              <a href="tel:${phone}" class="detail-row" title="Call">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>${phone}</span>
              </a>

              ${email ? `
                <a href="mailto:${email}" class="detail-row" title="Email">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  <span>${email}</span>
                </a>
              ` : ''}

              ${address ? `
                <div class="detail-row detail-address" title="Address">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  <span>${address}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="card-actions">
            <button class="btn-icon-action btn-action-edit" data-edit-id="${c.id}" title="Edit Contact">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
              <span>Edit</span>
            </button>
            <button class="btn-icon-action btn-action-delete" data-delete-id="${c.id}" title="Delete Contact">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
              <span>Delete</span>
            </button>
          </div>
        </article>
      `;
    }).join('');

    bindContactActionButtons();
  }

  function renderTableView(contacts) {
    elements.contactsTableBody.innerHTML = contacts.map(c => {
      const gradient = getAvatarGradient(c.name);
      const initials = getInitials(c.name);
      const badgeClass = getCategoryBadgeClass(c.category);
      const categoryText = escapeHtml(c.category || 'Other');
      const name = escapeHtml(c.name);
      const phone = escapeHtml(c.phone);
      const email = escapeHtml(c.email || '-');
      const address = escapeHtml(c.address || '-');

      return `
        <tr data-id="${c.id}">
          <td style="font-family: monospace; color: var(--text-muted);">#${c.id}</td>
          <td>
            <div class="table-contact-cell">
              <div class="table-avatar" style="background: ${gradient};">
                ${initials}
              </div>
              <span class="table-contact-name">${name}</span>
            </div>
          </td>
          <td>${phone}</td>
          <td>${email}</td>
          <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${address}</td>
          <td><span class="${badgeClass}">${categoryText}</span></td>
          <td class="text-right">
            <div class="table-actions">
              <button class="btn-icon-action btn-action-edit" data-edit-id="${c.id}" title="Edit Contact">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit</span>
              </button>
              <button class="btn-icon-action btn-action-delete" data-delete-id="${c.id}" title="Delete Contact">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Delete</span>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    bindContactActionButtons();
  }

  function bindContactActionButtons() {
    document.querySelectorAll('.btn-action-edit').forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.getAttribute('data-edit-id'), 10);
        openEditModal(id);
      };
    });

    document.querySelectorAll('.btn-action-delete').forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.getAttribute('data-delete-id'), 10);
        openDeleteModal(id);
      };
    });
  }

  // Modals Management
  function openModal(modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  // Setup Add Modal
  function openAddModal() {
    elements.addForm.reset();
    clearFormErrors(elements.addForm);
    openModal(elements.addModal);
    setTimeout(() => document.getElementById('addName').focus(), 150);
  }

  // Setup Edit Modal
  function openEditModal(id) {
    const contact = state.contacts.find(c => c.id === id);
    if (!contact) {
      showToast('Contact not found', 'error');
      return;
    }

    clearFormErrors(elements.editForm);
    document.getElementById('editId').value = contact.id;
    document.getElementById('editName').value = contact.name || '';
    document.getElementById('editPhone').value = contact.phone || '';
    document.getElementById('editEmail').value = contact.email || '';
    document.getElementById('editAddress').value = contact.address || '';
    document.getElementById('editCategory').value = contact.category || 'Friend';

    openModal(elements.editModal);
    setTimeout(() => document.getElementById('editName').focus(), 150);
  }

  // Setup Delete Modal
  function openDeleteModal(id) {
    const contact = state.contacts.find(c => c.id === id);
    if (!contact) {
      showToast('Contact not found', 'error');
      return;
    }

    state.contactPendingDelete = contact;
    elements.deleteNameText.textContent = `"${contact.name}"`;
    openModal(elements.deleteModal);
  }

  function clearFormErrors(form) {
    form.querySelectorAll('.field-error').forEach(el => el.textContent = '');
  }

  // Validation Logic (Matching Core Java rules)
  function validateContactForm(nameInput, phoneInput, emailInput, nameErr, phoneErr, emailErr) {
    let isValid = true;
    nameErr.textContent = '';
    phoneErr.textContent = '';
    emailErr.textContent = '';

    const nameVal = nameInput.value.trim();
    if (!nameVal) {
      nameErr.textContent = 'Name is required.';
      isValid = false;
    }

    const phoneVal = phoneInput.value.trim();
    const phonePattern = /^[0-9+ -]{7,15}$/;
    if (!phoneVal) {
      phoneErr.textContent = 'Phone number is required.';
      isValid = false;
    } else if (!phonePattern.test(phoneVal)) {
      phoneErr.textContent = 'Enter a valid phone number (at least 7 digits).';
      isValid = false;
    }

    const emailVal = emailInput.value.trim();
    if (emailVal && (!emailVal.includes('@') || !emailVal.includes('.'))) {
      emailErr.textContent = 'Enter a valid email address.';
      isValid = false;
    }

    return isValid;
  }

  // Handle Add Form Submission
  async function handleAddSubmit(e) {
    e.preventDefault();
    const nameInput = document.getElementById('addName');
    const phoneInput = document.getElementById('addPhone');
    const emailInput = document.getElementById('addEmail');
    const categoryInput = document.getElementById('addCategory');
    const addressInput = document.getElementById('addAddress');

    const nameErr = document.getElementById('addNameError');
    const phoneErr = document.getElementById('addPhoneError');
    const emailErr = document.getElementById('addEmailError');

    if (!validateContactForm(nameInput, phoneInput, emailInput, nameErr, phoneErr, emailErr)) {
      return;
    }

    const newContact = {
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim(),
      address: addressInput.value.trim(),
      category: categoryInput.value
    };

    const submitBtn = document.getElementById('submitAddBtn');
    submitBtn.disabled = true;

    if (state.isServerConnected) {
      try {
        const response = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newContact)
        });

        if (response.ok) {
          showToast(`Contact "${newContact.name}" added successfully!`, 'success');
          closeModal(elements.addModal);
          await loadContacts();
        } else {
          showToast('Failed to save contact to database', 'error');
        }
      } catch (err) {
        showToast('Error communicating with Java server', 'error');
      }
    } else {
      // Local fallback
      const maxId = state.contacts.reduce((max, c) => Math.max(max, c.id || 0), 0);
      newContact.id = maxId + 1;
      state.contacts.unshift(newContact);
      saveLocalContacts();
      showToast(`Contact "${newContact.name}" added locally!`, 'success');
      closeModal(elements.addModal);
      applyFilterAndRender();
    }

    submitBtn.disabled = false;
  }

  // Handle Edit Form Submission
  async function handleEditSubmit(e) {
    e.preventDefault();
    const id = parseInt(document.getElementById('editId').value, 10);
    const nameInput = document.getElementById('editName');
    const phoneInput = document.getElementById('editPhone');
    const emailInput = document.getElementById('editEmail');
    const categoryInput = document.getElementById('editCategory');
    const addressInput = document.getElementById('editAddress');

    const nameErr = document.getElementById('editNameError');
    const phoneErr = document.getElementById('editPhoneError');
    const emailErr = document.getElementById('editEmailError');

    if (!validateContactForm(nameInput, phoneInput, emailInput, nameErr, phoneErr, emailErr)) {
      return;
    }

    const updatedContact = {
      id: id,
      name: nameInput.value.trim(),
      phone: phoneInput.value.trim(),
      email: emailInput.value.trim(),
      address: addressInput.value.trim(),
      category: categoryInput.value
    };

    const submitBtn = document.getElementById('submitEditBtn');
    submitBtn.disabled = true;

    if (state.isServerConnected) {
      try {
        const response = await fetch(`/api/contacts/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedContact)
        });

        if (response.ok) {
          showToast(`Contact "${updatedContact.name}" updated!`, 'success');
          closeModal(elements.editModal);
          await loadContacts();
        } else {
          showToast('Failed to update contact in database', 'error');
        }
      } catch (err) {
        showToast('Error communicating with Java server', 'error');
      }
    } else {
      // Local fallback
      const index = state.contacts.findIndex(c => c.id === id);
      if (index !== -1) {
        state.contacts[index] = updatedContact;
        saveLocalContacts();
        showToast(`Contact "${updatedContact.name}" updated locally!`, 'success');
        closeModal(elements.editModal);
        applyFilterAndRender();
      }
    }

    submitBtn.disabled = false;
  }

  // Handle Delete Confirmation
  async function handleConfirmDelete() {
    if (!state.contactPendingDelete) return;
    const id = state.contactPendingDelete.id;
    const name = state.contactPendingDelete.name;

    elements.confirmDeleteBtn.disabled = true;

    if (state.isServerConnected) {
      try {
        const response = await fetch(`/api/contacts/${id}`, { method: 'DELETE' });
        if (response.ok) {
          showToast(`Contact "${name}" deleted from database`, 'info');
          closeModal(elements.deleteModal);
          state.contactPendingDelete = null;
          await loadContacts();
        } else {
          showToast('Failed to delete contact from database', 'error');
        }
      } catch (err) {
        showToast('Error communicating with Java server', 'error');
      }
    } else {
      // Local fallback
      state.contacts = state.contacts.filter(c => c.id !== id);
      saveLocalContacts();
      showToast(`Contact "${name}" deleted locally`, 'info');
      closeModal(elements.deleteModal);
      state.contactPendingDelete = null;
      applyFilterAndRender();
    }

    elements.confirmDeleteBtn.disabled = false;
  }

  // Event Listeners Initialization
  function initEventListeners() {
    // Open Add Modal
    elements.openAddModalBtn.onclick = openAddModal;
    elements.emptyAddBtn.onclick = openAddModal;

    // Form Submissions
    elements.addForm.onsubmit = handleAddSubmit;
    elements.editForm.onsubmit = handleEditSubmit;
    elements.confirmDeleteBtn.onclick = handleConfirmDelete;

    // Modal Close buttons
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.onclick = () => {
        const modalId = btn.getAttribute('data-close-modal');
        const modal = document.getElementById(modalId);
        if (modal) closeModal(modal);
      };
    });

    // Close on clicking backdrop
    [elements.addModal, elements.editModal, elements.deleteModal].forEach(modal => {
      modal.onclick = (e) => {
        if (e.target === modal) closeModal(modal);
      };
    });

    // Keyboard ESC to close active modal
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        [elements.addModal, elements.editModal, elements.deleteModal].forEach(m => {
          if (m.classList.contains('active')) closeModal(m);
        });
      }
    });

    // Search Input
    elements.searchInput.oninput = (e) => {
      state.searchQuery = e.target.value;
      elements.clearSearchBtn.style.display = state.searchQuery ? 'flex' : 'none';
      applyFilterAndRender();
    };

    elements.clearSearchBtn.onclick = () => {
      elements.searchInput.value = '';
      state.searchQuery = '';
      elements.clearSearchBtn.style.display = 'none';
      elements.searchInput.focus();
      applyFilterAndRender();
    };

    // Category Filter Pills
    elements.categoryPills.querySelectorAll('.pill').forEach(pill => {
      pill.onclick = () => {
        elements.categoryPills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.selectedCategory = pill.getAttribute('data-category');
        applyFilterAndRender();
      };
    });

    // View Switching
    elements.viewCardsBtn.onclick = () => {
      elements.viewCardsBtn.classList.add('active');
      elements.viewTableBtn.classList.remove('active');
      state.currentView = 'cards';
      renderContacts();
    };

    elements.viewTableBtn.onclick = () => {
      elements.viewTableBtn.classList.add('active');
      elements.viewCardsBtn.classList.remove('active');
      state.currentView = 'table';
      renderContacts();
    };
  }

  // Bootstrap Application
  document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadContacts();
  });

})();
