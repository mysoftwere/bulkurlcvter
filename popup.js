// Link Combiner - Professional Chrome Extension Logic

document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle Elements
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const themeLabel = document.getElementById('themeLabel');
  const themeIcon = themeToggleBtn.querySelector('.theme-icon');

  // Elements - Step 1
  const baseUrlInput = document.getElementById('baseUrlInput');
  const clearBaseBtn = document.getElementById('clearBaseBtn');
  const pasteBaseBtn = document.getElementById('pasteBaseBtn');
  const openTabBtn = document.getElementById('openTabBtn');

  // Elements - Step 2 (Tabs & Modes)
  const tabTextBtn = document.getElementById('tabTextBtn');
  const tabFileBtn = document.getElementById('tabFileBtn');
  const textModeContainer = document.getElementById('textModeContainer');
  const fileModeContainer = document.getElementById('fileModeContainer');

  // Elements - Text Mode
  const usernamesInput = document.getElementById('usernamesInput');
  const inputCountBadge = document.getElementById('inputCountBadge');
  const pasteUsernamesBtn = document.getElementById('pasteUsernamesBtn');
  const clearUsernamesBtn = document.getElementById('clearUsernamesBtn');

  // Elements - File Mode
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const folderInput = document.getElementById('folderInput');
  const selectFilesBtn = document.getElementById('selectFilesBtn');
  const selectFolderBtn = document.getElementById('selectFolderBtn');

  const fileLoadedCard = document.getElementById('fileLoadedCard');
  const loadedFileName = document.getElementById('loadedFileName');
  const loadedFileDetails = document.getElementById('loadedFileDetails');
  const removeFileBtn = document.getElementById('removeFileBtn');

  // Elements - Live Preview
  const livePreviewText = document.getElementById('livePreviewText');

  // Elements - Actions
  const generateBtn = document.getElementById('generateBtn');
  const resetAllBtn = document.getElementById('resetAllBtn');

  // Elements - Results
  const resultsSection = document.getElementById('resultsSection');
  const resultsCountBadge = document.getElementById('resultsCountBadge');
  const viewListBtn = document.getElementById('viewListBtn');
  const viewTextBtn = document.getElementById('viewTextBtn');
  const resultListView = document.getElementById('resultListView');
  const resultTextView = document.getElementById('resultTextView');
  const resultRawText = document.getElementById('resultRawText');

  const copyAllBtn = document.getElementById('copyAllBtn');
  const downloadTxtBtn = document.getElementById('downloadTxtBtn');
  const openTabsBtn = document.getElementById('openTabsBtn');
  const toast = document.getElementById('toast');

  // App State
  let fileExtractedItems = [];
  let currentGeneratedUrls = [];
  let activeInputMode = 'text'; // 'text' | 'file'
  let currentTheme = 'dark';

  // Default example given by user
  const DEFAULT_EXAMPLE_BASE = '';
  const DEFAULT_EXAMPLE_USERNAMES = '';

  // Check if opened in full browser tab or popup
  function updateLayoutMode() {
    if (window.innerWidth > 540) {
      openTabBtn.style.display = 'none';
    } else {
      openTabBtn.style.display = 'flex';
    }
  }
  updateLayoutMode();
  window.addEventListener('resize', updateLayoutMode);

  // Toast Helper
  let toastTimer = null;
  function showToast(message, duration = 2400) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, duration);
  }

  // -------------------------------------------------------------
  // THEME MANAGEMENT (Dark Mode & White/Light Mode)
  // -------------------------------------------------------------
  function applyTheme(theme) {
    currentTheme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    if (theme === 'light') {
      themeIcon.textContent = '🌙';
      themeLabel.textContent = 'ডার্ক মোড';
    } else {
      themeIcon.textContent = '☀️';
      themeLabel.textContent = 'সাদা মোড';
    }
  }

  function toggleTheme() {
    const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);

    // Save preference
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ appTheme: nextTheme });
    } else {
      localStorage.setItem('combiner_theme', nextTheme);
    }

    showToast(nextTheme === 'light' ? '☀️ সাদা মোড চালু হয়েছে' : '🌙 ডার্ক মোড চালু হয়েছে');
  }

  themeToggleBtn.addEventListener('click', toggleTheme);

  // -------------------------------------------------------------
  // LIVE PREVIEW & COUNTER
  // -------------------------------------------------------------
  function updateLivePreview() {
    const base = baseUrlInput.value.trim() || 'https://example.com/?id=';
    let sampleId = '';

    if (activeInputMode === 'file' && fileExtractedItems.length > 0) {
      sampleId = fileExtractedItems[0];
    } else {
      const lines = usernamesInput.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      sampleId = lines.length > 0 ? lines[0] : 'xxx-workout-xx-new-videos-ygk111ddq-vxc-1';
    }

    const previewUrl = base + sampleId;
    livePreviewText.textContent = previewUrl;
  }

  function updateCountBadge() {
    const lines = usernamesInput.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    inputCountBadge.textContent = `${lines.length} Username${lines.length === 1 ? '' : 's'}`;
    updateLivePreview();
  }

  // -------------------------------------------------------------
  // STORAGE & INITIAL STATE
  // -------------------------------------------------------------
  function loadSavedData() {
    const hasChromeStorage = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
    if (hasChromeStorage) {
      chrome.storage.local.get(['savedBaseUrl', 'appTheme'], (res) => {
        if (res.appTheme) {
          applyTheme(res.appTheme);
        } else {
          applyTheme('dark');
        }

        if (res.savedBaseUrl) {
          baseUrlInput.value = res.savedBaseUrl;
        } else {
          baseUrlInput.value = DEFAULT_EXAMPLE_BASE;
        }
        updateCountBadge();
      });
    } else {
      const savedTheme = localStorage.getItem('combiner_theme') || 'dark';
      applyTheme(savedTheme);

      const saved = localStorage.getItem('combiner_base_url');
      baseUrlInput.value = saved || DEFAULT_EXAMPLE_BASE;
      updateCountBadge();
    }

    // Set initial sample usernames if empty
    if (!usernamesInput.value.trim()) {
      usernamesInput.value = DEFAULT_EXAMPLE_USERNAMES;
      updateCountBadge();
    }
  }

  function saveBaseUrl(val) {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ savedBaseUrl: val });
    } else {
      localStorage.setItem('combiner_base_url', val);
    }
  }

  // -------------------------------------------------------------
  // STEP 1 EVENTS
  // -------------------------------------------------------------
  baseUrlInput.addEventListener('input', () => {
    saveBaseUrl(baseUrlInput.value);
    updateLivePreview();
  });

  clearBaseBtn.addEventListener('click', () => {
    baseUrlInput.value = '';
    saveBaseUrl('');
    updateLivePreview();
    baseUrlInput.focus();
  });

  pasteBaseBtn.addEventListener('click', async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        baseUrlInput.value = clipText.trim();
        saveBaseUrl(baseUrlInput.value);
        updateLivePreview();
        showToast('Main URL পেস্ট করা হয়েছে');
      }
    } catch {
      showToast('Clipboard access denied');
    }
  });

  // Open In Full Tab
  openTabBtn.addEventListener('click', () => {
    const standaloneUrl = (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL)
      ? chrome.runtime.getURL('popup.html?mode=standalone')
      : 'popup.html?mode=standalone';

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url: standaloneUrl });
    } else {
      window.open(standaloneUrl, '_blank');
    }
  });

  // -------------------------------------------------------------
  // STEP 2 TABS (Box vs File)
  // -------------------------------------------------------------
  tabTextBtn.addEventListener('click', () => {
    activeInputMode = 'text';
    tabTextBtn.classList.add('active');
    tabFileBtn.classList.remove('active');
    textModeContainer.classList.add('active');
    fileModeContainer.classList.remove('active');
    updateLivePreview();
  });

  tabFileBtn.addEventListener('click', () => {
    activeInputMode = 'file';
    tabFileBtn.classList.add('active');
    tabTextBtn.classList.remove('active');
    fileModeContainer.classList.add('active');
    textModeContainer.classList.remove('active');
    updateLivePreview();
  });

  // Text Mode Input Events
  usernamesInput.addEventListener('input', updateCountBadge);

  clearUsernamesBtn.addEventListener('click', () => {
    usernamesInput.value = '';
    updateCountBadge();
    usernamesInput.focus();
  });

  pasteUsernamesBtn.addEventListener('click', async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        if (usernamesInput.value.trim()) {
          usernamesInput.value += '\n' + clipText;
        } else {
          usernamesInput.value = clipText;
        }
        updateCountBadge();
        showToast('Clipboard থেকে পেস্ট করা হয়েছে');
      }
    } catch {
      showToast('Clipboard access denied');
    }
  });

  // -------------------------------------------------------------
  // FILE & FOLDER UPLOAD HANDLING (.html, .txt, etc.)
  // -------------------------------------------------------------
  dropZone.addEventListener('click', (e) => {
    // Only trigger if not clicked on inner specific buttons
    if (e.target !== selectFolderBtn && !selectFolderBtn.contains(e.target)) {
      fileInput.click();
    }
  });

  selectFilesBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput.click();
  });

  selectFolderBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    folderInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
    }
  });

  folderInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(Array.from(e.target.files));
    }
  });

  // Drag & drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(Array.from(e.dataTransfer.files));
    }
  });

  // Process uploaded files (HTML filenames or text contents)
  async function processSelectedFiles(files) {
    if (!files || files.length === 0) return;

    let usernamesFound = [];
    let htmlFileCount = 0;
    let txtFileCount = 0;

    for (const file of files) {
      const fileName = file.name;

      // 1. If HTML/PDF file: Extract username directly from the filename!
      // Example: "xxx-workout-xx-new-videos-ygk111ddq-vxc-1.html" -> "xxx-workout-xx-new-videos-ygk111ddq-vxc-1"
      if (/\.(html?|pdf)$/i.test(fileName)) {
        const username = fileName.replace(/\.(html?|pdf)$/i, '').trim();
        if (username) {
          usernamesFound.push(username);
          htmlFileCount++;
        }
      }
      // 2. If Text/CSV file: Read file contents and extract lines
      else if (/\.(txt|csv|log)$/i.test(fileName)) {
        try {
          const content = await file.text();
          const lines = content.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
          usernamesFound.push(...lines);
          txtFileCount++;
        } catch (err) {
          console.error('Error reading text file:', err);
        }
      }
      // 3. Fallback: Take filename without extension
      else {
        const baseName = fileName.replace(/\.[^/.]+$/, '').trim();
        if (baseName) {
          usernamesFound.push(baseName);
        }
      }
    }

    if (usernamesFound.length === 0) {
      showToast('⚠️ ফাইলে কোনো ইউজারনেম পাওয়া যায়নি');
      return;
    }

    // Remove duplicates
    usernamesFound = Array.from(new Set(usernamesFound));
    fileExtractedItems = usernamesFound;

    // Sync into textarea
    usernamesInput.value = fileExtractedItems.join('\n');
    updateCountBadge();

    // Show card info
    if (files.length === 1) {
      loadedFileName.textContent = files[0].name;
    } else {
      loadedFileName.textContent = `${files.length} টি ফাইল আপলোড হয়েছে`;
    }

    loadedFileDetails.textContent = `মোট ${usernamesFound.length} টি ইউজারনেম পাওয়া গেছে (${htmlFileCount > 0 ? htmlFileCount + 'টি HTML/PDF' : ''})`;
    dropZone.style.display = 'none';
    fileLoadedCard.style.display = 'flex';
    
    showToast(`✅ ${usernamesFound.length} টি ইউজারনেম পাওয়া গেছে!`);
    updateLivePreview();
  }

  removeFileBtn.addEventListener('click', () => {
    fileExtractedItems = [];
    fileInput.value = '';
    folderInput.value = '';
    dropZone.style.display = 'block';
    fileLoadedCard.style.display = 'none';
    updateLivePreview();
    showToast('ফাইল সরানো হয়েছে');
  });

  // -------------------------------------------------------------
  // GENERATE LINKS BUTTON
  // -------------------------------------------------------------
  generateBtn.addEventListener('click', () => {
    const baseUrl = baseUrlInput.value.trim();
    if (!baseUrl) {
      showToast('⚠️ প্রথমে Main URL দিন');
      baseUrlInput.focus();
      return;
    }

    let sourceItems = [];
    if (activeInputMode === 'file' && fileExtractedItems.length > 0) {
      sourceItems = fileExtractedItems;
    } else {
      sourceItems = usernamesInput.value.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    }

    if (sourceItems.length === 0) {
      showToast('⚠️ কোনো ইউজারনেম বা আইডি পাওয়া যায়নি');
      usernamesInput.focus();
      return;
    }

    // Remove duplicates
    const uniqueItems = Array.from(new Set(sourceItems));

    // Combine
    currentGeneratedUrls = uniqueItems.map(item => {
      return {
        id: item,
        fullUrl: baseUrl + item
      };
    });

    renderResults(baseUrl, currentGeneratedUrls);
  });

  function renderResults(baseUrl, items) {
    resultsSection.style.display = 'flex';
    resultsCountBadge.textContent = `${items.length} Links`;

    // Raw Text View
    const allUrls = items.map(x => x.fullUrl).join('\n');
    resultRawText.value = allUrls;

    // List View
    resultListView.innerHTML = '';
    const fragment = document.createDocumentFragment();

    items.forEach((item, index) => {
      const row = document.createElement('div');
      row.className = 'link-row-card';

      const content = document.createElement('div');
      content.className = 'link-text-content';

      const shortBase = baseUrl.length > 55 ? baseUrl.slice(0, 52) + '...' : baseUrl;
      content.innerHTML = `<span class="prefix-part">${escapeHtml(shortBase)}</span><span class="id-part">${escapeHtml(item.id)}</span>`;

      const actions = document.createElement('div');
      actions.className = 'link-btn-actions';

      // Copy single link button
      const copyBtn = document.createElement('button');
      copyBtn.className = 'small-icon-btn';
      copyBtn.title = 'Copy this link';
      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
      `;
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(item.fullUrl).then(() => {
          showToast(`Link #${index + 1} কপি করা হয়েছে`);
        });
      });

      // Open single link in browser tab
      const openBtn = document.createElement('button');
      openBtn.className = 'small-icon-btn';
      openBtn.title = 'Open link in new tab';
      openBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      `;
      openBtn.addEventListener('click', () => {
        openUrl(item.fullUrl);
      });

      actions.appendChild(copyBtn);
      actions.appendChild(openBtn);
      row.appendChild(content);
      row.appendChild(actions);
      fragment.appendChild(row);
    });

    resultListView.appendChild(fragment);
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    showToast(`✅ ${items.length} টি লিংক তৈরি হয়েছে!`);
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function openUrl(url) {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.create) {
      chrome.tabs.create({ url, active: false });
    } else {
      window.open(url, '_blank');
    }
  }

  // View Switcher (List vs Raw Text)
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
    resultRawText.focus();
    resultRawText.select();
  });

  // Copy All Links
  copyAllBtn.addEventListener('click', () => {
    if (currentGeneratedUrls.length === 0) return;
    const text = currentGeneratedUrls.map(x => x.fullUrl).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      showToast(`📋 সব (${currentGeneratedUrls.length}) লিংক কপি করা হয়েছে!`);
    }).catch(() => {
      resultRawText.select();
      document.execCommand('copy');
      showToast('📋 কপি করা হয়েছে!');
    });
  });

  // Download .txt file
  downloadTxtBtn.addEventListener('click', () => {
    if (currentGeneratedUrls.length === 0) return;
    const text = currentGeneratedUrls.map(x => x.fullUrl).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `combined_links.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('💾 links.txt ফাইল ডাউনলোড হয়েছে');
  });

  // Open All in Browser Tabs
  openTabsBtn.addEventListener('click', () => {
    if (currentGeneratedUrls.length === 0) return;
    const count = currentGeneratedUrls.length;
    if (count > 10) {
      const confirmOpen = confirm(`আপনি একসাথে ${count} টি ট্যাব খুলতে যাচ্ছেন। ব্রাউজার কিছুটা স্লো হতে পারে। আপনি কি নিশ্চিত?`);
      if (!confirmOpen) return;
    }
    currentGeneratedUrls.forEach(item => {
      openUrl(item.fullUrl);
    });
    showToast(`🌐 ${count} টি ট্যাব খোলা হয়েছে`);
  });

  // Reset Everything
  resetAllBtn.addEventListener('click', () => {
    usernamesInput.value = '';
    updateCountBadge();
    removeFileBtn.click();
    resultsSection.style.display = 'none';
    currentGeneratedUrls = [];
    showToast('সব খালি করা হয়েছে');
  });

  // Keyboard shortcut Ctrl + Enter to Generate
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      generateBtn.click();
    }
  });

  // Initial call
  loadSavedData();
});
