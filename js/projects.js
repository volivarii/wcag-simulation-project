/* ============================================
   projects.js — Projects search page logic
   Depends on: js/shared.js (window.App)
   Handles: filters, range slider, checkbox/toggle
   state, rendering, select-all, sorting, bulk
   actions, drawer open/close, page-specific init.
   ============================================ */
(function() {
  'use strict';

  var announce = App.announce;
  var trapFocus = App.trapFocus;
  var releaseFocus = App.releaseFocus;

  // ============================================
  // MOCK DATA
  // ============================================
  var projectData = [
    { id: 1, name: 'Project Alpha', type: 'document', typeCode: 'DC', shared: true, completion: 85, desc: 'Primary project for document management and cross-team collaboration across all departments.', tags: ['Approved', 'Internal'], updated: '2025-02-14', suggested: false },
    { id: 2, name: 'Project Beta', type: 'document', typeCode: 'DC', shared: true, completion: 72, desc: 'Internal records management project with automated workflows and approval chains.', tags: ['Approved', 'Internal'], updated: '2025-02-13', suggested: true },
    { id: 3, name: 'Weekly Status Report', type: 'report', typeCode: 'RP', shared: false, completion: 95, desc: 'Automated weekly status report aggregating task progress, blockers, and team velocity metrics.', tags: ['Recurring', 'Analytics'], updated: '2025-02-15', suggested: false },
    { id: 4, name: 'Monthly Report', type: 'dashboard', typeCode: 'DB', shared: true, completion: 100, desc: 'Monthly summary dashboard showing key project metrics, resource utilization, and milestone tracking.', tags: ['Analytics', 'Executive'], updated: '2025-02-10', suggested: false },
    { id: 5, name: 'Q1 Planning Document', type: 'document', typeCode: 'DC', shared: false, completion: 45, desc: 'Quarterly planning document outlining objectives, resource allocation, and deliverable timelines.', tags: ['Planning', 'Strategy'], updated: '2025-02-08', suggested: true },
    { id: 6, name: 'Data Import Task', type: 'task', typeCode: 'TK', shared: true, completion: 60, desc: 'Scheduled task for importing records from external sources with validation and error handling.', tags: ['Import', 'Automated'], updated: '2025-02-12', suggested: false },
    { id: 7, name: 'Report Sync Task', type: 'task', typeCode: 'TK', shared: true, completion: 88, desc: 'Synchronization task keeping report data consistent across project environments and teams.', tags: ['Sync', 'Automated'], updated: '2025-02-15', suggested: false },
    { id: 8, name: 'Project Gamma', type: 'document', typeCode: 'DC', shared: false, completion: 78, desc: 'External collaboration project for cross-team document sharing and review workflows.', tags: ['Flagged', 'External'], updated: '2025-02-11', suggested: true },
    { id: 9, name: 'Team Performance Dashboard', type: 'dashboard', typeCode: 'DB', shared: true, completion: 92, desc: 'Real-time team performance dashboard tracking task completion rates, response times, and workload distribution.', tags: ['Team', 'Metrics'], updated: '2025-02-09', suggested: false },
    { id: 10, name: 'Resource Allocation Dashboard', type: 'dashboard', typeCode: 'DB', shared: true, completion: 68, desc: 'Resource allocation overview showing team capacity, project assignments, and availability forecasts.', tags: ['Resources', 'Planning'], updated: '2025-02-14', suggested: false },
    { id: 11, name: 'CRM Integration', type: 'integration', typeCode: 'IN', shared: true, completion: 100, desc: 'Integration module connecting the project workspace with external CRM for bi-directional record sync.', tags: ['CRM', 'External'], updated: '2025-01-28', suggested: false },
    { id: 12, name: 'Quarterly Review Report', type: 'report', typeCode: 'RP', shared: false, completion: 55, desc: 'End-of-quarter review report with KPI summaries, milestone achievements, and improvement recommendations.', tags: ['Quarterly', 'Review'], updated: '2025-02-06', suggested: true },
    { id: 13, name: 'Report Generation Task', type: 'task', typeCode: 'TK', shared: true, completion: 30, desc: 'Automated task for generating weekly and monthly reports from aggregated project activity data.', tags: ['Reports', 'Automated'], updated: '2025-02-05', suggested: false },
    { id: 14, name: 'Onboarding Checklist Template', type: 'template', typeCode: 'TM', shared: true, completion: 98, desc: 'Reusable onboarding template with task assignments, milestone checkpoints, and progress tracking.', tags: ['Onboarding', 'Template'], updated: '2025-02-15', suggested: false },
    { id: 15, name: 'Legacy Project Archive', type: 'archive', typeCode: 'AR', shared: false, completion: 42, desc: 'Archived collection of completed legacy projects retained for reference and audit purposes.', tags: ['Archive', 'Legacy'], updated: '2025-02-07', suggested: true },
  ];

  var typeBadgeColors = {
    'DC': '#525252', 'DB': '#6B6B6B', 'TK': '#3D3D3D', 'RP': '#757575',
    'IN': '#4A4A4A', 'TM': '#5C5C5C', 'AR': '#8A8A8A'
  };

  // ============================================
  // DRAWER — open/close with focus trap
  // ============================================
  var drawerOverlay = document.getElementById('drawer-overlay');
  var drawer = document.getElementById('project-drawer');
  var drawerTrigger = null;

  var drawerTabs = App.initDrawerTabs('.drawer__tabs');
  var switchTab = drawerTabs.switchTab;

  function formatDate(dateStr) {
    var date = new Date(dateStr);
    var now = new Date();
    var diff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'today';
    if (diff === 1) return 'yesterday';
    if (diff < 7) return diff + ' days ago';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  function openDrawer(itemId) {
    drawerTrigger = document.activeElement;
    var item = projectData.find(function(p) { return p.id === itemId; });
    if (!item) return;

    document.getElementById('drawer-title').textContent = item.name;
    var typeName = item.type.charAt(0).toUpperCase() + item.type.slice(1);
    document.getElementById('drawer-subtitle').textContent = typeName + (item.shared ? ' \u00B7 Shared' : '');
    document.getElementById('detail-type').textContent = typeName;
    document.getElementById('detail-completion').textContent = item.completion + '%';
    document.getElementById('detail-shared').textContent = item.shared ? 'Yes' : 'No';
    document.getElementById('detail-updated').textContent = formatDate(item.updated);
    document.getElementById('detail-tags').textContent = item.tags.join(', ');
    document.getElementById('detail-desc').textContent = item.desc;

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
    announce('Project details drawer opened for ' + item.name);
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
  // RENDER RESULTS
  // ============================================
  var filteredData = projectData.slice();

  function renderResults(data) {
    var list = document.getElementById('results-list');
    var countEl = document.getElementById('results-count');
    countEl.textContent = '(' + data.length + ' result' + (data.length !== 1 ? 's' : '') + ')';

    if (data.length === 0) {
      list.innerHTML = '<li style="padding: 40px; text-align: center; color: var(--color-text-muted); font-size: 14px;">No results match your filters.</li>';
      return;
    }

    list.innerHTML = data.map(function(item) {
      return '<li class="result-card" role="listitem" data-item-id="' + item.id + '" tabindex="0" style="cursor:pointer;" aria-label="' + item.name + ', ' + item.type.replace(/-/g, ' ') + ', ' + item.completion + '% complete">' +
        '<div class="result-card__checkbox">' +
          '<input type="checkbox" class="result-checkbox" data-id="' + item.id + '" aria-label="Select ' + item.name + '">' +
        '</div>' +
        '<div class="result-card__badges">' +
          '<span class="result-card__type-badge" style="background: ' + (typeBadgeColors[item.typeCode] || '#4A4A4A') + '" title="' + item.type.replace(/-/g, ' ') + '">' + item.typeCode + '</span>' +
          (item.shared ? '<span class="result-card__shared-badge">Shared</span>' : '') +
        '</div>' +
        '<div class="result-card__body">' +
          '<div class="result-card__title-row">' +
            '<a href="#" class="result-card__title" onclick="event.preventDefault()">' + item.name + '</a>' +
          '</div>' +
          '<div class="result-card__progress">' +
            '<div class="progress-bar" role="progressbar" aria-valuenow="' + item.completion + '" aria-valuemin="0" aria-valuemax="100" aria-label="Completion: ' + item.completion + '%">' +
              '<div class="progress-bar__fill" style="width: ' + item.completion + '%"></div>' +
            '</div>' +
            '<span class="progress-bar__label">' + item.completion + '%</span>' +
          '</div>' +
          '<p class="result-card__desc">' + item.desc + '</p>' +
          '<div class="result-card__meta">' +
            item.tags.map(function(tag) { return '<span class="result-card__tag">' + tag + '</span>'; }).join('') +
            '<span class="result-card__date">Updated ' + formatDate(item.updated) + '</span>' +
          '</div>' +
        '</div>' +
      '</li>';
    }).join('');

    bindResultCheckboxes();
    bindResultCardClicks();
  }

  // ============================================
  // FILTERING
  // ============================================
  function applyFilters() {
    var minVal = parseInt(document.getElementById('range-min').value);
    var maxVal = parseInt(document.getElementById('range-max').value);

    var checkedTypes = [];
    var checkboxes = document.querySelectorAll('#item-type-list input[type="checkbox"]');
    Array.prototype.forEach.call(checkboxes, function(cb) {
      if (cb.checked) checkedTypes.push(cb.value);
    });

    var suggestionsOnly = document.getElementById('suggestions-toggle').getAttribute('aria-checked') === 'true';

    filteredData = projectData.filter(function(item) {
      if (item.completion < minVal || item.completion > maxVal) return false;
      if (checkedTypes.length > 0 && checkedTypes.indexOf(item.type) === -1) return false;
      if (suggestionsOnly && !item.suggested) return false;
      return true;
    });

    sortResults();
    renderResults(filteredData);
    document.getElementById('range-count').textContent = filteredData.length + ' results';
    announce(filteredData.length + ' results match your filters');

    var selectAll = document.getElementById('select-all');
    selectAll.checked = false;
    selectAll.indeterminate = false;
    updateBulkActions();
  }

  // ============================================
  // SORTING
  // ============================================
  function sortResults() {
    var sortVal = document.getElementById('sort-select').value;
    switch (sortVal) {
      case 'name-asc':
        filteredData.sort(function(a, b) { return a.name.localeCompare(b.name); });
        break;
      case 'name-desc':
        filteredData.sort(function(a, b) { return b.name.localeCompare(a.name); });
        break;
      case 'date-desc':
        filteredData.sort(function(a, b) { return new Date(b.updated) - new Date(a.updated); });
        break;
      case 'date-asc':
        filteredData.sort(function(a, b) { return new Date(a.updated) - new Date(b.updated); });
        break;
      case 'completion-desc':
        filteredData.sort(function(a, b) { return b.completion - a.completion; });
        break;
      case 'completion-asc':
        filteredData.sort(function(a, b) { return a.completion - b.completion; });
        break;
      default:
        filteredData.sort(function(a, b) { return a.id - b.id; });
    }
  }

  document.getElementById('sort-select').addEventListener('change', function() {
    sortResults();
    renderResults(filteredData);
    announce('Results sorted by ' + document.getElementById('sort-select').selectedOptions[0].text);
  });

  // ============================================
  // SELECT ALL & BULK ACTIONS
  // ============================================
  function bindResultCheckboxes() {
    var cbs = document.querySelectorAll('.result-checkbox');
    Array.prototype.forEach.call(cbs, function(cb) {
      cb.addEventListener('change', updateSelectAllState);
    });
  }

  function bindResultCardClicks() {
    var cards = document.querySelectorAll('.result-card');
    Array.prototype.forEach.call(cards, function(card) {
      card.addEventListener('click', function(e) {
        if (e.target.closest('.result-card__checkbox') || e.target.closest('.result-card__title')) return;
        var itemId = parseInt(card.getAttribute('data-item-id'));
        if (itemId) openDrawer(itemId);
      });
      card.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.target.closest('.result-card__checkbox') || e.target.closest('.result-card__title')) return;
          e.preventDefault();
          var itemId = parseInt(card.getAttribute('data-item-id'));
          if (itemId) openDrawer(itemId);
        }
      });
    });
  }

  function updateSelectAllState() {
    var checkboxes = document.querySelectorAll('.result-checkbox');
    var checked = document.querySelectorAll('.result-checkbox:checked');
    var selectAll = document.getElementById('select-all');

    if (checked.length === 0) {
      selectAll.checked = false;
      selectAll.indeterminate = false;
    } else if (checked.length === checkboxes.length) {
      selectAll.checked = true;
      selectAll.indeterminate = false;
    } else {
      selectAll.checked = false;
      selectAll.indeterminate = true;
    }

    updateBulkActions();
  }

  function updateBulkActions() {
    var checked = document.querySelectorAll('.result-checkbox:checked');
    var hasSelection = checked.length > 0;

    ['bulk-edit', 'bulk-move', 'bulk-delete', 'bulk-export'].forEach(function(id) {
      document.getElementById(id).setAttribute('aria-disabled', hasSelection ? 'false' : 'true');
    });

    if (hasSelection) {
      announce(checked.length + ' item' + (checked.length !== 1 ? 's' : '') + ' selected');
    }
  }

  document.getElementById('select-all').addEventListener('change', function(e) {
    var checked = e.target.checked;
    var cbs = document.querySelectorAll('.result-checkbox');
    Array.prototype.forEach.call(cbs, function(cb) { cb.checked = checked; });
    updateBulkActions();
    announce(checked ? 'All ' + cbs.length + ' items selected' : 'Selection cleared');
  });

  // ============================================
  // FILTER GROUP COLLAPSE / EXPAND
  // ============================================
  var toggleBtns = document.querySelectorAll('.filter-group__toggle');
  Array.prototype.forEach.call(toggleBtns, function(toggle) {
    toggle.addEventListener('click', function() {
      var expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      var contentId = toggle.getAttribute('aria-controls');
      var content = document.getElementById(contentId);
      content.setAttribute('aria-hidden', expanded ? 'true' : 'false');
      announce(expanded ? 'Filter collapsed' : 'Filter expanded');
    });
  });

  // ============================================
  // RANGE SLIDER
  // ============================================
  var rangeMin = document.getElementById('range-min');
  var rangeMax = document.getElementById('range-max');
  var rangeFill = document.getElementById('range-fill');
  var rangeMinLabel = document.getElementById('range-min-label');
  var rangeMaxLabel = document.getElementById('range-max-label');

  function updateRange() {
    var minVal = parseInt(rangeMin.value);
    var maxVal = parseInt(rangeMax.value);

    if (minVal > maxVal) {
      var tmp = minVal;
      minVal = maxVal;
      maxVal = tmp;
    }

    rangeFill.style.left = minVal + '%';
    rangeFill.style.width = (maxVal - minVal) + '%';
    rangeMinLabel.textContent = minVal + '%';
    rangeMaxLabel.textContent = maxVal + '%';
    rangeMin.setAttribute('aria-valuenow', minVal);
    rangeMax.setAttribute('aria-valuenow', maxVal);
  }

  rangeMin.addEventListener('input', function() { updateRange(); applyFilters(); });
  rangeMax.addEventListener('input', function() { updateRange(); applyFilters(); });

  // ============================================
  // ITEM TYPE CHECKBOXES
  // ============================================
  var typeCheckboxes = document.querySelectorAll('#item-type-list input[type="checkbox"]');
  Array.prototype.forEach.call(typeCheckboxes, function(cb) {
    cb.addEventListener('change', applyFilters);
  });

  // View more / less
  document.getElementById('view-more-items').addEventListener('click', function() {
    var expanded = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', expanded ? 'false' : 'true');
    this.textContent = expanded ? 'View more (3)' : 'View less';
    ['extra-filter-1', 'extra-filter-2', 'extra-filter-3'].forEach(function(id) {
      document.getElementById(id).style.display = expanded ? 'none' : '';
    });
    announce(expanded ? '3 item types hidden' : '3 more item types shown');
  });

  // ============================================
  // TOGGLE SWITCH
  // ============================================
  var suggestionsToggle = document.getElementById('suggestions-toggle');
  suggestionsToggle.addEventListener('click', function() {
    var checked = suggestionsToggle.getAttribute('aria-checked') === 'true';
    suggestionsToggle.setAttribute('aria-checked', checked ? 'false' : 'true');
    announce(checked ? 'Starred filter off' : 'Starred filter on');
    applyFilters();
  });
  suggestionsToggle.addEventListener('keydown', function(e) {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      suggestionsToggle.click();
    }
  });

  // ============================================
  // LIFECYCLE SELECT
  // ============================================
  document.getElementById('lifecycle-select').addEventListener('change', applyFilters);

  // ============================================
  // CLEAR ALL FILTERS
  // ============================================
  document.getElementById('clear-all-filters').addEventListener('click', function() {
    rangeMin.value = 0;
    rangeMax.value = 100;
    updateRange();
    Array.prototype.forEach.call(typeCheckboxes, function(cb) { cb.checked = true; });
    suggestionsToggle.setAttribute('aria-checked', 'false');
    document.getElementById('lifecycle-select').value = '';
    document.getElementById('curator-search').value = '';
    document.getElementById('contact-search').value = '';
    document.getElementById('product-search').value = '';
    applyFilters();
    announce('All filters cleared');
  });

  // ============================================
  // SAVE FILTERS
  // ============================================
  document.getElementById('save-filters-btn').addEventListener('click', function() {
    announce('Filters saved successfully');
  });

  // ============================================
  // BULK ACTION BUTTONS
  // ============================================
  ['bulk-edit', 'bulk-move', 'bulk-delete', 'bulk-export'].forEach(function(id) {
    document.getElementById(id).addEventListener('click', function() {
      if (document.getElementById(id).getAttribute('aria-disabled') === 'true') return;
      var count = document.querySelectorAll('.result-checkbox:checked').length;
      var action = id.replace('bulk-', '');
      announce(action.charAt(0).toUpperCase() + action.slice(1) + ' action applied to ' + count + ' item' + (count !== 1 ? 's' : ''));
    });
  });

  // ============================================
  // INIT — call shared utilities, initial render
  // ============================================
  App.initDropdowns();
  App.initSearchShortcut();
  App.initKeyboardHelpToggle();

  // F6 landmark cycling — skip when drawer is open
  App.initLandmarkCycling(
    [
      document.querySelector('[role="banner"]'),
      document.getElementById('main-nav'),
      document.getElementById('filter-panel'),
      document.getElementById('results-area')
    ],
    ['Header', 'Navigation', 'Filters', 'Results'],
    function() {
      return drawer.getAttribute('aria-hidden') === 'false';
    }
  );

  // Initial render
  renderResults(projectData);
})();
