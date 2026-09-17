/**
 * ShopEase Admin Portal Interactive Enhancements
 * - Theme Switcher (Syncs with Django native theme without double-toggle)
 * - User Menu Dropdown
 * - Collapsible Filter Drawer
 * - Bulk Action Counter
 * - Sidebar Navigation Filter
 * - Keyboard Shortcuts ('/' to focus search)
 */

document.addEventListener('DOMContentLoaded', () => {
  initThemeObserver();
  initUserDropdown();
  initFilterDrawer();
  initNavFilter();
  initBulkActionCounter();
  initKeyboardShortcuts();
});

/* ── Theme Observer & Direct 1-Click Toggle ── */
function initThemeObserver() {
  const syncThemeState = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.setAttribute('title', `Current: ${currentTheme === 'dark' ? 'Dark' : 'Light'} mode (Click to switch)`);
    }
  };

  const btn = document.getElementById('themeToggleBtn');
  if (btn) {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      const currentTheme = document.documentElement.getAttribute('data-theme') || 
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', nextTheme);
      localStorage.setItem('theme', nextTheme);
      syncThemeState();
    }, true);
  }

  syncThemeState();

  // Observe attribute changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        syncThemeState();
      }
    });
  });

  observer.observe(document.documentElement, { attributes: true });
}

/* ── User Account Menu Dropdown ── */
function initUserDropdown() {
  const btn = document.getElementById('shopeaseUserMenuBtn');
  const menu = document.getElementById('shopeaseUserMenu');
  if (!btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(isOpen));
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !btn.contains(e.target)) {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('open')) {
      menu.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });
}

/* ── Collapsible Filter Drawer ── */
function initFilterDrawer() {
  const toggleBtn = document.getElementById('shopeaseFilterToggleBtn');
  const closeBtn = document.getElementById('shopeaseFilterCloseBtn');
  const drawer = document.getElementById('shopeaseFilterDrawer');
  const container = document.getElementById('content-main');

  if (!toggleBtn || !drawer) return;

  const toggle = (force) => {
    const isCurrentlyOpen = drawer.classList.contains('open');
    const newState = typeof force === 'boolean' ? force : !isCurrentlyOpen;
    drawer.classList.toggle('open', newState);
    if (container) container.classList.toggle('filter-drawer-open', newState);
    toggleBtn.setAttribute('aria-expanded', String(newState));
    toggleBtn.classList.toggle('active', newState);
  };

  toggleBtn.addEventListener('click', (e) => {
    e.preventDefault();
    toggle();
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      toggle(false);
    });
  }
}

/* ── Sidebar Navigation Quick Filter ── */
function initNavFilter() {
  const filterInput = document.getElementById('nav-filter');
  const navTree = document.getElementById('shopeaseNavTree');
  if (!filterInput || !navTree) return;

  filterInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const sections = navTree.querySelectorAll('.shopease-nav-section');

    sections.forEach((section) => {
      const links = section.querySelectorAll('.shopease-section-links li');
      let sectionHasMatch = false;

      links.forEach((li) => {
        const text = li.textContent.toLowerCase();
        if (!q || text.includes(q)) {
          li.style.display = '';
          sectionHasMatch = true;
        } else {
          li.style.display = 'none';
        }
      });

      section.style.display = (!q || sectionHasMatch) ? '' : 'none';
    });
  });
}

/* ── Bulk Action Counter ── */
function initBulkActionCounter() {
  const actionContainer = document.querySelector('.actions');
  const checkboxes = document.querySelectorAll('input.action-select');

  if (!checkboxes.length || !actionContainer) return;

  const updateCount = () => {
    const count = document.querySelectorAll('input.action-select:checked').length;
    let badge = document.getElementById('shopeaseSelectedBadge');
    if (!badge) {
      badge = document.createElement('span');
      badge.id = 'shopeaseSelectedBadge';
      badge.className = 'shopease-selected-badge';
      actionContainer.insertBefore(badge, actionContainer.firstChild);
    }
    badge.textContent = `${count} selected`;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  };

  checkboxes.forEach((cb) => cb.addEventListener('change', updateCount));
  const selectAll = document.getElementById('action-toggle');
  if (selectAll) selectAll.addEventListener('change', () => setTimeout(updateCount, 50));
  updateCount();
}

/* ── Keyboard Shortcuts ── */
function initKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      const searchbar = document.getElementById('searchbar');
      if (searchbar) {
        e.preventDefault();
        searchbar.focus();
        searchbar.select();
      }
    }
  });
}
