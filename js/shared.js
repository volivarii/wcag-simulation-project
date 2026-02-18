/* ============================================
   shared.js — Common utilities for all pages
   IIFE exposing window.App namespace.
   Provides: announce, focus trapping, dropdowns,
   tooltips, Cmd+K search, F6 landmark cycling,
   keyboard help bar, drawer tab switching.
   ============================================ */
(function() {
  'use strict';

  var App = {};

  // ──────────────────────────────────────────
  // Announce — push message to aria-live region
  // WCAG 4.1.3: Status Messages
  // ──────────────────────────────────────────
  App.announce = function(message) {
    var el = document.getElementById('live-region');
    if (!el) return;
    el.textContent = '';
    requestAnimationFrame(function() { el.textContent = message; });
  };

  // ──────────────────────────────────────────
  // Focus Trap — confine Tab within container
  // Used by modals and drawers.
  // ──────────────────────────────────────────

  /**
   * Return visible, focusable elements within a container.
   * Filters out elements hidden by aria-hidden ancestors.
   * @param {HTMLElement} container
   * @returns {HTMLElement[]}
   */
  App.getFocusableElements = function(container) {
    var selector = 'a[href], button:not([disabled]):not([aria-disabled="true"]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    return Array.prototype.slice.call(container.querySelectorAll(selector)).filter(function(el) {
      if (el.offsetParent === null) return false;
      var node = el;
      while (node && node !== container) {
        if (node.getAttribute && node.getAttribute('aria-hidden') === 'true') return false;
        node = node.parentElement;
      }
      return true;
    });
  };

  /**
   * Trap Tab key within container. Recalculates focusable
   * elements on each Tab press (tabs may switch content).
   * @param {HTMLElement} container
   */
  App.trapFocus = function(container) {
    App.releaseFocus(container);
    var focusable = App.getFocusableElements(container);
    if (focusable.length === 0) return;

    function handler(e) {
      if (e.key !== 'Tab') return;
      var current = App.getFocusableElements(container);
      if (current.length === 0) return;
      var first = current[0];
      var last = current[current.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    container._focusTrapHandler = handler;
    container.addEventListener('keydown', handler);
  };

  /**
   * Release focus trap on container, restoring normal Tab behavior.
   * @param {HTMLElement} container
   */
  App.releaseFocus = function(container) {
    if (container._focusTrapHandler) {
      container.removeEventListener('keydown', container._focusTrapHandler);
      delete container._focusTrapHandler;
    }
  };

  // ──────────────────────────────────────────
  // Dropdowns — generic keyboard navigation
  // WCAG 4.1.2: role="menu", arrow keys, Escape
  // ──────────────────────────────────────────
  App.initDropdowns = function() {
    var dropdowns = document.querySelectorAll('.dropdown');
    Array.prototype.forEach.call(dropdowns, function(dropdown) {
      var trigger = dropdown.querySelector('[aria-haspopup]');
      var menu = dropdown.querySelector('.dropdown__menu');
      if (!trigger || !menu) return;
      var items = Array.prototype.slice.call(menu.querySelectorAll('[role="menuitem"]'));

      function openMenu() {
        menu.setAttribute('aria-hidden', 'false');
        trigger.setAttribute('aria-expanded', 'true');
        if (items[0]) items[0].focus();
        App.announce('Menu opened');
      }
      function closeMenu() {
        menu.setAttribute('aria-hidden', 'true');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus();
        App.announce('Menu closed');
      }

      trigger.addEventListener('click', function() {
        var open = menu.getAttribute('aria-hidden') === 'false';
        open ? closeMenu() : openMenu();
      });

      trigger.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openMenu();
        }
      });

      menu.addEventListener('keydown', function(e) {
        var idx = items.indexOf(document.activeElement);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          items[(idx + 1) % items.length].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          items[(idx - 1 + items.length) % items.length].focus();
        } else if (e.key === 'Escape') {
          closeMenu();
        } else if (e.key === 'Tab') {
          closeMenu();
        }
      });

      document.addEventListener('click', function(e) {
        if (!dropdown.contains(e.target)) {
          menu.setAttribute('aria-hidden', 'true');
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    });
  };

  // ──────────────────────────────────────────
  // Tooltip Positioning
  // Dynamically positions tooltips to stay in viewport.
  // ──────────────────────────────────────────

  /**
   * Position a tooltip relative to its .has-tooltip parent.
   * Chooses the direction with most available space, then applies
   * pixel-accurate inline styles so the tooltip always stays within
   * the viewport even when the trigger is near an edge.
   * The CSS arrow tracks the trigger centre via --tooltip-arrow-x/y.
   * WCAG 1.4.13: Content on Hover or Focus must be dismissible and
   * persistable; this positioning ensures the tooltip is fully visible.
   * @param {HTMLElement} tooltipEl
   */
  App.positionTooltip = function(tooltipEl) {
    var parent = tooltipEl.closest('.has-tooltip');
    if (!parent) return;

    // ── 1. Reset all previously applied overrides ──────────────────
    tooltipEl.classList.remove('tooltip--top', 'tooltip--bottom', 'tooltip--left', 'tooltip--right');
    tooltipEl.style.left = '';
    tooltipEl.style.right = '';
    tooltipEl.style.top = '';
    tooltipEl.style.bottom = '';
    tooltipEl.style.transform = '';
    tooltipEl.style.removeProperty('--tooltip-arrow-x');
    tooltipEl.style.removeProperty('--tooltip-arrow-y');

    // ── 2. Measure tooltip at a neutral off-screen position ─────────
    tooltipEl.style.visibility = 'hidden';
    tooltipEl.style.opacity = '0';
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = '0';
    tooltipEl.style.top = '-9999px';
    tooltipEl.style.transform = 'none';
    var tipWidth = tooltipEl.offsetWidth;
    var tipHeight = tooltipEl.offsetHeight;
    tooltipEl.style.visibility = '';
    tooltipEl.style.opacity = '';
    tooltipEl.style.display = '';
    tooltipEl.style.left = '';
    tooltipEl.style.top = '';
    tooltipEl.style.transform = '';

    var parentRect = parent.getBoundingClientRect();
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var gap = 8;   // space between trigger edge and tooltip
    var margin = 8; // min distance from viewport edge

    var spaceAbove = parentRect.top;
    var spaceBelow = vh - parentRect.bottom;
    var spaceLeft  = parentRect.left;
    var spaceRight = vw - parentRect.right;

    // ── 3. Pick direction ───────────────────────────────────────────
    var dir;
    if      (spaceAbove >= tipHeight + gap + margin) { dir = 'top';    }
    else if (spaceBelow >= tipHeight + gap + margin) { dir = 'bottom'; }
    else if (spaceRight >= tipWidth  + gap + margin) { dir = 'right';  }
    else if (spaceLeft  >= tipWidth  + gap + margin) { dir = 'left';   }
    else                                              { dir = 'bottom'; }

    tooltipEl.classList.add('tooltip--' + dir);

    // ── 4. Apply pixel-accurate inline position with viewport clamping
    if (dir === 'top' || dir === 'bottom') {
      // Ideal centre-aligned left, clamped to viewport
      var idealLeft   = parentRect.left + parentRect.width  / 2 - tipWidth  / 2;
      var clampedLeft = Math.max(margin, Math.min(idealLeft, vw - tipWidth - margin));

      // Convert viewport-absolute left to parent-relative offset
      tooltipEl.style.left      = (clampedLeft - parentRect.left) + 'px';
      tooltipEl.style.transform = 'none'; // disable CSS translateX(-50%)

      // Arrow: point to trigger centre regardless of clamping
      var arrowX = parentRect.left + parentRect.width / 2 - clampedLeft;
      tooltipEl.style.setProperty('--tooltip-arrow-x', arrowX + 'px');
    }

    if (dir === 'left' || dir === 'right') {
      // Ideal centre-aligned top, clamped to viewport
      var idealTop   = parentRect.top + parentRect.height / 2 - tipHeight / 2;
      var clampedTop = Math.max(margin, Math.min(idealTop, vh - tipHeight - margin));

      tooltipEl.style.top       = (clampedTop - parentRect.top) + 'px';
      tooltipEl.style.transform = 'none'; // disable CSS translateY(-50%)

      var arrowY = parentRect.top + parentRect.height / 2 - clampedTop;
      tooltipEl.style.setProperty('--tooltip-arrow-y', arrowY + 'px');
    }
  };

  /** Attach tooltip positioning handlers to all .has-tooltip elements. */
  App.initTooltips = function() {
    var tooltips = document.querySelectorAll('.tooltip');
    Array.prototype.forEach.call(tooltips, function(tooltip) {
      var parent = tooltip.closest('.has-tooltip');
      if (parent) {
        parent.addEventListener('mouseenter', function() { App.positionTooltip(tooltip); });
        parent.addEventListener('focusin', function() { App.positionTooltip(tooltip); });
      }
    });
  };

  // ──────────────────────────────────────────
  // Cmd/Ctrl+K — focus search input
  // ──────────────────────────────────────────
  App.initSearchShortcut = function() {
    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        var input = document.getElementById('search-input');
        if (input) input.focus();
      }
    });
  };

  // ──────────────────────────────────────────
  // F6 Landmark Cycling
  // Parameterized: each page provides its own
  // landmark list, names, and skip condition.
  // ──────────────────────────────────────────

  /**
   * Initialize F6/Shift+F6 landmark cycling.
   * @param {HTMLElement[]} landmarks - ordered list of landmark elements
   * @param {string[]} names - human-readable names for announcements
   * @param {function} shouldSkipFn - returns true when cycling should be suppressed (e.g. modal open)
   */
  App.initLandmarkCycling = function(landmarks, names, shouldSkipFn) {
    var currentIndex = -1;

    function cycleLandmark(reverse) {
      if (reverse) {
        currentIndex = (currentIndex - 1 + landmarks.length) % landmarks.length;
      } else {
        currentIndex = (currentIndex + 1) % landmarks.length;
      }
      var target = landmarks[currentIndex];
      if (!target) return;

      var focusable = target.querySelector(
        'a[href], button:not([disabled]):not([aria-disabled="true"]), input, select, textarea, [tabindex="0"]'
      );
      if (focusable) {
        focusable.focus();
      } else {
        target.setAttribute('tabindex', '-1');
        target.focus();
      }

      target.classList.add('landmark-focus-ring');
      setTimeout(function() { target.classList.remove('landmark-focus-ring'); }, 700);

      App.announce(names[currentIndex] + ' landmark');
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'F6') {
        e.preventDefault();
        if (shouldSkipFn && shouldSkipFn()) return;
        cycleLandmark(e.shiftKey);
      }
    });
  };

  // ──────────────────────────────────────────
  // ? Key — Toggle keyboard shortcuts help bar
  // ──────────────────────────────────────────
  App.initKeyboardHelpToggle = function() {
    var kbdHelpBar = document.getElementById('kbd-help-bar');
    if (!kbdHelpBar) return;

    function toggleKbdHelp() {
      var open = kbdHelpBar.getAttribute('aria-hidden') === 'false';
      kbdHelpBar.setAttribute('aria-hidden', open ? 'true' : 'false');
      if (!open) App.announce('Keyboard shortcuts bar opened');
    }

    document.addEventListener('keydown', function(e) {
      var tag = document.activeElement.tagName.toLowerCase();
      if (e.key === '?' && tag !== 'input' && tag !== 'textarea' && tag !== 'select') {
        e.preventDefault();
        toggleKbdHelp();
      }
    });

    var closeBtn = document.getElementById('kbd-help-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        kbdHelpBar.setAttribute('aria-hidden', 'true');
      });
    }
  };

  // ──────────────────────────────────────────
  // Drawer Tabs — arrow key tab switching
  // WCAG: role="tab", aria-selected, tabindex
  // ──────────────────────────────────────────

  /**
   * Initialize drawer tab switching with arrow keys.
   * @param {string} tabListSelector - CSS selector for the tablist container
   * @returns {{ switchTab: function }} - object with switchTab(tabName) method
   */
  App.initDrawerTabs = function(tabListSelector) {
    var tabList = document.querySelector(tabListSelector);
    if (!tabList) return { switchTab: function() {} };

    var tabButtons = tabList.querySelectorAll('[role="tab"]');
    var tabPanels = document.querySelectorAll('.drawer__tab-panel');

    function switchTab(tabName) {
      Array.prototype.forEach.call(tabButtons, function(btn) {
        var id = btn.id.replace('tab-btn-', '');
        var selected = id === tabName;
        btn.setAttribute('aria-selected', selected ? 'true' : 'false');
        btn.setAttribute('tabindex', selected ? '0' : '-1');
      });
      Array.prototype.forEach.call(tabPanels, function(panel) {
        var id = panel.id.replace('tab-', '');
        panel.setAttribute('aria-hidden', id === tabName ? 'false' : 'true');
      });
    }

    Array.prototype.forEach.call(tabButtons, function(btn) {
      btn.addEventListener('click', function() {
        var tabName = btn.id.replace('tab-btn-', '');
        switchTab(tabName);
        App.announce(tabName.charAt(0).toUpperCase() + tabName.slice(1) + ' tab selected');
      });

      btn.addEventListener('keydown', function(e) {
        var tabs = Array.prototype.slice.call(tabButtons);
        var idx = tabs.indexOf(btn);
        var target = null;

        if (e.key === 'ArrowRight') {
          e.preventDefault();
          target = tabs[(idx + 1) % tabs.length];
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          target = tabs[(idx - 1 + tabs.length) % tabs.length];
        } else if (e.key === 'Home') {
          e.preventDefault();
          target = tabs[0];
        } else if (e.key === 'End') {
          e.preventDefault();
          target = tabs[tabs.length - 1];
        }

        if (target) {
          var tabName = target.id.replace('tab-btn-', '');
          switchTab(tabName);
          target.focus();
          App.announce(tabName.charAt(0).toUpperCase() + tabName.slice(1) + ' tab');
        }
      });
    });

    return { switchTab: switchTab };
  };

  // Expose to global scope
  window.App = App;
})();
