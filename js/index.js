/* ============================================
   index.js — Dashboard page logic
   Depends on: js/shared.js (window.App)
   Handles: modals, drawer, form validation,
   walkthrough tour, chart, edit/delete actions,
   WCAG panel toggle, page-specific init.
   ============================================ */
(function() {
  'use strict';

  var announce = App.announce;
  var trapFocus = App.trapFocus;
  var releaseFocus = App.releaseFocus;

  // ============================================
  // EDIT MODAL
  // ============================================
  var editOverlay = document.getElementById('edit-modal-overlay');
  var editModal = document.getElementById('edit-modal');
  var editTrigger = null;

  var assetData = {
    project_alpha: { name: 'Project Alpha', desc: 'Primary project for document management.', owner: 'alex', tags: 'approved, flagged' },
    project_beta: { name: 'Project Beta', desc: 'Secondary project for internal records.', owner: 'jordan', tags: 'approved, internal' },
    report_monthly: { name: 'Monthly Report', desc: 'Monthly summary dashboard view.', owner: 'sam', tags: 'analytics' },
    project_gamma: { name: 'Project Gamma', desc: 'External data integration project.', owner: 'taylor', tags: 'flagged, external' },
    task_import: { name: 'Data Import', desc: 'Scheduled data import task.', owner: 'alex', tags: 'import' },
    task_sync: { name: 'Report Sync', desc: 'Report synchronization task.', owner: 'jordan', tags: 'sync' },
    task_generate: { name: 'Report Generation', desc: 'Automated report generation task.', owner: 'sam', tags: 'reports' },
  };

  // Form validation helpers
  function showFieldError(fieldId, errorId, message) {
    var field = document.getElementById(fieldId);
    var errorDiv = document.getElementById(errorId);
    var errorText = document.getElementById(errorId + '-text');

    field.classList.add(field.tagName === 'SELECT' ? 'form-select--error' : 'form-input--error');
    field.setAttribute('aria-invalid', 'true');

    var describedby = field.getAttribute('aria-describedby') || '';
    if (describedby.indexOf(errorId) === -1) {
      field.setAttribute('aria-describedby', describedby ? describedby + ' ' + errorId : errorId);
    }

    errorText.textContent = message;
    errorDiv.style.display = 'flex';
  }

  function hideFieldError(fieldId, errorId) {
    var field = document.getElementById(fieldId);
    var errorDiv = document.getElementById(errorId);

    field.classList.remove('form-input--error', 'form-select--error');
    field.setAttribute('aria-invalid', 'false');

    var describedby = field.getAttribute('aria-describedby') || '';
    var ids = describedby.split(/\s+/).filter(function(id) { return id && id !== errorId; });
    if (ids.length > 0) {
      field.setAttribute('aria-describedby', ids.join(' '));
    } else {
      field.removeAttribute('aria-describedby');
    }

    errorDiv.style.display = 'none';
  }

  function validateField(fieldId, errorId, validationFn, errorMessage) {
    var field = document.getElementById(fieldId);
    var value = field.value.trim();

    if (!validationFn(value)) {
      showFieldError(fieldId, errorId, errorMessage);
      return false;
    } else {
      hideFieldError(fieldId, errorId);
      return true;
    }
  }

  function validateEditForm() {
    var nameValid = validateField(
      'edit-name', 'edit-name-error',
      function(v) { return v.length > 0; },
      'Item name is required.'
    );
    var ownerValid = validateField(
      'edit-owner', 'edit-owner-error',
      function(v) { return v.length > 0; },
      'Please select an owner.'
    );
    return nameValid && ownerValid;
  }

  function openModal(assetId) {
    editTrigger = document.activeElement;
    var data = assetData[assetId] || { name: assetId, desc: '', owner: '', tags: '' };

    hideFieldError('edit-name', 'edit-name-error');
    hideFieldError('edit-owner', 'edit-owner-error');

    document.getElementById('edit-name').value = data.name;
    document.getElementById('edit-desc').value = data.desc;
    document.getElementById('edit-owner').value = data.owner;
    document.getElementById('edit-tags').value = data.tags;
    document.getElementById('edit-modal-title').textContent = 'Edit: ' + data.name;

    editOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trapFocus(editModal);

    requestAnimationFrame(function() { document.getElementById('edit-name').focus(); });
    announce('Edit dialog opened for ' + data.name);
  }

  function closeEditModal() {
    editOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    releaseFocus(editModal);
    if (editTrigger) editTrigger.focus();
    announce('Edit dialog closed');
  }

  // Real-time validation on blur
  document.getElementById('edit-name').addEventListener('blur', function() {
    var value = document.getElementById('edit-name').value.trim();
    if (value.length === 0) {
      showFieldError('edit-name', 'edit-name-error', 'Item name is required.');
    } else {
      hideFieldError('edit-name', 'edit-name-error');
    }
  });

  document.getElementById('edit-owner').addEventListener('blur', function() {
    var value = document.getElementById('edit-owner').value;
    if (value.length === 0) {
      showFieldError('edit-owner', 'edit-owner-error', 'Please select an owner.');
    } else {
      hideFieldError('edit-owner', 'edit-owner-error');
    }
  });

  document.getElementById('edit-modal-close').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal-cancel').addEventListener('click', closeEditModal);
  document.getElementById('edit-modal-save').addEventListener('click', function() {
    if (validateEditForm()) {
      announce('Changes saved successfully');
      closeEditModal();
    } else {
      announce('Please fix the errors before saving');
      if (document.getElementById('edit-name').getAttribute('aria-invalid') === 'true') {
        document.getElementById('edit-name').focus();
      } else if (document.getElementById('edit-owner').getAttribute('aria-invalid') === 'true') {
        document.getElementById('edit-owner').focus();
      }
    }
  });
  editOverlay.addEventListener('click', function(e) { if (e.target === editOverlay) closeEditModal(); });
  editOverlay.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeEditModal(); });

  // ============================================
  // DELETE MODAL
  // ============================================
  var deleteOverlay = document.getElementById('delete-modal-overlay');
  var deleteModal = document.getElementById('delete-modal');
  var deleteTrigger = null;

  function openDeleteModal(assetId) {
    deleteTrigger = document.activeElement;
    var data = assetData[assetId] || { name: assetId };
    document.getElementById('delete-asset-name').textContent = data.name;
    deleteOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    trapFocus(deleteModal);
    requestAnimationFrame(function() { document.getElementById('delete-modal-cancel').focus(); });
    announce('Delete confirmation dialog opened for ' + data.name);
  }

  function closeDeleteModal() {
    deleteOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    releaseFocus(deleteModal);
    if (deleteTrigger) deleteTrigger.focus();
    announce('Delete dialog closed');
  }

  document.getElementById('delete-modal-close').addEventListener('click', closeDeleteModal);
  document.getElementById('delete-modal-cancel').addEventListener('click', closeDeleteModal);
  document.getElementById('delete-modal-confirm').addEventListener('click', function() {
    announce('Item deleted');
    closeDeleteModal();
  });
  deleteOverlay.addEventListener('click', function(e) { if (e.target === deleteOverlay) closeDeleteModal(); });
  deleteOverlay.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeDeleteModal(); });

  // ============================================
  // DRAWER — open from list items, focus trap
  // ============================================
  var drawerOverlay = document.getElementById('drawer-overlay');
  var drawer = document.getElementById('asset-drawer');
  var drawerTrigger = null;

  var drawerDetails = {
    project_alpha: { title: 'Project Alpha', subtitle: 'Document · Source A', type: 'Document', source: 'Source A', schema: 'Group 1', rows: '1,247', updated: '2 hours ago', quality: '96%', desc: 'Primary project for document management and team collaboration.' },
    project_beta: { title: 'Project Beta', subtitle: 'Document · Source B', type: 'Document', source: 'Source B', schema: 'Group 2', rows: '8,400', updated: '30 minutes ago', quality: '98%', desc: 'Secondary project for internal records and reporting.' },
    report_monthly: { title: 'Monthly Report', subtitle: 'Dashboard · Source B', type: 'Dashboard', source: 'Source B', schema: 'Group 3', rows: '2,400', updated: '1 day ago', quality: '94%', desc: 'Monthly summary dashboard aggregating key project metrics.' },
    project_gamma: { title: 'Project Gamma', subtitle: 'Document · Source C', type: 'Document', source: 'Source C', schema: 'Group 4', rows: '42,000', updated: '5 minutes ago', quality: '89%', desc: 'External data integration project for cross-team collaboration.' },
    task_import: { title: 'Data Import', subtitle: 'Task · Automated', type: 'Task', source: 'Scheduler', schema: 'N/A', rows: 'N/A', updated: '15 minutes ago', quality: 'N/A', desc: 'Scheduled task to import data from external sources.' },
    task_sync: { title: 'Report Sync', subtitle: 'Task · Automated', type: 'Task', source: 'Scheduler', schema: 'N/A', rows: 'N/A', updated: '1 hour ago', quality: 'N/A', desc: 'Synchronizes report data across project environments.' },
    task_generate: { title: 'Report Generation', subtitle: 'Task · Automated', type: 'Task', source: 'Scheduler', schema: 'N/A', rows: 'N/A', updated: '4 minutes ago', quality: 'N/A', desc: 'Automated report generation for weekly summaries.' },
  };

  // Initialize drawer tabs — get switchTab function
  var drawerTabs = App.initDrawerTabs('.drawer__tabs');
  var switchTab = drawerTabs.switchTab;

  function openDrawer(assetId) {
    drawerTrigger = document.activeElement;
    var data = drawerDetails[assetId] || { title: assetId, subtitle: '' };

    document.getElementById('drawer-title').textContent = data.title || assetId;
    document.getElementById('drawer-subtitle').textContent = data.subtitle || '';
    document.getElementById('detail-type').textContent = data.type || '';
    document.getElementById('detail-source').textContent = data.source || '';
    document.getElementById('detail-schema').textContent = data.schema || '';
    document.getElementById('detail-rows').textContent = data.rows || '';
    document.getElementById('detail-updated').textContent = data.updated || '';
    document.getElementById('detail-quality').textContent = data.quality || '';
    document.getElementById('detail-desc').textContent = data.desc || '';

    switchTab('general');

    drawerOverlay.setAttribute('aria-hidden', 'false');
    drawer.setAttribute('aria-hidden', 'false');
    drawer.style.display = 'flex';
    requestAnimationFrame(function() {
      drawerOverlay.classList.add('drawer-overlay--visible');
      drawer.classList.add('drawer--visible');
    });
    document.body.style.overflow = 'hidden';
    trapFocus(drawer);
    requestAnimationFrame(function() { document.getElementById('drawer-close').focus(); });
    announce('Item details drawer opened for ' + (data.title || assetId));
  }

  function closeDrawer() {
    drawerOverlay.classList.remove('drawer-overlay--visible');
    drawer.classList.remove('drawer--visible');
    drawer.addEventListener('transitionend', function handler() {
      drawer.removeEventListener('transitionend', handler);
      drawerOverlay.setAttribute('aria-hidden', 'true');
      drawer.setAttribute('aria-hidden', 'true');
      drawer.style.display = 'none';
    }, { once: true });
    document.body.style.overflow = '';
    releaseFocus(drawer);
    if (drawerTrigger) drawerTrigger.focus();
    announce('Drawer closed');
  }

  document.getElementById('drawer-close').addEventListener('click', closeDrawer);
  drawerOverlay.addEventListener('click', closeDrawer);
  drawer.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeDrawer(); });

  // ============================================
  // EDIT / DELETE ACTION BUTTONS (event delegation)
  // ============================================
  var editBtns = document.querySelectorAll('.action-edit');
  Array.prototype.forEach.call(editBtns, function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openModal(btn.getAttribute('data-asset'));
    });
    btn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
    });
  });

  var deleteBtns = document.querySelectorAll('.action-delete');
  Array.prototype.forEach.call(deleteBtns, function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openDeleteModal(btn.getAttribute('data-asset'));
    });
    btn.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
    });
  });

  // Disabled buttons should also stop propagation
  var disabledBtns = document.querySelectorAll('.data-list__actions .icon-btn[aria-disabled="true"]');
  Array.prototype.forEach.call(disabledBtns, function(btn) {
    btn.addEventListener('click', function(e) { e.stopPropagation(); });
  });

  // ============================================
  // LIST ITEMS → open drawer
  // ============================================
  var listItems = document.querySelectorAll('.data-list__item');
  Array.prototype.forEach.call(listItems, function(item) {
    item.addEventListener('click', function(e) {
      if (e.target.closest('.data-list__actions')) return;
      var assetId = item.getAttribute('data-asset');
      if (assetId) openDrawer(assetId);
    });
    item.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        if (e.target.closest('.data-list__actions')) return;
        e.preventDefault();
        var assetId = item.getAttribute('data-asset');
        if (assetId) openDrawer(assetId);
      }
    });
  });

  // ============================================
  // WCAG PANEL TOGGLE
  // ============================================
  var wcagToggle = document.getElementById('wcag-toggle');
  var wcagPanel = document.getElementById('wcag-panel');

  wcagToggle.addEventListener('click', function() {
    var open = wcagPanel.getAttribute('aria-hidden') === 'false';
    wcagPanel.setAttribute('aria-hidden', open ? 'true' : 'false');
    wcagToggle.setAttribute('aria-expanded', open ? 'false' : 'true');
  });

  document.addEventListener('click', function(e) {
    if (!wcagToggle.contains(e.target) && !wcagPanel.contains(e.target)) {
      wcagPanel.setAttribute('aria-hidden', 'true');
      wcagToggle.setAttribute('aria-expanded', 'false');
    }
  });

  // ============================================
  // WALKTHROUGH OVERLAY
  // ============================================
  (function() {
    var overlay = document.getElementById('wt-overlay');
    var spotlight = document.getElementById('wt-spotlight');
    var card = document.getElementById('wt-card');
    var tourBtn = document.getElementById('wt-tour-btn');
    var closeBtn = document.getElementById('wt-close');
    var prevBtn = document.getElementById('wt-prev');
    var nextBtn = document.getElementById('wt-next');
    var stepCounter = document.getElementById('wt-step-counter');
    var wcagTag = document.getElementById('wt-wcag-tag');
    var titleEl = document.getElementById('wt-title');
    var descEl = document.getElementById('wt-desc');
    var impactEl = document.getElementById('wt-impact');
    var srOutput = document.getElementById('wt-sr-output');
    var progressEl = document.getElementById('wt-progress');

    var currentStep = 0;
    var walkthroughActive = false;

    var steps = [
      {
        target: '.skip-links',
        wcag: '2.4.1',
        title: 'Skip Links & Landmarks',
        description: 'This page provides 5 skip links that become visible on keyboard focus, letting users jump past repeated navigation directly to content. Three semantic landmarks (banner, navigation, main) structure the page for screen reader rotor menus.',
        impact: 'Without skip links, keyboard users must Tab through every header element before reaching page content.',
        srOutput: 'navigation "Skip links"\n\u251C\u2500\u2500 link "Skip to main content"\n\u251C\u2500\u2500 link "Skip to navigation"\n\u251C\u2500\u2500 link "Skip to search"\n\u251C\u2500\u2500 link "Skip to projects"\n\u2514\u2500\u2500 link "Skip to tasks"',
        onEnter: function() { var el = document.querySelector('.skip-link'); if (el) el.classList.add('skip-link--visible'); },
        onLeave: function() { var el = document.querySelector('.skip-link'); if (el) el.classList.remove('skip-link--visible'); }
      },
      {
        target: '.metric-card .has-tooltip',
        wcag: '1.3.1',
        title: 'Readable Tooltips',
        description: 'Each info icon uses a <span> with role="tooltip" that appears on both hover and keyboard focus via :focus-within. The trigger button links to the tooltip text with aria-describedby, so screen readers announce the tooltip content automatically when the button receives focus \u2014 no hover required.',
        impact: 'Without role="tooltip" and aria-describedby, tooltip text is only available on mouse hover \u2014 keyboard and screen reader users never see or hear the extra context.',
        srOutput: 'button "About total items metric"\n  described by: "Count of all registered\n  items across projects"\n\n  role=tooltip ensures AT announces\n  the description on focus.'
      },
      {
        target: '.action-edit',
        wcag: '4.1.2',
        title: 'Icon Button with Accessible Name',
        description: 'Every icon-only button has a descriptive aria-label so screen readers announce its purpose. The SVG icon is hidden from assistive tech with aria-hidden="true".',
        impact: 'Without aria-label, screen readers announce just "button" \u2014 users have no idea what it does.',
        srOutput: 'button "Edit Project Alpha"\n     \u2193 without aria-label:\nbutton ""'
      },
      {
        target: 'button[aria-disabled="true"][aria-label*="Cannot delete Monthly"]',
        wcag: '4.1.2',
        title: 'Disabled Button with Reason',
        description: 'This delete button uses aria-disabled="true" instead of the HTML disabled attribute. It stays in the tab order so screen reader users discover it, and its aria-label explains why it\u2019s disabled.',
        impact: 'The native disabled attribute removes the element from tab order \u2014 screen reader users never know it exists or why they can\u2019t act.',
        srOutput: 'button "Cannot delete Monthly Report\n  \u2014 item is protected by admin\n  policy" (dimmed)'
      },
      {
        target: '.data-list__item',
        spotlightTarget: '#asset-drawer',
        wcag: '2.4.3',
        title: 'Focus Trapping in Drawer',
        description: 'Clicking this row opens a details drawer. Focus is immediately trapped inside \u2014 Tab cycles only through drawer controls (close button, tabs, tab content). Escape closes the drawer and returns focus to this row.',
        impact: 'Without focus trapping, keyboard users Tab behind the overlay into invisible content with no way back.',
        onEnter: function() {
          var d = document.getElementById('asset-drawer');
          var dOverlay = document.getElementById('drawer-overlay');
          document.getElementById('drawer-title').textContent = 'Project Alpha';
          document.getElementById('drawer-subtitle').textContent = 'Main workspace project';
          switchTab('general');
          dOverlay.setAttribute('aria-hidden', 'false');
          d.setAttribute('aria-hidden', 'false');
          d.style.display = 'flex';
          d.style.zIndex = '3001';
          dOverlay.style.zIndex = '3000';
          requestAnimationFrame(function() {
            dOverlay.classList.add('drawer-overlay--visible');
            d.classList.add('drawer--visible');
          });
        },
        onLeave: function() {
          var d = document.getElementById('asset-drawer');
          var dOverlay = document.getElementById('drawer-overlay');
          dOverlay.classList.remove('drawer-overlay--visible');
          d.classList.remove('drawer--visible');
          dOverlay.setAttribute('aria-hidden', 'true');
          d.setAttribute('aria-hidden', 'true');
          d.style.display = 'none';
          d.style.zIndex = '';
          dOverlay.style.zIndex = '';
        },
        srOutput: 'dialog "Project Alpha"\n\u251C\u2500\u2500 button "Close dialog"\n\u251C\u2500\u2500 tablist\n\u2502   \u251C\u2500\u2500 tab "General" (selected)\n\u2502   \u251C\u2500\u2500 tab "Properties"\n\u2502   \u2514\u2500\u2500 tab "People"\n\u2514\u2500\u2500 tabpanel "General"\n     \u2514\u2500\u2500 [content, focus trapped]'
      },
      {
        target: '.chart-area',
        wcag: '1.1.1',
        title: 'Alternative Content for Charts',
        description: 'The visual bar chart is wrapped in aria-hidden="true" so screen readers skip it entirely. Directly below, a semantically structured <table> with a descriptive <caption> provides the same data in a format screen readers can navigate row by row.',
        impact: 'Without a text alternative, screen reader users get no information from visual charts \u2014 the data is completely invisible to them.',
        srOutput: 'table "Weekly activity: completed vs pending"\n\u251C\u2500\u2500 row: Day | Completed | Pending\n\u251C\u2500\u2500 row: Monday | 88% | 6%\n\u251C\u2500\u2500 row: Tuesday | 92% | 4%\n\u251C\u2500\u2500 row: Wednesday | 85% | 10%\n\u251C\u2500\u2500 row: Thursday | 95% | 3%\n\u2514\u2500\u2500 row: Friday | 91% | 5%'
      },
      {
        target: '.action-edit',
        spotlightTarget: '#edit-modal',
        wcag: '3.3.1',
        title: 'Modal with Focus Management',
        description: 'The edit modal traps focus, labels required fields with aria-required, and uses role="alert" to announce validation errors. On close, focus returns to the button that opened it.',
        onEnter: function() {
          var ov = document.getElementById('edit-modal-overlay');
          var modal = document.getElementById('edit-modal');
          ov.setAttribute('aria-hidden', 'false');
          ov.style.background = 'transparent';
          ov.style.backdropFilter = 'none';
          ov.style.zIndex = '3002';
          ov.style.pointerEvents = 'none';
          modal.style.zIndex = '3002';
          modal.style.pointerEvents = 'none';
        },
        onLeave: function() {
          var ov = document.getElementById('edit-modal-overlay');
          var modal = document.getElementById('edit-modal');
          ov.setAttribute('aria-hidden', 'true');
          ov.style.background = '';
          ov.style.backdropFilter = '';
          ov.style.zIndex = '';
          ov.style.pointerEvents = '';
          modal.style.zIndex = '';
          modal.style.pointerEvents = '';
        },
        impact: 'Without focus return, closing a modal leaves the user at the top of the page \u2014 losing their place in a long document.',
        srOutput: 'dialog "Edit Item"\n\u251C\u2500\u2500 textbox "Item Name *" (required)\n\u251C\u2500\u2500 textbox "Description"\n\u251C\u2500\u2500 combobox "Owner *" (required)\n\u251C\u2500\u2500 textbox "Tags"\n\u251C\u2500\u2500 button "Cancel"\n\u2514\u2500\u2500 button "Save Changes"\nOn validation error:\n  alert "Item name is required"'
      },
      {
        target: '#live-region',
        wcag: '4.1.3',
        title: 'Live Region Announcements',
        description: 'A hidden live region with aria-live="polite" silently feeds announcements to screen readers whenever the UI changes \u2014 modals open, tabs switch, landmarks are reached. Users never need to visually discover what happened.',
        impact: 'Without live regions, screen reader users miss every dynamic UI update entirely.',
        srOutput: 'status (live: polite)\nAnnounced:\n  "Edit dialog opened for Project Alpha"\n  "General tab selected"\n  "Navigation landmark"\n  "Drawer closed"'
      }
    ];

    function positionSpotlightAndCard(targetEl) {
      var rect = targetEl.getBoundingClientRect();
      var pad = 8;

      var offScreen = rect.right < 0 || rect.left > window.innerWidth
        || rect.bottom < 0 || rect.top > window.innerHeight;
      if (offScreen) {
        spotlight.style.top = '-9999px';
        spotlight.style.left = '-9999px';
        spotlight.style.width = '0';
        spotlight.style.height = '0';
        var cardW = Math.min(420, window.innerWidth - 32);
        var cardH = card.offsetHeight || 400;
        card.style.left = ((window.innerWidth - cardW) / 2) + 'px';
        card.style.top = ((window.innerHeight - cardH) / 2) + 'px';
        card.style.right = 'auto';
        return;
      }

      spotlight.style.top = (rect.top - pad + window.scrollY) + 'px';
      spotlight.style.left = (rect.left - pad) + 'px';
      spotlight.style.width = (rect.width + pad * 2) + 'px';
      spotlight.style.height = (rect.height + pad * 2) + 'px';

      var viewTop = window.scrollY;
      var viewBottom = viewTop + window.innerHeight;
      var elTop = rect.top + window.scrollY;
      var elBottom = elTop + rect.height;
      if (elTop < viewTop + 60 || elBottom > viewBottom - 60) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(function() {
          var r = targetEl.getBoundingClientRect();
          spotlight.style.top = (r.top - pad + window.scrollY) + 'px';
          spotlight.style.left = (r.left - pad) + 'px';
          spotlight.style.width = (r.width + pad * 2) + 'px';
          spotlight.style.height = (r.height + pad * 2) + 'px';
          positionCard(r);
        }, 400);
        return;
      }

      positionCard(rect);
    }

    function positionCard(rect) {
      var cardW = Math.min(420, window.innerWidth - 32);
      var cardH = card.offsetHeight || 400;
      var gap = 16;

      if (rect.right + gap + cardW < window.innerWidth - 16) {
        card.style.left = (rect.right + gap) + 'px';
        card.style.top = Math.max(16, Math.min(rect.top, window.innerHeight - cardH - 16)) + 'px';
        card.style.right = 'auto';
        return;
      }
      if (rect.left - gap - cardW > 16) {
        card.style.left = (rect.left - gap - cardW) + 'px';
        card.style.top = Math.max(16, Math.min(rect.top, window.innerHeight - cardH - 16)) + 'px';
        card.style.right = 'auto';
        return;
      }
      card.style.left = Math.max(16, Math.min(rect.left, window.innerWidth - cardW - 16)) + 'px';
      card.style.top = Math.min(rect.bottom + gap, window.innerHeight - cardH - 16) + 'px';
      card.style.right = 'auto';
    }

    function renderStep(index) {
      var step = steps[index];
      var targetEl = document.querySelector(step.target);
      if (!targetEl) return;

      if (steps[currentStep] && steps[currentStep].onLeave) steps[currentStep].onLeave();
      currentStep = index;
      if (step.onEnter) step.onEnter();

      stepCounter.textContent = (index + 1) + ' / ' + steps.length;
      wcagTag.textContent = step.wcag;
      titleEl.textContent = step.title;
      descEl.textContent = step.description;
      impactEl.textContent = step.impact;
      srOutput.textContent = step.srOutput;

      prevBtn.style.display = index === 0 ? 'none' : '';
      nextBtn.textContent = index === steps.length - 1 ? 'Close' : 'Next';

      progressEl.innerHTML = '';
      for (var i = 0; i < steps.length; i++) {
        var dot = document.createElement('span');
        dot.className = 'wt-card__dot' + (i === index ? ' wt-card__dot--active' : '');
        progressEl.appendChild(dot);
      }

      positionSpotlightAndCard(targetEl);

      if (step.spotlightTarget) {
        setTimeout(function() {
          var spotEl = document.querySelector(step.spotlightTarget);
          if (spotEl) positionSpotlightAndCard(spotEl);
        }, 350);
      }

      announce('Step ' + (index + 1) + ' of ' + steps.length + ': ' + step.title);
    }

    function startWalkthrough() {
      wcagPanel.setAttribute('aria-hidden', 'true');
      wcagToggle.setAttribute('aria-expanded', 'false');

      walkthroughActive = true;
      overlay.setAttribute('aria-hidden', 'false');
      overlay.style.display = 'block';
      document.body.style.overflow = 'hidden';

      renderStep(0);
      trapFocus(card);
      requestAnimationFrame(function() { closeBtn.focus(); });
    }

    function endWalkthrough() {
      if (steps[currentStep] && steps[currentStep].onLeave) steps[currentStep].onLeave();
      walkthroughActive = false;
      overlay.setAttribute('aria-hidden', 'true');
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      releaseFocus(card);
      tourBtn.focus();
      announce('Tour ended');
    }

    tourBtn.addEventListener('click', startWalkthrough);
    closeBtn.addEventListener('click', endWalkthrough);

    nextBtn.addEventListener('click', function() {
      if (currentStep < steps.length - 1) {
        renderStep(currentStep + 1);
      } else {
        endWalkthrough();
      }
    });

    prevBtn.addEventListener('click', function() {
      if (currentStep > 0) {
        renderStep(currentStep - 1);
      }
    });

    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) endWalkthrough();
    });

    document.addEventListener('keydown', function(e) {
      if (!walkthroughActive) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        endWalkthrough();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentStep < steps.length - 1) renderStep(currentStep + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentStep > 0) renderStep(currentStep - 1);
      }
    }, true);

    window.addEventListener('resize', function() {
      if (!walkthroughActive) return;
      var targetEl = document.querySelector(steps[currentStep].target);
      if (targetEl) positionSpotlightAndCard(targetEl);
    });
  })();

  // ============================================
  // WELCOME MODAL — shown on first page load
  // ============================================
  var welcomeOverlay = document.getElementById('welcome-modal-overlay');
  var welcomeModal = document.getElementById('welcome-modal');

  (function initWelcomeModal() {
    if (!welcomeOverlay || !welcomeModal) return;

    function openWelcome() {
      welcomeOverlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      trapFocus(welcomeModal);
      requestAnimationFrame(function() {
        var closeBtn = document.getElementById('welcome-modal-close');
        if (closeBtn) closeBtn.focus();
      });
      announce('Welcome guide opened');
    }

    function closeWelcome() {
      localStorage.setItem('wcag-demo-welcome-seen', '1');
      welcomeOverlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      releaseFocus(welcomeModal);
      var firstNav = document.querySelector('.nav-item');
      if (firstNav) firstNav.focus();
      announce('Welcome guide closed. Use Tab to navigate, or press ? for keyboard shortcuts.');
    }

    document.getElementById('welcome-modal-close').addEventListener('click', closeWelcome);
    document.getElementById('welcome-modal-start').addEventListener('click', closeWelcome);
    welcomeOverlay.addEventListener('click', function(e) {
      if (e.target === welcomeOverlay) closeWelcome();
    });
    welcomeModal.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeWelcome();
      }
    });

    var guideBtn = document.getElementById('welcome-guide-btn');
    if (guideBtn) {
      guideBtn.addEventListener('click', function() {
        wcagPanel.setAttribute('aria-hidden', 'true');
        wcagToggle.setAttribute('aria-expanded', 'false');
        openWelcome();
      });
    }

    if (!localStorage.getItem('wcag-demo-welcome-seen')) {
      openWelcome();
    }
  })();

  // ============================================
  // INIT — call shared utilities
  // ============================================
  App.initDropdowns();
  App.initTooltips();
  App.initSearchShortcut();
  App.initKeyboardHelpToggle();

  // F6 landmark cycling — skip when modal/drawer/walkthrough is open
  App.initLandmarkCycling(
    [
      document.querySelector('[role="banner"]'),
      document.getElementById('main-nav'),
      document.getElementById('main-content')
    ],
    ['Header', 'Navigation', 'Main content'],
    function() {
      return editOverlay.getAttribute('aria-hidden') === 'false'
        || deleteOverlay.getAttribute('aria-hidden') === 'false'
        || drawer.getAttribute('aria-hidden') === 'false'
        || document.getElementById('wt-overlay').getAttribute('aria-hidden') === 'false'
        || (welcomeOverlay && welcomeOverlay.getAttribute('aria-hidden') === 'false');
    }
  );
})();
