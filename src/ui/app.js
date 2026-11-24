(function () {
  // Detect environment
  const isVsCode = typeof acquireVsCodeApi !== 'undefined';
  const vscode = isVsCode ? acquireVsCodeApi() : null;

  // App State
  const state = {
    installedVersions: [],
    remoteReleases: [],
    currentVersion: null,
    nvmVersion: '2.0.1',
    operatingMode: 'shim',
    nvmPath: '',
    installsPath: '',
    projectVersionInfo: null,
    activeTab: 'installed',
    filterLts: 'lts', // 'lts' | 'all' | 'security'
    isOperating: false,
    storageInfo: null,
    selectedVersionForPackages: null,
    packagesList: []
  };

  // DOM Elements
  const headerCurrentVer = document.getElementById('headerCurrentVer');
  const headerNvmMode = document.getElementById('headerNvmMode');
  const installedCount = document.getElementById('installedCount');
  const installedList = document.getElementById('installedList');
  const releasesListBody = document.getElementById('releasesListBody');
  const terminalOutput = document.getElementById('terminalOutput');
  const terminalBadge = document.getElementById('terminalBadge');
  const autoScrollCheck = document.getElementById('autoScrollCheck');
  const projectBanner = document.getElementById('projectBanner');
  const projectBannerText = document.getElementById('projectBannerText');
  const btnSwitchToProjectVer = document.getElementById('btnSwitchToProjectVer');
  const btnDismissBanner = document.getElementById('btnDismissBanner');
  const prereqBanner = document.getElementById('prereqBanner');
  const btnDownloadNvm = document.getElementById('btnDownloadNvm');
  const btnCopyWinget = document.getElementById('btnCopyWinget');
  const installedSearch = document.getElementById('installedSearch');
  const releasesSearch = document.getElementById('releasesSearch');
  const installModal = document.getElementById('installModal');
  const customVersionInput = document.getElementById('customVersionInput');
  const btnConfirmInstall = document.getElementById('btnConfirmInstall');
  const btnCancelInstall = document.getElementById('btnCancelInstall');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const btnQuickInstallModal = document.getElementById('btnQuickInstallModal');
  const btnRefresh = document.getElementById('btnRefresh');
  const btnClearLog = document.getElementById('btnClearLog');
  const btnRunDoctor = document.getElementById('btnRunDoctor');
  const btnCreateNvmrc = document.getElementById('btnCreateNvmrc');
  const toastContainer = document.getElementById('toastContainer');

  // System view elements
  const sysNvmVer = document.getElementById('sysNvmVer');
  const sysOpMode = document.getElementById('sysOpMode');
  const sysNvmPath = document.getElementById('sysNvmPath');
  const sysInstallsPath = document.getElementById('sysInstallsPath');

  // --- Unified API Layer ---
  const API = {
    async getStatus() {
      if (isVsCode) {
        vscode.postMessage({ command: 'getStatus' });
      } else {
        try {
          const res = await fetch('/api/status');
          const data = await res.json();
          handleStatusUpdate(data);
        } catch (err) {
          showToast('Failed to connect to NVM backend', 'error');
        }
      }
    },

    async getReleases() {
      if (isVsCode) {
        vscode.postMessage({ command: 'getReleases' });
      } else {
        try {
          const res = await fetch('/api/releases');
          const data = await res.json();
          handleReleasesUpdate(data);
        } catch (err) {
          showToast('Failed to load remote releases', 'error');
        }
      }
    },

    async useVersion(version) {
      logToTerminal(`\n> Switching to Node.js v${version}...`);
      showToast(`Switching to Node.js v${version}...`, 'info');
      state.isOperating = true;

      if (isVsCode) {
        vscode.postMessage({ command: 'useVersion', version });
      } else {
        try {
          const res = await fetch('/api/use', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version })
          });
          const result = await res.json();
          state.isOperating = false;
          if (result.success) {
            logToTerminal(`✓ ${result.message}`);
            showToast(`Now using Node.js v${version}`, 'success');
            API.getStatus();
          } else {
            logToTerminal(`✗ Error: ${result.message}`);
            showToast(`Failed to switch: ${result.message}`, 'error');
          }
        } catch (err) {
          state.isOperating = false;
          logToTerminal(`✗ Network error: ${err.message}`);
          showToast(`Error: ${err.message}`, 'error');
        }
      }
    },

    async installVersion(version) {
      logToTerminal(`\n> Starting installation of Node.js v${version}...`);
      showToast(`Installing Node.js v${version}...`, 'info');
      switchTab('activity');
      terminalBadge.classList.remove('hidden');

      if (isVsCode) {
        vscode.postMessage({ command: 'installVersion', version });
      } else {
        try {
          const res = await fetch('/api/install', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version })
          });
          const result = await res.json();
          if (!result.started) {
            terminalBadge.classList.add('hidden');
            showToast(result.error || 'Failed to start install', 'error');
          }
        } catch (err) {
          terminalBadge.classList.add('hidden');
          showToast(`Install error: ${err.message}`, 'error');
        }
      }
    },

    async uninstallVersion(version) {
      logToTerminal(`\n> Uninstalling Node.js v${version}...`);
      showToast(`Uninstalling Node.js v${version}...`, 'info');
      switchTab('activity');
      terminalBadge.classList.remove('hidden');

      if (isVsCode) {
        vscode.postMessage({ command: 'uninstallVersion', version });
      } else {
        try {
          const res = await fetch('/api/uninstall', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version })
          });
          const result = await res.json();
          if (!result.started) {
            terminalBadge.classList.add('hidden');
            showToast(result.error || 'Failed to start uninstall', 'error');
          }
        } catch (err) {
          terminalBadge.classList.add('hidden');
          showToast(`Error: ${err.message}`, 'error');
        }
      }
    },

    async pinVersion(version) {
      if (isVsCode) {
        vscode.postMessage({ command: 'pinProject', version });
      } else {
        try {
          const res = await fetch('/api/pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ version })
          });
          const result = await res.json();
          if (result.success) {
            showToast(`Pinned project to Node.js v${version} (.nvmrc created)`, 'success');
            API.getStatus();
          } else {
            showToast('Failed to pin version', 'error');
          }
        } catch (err) {
          showToast(`Error: ${err.message}`, 'error');
        }
      }
    },

    async runDoctor() {
      logToTerminal('\n> Running nvm doctor diagnostic...');
      switchTab('activity');
      if (isVsCode) {
        vscode.postMessage({ command: 'runDoctor' });
      } else {
        try {
          const res = await fetch('/api/doctor');
          const data = await res.json();
          logToTerminal(data.output || 'Doctor completed.');
          showToast('Diagnostic completed', 'success');
        } catch (e) {
          showToast('Failed to run doctor', 'error');
        }
      }
    },

    async getStorage() {
      if (isVsCode) {
        vscode.postMessage({ command: 'getStorage' });
      } else {
        try {
          const res = await fetch('/api/storage');
          if (res.ok) {
            const data = await res.json();
            handleStorageUpdate(data);
          } else {
            console.error('Storage API response not ok:', res.status);
          }
        } catch (err) {
          console.error('Failed to get storage:', err);
        }
      }
    },

    async cleanCache() {
      logToTerminal('\n> Cleaning NVM cache...');
      showToast('Cleaning NVM cache...', 'info');
      if (isVsCode) {
        vscode.postMessage({ command: 'cleanCache' });
      } else {
        try {
          const res = await fetch('/api/storage/clean-cache', { method: 'POST' });
          const data = await res.json();
          showToast(data.message || 'Cache cleaned', data.success ? 'success' : 'error');
          logToTerminal(data.message || 'Cache cleaned');
          API.getStorage();
        } catch (e) {
          showToast(`Clean cache error: ${e.message}`, 'error');
        }
      }
    },

    async getGlobalPackages(version) {
      state.selectedVersionForPackages = version;
      if (isVsCode) {
        vscode.postMessage({ command: 'getGlobalPackages', version });
      } else {
        try {
          const res = await fetch(`/api/packages/global?version=${encodeURIComponent(version)}`);
          const pkgs = await res.json();
          handlePackagesUpdate(version, pkgs);
        } catch (e) {
          showToast('Failed to load global packages', 'error');
        }
      }
    },

    async migratePackages(packages) {
      if (!packages || packages.length === 0) {
        showToast('No packages selected', 'error');
        return;
      }
      logToTerminal(`\n> Migrating ${packages.length} global packages to active Node v${state.currentVersion}...`);
      showToast(`Migrating ${packages.length} packages to v${state.currentVersion}...`, 'info');
      switchTab('activity');
      terminalBadge.classList.remove('hidden');

      if (isVsCode) {
        vscode.postMessage({ command: 'migratePackages', packages });
      } else {
        try {
          const res = await fetch('/api/packages/migrate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ packages })
          });
          const result = await res.json();
          if (!result.started) {
            terminalBadge.classList.add('hidden');
            showToast('Failed to start package migration', 'error');
          }
        } catch (e) {
          terminalBadge.classList.add('hidden');
          showToast('Error migrating packages', 'error');
        }
      }
    }
  };

  // --- Handlers for Data Updates ---
  function handleStatusUpdate(data) {
    if (!data) return;
    state.installedVersions = data.installedVersions || [];
    state.currentVersion = data.currentVersion || (data.installedVersions.find(v => v.isCurrent)?.version) || null;
    state.nvmVersion = data.nvmVersion || '2.0.1';
    state.operatingMode = data.operatingMode || 'shim';
    state.nvmPath = data.nvmPath || '';
    state.installsPath = data.installsPath || '';
    state.projectVersionInfo = data.projectVersionInfo || null;

    // Update Header
    headerCurrentVer.textContent = state.currentVersion ? `v${state.currentVersion}` : 'None active';
    headerNvmMode.textContent = `v${state.nvmVersion} (${state.operatingMode})`;
    installedCount.textContent = state.installedVersions.length;

    // Update System Info
    sysNvmVer.textContent = `v${state.nvmVersion}`;
    sysOpMode.textContent = state.operatingMode;
    sysNvmPath.textContent = state.nvmPath || 'Auto-detected';
    sysInstallsPath.textContent = state.installsPath || 'Default';

    // Check if NVM is installed
    if (data.isNvmInstalled === false || (data.nvmVersion === 'Unknown' && !data.nvmPath && state.installedVersions.length === 0)) {
      if (prereqBanner) prereqBanner.classList.remove('hidden');
    } else {
      if (prereqBanner) prereqBanner.classList.add('hidden');
    }

    // Update Project Banner
    renderProjectBanner();

    // Render Installed List
    renderInstalledVersions();

    // Re-render releases to update "Installed" tag
    if (state.remoteReleases.length > 0) {
      renderReleasesTable();
    }
  }

  function handleReleasesUpdate(releases) {
    state.remoteReleases = releases || [];
    renderReleasesTable();
  }

  function handleStorageUpdate(storage) {
    if (!storage) return;
    state.storageInfo = storage;
    const badge = document.getElementById('storageTotalBadge');
    const cacheSpan = document.getElementById('cacheSizeSpan');
    const breakdown = document.getElementById('storageBreakdownList');

    if (badge) badge.textContent = `${storage.formattedTotalSize || '0 MB'} Total`;
    if (cacheSpan) cacheSpan.textContent = storage.formattedCacheSize || '0 MB';

    if (breakdown) {
      if (storage.versions && storage.versions.length > 0) {
        const max = Math.max(...storage.versions.map(v => v.sizeBytes || 0), storage.cacheSizeBytes || 1);
        breakdown.innerHTML = storage.versions.map(v => {
          const pct = Math.max(4, Math.round(((v.sizeBytes || 0) / max) * 100));
          return `
            <div class="storage-row">
              <div class="storage-row-header">
                <span><strong>Node v${v.version}</strong> (${v.packageCount || 0} packages)</span>
                <span>${v.formattedSize}</span>
              </div>
              <div class="storage-progress-bg">
                <div class="storage-progress-fill" style="width: ${pct}%;"></div>
              </div>
            </div>
          `;
        }).join('') + `
          <div class="storage-row">
            <div class="storage-row-header">
              <span><strong>NVM Download Cache</strong></span>
              <span>${storage.formattedCacheSize || '0 MB'}</span>
            </div>
            <div class="storage-progress-bg">
              <div class="storage-progress-fill" style="width: ${Math.max(4, Math.round(((storage.cacheSizeBytes || 0) / max) * 100))}%; background: #94a3b8;"></div>
            </div>
          </div>
        `;
      } else {
        breakdown.innerHTML = `<span style="color: var(--text-secondary); font-size: 11px;">No storage data available.</span>`;
      }
    }
  }

  function handlePackagesUpdate(version, pkgs) {
    state.packagesList = pkgs || [];
    const checklist = document.getElementById('packagesChecklist');
    const subtitle = document.getElementById('packagesModalSubtitle');
    const target = document.getElementById('activeNodeTarget');
    const modal = document.getElementById('packagesModal');

    subtitle.textContent = `Global packages in Node v${version}`;
    target.textContent = state.currentVersion ? `v${state.currentVersion}` : 'None';

    if (state.packagesList.length === 0) {
      checklist.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-secondary);">
          No global packages found installed in Node v${version}.
        </div>
      `;
    } else {
      checklist.innerHTML = state.packagesList.map((p, idx) => `
        <label class="package-item">
          <input type="checkbox" class="pkg-checkbox" value="${escapeHtml(p.name)}" checked>
          <strong style="font-family: var(--font-mono);">${escapeHtml(p.name)}</strong>
          <span style="color: var(--text-secondary); margin-left: auto; font-size: 11px;">v${escapeHtml(p.version)}</span>
        </label>
      `).join('');
    }

    modal.classList.remove('hidden');
  }

  // --- Rendering Functions ---
  function renderProjectBanner() {
    const p = state.projectVersionInfo;
    if (p && p.requiredVersion && (!state.currentVersion || !state.currentVersion.startsWith(p.requiredVersion))) {
      projectBannerText.innerHTML = `Project requires Node <strong>v${p.requiredVersion}</strong> (${p.source}). Current is <strong>v${state.currentVersion || 'none'}</strong>.`;
      projectBanner.classList.remove('hidden');
      btnSwitchToProjectVer.onclick = () => {
        // If installed, switch. If not installed, prompt to install.
        const isInst = state.installedVersions.some(v => v.version.startsWith(p.requiredVersion));
        if (isInst) {
          const match = state.installedVersions.find(v => v.version.startsWith(p.requiredVersion));
          API.useVersion(match.version);
        } else {
          API.installVersion(p.requiredVersion);
        }
      };
    } else {
      projectBanner.classList.add('hidden');
    }
  }

  function renderInstalledVersions() {
    const query = (installedSearch.value || '').toLowerCase().trim();
    const filtered = state.installedVersions.filter(v => v.version.toLowerCase().includes(query));

    if (filtered.length === 0) {
      installedList.innerHTML = `
        <div class="loading-state" style="grid-column: 1 / -1;">
          <span>${state.installedVersions.length === 0 ? 'No Node.js versions installed yet. Click "Install Version" to add one!' : 'No matching versions found.'}</span>
        </div>
      `;
      return;
    }

    installedList.innerHTML = filtered.map(v => {
      const isActive = Boolean(state.currentVersion && v.version === state.currentVersion);
      return `
        <div class="version-card ${isActive ? 'is-active' : ''}">
          <div class="card-top">
            <div class="card-version-title">
              <span class="v-tag">v${v.version}</span>
              ${isActive ? '<span class="active-badge">Active</span>' : ''}
              ${v.isDefault && !isActive ? '<span class="default-badge">Default</span>' : ''}
            </div>
            <div class="status-indicator">
              <span class="status-dot ${isActive ? 'online' : ''}"></span>
            </div>
          </div>
          <div class="card-meta">
            <span>Architecture: <strong>64-bit</strong></span>
            <span>Raw: <code>${escapeHtml(v.raw || v.version)}</code></span>
          </div>
          <div class="card-actions-row">
            ${isActive 
              ? `<button class="btn btn-sm btn-accent" disabled>
                   <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                   Active Version
                 </button>`
              : `<button class="btn btn-sm btn-primary btn-use" data-v="${v.version}">
                   <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
                   Switch
                 </button>`
            }
            <button class="btn btn-sm btn-secondary btn-pkgs" data-v="${v.version}" title="View and migrate global packages">
              Packages
            </button>
            <button class="btn btn-sm btn-secondary btn-pin" data-v="${v.version}" title="Pin to current project (.nvmrc)">
              Pin (.nvmrc)
            </button>
            ${!isActive ? `
              <button class="btn btn-sm btn-danger btn-uninstall" data-v="${v.version}" title="Uninstall version" style="margin-left: auto;">
                Uninstall
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Attach event listeners to card buttons
    installedList.querySelectorAll('.btn-use').forEach(btn => {
      btn.onclick = () => API.useVersion(btn.getAttribute('data-v'));
    });
    installedList.querySelectorAll('.btn-pkgs').forEach(btn => {
      btn.onclick = () => API.getGlobalPackages(btn.getAttribute('data-v'));
    });
    installedList.querySelectorAll('.btn-pin').forEach(btn => {
      btn.onclick = () => API.pinVersion(btn.getAttribute('data-v'));
    });
    installedList.querySelectorAll('.btn-uninstall').forEach(btn => {
      btn.onclick = () => {
        const v = btn.getAttribute('data-v');
        showConfirmModal(
          `Uninstall Node.js v${v}`,
          `Are you sure you want to uninstall <strong>Node.js v${v}</strong>?<br><span style="color: var(--text-secondary); font-size: 11px; margin-top: 4px; display: inline-block;">This will permanently remove this version from your computer.</span>`,
          () => API.uninstallVersion(v)
        );
      };
    });
  }

  function renderReleasesTable() {
    const query = (releasesSearch.value || '').toLowerCase().trim();
    const filter = state.filterLts;

    let list = state.remoteReleases;

    // Apply filter chips
    if (filter === 'lts') {
      list = list.filter(r => r.lts !== false);
    } else if (filter === 'security') {
      list = list.filter(r => r.security === true);
    }

    // Apply search query
    if (query) {
      list = list.filter(r => r.version.toLowerCase().includes(query) || (r.lts && String(r.lts).toLowerCase().includes(query)));
    }

    // Limit to top 30 for performance
    const displayList = list.slice(0, 35);

    if (displayList.length === 0) {
      releasesListBody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center py-8">No releases found matching current search.</td>
        </tr>
      `;
      return;
    }

    const installedSet = new Set(state.installedVersions.map(v => v.version));

    releasesListBody.innerHTML = displayList.map(r => {
      const isInst = installedSet.has(r.version);
      const ltsText = r.lts ? `LTS (${r.lts})` : 'Current';
      const secTag = r.security ? '<span class="pill-sec" title="Security Patch">Security</span>' : '';

      return `
        <tr>
          <td><strong style="font-family: var(--font-mono)">v${r.version}</strong></td>
          <td>
            <span class="${r.lts ? 'pill-lts' : ''}">${ltsText}</span>
            ${secTag}
          </td>
          <td>${r.date || '-'}</td>
          <td><code>${r.npm ? 'npm v' + r.npm : '-'}</code></td>
          <td>
            ${isInst 
              ? '<span style="color: var(--accent-node); font-weight: 600;">✓ Installed</span>' 
              : '<span style="color: var(--text-secondary)">Available</span>'
            }
          </td>
          <td>
            ${isInst
              ? (r.version === state.currentVersion 
                  ? '<span class="badge" style="color: var(--accent-node)">Active</span>' 
                  : `<button class="btn btn-xs btn-secondary btn-switch-release" data-v="${r.version}">Switch</button>`
                )
              : `<button class="btn btn-xs btn-primary btn-install-release" data-v="${r.version}">Install</button>`
            }
          </td>
        </tr>
      `;
    }).join('');

    // Attach row events
    releasesListBody.querySelectorAll('.btn-switch-release').forEach(btn => {
      btn.onclick = () => API.useVersion(btn.getAttribute('data-v'));
    });
    releasesListBody.querySelectorAll('.btn-install-release').forEach(btn => {
      btn.onclick = () => API.installVersion(btn.getAttribute('data-v'));
    });
  }

  // --- Helper Functions ---
  function logToTerminal(text) {
    terminalOutput.textContent += text + '\n';
    if (autoScrollCheck.checked) {
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function switchTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    if (tabName === 'installed') {
      document.getElementById('paneInstalled').classList.add('active');
    } else if (tabName === 'releases') {
      document.getElementById('paneReleases').classList.add('active');
      if (state.remoteReleases.length === 0) {
        API.getReleases();
      }
    } else if (tabName === 'activity') {
      document.getElementById('paneActivity').classList.add('active');
    } else if (tabName === 'system') {
      document.getElementById('paneSystem').classList.add('active');
      API.getStorage();
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // --- Modal Logic ---
  function showConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const titleEl = document.getElementById('confirmModalTitle');
    const msgEl = document.getElementById('confirmModalMessage');
    const okBtn = document.getElementById('btnOkConfirm');
    const cancelBtn = document.getElementById('btnCancelConfirm');
    const closeBtn = document.getElementById('btnCloseConfirmModal');

    if (!modal) {
      onConfirm();
      return;
    }

    titleEl.textContent = title;
    msgEl.innerHTML = message;
    modal.classList.remove('hidden');

    const cleanup = () => {
      modal.classList.add('hidden');
      okBtn.onclick = null;
      cancelBtn.onclick = null;
      closeBtn.onclick = null;
    };

    okBtn.onclick = () => {
      cleanup();
      onConfirm();
    };
    cancelBtn.onclick = cleanup;
    closeBtn.onclick = cleanup;
  }

  function openInstallModal(defaultVal = '') {
    customVersionInput.value = defaultVal;
    installModal.classList.remove('hidden');
    customVersionInput.focus();
  }

  function closeInstallModal() {
    installModal.classList.add('hidden');
  }

  // --- Event Listeners Setup ---
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab')));
  });

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.filterLts = chip.getAttribute('data-filter');
      renderReleasesTable();
    });
  });

  installedSearch.addEventListener('input', () => renderInstalledVersions());
  releasesSearch.addEventListener('input', () => renderReleasesTable());

  btnRefresh.addEventListener('click', () => {
    showToast('Refreshing versions...', 'info');
    API.getStatus();
    if (state.activeTab === 'releases') API.getReleases();
  });

  btnQuickInstallModal.addEventListener('click', () => openInstallModal());
  btnCloseModal.addEventListener('click', closeInstallModal);
  btnCancelInstall.addEventListener('click', closeInstallModal);

  document.querySelectorAll('.preset-chip').forEach(preset => {
    preset.addEventListener('click', () => {
      customVersionInput.value = preset.getAttribute('data-v');
    });
  });

  btnConfirmInstall.addEventListener('click', () => {
    const ver = customVersionInput.value.trim();
    if (!ver) return;
    closeInstallModal();
    API.installVersion(ver);
  });

  customVersionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      btnConfirmInstall.click();
    } else if (e.key === 'Escape') {
      closeInstallModal();
    }
  });

  btnClearLog.addEventListener('click', () => {
    terminalOutput.textContent = '';
  });

  btnDismissBanner.addEventListener('click', () => {
    projectBanner.classList.add('hidden');
  });

  btnRunDoctor.addEventListener('click', () => API.runDoctor());
  btnCreateNvmrc.addEventListener('click', () => {
    if (state.currentVersion) {
      API.pinVersion(state.currentVersion);
    } else {
      showToast('No active Node version to pin', 'error');
    }
  });

  // Storage & Clean Cache
  const btnCleanCache = document.getElementById('btnCleanCache');
  if (btnCleanCache) {
    btnCleanCache.addEventListener('click', () => API.cleanCache());
  }

  // Packages Modal Listeners
  const packagesModal = document.getElementById('packagesModal');
  const btnClosePackagesModal = document.getElementById('btnClosePackagesModal');
  const btnCancelPackages = document.getElementById('btnCancelPackages');
  const btnSelectAllPkgs = document.getElementById('btnSelectAllPkgs');
  const btnConfirmMigrate = document.getElementById('btnConfirmMigrate');

  const closePackagesModal = () => {
    if (packagesModal) packagesModal.classList.add('hidden');
  };

  if (btnClosePackagesModal) btnClosePackagesModal.addEventListener('click', closePackagesModal);
  if (btnCancelPackages) btnCancelPackages.addEventListener('click', closePackagesModal);

  if (btnSelectAllPkgs) {
    btnSelectAllPkgs.addEventListener('click', () => {
      const boxes = document.querySelectorAll('.pkg-checkbox');
      const allChecked = Array.from(boxes).every(b => b.checked);
      boxes.forEach(b => b.checked = !allChecked);
      btnSelectAllPkgs.textContent = allChecked ? 'Select All' : 'Deselect All';
    });
  }

  if (btnConfirmMigrate) {
    btnConfirmMigrate.addEventListener('click', () => {
      const selected = Array.from(document.querySelectorAll('.pkg-checkbox:checked')).map(b => b.value);
      if (selected.length === 0) {
        showToast('Please select at least one package to migrate', 'error');
        return;
      }
      closePackagesModal();
      API.migratePackages(selected);
    });
  }

  // Taskbar Tray Companion Guide / Launcher
  const btnLaunchTrayGuide = document.getElementById('btnLaunchTrayGuide');
  if (btnLaunchTrayGuide) {
    btnLaunchTrayGuide.addEventListener('click', () => {
      showToast('To launch the Tray Companion, double-click launch-tray.bat in the project folder!', 'info');
      logToTerminal('\n[Super NVM] Taskbar Tray Companion is available.\nRun launch-tray.bat to minimize Super NVM into your Windows taskbar clock tray.\n');
      switchTab('activity');
    });
  }

  // Prerequisite banner listeners
  if (btnCopyWinget) {
    btnCopyWinget.addEventListener('click', () => {
      navigator.clipboard.writeText('winget install CoreyButler.NVMforWindows');
      showToast('Copied to clipboard: winget install CoreyButler.NVMforWindows', 'success');
    });
  }

  if (btnDownloadNvm && isVsCode) {
    btnDownloadNvm.addEventListener('click', (e) => {
      e.preventDefault();
      vscode.postMessage({
        command: 'openExternal',
        url: 'https://github.com/nvm-windows/nvm/releases/download/v2.0.1/nvm-2.0.1-x64-setup.exe'
      });
    });
  }

  // --- VS Code Message Listener or Standalone SSE Listener ---
  if (isVsCode) {
    window.addEventListener('message', (event) => {
      const msg = event.data;
      switch (msg.type) {
        case 'status':
          handleStatusUpdate(msg.data);
          break;
        case 'releases':
          handleReleasesUpdate(msg.data);
          break;
        case 'storage':
          handleStorageUpdate(msg.data);
          break;
        case 'globalPackages':
          handlePackagesUpdate(msg.version, msg.data);
          break;
        case 'log':
          logToTerminal(msg.message);
          break;
        case 'toast':
          showToast(msg.message, msg.variant || 'info');
          break;
        case 'operationComplete':
          terminalBadge.classList.add('hidden');
          if (msg.success) {
            showToast(msg.message || 'Operation succeeded', 'success');
          } else {
            showToast(msg.message || 'Operation failed', 'error');
          }
          API.getStatus();
          break;
      }
    });

    // Initial load in VS Code
    vscode.postMessage({ command: 'ready' });
  } else {
    // Standalone SSE stream for live logs
    try {
      const evtSource = new EventSource('/api/events');
      evtSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);
          if (payload.type === 'log') {
            logToTerminal(payload.data);
          } else if (payload.type === 'operationComplete') {
            terminalBadge.classList.add('hidden');
            showToast(payload.message, payload.success ? 'success' : 'error');
            API.getStatus();
          }
        } catch {}
      };
    } catch {}

    // Initial load in Browser
    API.getStatus();
  }
  // --- Global Keyboard Shortcuts ---
  let chordPending = false;
  let chordTimer = null;

  window.addEventListener('keydown', (e) => {
    // Escape closes any active modal
    if (e.key === 'Escape') {
      if (installModal && !installModal.classList.contains('hidden')) {
        installModal.classList.add('hidden');
      }
      if (packagesModal && !packagesModal.classList.contains('hidden')) {
        packagesModal.classList.add('hidden');
      }
      const confirmModal = document.getElementById('confirmModal');
      if (confirmModal && !confirmModal.classList.contains('hidden')) {
        confirmModal.classList.add('hidden');
      }
      return;
    }

    // Ctrl+Shift+S then N chord detection
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'S' || e.key === 's')) {
      chordPending = true;
      clearTimeout(chordTimer);
      chordTimer = setTimeout(() => { chordPending = false; }, 1500);
      return;
    }

    if (chordPending && (e.key === 'n' || e.key === 'N')) {
      chordPending = false;
      clearTimeout(chordTimer);
      e.preventDefault();
      if (installModal) {
        installModal.classList.remove('hidden');
        if (customVersionInput) customVersionInput.focus();
      }
      showToast('Shortcut activated: Ctrl+Shift+S N', 'info');
      return;
    }

    // '/' to search (when not inside an input)
    if (e.key === '/' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      if (state.activeTab === 'installed' && installedSearch) {
        installedSearch.focus();
      } else if (state.activeTab === 'releases' && releasesSearch) {
        releasesSearch.focus();
      }
    }
  });
})();
