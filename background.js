// Time settings
const AI_MODE_START = '18:30';   // 6:30 PM (AI mode)
const AI_MODE_END = '08:30';     // 8:30 AM (AI mode)

// CSS to inject for dark mode
const darkModeCSS = `
  html {
    filter: invert(90%) hue-rotate(180deg) !important;
  }
  img, video, picture {
    filter: invert(100%) hue-rotate(180deg) !important;
  }
`;

// Create context menu when extension is installed
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'darkModeToggle',
    title: 'Toggle Dark Mode',
    contexts: ['action']
  });
});

// Update context menu title based on current state
function updateContextMenu() {
  chrome.storage.local.get(['mode'], (result) => {
    const currentMode = result.mode || 'manual';
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                       now.getMinutes().toString().padStart(2, '0');
    
    let isDarkMode;
    if (currentMode === 'ai') {
      isDarkMode = currentTime >= AI_MODE_START || currentTime < AI_MODE_END;
    } else {
      // Manual mode - check if currently in dark mode based on user times
      chrome.storage.local.get(['manualDarkModeStart', 'manualDarkModeEnd'], (manualResult) => {
        const start = manualResult.manualDarkModeStart || '17:30';
        const end = manualResult.manualDarkModeEnd || '07:00';
        isDarkMode = currentTime >= start || currentTime < end;
        
        const title = `${currentMode === 'ai' ? 'AI' : 'Manual'} Mode: ${isDarkMode ? 'On' : 'Off'}`;
        chrome.contextMenus.update('darkModeToggle', { title });
      });
      return; // Return early for manual mode to avoid undefined isDarkMode
    }
    
    const title = `${currentMode === 'ai' ? 'AI' : 'Manual'} Mode: ${isDarkMode ? 'On' : 'Off'}`;
    chrome.contextMenus.update('darkModeToggle', { title });
  });
}

// Load saved state when extension starts
chrome.storage.local.get(['mode', 'manualDarkModeStart', 'manualDarkModeEnd'], (result) => {
  const currentMode = result.mode || 'manual';
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0');
  
  let isDarkMode;
  if (currentMode === 'ai') {
    isDarkMode = currentTime >= AI_MODE_START || currentTime < AI_MODE_END;
  } else {
    const start = result.manualDarkModeStart || '17:30';
    const end = result.manualDarkModeEnd || '07:00';
    isDarkMode = currentTime >= start || currentTime < end;
  }
  
  applyTheme(isDarkMode);
  updateContextMenu();
});

function shouldBeDarkMode(mode, startTime, endTime) {
  const now = new Date();
  const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                     now.getMinutes().toString().padStart(2, '0');
  
  if (mode === 'ai') {
    return currentTime >= AI_MODE_START || currentTime < AI_MODE_END;
  } else {
    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime;
    } else {
      return currentTime >= startTime || currentTime < endTime;
    }
  }
}

async function applyTheme(isDark) {
  const tabs = await chrome.tabs.query({});
  
  for (const tab of tabs) {
    // Skip chrome:// pages, chrome web store, and extensions page
    if (tab.url.startsWith('http') && 
        !tab.url.startsWith('https://chrome.google.com/webstore') && 
        !tab.url.includes('chrome://extensions')) {
      try {
        if (isDark) {
          await chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            css: darkModeCSS
          });
        } else {
          await chrome.scripting.removeCSS({
            target: { tabId: tab.id },
            css: darkModeCSS
          });
        }
      } catch (error) {
        console.log(`Skipping tab ${tab.url}: ${error.message}`);
      }
    }
  }
}

// Modify the existing interval check to respect current mode
setInterval(async () => {
  chrome.storage.local.get(['mode', 'manualDarkModeStart', 'manualDarkModeEnd'], (result) => {
    const currentMode = result.mode || 'manual';
    const start = result.manualDarkModeStart || '17:30';
    const end = result.manualDarkModeEnd || '07:00';
    const isDark = shouldBeDarkMode(currentMode, start, end);
    applyTheme(isDark);
    updateContextMenu();
  });
}, 60000);

// Apply theme when a new tab is created
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && 
      tab.url.startsWith('http') && 
      !tab.url.startsWith('https://chrome.google.com/webstore') && 
      !tab.url.includes('chrome://extensions')) {
    
    chrome.storage.local.get(['mode', 'manualDarkModeStart', 'manualDarkModeEnd'], (result) => {
      const currentMode = result.mode || 'manual';
      const start = result.manualDarkModeStart || '17:30';
      const end = result.manualDarkModeEnd || '07:00';
      const isDark = shouldBeDarkMode(currentMode, start, end);
      
      if (isDark) {
        try {
          chrome.scripting.insertCSS({
            target: { tabId: tab.id },
            css: darkModeCSS
          });
        } catch (error) {
          console.log(`Skipping tab ${tab.url}: ${error.message}`);
        }
      }
    });
  }
});

// Initial check when extension is loaded
chrome.storage.local.get(['mode', 'manualDarkModeStart', 'manualDarkModeEnd'], (result) => {
  const currentMode = result.mode || 'manual';
  const start = result.manualDarkModeStart || '17:30';
  const end = result.manualDarkModeEnd || '07:00';
  const isDark = shouldBeDarkMode(currentMode, start, end);
  applyTheme(isDark);
});

// Listen for messages from popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'modeChanged') {
    // Mode was changed in popup, reapply theme
    chrome.storage.local.get(['mode', 'manualDarkModeStart', 'manualDarkModeEnd'], (result) => {
      const currentMode = result.mode || 'manual';
      const start = result.manualDarkModeStart || '17:30';
      const end = result.manualDarkModeEnd || '07:00';
      const isDark = shouldBeDarkMode(currentMode, start, end);
      applyTheme(isDark);
      updateContextMenu();
    });
    sendResponse({ success: true });
  }
});

// Listen for storage changes to react to mode changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.mode) {
    // Mode was changed, reapply theme
    chrome.storage.local.get(['mode', 'manualDarkModeStart', 'manualDarkModeEnd'], (result) => {
      const currentMode = result.mode || 'manual';
      const start = result.manualDarkModeStart || '17:30';
      const end = result.manualDarkModeEnd || '07:00';
      const isDark = shouldBeDarkMode(currentMode, start, end);
      applyTheme(isDark);
      updateContextMenu();
    });
  }
});
