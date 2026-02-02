document.addEventListener('DOMContentLoaded', function() {
  const currentMode = document.getElementById('currentMode');
  const controlMode = document.getElementById('controlMode');
  const aiModeButton = document.querySelector('.ai-mode-button');
  const darkModeStart = document.getElementById('darkModeStart');
  const darkModeEnd = document.getElementById('darkModeEnd');
  const goProButton = document.querySelector('.go-pro-button');
  const container = document.querySelector('.container');
  
  function updateStatus() {
    chrome.storage.local.get(['mode', 'manualDarkModeStart', 'manualDarkModeEnd'], (result) => {
      const now = new Date();
      const currentTime = now.getHours().toString().padStart(2, '0') + ':' + 
                         now.getMinutes().toString().padStart(2, '0');
      
      const currentModeValue = result.mode || 'manual';
      const isDarkMode = isDarkModeActive(currentTime, currentModeValue, result);
      
      currentMode.textContent = isDarkMode ? 'Dark Mode' : 'Light Mode';
      currentMode.className = isDarkMode ? 'dark' : 'light';
      
      // Update control display and button text based on mode
      if (currentModeValue === 'manual') {
        controlMode.textContent = 'Manual';
        aiModeButton.textContent = 'AI Mode';
        aiModeButton.classList.remove('manual-active');
        // Enable time selectors for manual mode
        darkModeStart.disabled = false;
        darkModeEnd.disabled = false;
        // Show user's saved manual times
        darkModeStart.value = result.manualDarkModeStart || '17:30';
        darkModeEnd.value = result.manualDarkModeEnd || '07:00';
      } else {
        controlMode.textContent = 'AI Mode';
        aiModeButton.textContent = 'Manual';
        aiModeButton.classList.add('manual-active');
        // Disable time selectors for AI mode
        darkModeStart.disabled = true;
        darkModeEnd.disabled = true;
        // Show AI times (6:30 PM - 8:30 AM)
        darkModeStart.value = '18:30';
        darkModeEnd.value = '08:30';
      }
      
      if (isDarkMode) {
        container.classList.add('dark-mode');
      } else {
        container.classList.remove('dark-mode');
      }
    });
  }
  
  function isDarkModeActive(currentTime, mode, storageResult) {
    if (mode === 'ai') {
      // AI Mode: Fixed times 6:30 PM to 8:30 AM
      return currentTime >= '18:30' || currentTime < '08:30';
    } else {
      // Manual Mode: User's selected times
      const start = storageResult.manualDarkModeStart || '17:30';
      const end = storageResult.manualDarkModeEnd || '07:00';
      
      if (start <= end) {
        return currentTime >= start && currentTime < end;
      } else {
        return currentTime >= start || currentTime < end;
      }
    }
  }
  
  // Handle AI Mode button toggle
  aiModeButton.addEventListener('click', () => {
    chrome.storage.local.get(['mode'], (result) => {
      const newMode = (result.mode || 'manual') === 'manual' ? 'ai' : 'manual';
      
      chrome.storage.local.set({ mode: newMode }, () => {
        updateStatus();
        // Notify background script of mode change
        chrome.runtime.sendMessage({ action: 'modeChanged', mode: newMode });
      });
    });
  });
  
  // Handle time changes (only active in manual mode)
  darkModeStart.addEventListener('change', () => {
    chrome.storage.local.get(['mode'], (result) => {
      if (result.mode === 'manual') {
        chrome.storage.local.set({ manualDarkModeStart: darkModeStart.value }, updateStatus);
      }
    });
  });
  
  darkModeEnd.addEventListener('change', () => {
    chrome.storage.local.get(['mode'], (result) => {
      if (result.mode === 'manual') {
        chrome.storage.local.set({ manualDarkModeEnd: darkModeEnd.value }, updateStatus);
      }
    });
  });
  
  // Handle Go Pro button
  goProButton.addEventListener('click', () => {
    // Open Go Pro URL in new tab
    chrome.tabs.create({ url: 'https://rankboost.pro/dark-auto-switcher-v3' });
  });
  
  updateStatus();
  setInterval(updateStatus, 1000);
});
