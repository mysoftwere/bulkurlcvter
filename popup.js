/**
 * Link Combiner Pro
 * Logic for URL + Username combination, Domain persistence & removal,
 * File/Folder handling, Themes and Clipboard operations.
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- DOM Elements ---
  // Theme & Window
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeLabel = document.getElementById('themeLabel');
  const openTabBtn = document.getElementById('openTabBtn');

  // Step 1: Base URL & Domain persistence
  const baseUrlInput = document.getElementById('baseUrlInput');
  const clearBaseBtn = document.getElementById('clearBaseBtn');
  const pasteBaseBtn = document.getElementById('pasteBaseBtn');
  const saveBaseManualBtn = document.getElementById('saveBaseManualBtn');
  const domainSavedBadge = document.getElementById('domainSavedBadge');
  const saveStatusText = document.getElementById('saveStatusText');
  const savedDomainsContainer = document.getElementById('savedDomainsContainer');
  const savedDomainsChips = document.getElementById('savedDomainsChips');

  // Step 2: Usernames Mode & Inputs
  const tabTextBtn = document.getElementById('tabTextBtn');
  const tabFileBtn = document.getElementById('tabFileBtn');
  const textModeContainer = document.getElementById('textModeContainer');
  const fileModeContainer = document.getElementById('fileModeContainer');
  const usernamesInput = document.getElementById('usernamesInput');
  const inputCountBadge = document.getElementById('inputCountBadge');
  const pasteUsernamesBtn = document.getElementById('pasteUsernamesBtn');
  const clearUsernamesBtn = document.getElementById('clearUsernamesBtn');

  // Step 2: File Uploads
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const folderInput = document.getElementById('folderInput');
  const selectFilesBtn = document.getElementById('selectFilesBtn');
  const selectFolderBtn = document.getElementById('selectFolderBtn');
  const fileLoadedCard = document.getElementById('fileLoadedCard');
  const loadedFileName = document.getElementById('loadedFileName');
  const loadedFileDetails = document.getElementById('loadedFileDetails');
  const removeFileBtn = document.getElementById('removeFileBtn');

  // Preview & Actions
  const livePreviewText = document.getElementById('livePreviewText');
  const generateBtn = document.getElementById('generateBtn');
  const resetAllBtn = document.getElementById('resetAllBtn');

  // Step 3: Results
  const resultsSection = document.getElementById('resultsSection');
  const resultsCountBadge = document.getElementById('resultsCountBadge');
  const viewListBtn = document.getElementById('viewListBtn');
  const viewTextBtn = document.getElementById('viewTextBtn');
  const copyAllBtn = document.getElementById('copyAllBtn');
  const downloadTxtBtn = document.getElementById('downloadTxtBtn');
  const openTabsBtn = document.getElementById('openTabsBtn');
  const resultListView = document.getElementById('resultListView');
  const resultTextView = document.getElementById('resultTextView');
  const resultRawText = document.getElementById('resultRawText');

  // Toast
  const toast = document.getElementById('toast');

  // State
  let currentMode = 'text'; // 'text' or 'file'
  let uploadedUsernames = [];
  let generatedLinks = [];
  let toastTimeout = null;

  // --- STORAGE WRAPPER (Works in Chrome Extension & Browser) ---
  const Storage = {
    async get(key, defaultValue = null) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            resolve(result[key] !== undefined ? result[key] : defaultValue);
          });
        });
      } else {
        const val = localStorage.getItem(key);
        if (val === null) return defaultValue;
        try {
          return JSON.parse(val);
        } catch {
          return val;
        }
      }
    },
    async set(key, value) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.set({ [key]: value }, resolve);
        });
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
    },
    async remove(key) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        return new Promise((resolve) => {
          chrome.storage.local.remove([key], resolve);
        });
      } else {
        localStorage.removeItem(key);
      }
    }
  };

  // --- TOAST NOTIFICATION ---
  function showToast(message, duration = 2800) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // --- THEME MANAGEMENT ---
  async function initTheme() {
    const savedTheme = await Storage.get('app_theme', 'dark');
    applyTheme(savedTheme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      themeToggleBtn.querySelector('.theme-icon').textContent = '🌙';
      themeLabel.textContent = 'ডার্ক মোড';
    } else {
      themeToggleBtn.querySelector('.theme-icon').textContent = '☀️';
      themeLabel.textContent = 'সাদা মোড';
    }
    Storage.set('app_theme', theme);
  }

  themeToggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
  });

  // Open in Full Tab
  if (openTabBtn) {
    openTabBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.runtime && chrome.runtime.getURL) {
        chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
      } else {
        window.open(window.location.href, '_blank');
      }
    });
  }

  // --- STEP 1: DOMAIN / BASE URL PERSISTENCE & CLEAR LOGIC ---
  async function initBaseUrl() {
    const savedUrl = await Storage.get('saved_base_url', '');
    if (savedUrl) {
      baseUrlInput.value = savedUrl;
      updateDomainBadge(true);
    } else {
      updateDomainBadge(false);
    }
    renderSavedDomainChips();
    updateLivePreview();
  }

  function updateDomainBadge(isSaved) {
    if (isSaved && baseUrlInput.value.trim().length > 0) {
      domainSavedBadge.className = 'save-status-badge saved';
      saveStatusText.textContent = 'মেমোরিতে সংরক্ষিত আছে';
      domainSavedBadge.title = 'এই ডোমেনটি সেভ করা আছে, পৃষ্ঠা রিলোড দিলেও থাকবে';
    } else {
      domainSavedBadge.className = 'save-status-badge empty';
      saveStatusText.textContent = 'কোন ডোমেন সংরক্ষিত নেই';
      domainSavedBadge.title = 'URL লিখলে স্বয়ংক্রিয়ভাবে সেভ হবে';
    }
  }

  let saveBaseTimeout = null;
  baseUrlInput.addEventListener('input', () => {
    const val = baseUrlInput.value.trim();
    updateLivePreview();

    if (saveBaseTimeout) clearTimeout(saveBaseTimeout);
    saveBaseTimeout = setTimeout(async () => {
      if (val) {
        await Storage.set('saved_base_url', val);
        updateDomainBadge(true);
        addDomainToHistory(val);
      } else {
        await Storage.remove('saved_base_url');
        updateDomainBadge(false);
      }
    }, 400);
  });

  // Clear / Remove Domain button
  clearBaseBtn.addEventListener('click', async () => {
    baseUrlInput.value = '';
    await Storage.remove('saved_base_url');
    updateDomainBadge(false);
    updateLivePreview();
    showToast('🗑️ ডোমেন মুছে ফেলা হয়েছে এবং মেমোরি থেকে সরানো হয়েছে!');
  });

  // Paste Base URL
  pasteBaseBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        baseUrlInput.value = text.trim();
        await Storage.set('saved_base_url', text.trim());
        updateDomainBadge(true);
        addDomainToHistory(text.trim());
        updateLivePreview();
        showToast('📋 URL পেস্ট এবং সেভ হয়েছে!');
      } else {
        showToast('ক্লিপবোর্ডে কোন লেখা নেই');
      }
    } catch (err) {
      baseUrlInput.focus();
      showToast('পেস্ট করতে কন্ট্রোল+ভি (Ctrl+V) চাপুন');
    }
  });

  // Save Domain explicitly
  if (saveBaseManualBtn) {
    saveBaseManualBtn.addEventListener('click', async () => {
      const val = baseUrlInput.value.trim();
      if (!val) {
        showToast('⚠️ অনুগ্রহ করে প্রথমে একটি URL লিখুন');
        return;
      }
      await Storage.set('saved_base_url', val);
      await addDomainToHistory(val);
      updateDomainBadge(true);
      showToast('💾 ডোমেন সফলভাবে সংরক্ষিত হয়েছে!');
    });
  }

  // Saved Domains History Chips
  async function addDomainToHistory(url) {
    if (!url) return;
    let list = await Storage.get('saved_domains_history', []);
    if (!Array.isArray(list)) list = [];
    list = list.filter(item => item !== url);
    list.unshift(url);
    if (list.length > 5) list = list.slice(0, 5); // Keep top 5
    await Storage.set('saved_domains_history', list);
    renderSavedDomainChips();
  }

  async function renderSavedDomainChips() {
    const list = await Storage.get('saved_domains_history', []);
    if (!Array.isArray(list) || list.length === 0) {
      savedDomainsContainer.style.display = 'none';
      savedDomainsChips.innerHTML = '';
      return;
    }
    savedDomainsContainer.style.display = 'block';
    savedDomainsChips.innerHTML = '';

    list.forEach(item => {
      const chip = document.createElement('div');
      chip.className = 'domain-chip-item';
      
      const label = document.createElement('span');
      label.textContent = item.length > 35 ? item.substring(0, 32) + '...' : item;
      label.title = item;
      label.onclick = () => {
        baseUrlInput.value = item;
        Storage.set('saved_base_url', item);
        updateDomainBadge(true);
        updateLivePreview();
        showToast('🔄 ডোমেন সিলেক্ট করা হয়েছে!');
      };

      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-tag-btn';
      removeBtn.innerHTML = '&times;';
      removeBtn.title = 'তালিকা থেকে রিমুভ করুন';
      removeBtn.onclick = async (e) => {
        e.stopPropagation();
        let currentList = await Storage.get('saved_domains_history', []);
        currentList = currentList.filter(x => x !== item);
        await Storage.set('saved_domains_history', currentList);
        // If current active is the one deleted, clear it if matches
        if (baseUrlInput.value.trim() === item) {
          baseUrlInput.value = '';
          await Storage.remove('saved_base_url');
          updateDomainBadge(false);
          updateLivePreview();
        }
        renderSavedDomainChips();
        showToast('রিমুভ করা হয়েছে');
      };

      chip.appendChild(label);
      chip.appendChild(removeBtn);
      savedDomainsChips.appendChild(chip);
    });
  }

  // --- STEP 2: MODE TOGGLE (TEXT BOX VS FILE UPLOAD) ---
  tabTextBtn.addEventListener('click', () => {
    currentMode = 'text';
    tabTextBtn.classList.add('active');
    tabFileBtn.classList.remove('active');
    textModeContainer.classList.add('active');
    fileModeContainer.classList.remove('active');
    updateLivePreview();
  });

  tabFileBtn.addEventListener('click', () => {
    currentMode = 'file';
    tabFileBtn.classList.add('active');
    tabTextBtn.classList.remove('active');
    fileModeContainer.classList.add('active');
    textModeContainer.classList.remove('active');
    updateLivePreview();
  });

  // Text mode username count
  function getUsernamesFromText() {
    return usernamesInput.value
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }

  usernamesInput.addEventListener('input', () => {
    const count = getUsernamesFromText().length;
    inputCountBadge.textContent = `${count} Username${count === 1 ? '' : 's'}`;
    updateLivePreview();
  });

  pasteUsernamesBtn.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (usernamesInput.value.trim()) {
          usernamesInput.value += '\n' + text.trim();
        } else {
          usernamesInput.value = text.trim();
        }
        const count = getUsernamesFromText().length;
        inputCountBadge.textContent = `${count} Username${count === 1 ? '' : 's'}`;
        updateLivePreview();
        showToast('📋 Usernames পেস্ট হয়েছে!');
      }
    } catch {
      usernamesInput.focus();
      showToast('পেস্ট করতে Ctrl+V চাপুন');
    }
  });

  clearUsernamesBtn.addEventListener('click', () => {
    usernamesInput.value = '';
    inputCountBadge.textContent = '0 Usernames';
    updateLivePreview();
    showToast('Usernames বক্স ক্লিয়ার হয়েছে');
  });

  // --- FILE & FOLDER UPLOAD HANDLING ---
  selectFilesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  selectFolderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    folderInput.click();
  });

  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      processFiles(fileInput.files);
    }
  });

  folderInput.addEventListener('change', () => {
    if (folderInput.files && folderInput.files.length > 0) {
      processFiles(folderInput.files);
    }
  });

  async function processFiles(fileList) {
    uploadedUsernames = [];
    const files = Array.from(fileList);
    let htmlPdfCount = 0;
    let txtCount = 0;

    for (const file of files) {
      const fileName = file.name;
      const lower = fileName.toLowerCase();

      // Rule: For .html, .htm, .pdf: take username directly from file name without extension!
      if (lower.endsWith('.html') || lower.endsWith('.htm') || lower.endsWith('.pdf')) {
        const usernameFromName = fileName.replace(/\.(html|htm|pdf)$/i, '').trim();
        if (usernameFromName) {
          uploadedUsernames.push(usernameFromName);
          htmlPdfCount++;
        }
      }
      // Rule: For .txt, .csv, .log: read text content line-by-line
      else if (lower.endsWith('.txt') || lower.endsWith('.csv') || lower.endsWith('.log')) {
        try {
          const content = await file.text();
          const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
          uploadedUsernames.push(...lines);
          txtCount++;
        } catch (err) {
          console.error('Error reading text file:', err);
        }
      } else {
        // Fallback: If unknown extension, take filename without last extension
        const usernameFromName = fileName.replace(/\.[^/.]+$/, '').trim();
        if (usernameFromName) {
          uploadedUsernames.push(usernameFromName);
        }
      }
    }

    // Deduplicate while preserving order
    uploadedUsernames = Array.from(new Set(uploadedUsernames));

    if (uploadedUsernames.length === 0) {
      showToast('⚠️ কোন Username বা বৈধ ফাইল পাওয়া যায়নি');
      return;
    }

    // Display File loaded card
    fileLoadedCard.style.display = 'flex';
    loadedFileName.textContent = files.length === 1 ? files[0].name : `${files.length}টি ফাইল / ফোল্ডার লোড হয়েছে`;
    loadedFileDetails.textContent = `মোট ${uploadedUsernames.length} টি ইউজারনেম পাওয়া গেছে (${htmlPdfCount} HTML/PDF, ${txtCount} TXT)`;
    
    updateLivePreview();
    showToast(`✅ ${uploadedUsernames.length} টি Username সফলভাবে লোড হয়েছে!`);
  }

  removeFileBtn.addEventListener('click', () => {
    uploadedUsernames = [];
    fileInput.value = '';
    folderInput.value = '';
    fileLoadedCard.style.display = 'none';
    updateLivePreview();
    showToast('আপলোড করা ফাইল মুছে ফেলা হয়েছে');
  });

  // --- LIVE PREVIEW ---
  function getActiveUsernames() {
    if (currentMode === 'file') {
      return uploadedUsernames;
    }
    return getUsernamesFromText();
  }

  function combineUrlAndUsername(base, user) {
    if (!base) base = 'https://example.com/user/';
    if (!user) user = 'john_doe';

    base = base.trim();
    user = user.trim();

    // Check if placeholder {id} or {username} exists
    if (base.includes('{id}')) {
      return base.replace('{id}', encodeURIComponent(user));
    }
    if (base.includes('{username}')) {
      return base.replace('{username}', encodeURIComponent(user));
    }

    // Check if query parameter with trailing = or &
    if (base.endsWith('=') || base.endsWith('&') || base.endsWith('?')) {
      return base + encodeURIComponent(user);
    }

    // Standard URL joining: ensure single slash between base and username
    if (base.endsWith('/')) {
      return base + user;
    } else {
      return base + '/' + user;
    }
  }

  function updateLivePreview() {
    const rawBase = baseUrlInput.value.trim();
    const activeList = getActiveUsernames();
    const firstUser = activeList.length > 0 ? activeList[0] : null;

    if (!rawBase && !firstUser) {
      livePreviewText.textContent = 'Main URL + Username = আপনার ফাইনাল লিংক (যেমন: https://example.com/user/john_doe)';
      return;
    }

    const preview = combineUrlAndUsername(rawBase || 'https://example.com/user/', firstUser || 'example_username');
    livePreviewText.textContent = preview;
  }

  // --- GENERATE LINKS ---
  generateBtn.addEventListener('click', () => {
    const base = baseUrlInput.value.trim();
    const users = getActiveUsernames();

    if (!base) {
      showToast('⚠️ অনুগ্রহ করে Main URL বা Domain দিন!');
      baseUrlInput.focus();
      return;
    }

    if (users.length === 0) {
      if (currentMode === 'text') {
        showToast('⚠️ অনুগ্রহ করে অন্তত ১টি Username বক্সে লিখুন!');
        usernamesInput.focus();
      } else {
        showToast('⚠️ কোন ফাইল আপলোড করা হয়নি! ফাইল সিলেক্ট করুন।');
      }
      return;
    }

    generatedLinks = users.map(u => combineUrlAndUsername(base, u));

    // Show Results
    renderResults(generatedLinks);
    resultsSection.style.display = 'flex';
    resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast(`🎉 ${generatedLinks.length} টি লিংক সফলভাবে তৈরি হয়েছে!`);
  });

  function renderResults(links) {
    resultsCountBadge.textContent = `${links.length} Links`;
    resultRawText.value = links.join('\n');

    resultListView.innerHTML = '';
    links.forEach((link, idx) => {
      const row = document.createElement('div');
      row.className = 'link-row-item';

      const left = document.createElement('div');
      left.className = 'link-row-left';

      const indexSpan = document.createElement('span');
      indexSpan.className = 'link-index';
      indexSpan.textContent = `#${idx + 1}`;

      const linkA = document.createElement('a');
      linkA.className = 'link-url-text';
      linkA.href = link;
      linkA.target = '_blank';
      linkA.rel = 'noreferrer noopener';
      linkA.textContent = link;

      left.appendChild(indexSpan);
      left.appendChild(linkA);

      const actions = document.createElement('div');
      actions.className = 'link-row-actions';

      // Copy individual button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'mini-icon-btn';
      copyBtn.title = 'কপি করুন';
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;
      copyBtn.onclick = () => {
        navigator.clipboard.writeText(link);
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        showToast(`লিংক #${idx + 1} কপি হয়েছে!`);
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          `;
        }, 1500);
      };

      // Open tab button
      const openBtn = document.createElement('button');
      openBtn.className = 'mini-icon-btn';
      openBtn.title = 'ব্রাউজারে খুলুন';
      openBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      `;
      openBtn.onclick = () => {
        window.open(link, '_blank');
      };

      actions.appendChild(copyBtn);
      actions.appendChild(openBtn);

      row.appendChild(left);
      row.appendChild(actions);

      resultListView.appendChild(row);
    });
  }

  // View switch: List vs Raw Text
  viewListBtn.addEventListener('click', () => {
    viewListBtn.classList.add('active');
    viewTextBtn.classList.remove('active');
    resultListView.style.display = 'flex';
    resultTextView.style.display = 'none';
  });

  viewTextBtn.addEventListener('click', () => {
    viewTextBtn.classList.add('active');
    viewListBtn.classList.remove('active');
    resultTextView.style.display = 'block';
    resultListView.style.display = 'none';
  });

  // Copy All
  copyAllBtn.addEventListener('click', async () => {
    if (generatedLinks.length === 0) return;
    try {
      await navigator.clipboard.writeText(generatedLinks.join('\n'));
      showToast(`📋 সব ${generatedLinks.length} টি লিংক কপি করা হয়েছে!`);
    } catch {
      resultRawText.select();
      document.execCommand('copy');
      showToast('সব লিংক কপি করা হয়েছে!');
    }
  });

  // Download .txt file
  downloadTxtBtn.addEventListener('click', () => {
    if (generatedLinks.length === 0) return;
    const blob = new Blob([generatedLinks.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combined_links_${dateStr}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('💾 টেক্সট ফাইল ডাউনলোড শুরু হয়েছে');
  });

  // Open multiple tabs
  openTabsBtn.addEventListener('click', () => {
    if (generatedLinks.length === 0) return;
    if (generatedLinks.length > 10) {
      const confirmOpen = confirm(`আপনি একসাথে ${generatedLinks.length} টি ট্যাব খুলতে যাচ্ছেন। ব্রাউজার হ্যাং রোধ করতে প্রথম ১০টি ট্যাব খুলবেন?`);
      if (!confirmOpen) return;
      generatedLinks.slice(0, 10).forEach(link => window.open(link, '_blank'));
    } else {
      generatedLinks.forEach(link => window.open(link, '_blank'));
    }
    showToast('ট্যাবসমূহ খোলা হচ্ছে...');
  });

  // --- RESET ALL ---
  resetAllBtn.addEventListener('click', () => {
    usernamesInput.value = '';
    inputCountBadge.textContent = '0 Usernames';
    uploadedUsernames = [];
    fileInput.value = '';
    folderInput.value = '';
    fileLoadedCard.style.display = 'none';
    generatedLinks = [];
    resultsSection.style.display = 'none';
    updateLivePreview();
    showToast('🔄 সম্পূর্ণ রিসেট করা হয়েছে');
  });

  // Initialize
  initTheme();
  initBaseUrl();
});
