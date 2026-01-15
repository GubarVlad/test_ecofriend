// Main App Controller
import { auth, saveUserData, getUserData, syncUserData, isOnline } from './firebase.js';
import { storage } from './storage.js';
import { scanner } from './scanner.js';
import { gamification } from './gamification.js';
import { lang } from './lang.js';
import { initializeExtensions } from './app-extensions.js';
import { CONFIG, log, warn, error } from './constants.js';
import { barcodeScanner } from './barcode.js';

const WASTE_CONFIG = {
  plastic: { points: 10, weight: 0.03, emoji: '🧃', name: 'Пластик' },
  paper: { points: 8, weight: 0.008, emoji: '📄', name: 'Бумага' },
  glass: { points: 15, weight: 0.5, emoji: '🍾', name: 'Стекло' },
  metal: { points: 12, weight: 0.012, emoji: '🥫', name: 'Металл' },
  organic: { points: 6, weight: 0.02, emoji: '🍎', name: 'Органика' },
  other: { points: 5, weight: 0.02, emoji: '🗑️', name: 'Другое' }
};

class App {
  constructor() {
    this.currentScreen = 'welcome';
    this.user = null;
    this.stats = {
      items: 0,
      weight: 0,
      points: 0,
      level: 1,
      plastic: 0,
      paper: 0,
      glass: 0,
      metal: 0,
      history: []
    };
    this.syncInterval = null;
    this.lastSyncTime = 0;
    this.selectedPeriod = '7';
    this.settings = {
      autoSync: true,
      syncInterval: 30,
      notifications: true,
      sound: true,
      vibration: true,
      confirmScans: true
    };
    this.pendingRecognition = null;
    this.extensions = null;
    this.badgeUpdateInterval = null;
    this.wrongRecognitionCount = 0;
    this.manualWasteContext = null;
    this.barcodeVideoElement = null;
    this.barcodeStream = null;
    
    this.init();
  }

  async init() {
    log('🚀 App initializing...');
    
    try {
      // FIXED: Ensure DOM is fully loaded before initializing
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve, { once: true });
        });
      }
      
      // Load user and settings from storage
      await this.loadUser();
      await this.loadSettings();
      
      // Initialize event listeners
      this.initEventListeners();
      
      // Initialize scanner with error handling
      try {
        if (scanner && scanner.init) {
          await scanner.init();
        }
      } catch (e) {
        warn('⚠️ Scanner initialization deferred:', e.message);
      }
      
      await new Promise(resolve => setTimeout(resolve, CONFIG.MODULE_INIT_DELAY_MS));
      
      try {
        this.extensions = initializeExtensions(this);
      } catch (e) {
        warn('⚠️ Extensions initialization deferred:', e.message);
      }
      
      // Check if user is logged in
      if (this.user) {
        this.showScreen('main');
        this.updateUI();
        
        // Start auto-sync timer
        if (this.settings.autoSync) {
          this.startAutoSync();
        }
        
        // Update pending scans badge immediately and set up periodic updates
        await this.updatePendingScansBadge();
        this.startBadgeUpdateInterval();
        
        log('✅ User logged in');
      } else {
        this.showScreen('welcome');
        log('👋 Welcome screen');
      }
      
      // Listen for online/offline events
      window.addEventListener('online', () => {
        this.showToast('🌐 Соединение восстановлено');
        if (this.user && this.settings.autoSync) {
          this.performSync();
        }
      });
      
      window.addEventListener('offline', () => {
        this.showToast('📡 Нет соединения (работаем офлайн)');
      });

      // Save data before page unload to prevent data loss
      window.addEventListener('beforeunload', async (e) => {
        if (this.user) {
          await storage.saveStats(this.stats);
          const pendingCount = await storage.getPendingScansCount();
          if (pendingCount > 0 && isOnline()) {
            // Don't block, but show warning if there are unsynced scans
            e.preventDefault();
            e.returnValue = `У вас ${pendingCount} несинхронизированных сканирований. Данные сохранены локально и будут синхронизированы при следующем посещении.`;
          }
        }
      });

      // Handle visibility change to sync when user returns
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.user) {
          this.updatePendingScansBadge();
          if (isOnline() && this.settings.autoSync) {
            this.performSync();
          }
        }
      });
      
      log('✅ App initialized');
    } catch (err) {
      error('❌ App initialization error:', err);
      // Show error to user
      document.body.innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: Arial;">
          <h2>⚠️ Ошибка загрузки</h2>
          <p>Не удалось загрузить приложение. Попробуйте обновить страницу.</p>
          <button onclick="window.location.reload()" style="padding: 10px 20px; background: #22c55e; color: white; border: none; border-radius: 8px; cursor: pointer;">
            Обновить
          </button>
        </div>
      `;
    }
  }

  async loadUser() {
    try {
      const savedUser = await storage.getUser();
      if (savedUser) {
        this.user = savedUser;
        const savedStats = await storage.getStats();
        if (savedStats) {
          this.stats = { ...this.stats, ...savedStats };
        }
        this.lastSyncTime = await storage.getLastSyncTime();
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  }

  async loadSettings() {
    try {
      this.settings = await storage.getSettings();
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  // Helper method to attach button listeners reliably
  attachButtonListener(buttonId, buttonName, handler) {
    // Try immediately
    let button = document.getElementById(buttonId);
    
    if (button) {
      button.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log(`✅ ${buttonName} button clicked`);
        handler();
      };
      console.log(`✅ ${buttonName} button listener attached`);
    } else {
      console.warn(`⚠️ ${buttonName} button not found, will retry`);
      
      // Retry after a short delay
      setTimeout(() => {
        button = document.getElementById(buttonId);
        if (button) {
          button.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`✅ ${buttonName} button clicked (delayed attach)`);
            handler();
          };
          console.log(`✅ ${buttonName} button listener attached (delayed)`);
        } else {
          console.error(`❌ ${buttonName} button still not found!`);
        }
      }, 500);
    }
  }

  initEventListeners() {
    console.log('📋 Initializing event listeners...');
    
    // Welcome screen
    const btnGetStarted = document.getElementById('btn-get-started');
    const btnHaveAccount = document.getElementById('btn-have-account');
    
    if (btnGetStarted) btnGetStarted.addEventListener('click', () => this.showScreen('register'));
    if (btnHaveAccount) btnHaveAccount.addEventListener('click', () => this.showScreen('login'));

    // Back buttons
    const btnBackRegister = document.getElementById('btn-back-from-register');
    const btnBackLogin = document.getElementById('btn-back-from-login');
    
    if (btnBackRegister) btnBackRegister.addEventListener('click', () => this.showScreen('welcome'));
    if (btnBackLogin) btnBackLogin.addEventListener('click', () => this.showScreen('welcome'));

    // Forms
    const registerForm = document.getElementById('register-form');
    const loginForm = document.getElementById('login-form');
    
    if (registerForm) {
      registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRegister();
      });
    }
    
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleLogin();
      });
    }

    // Bottom navigation - FIXED: Properly handle all screens
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const screen = item.dataset.screen;
        console.log('📱 Navigation to screen:', screen);
        
        // Update active state
        document.querySelectorAll('.nav-item').forEach(nav => {
          nav.classList.remove('active');
        });
        item.classList.add('active');
        
        // Navigate to screen
        this.navigateToScreen(screen);
      });
    });

    // Scan button
    const btnScan = document.getElementById('btn-scan');
    if (btnScan) btnScan.addEventListener('click', () => this.openScanner());

    // Scan by barcode button
    const btnScanBarcode = document.getElementById('btn-scan-barcode');
    const btnRecyclingGuide = document.getElementById('btn-recycling-guide');
    if (btnScanBarcode) btnScanBarcode.addEventListener('click', () => this.openBarcodeScanner());
    if (btnRecyclingGuide) btnRecyclingGuide.addEventListener('click', () => this.showScreen('recycling-guide'));

    // Scanner controls
    const btnCloseScanner = document.getElementById('btn-close-scanner');
    const btnCapture = document.getElementById('btn-capture');
    
    if (btnCloseScanner) btnCloseScanner.addEventListener('click', () => this.closeScanner());
    if (btnCapture) btnCapture.addEventListener('click', () => this.captureAndRecognize());

    // Barcode scanner close button
    const btnCloseBarcode = document.getElementById('btn-close-barcode');
    if (btnCloseBarcode) btnCloseBarcode.addEventListener('click', () => this.closeBarcodeScanner());

    // Logout
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) btnLogout.addEventListener('click', () => this.handleLogout());

    // Settings button - COMPLETELY REWRITTEN
    this.attachButtonListener('btn-settings', 'Settings', () => {
      console.log('⚙️ Settings clicked - opening modal');
      this.showSettingsModal();
    });

    // Notifications button - COMPLETELY REWRITTEN  
    this.attachButtonListener('btn-notifications', 'Notifications', () => {
      console.log('🔔 Notifications clicked - showing info');
      this.showNotifications();
    });

    // Period selector for statistics
    document.querySelectorAll('.period-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedPeriod = btn.dataset.period;
        console.log('📊 Period changed to:', this.selectedPeriod);
        await this.updateActivityChart();
        await this.updateStatsForPeriod();
      });
    });

    // Confirmation modal buttons
    const btnConfirmYes = document.getElementById('btn-confirm-yes');
    const btnConfirmNo = document.getElementById('btn-confirm-no');
    
    if (btnConfirmYes) {
      btnConfirmYes.addEventListener('click', async () => {
        if (this.pendingRecognition) {
          const { result, config } = this.pendingRecognition;
          const modal = document.getElementById('confirmation-modal');
          modal.classList.remove('show');
          this.wrongRecognitionCount = 0;
          await this.saveScanResult(result, config);
          this.pendingRecognition = null;
        }
      });
    }
    
    if (btnConfirmNo) {
      btnConfirmNo.addEventListener('click', () => {
        const modal = document.getElementById('confirmation-modal');
        modal.classList.remove('show');
        this.pendingRecognition = null;
        this.wrongRecognitionCount += 1;

        if (this.wrongRecognitionCount >= 3) {
          this.wrongRecognitionCount = 0;
          this.showWasteTypeModal({ source: 'camera' });
        } else {
          // Re-enable capture button for rescan
          const captureBtn = document.getElementById('btn-capture');
          if (captureBtn) {
            captureBtn.disabled = false;
          }
          this.showToast('Попробуйте еще раз');
        }
      });
    }

    // Manual waste type modal - FIXED: Use event delegation for dynamic elements
    document.addEventListener('click', async (e) => {
      const wasteOption = e.target.closest('.waste-option');
      if (wasteOption) {
        const type = wasteOption.dataset.type;
        console.log('🗑️ Waste type selected:', type);
        await this.handleManualWasteSelection(type);
      }
    });

    const btnCloseWasteModal = document.getElementById('btn-close-waste-modal');
    if (btnCloseWasteModal) {
      btnCloseWasteModal.addEventListener('click', () => {
        console.log('❌ Closing waste type modal');
        this.hideWasteTypeModal();
      });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.currentScreen === 'scanner') {
        if (e.key === 'Escape') {
          this.closeScanner();
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          const captureBtn = document.getElementById('btn-capture');
          if (captureBtn && !captureBtn.disabled) {
            this.captureAndRecognize();
          }
        }
      }
    });
  }

  async handleRegister() {
    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
      this.showToast('Заполните все поля');
      return;
    }

    if (password.length < 6) {
      this.showToast('Пароль должен быть минимум 6 символов');
      return;
    }

    this.showLoading(true);

    try {
      // Register with Firebase
      const userCredential = await auth.register(email, password);
      
      this.user = {
        uid: userCredential.user.uid,
        email: email,
        name: name,
        avatar: name.charAt(0).toUpperCase()
      };

      // Save to local storage
      await storage.saveUser(this.user);
      await storage.saveStats(this.stats);

      // Save to Firebase
      await saveUserData(this.user.uid, {
        name: name,
        email: email,
        createdAt: new Date().toISOString()
      });

      this.showToast('✅ Аккаунт создан!');
      this.showScreen('main');
      this.updateUI();
      
      // Start auto-sync
      if (this.settings.autoSync) {
        this.startAutoSync();
      }
    } catch (error) {
      console.error('Registration error:', error);
      this.showToast('❌ Ошибка регистрации: ' + error.message);
    } finally {
      this.showLoading(false);
    }
  }

  async handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
      this.showToast('Заполните все поля');
      return;
    }

    this.showLoading(true);

    try {
      // Login with Firebase
      const userCredential = await auth.login(email, password);
      
      // Get user data from Firebase
      const userData = await getUserData(userCredential.user.uid);
      
      this.user = {
        uid: userCredential.user.uid,
        email: email,
        name: userData.name || 'Пользователь',
        avatar: (userData.name || 'U').charAt(0).toUpperCase()
      };

      // Load stats from Firebase
      if (userData.stats) {
        this.stats = { ...this.stats, ...userData.stats };
      }
      
      // FIXED: Load gamification data from Firebase (coins, achievements)
      if (userData.gamification) {
        gamification.data = { ...gamification.data, ...userData.gamification };
        await storage.set('gamification', gamification.data);
        console.log('✅ Loaded gamification data from Firebase');
      }

      // Save to local storage
      await storage.saveUser(this.user);
      await storage.saveStats(this.stats);

      this.showToast('✅ Вход выполнен!');
      this.showScreen('main');
      this.updateUI();
      
      // Start auto-sync
      if (this.settings.autoSync) {
        this.startAutoSync();
      }
      
      this.updatePendingScansBadge();
    } catch (error) {
      console.error('Login error:', error);
      this.showToast('❌ Неверный email или пароль');
    } finally {
      this.showLoading(false);
    }
  }

  async handleLogout() {
    // Check for unsynced scans
    const pendingCount = await storage.getPendingScansCount();
    
    let confirmMessage = 'Вы уверены, что хотите выйти?';
    if (pendingCount > 0) {
      confirmMessage = `У вас ${pendingCount} несинхронизированных сканирований. При выходе данные будут сохранены локально. Продолжить?`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }

    this.showLoading(true);

    try {
      // Save all data locally before logout
      await storage.saveStats(this.stats);
      
      // Try to sync data before logout if online
      if (this.user && isOnline() && pendingCount > 0) {
        this.showToast('Синхронизация перед выходом...');
        await this.performSync(true);
      }

      // Stop intervals
      this.stopAutoSync();
      this.stopBadgeUpdateInterval();

      await auth.logout();

      // Note: We don't clear storage anymore to preserve offline data
      // Only clear auth-related data
      await storage.delete('user');

      this.user = null;
      this.stats = {
        items: 0,
        weight: 0,
        points: 0,
        level: 1,
        plastic: 0,
        paper: 0,
        glass: 0,
        metal: 0,
        history: []
      };

      this.showToast('Вы вышли из аккаунта');
      this.showScreen('welcome');
    } catch (error) {
      console.error('Logout error:', error);
      this.showToast('Ошибка при выходе');
    } finally {
      this.showLoading(false);
    }
  }

  showScreen(screenId) {
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
      screen.classList.remove('active', 'prev');
    });

    // Show requested screen
    const screen = document.getElementById(`${screenId}-screen`);
    if (screen) {
      screen.classList.add('active');
      this.currentScreen = screenId;
    } else {
      console.warn(`⚠️ Screen not found: ${screenId}-screen`);
    }

    // Show/hide bottom nav - FIXED: Added quests and shop screens
    const showNav = ['main', 'stats', 'profile', 'quests', 'shop', 'leaderboard', 'battles'].includes(screenId);
    const bottomNav = document.getElementById('bottom-nav');
    if (bottomNav) {
      bottomNav.classList.toggle('visible', showNav);
      // Force repaint on Safari
      if (showNav) {
        bottomNav.style.display = 'flex';
      } else {
        bottomNav.style.display = 'none';
      }
    }
  }

  navigateToScreen(screenId) {
    console.log('🧭 Navigating to screen:', screenId);
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.screen === screenId);
    });

    this.showScreen(screenId);
    
    // Update UI and trigger extension updates
    this.updateUI();
    
    // Trigger extension screen handlers
    if (this.extensions) {
      if (screenId === 'leaderboard') {
        this.extensions.showLeaderboardScreen();
      } else if (screenId === 'quests') {
        this.extensions.showQuestsScreen();
      } else if (screenId === 'shop') {
        this.extensions.showShopScreen();
      } else if (screenId === 'battles') {
        this.extensions.showBattlesScreen();
      } else if (screenId === 'recycling-guide') {
        // Recycling guide screen - no special handler needed
      }
    }
  }

  async openScanner() {
    this.showScreen('scanner');
    
    try {
      await scanner.start();
      document.getElementById('btn-capture').disabled = false;
    } catch (error) {
      console.error('Scanner error:', error);
      this.showToast('❌ Не удалось запустить камеру');
      this.closeScanner();
    }
  }

  closeScanner() {
    scanner.stop();
    this.showScreen('main');
  }

  // BARCODE SCANNER - COMPLETELY REWRITTEN
  async openBarcodeScanner() {
    console.log('📦 Opening barcode scanner...');
    this.showScreen('barcode');

    try {
      // Ensure QuaggaJS is loaded
      if (!barcodeScanner.quaggaLoaded) {
        this.showToast('Загрузка сканера...');
        await barcodeScanner.init();
      }

      const container = document.getElementById('barcode-camera-container');
      const placeholder = document.getElementById('barcode-placeholder');
      const resultEl = document.getElementById('barcode-result');
      
      if (!container) {
        console.error('❌ Barcode container not found');
        return;
      }

      // Hide result initially
      if (resultEl) {
        resultEl.style.display = 'none';
      }

      // Show placeholder while initializing
      if (placeholder) {
        placeholder.style.display = 'flex';
      }

      // Clear previous content but keep placeholder structure
      const existingVideo = container.querySelector('video');
      if (existingVideo) {
        existingVideo.remove();
      }

      // Create video element for QuaggaJS
      const video = document.createElement('video');
      video.id = 'barcode-video';
      video.setAttribute('playsinline', '');
      video.setAttribute('autoplay', '');
      video.setAttribute('muted', '');
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.backgroundColor = '#000'; // Black background while loading

      container.appendChild(video);

      // Start scanning with QuaggaJS
      await barcodeScanner.startScanning(video);
      
      // Hide placeholder once video starts
      setTimeout(() => {
        if (placeholder) {
          placeholder.style.display = 'none';
        }
      }, 500);
      
      this.barcodeVideoElement = video;
      console.log('✅ Barcode scanner started');
    } catch (err) {
      console.error('❌ Barcode scanner error:', err);
      this.showToast('❌ Не удалось запустить сканер. Выберите тип отходов вручную.');
      // If camera fails, immediately show waste type selection
      setTimeout(() => {
        this.showWasteTypeModal({ source: 'barcode' });
      }, 1000);
    }
  }

  closeBarcodeScanner() {
    console.log('🛑 Closing barcode scanner...');
    
    try {
      barcodeScanner.stopScanning();
    } catch (e) {
      console.warn('⚠️ Error stopping barcode scanner:', e);
    }

    // QuaggaJS handles stream cleanup, but ensure it's stopped
    if (this.barcodeVideoElement) {
      this.barcodeVideoElement.srcObject = null;
      this.barcodeVideoElement = null;
    }

    const container = document.getElementById('barcode-camera-container');
    const placeholder = document.getElementById('barcode-placeholder');
    
    if (container) {
      container.innerHTML = '';
      
      if (placeholder) {
        placeholder.style.display = 'flex';
        container.appendChild(placeholder);
      }
    }

    // Clear barcode result display
    const resultEl = document.getElementById('barcode-result');
    if (resultEl) {
      const infoRows = resultEl.querySelectorAll('.barcode-info-row span:last-child');
      infoRows.forEach(span => span.textContent = '—');
    }

    this.showScreen('main');
  }

  async captureAndRecognize() {
    const resultDiv = document.getElementById('scanner-result');
    const captureBtn = document.getElementById('btn-capture');
    
    captureBtn.disabled = true;
    resultDiv.textContent = 'Распознавание...';
    resultDiv.classList.add('show');

    // Vibration feedback
    if (this.settings.vibration && navigator.vibrate) {
      navigator.vibrate(50);
    }

    // Flash effect
    scanner.flashEffect();

    try {
      const result = await scanner.predict();
      
      if (!result || result.type === 'nothing' || result.confidence < 0.7) {
        resultDiv.textContent = '❌ Предмет не распознан';
        setTimeout(() => {
          resultDiv.classList.remove('show');
          captureBtn.disabled = false;
        }, 2000);
        return;
      }

      const config = WASTE_CONFIG[result.type];
      if (!config) {
        resultDiv.textContent = '❌ Неизвестный тип отхода';
        setTimeout(() => {
          resultDiv.classList.remove('show');
          captureBtn.disabled = false;
        }, 2000);
        return;
      }

      resultDiv.classList.remove('show');

      // Check if confirmation is enabled
      if (this.settings.confirmScans) {
        // Store the pending recognition
        // DON'T reset wrongRecognitionCount here - only reset on successful save
        this.pendingRecognition = { result, config };
        // Show confirmation popup
        this.showConfirmationPopup(config);
      } else {
        // Save directly without confirmation
        this.wrongRecognitionCount = 0; // Reset counter on direct save
        await this.saveScanResult(result, config);
      }

    } catch (error) {
      console.error('Recognition error:', error);
      resultDiv.textContent = '❌ Ошибка распознавания';
      setTimeout(() => {
        resultDiv.classList.remove('show');
        captureBtn.disabled = false;
      }, 2000);
    }
  }

  showWasteTypeModal(context = {}) {
    console.log('📋 Showing waste type modal with context:', context);
    const modal = document.getElementById('waste-type-modal');
    if (!modal) {
      console.error('❌ Waste type modal not found!');
      return;
    }
    this.manualWasteContext = context;
    modal.classList.add('show');
    console.log('✅ Waste type modal shown');
  }

  hideWasteTypeModal() {
    console.log('📋 Hiding waste type modal');
    const modal = document.getElementById('waste-type-modal');
    if (!modal) return;
    modal.classList.remove('show');
    this.manualWasteContext = null;
  }

  async handleManualWasteSelection(type) {
    console.log('✅ Manual waste selection:', type);
    
    const config = WASTE_CONFIG[type];
    if (!config) {
      console.error('❌ Unknown waste type:', type);
      this.showToast('Неизвестный тип отхода');
      return;
    }

    const context = this.manualWasteContext || {};
    const source = context.source || 'camera_manual';
    const barcode = context.barcode || null;

    const result = {
      type,
      confidence: 1.0,
      source,
      barcode
    };

    // Hide modal FIRST
    this.hideWasteTypeModal();
    
    // Reset counter on manual selection
    this.wrongRecognitionCount = 0;

    const extra = {
      source: source === 'barcode' ? 'barcode_manual' : source,
      barcode
    };

    // Если это был штрихкод неизвестного продукта – запомним выбор пользователя
    if (barcode && (source === 'barcode' || source === 'barcode_manual')) {
      try {
        await barcodeScanner.addProduct(barcode, type, config.name, 'Пользователь');
        console.log('✅ Saved custom product mapping:', barcode, '->', type);
      } catch (e) {
        console.warn('⚠️ Failed to save custom product mapping', e);
      }
    }

    // Save the scan result
    await this.saveScanResult(result, config, extra);
    console.log('✅ Manual waste selection saved');
  }

  showConfirmationPopup(config) {
    const modal = document.getElementById('confirmation-modal');
    const icon = document.getElementById('confirmation-icon');
    const title = document.getElementById('confirmation-title');
    const message = document.getElementById('confirmation-message');

    // Update modal content
    icon.textContent = config.emoji;
    title.textContent = config.name;
    message.textContent = 'Распознавание верное?';

    // Show modal
    modal.classList.add('show');

    // Sound effect
    if (this.settings.sound) {
      this.playSuccessSound();
    }
  }

  async saveScanResult(result, config, extra = {}) {
    // Add to stats
    this.stats.items++;
    this.stats.weight += config.weight;
    this.stats.points += config.points;
    this.stats[result.type]++;

    // Check level up
    const leveledUp = this.checkLevelUp();

    // Add to history
    const historyItem = {
      type: result.type,
      name: config.name,
      emoji: config.emoji,
      points: config.points,
      weight: config.weight,
      confidence: result.confidence,
      timestamp: new Date().toISOString(),
      ...extra
    };
    this.stats.history.unshift(historyItem);
    if (this.stats.history.length > 100) {
      this.stats.history = this.stats.history.slice(0, 100);
    }

    // Save locally
    await storage.saveStats(this.stats);

    // Add to pending scans queue
    await storage.addPendingScan(historyItem);
    console.log('📝 Added scan to pending queue');
    
    // Integrate gamification features
    if (this.extensions) {
      await this.extensions.enhanceScanWithGamification(historyItem, this.stats);
    }
    
    // Update badge immediately
    await this.updatePendingScansBadge();
    console.log('🔄 Badge updated after scan');

    // Vibration feedback
    if (this.settings.vibration && navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    // Close scanner and update UI
    if (extra.source === 'barcode' || extra.source === 'barcode_manual') {
      this.closeBarcodeScanner();
    } else {
      this.closeScanner();
    }
    this.updateUI();
    
    // Show success message
    if (leveledUp) {
      this.showToast(`🎉 Уровень ${this.stats.level}! +${config.points} баллов!`);
    } else {
      this.showToast(`✅ +${config.points} баллов!`);
    }
  }

  checkLevelUp() {
    const pointsPerLevel = 300;
    const newLevel = Math.floor(this.stats.points / pointsPerLevel) + 1;
    
    if (newLevel > this.stats.level) {
      this.stats.level = newLevel;
      return true;
    }
    return false;
  }

  // BADGE UPDATE SYSTEM
  startBadgeUpdateInterval() {
    // Update badge every 5 seconds to ensure it's always accurate
    this.badgeUpdateInterval = setInterval(() => {
      this.updatePendingScansBadge();
    }, 5000);
  }

  stopBadgeUpdateInterval() {
    if (this.badgeUpdateInterval) {
      clearInterval(this.badgeUpdateInterval);
      this.badgeUpdateInterval = null;
    }
  }

  // AUTO-SYNC SYSTEM
  startAutoSync() {
    const intervalMs = this.settings.syncInterval * 60 * 1000;
    
    this.syncInterval = setInterval(() => {
      this.performSync();
    }, intervalMs);
    
    console.log(`🔄 Auto-sync started (every ${this.settings.syncInterval} minutes)`);
  }

  stopAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 Auto-sync stopped');
    }
  }

  async performSync(force = false) {
    if (!this.user) {
      console.log('⚠️ No user - sync skipped');
      return;
    }

    // Check if online
    if (!isOnline()) {
      console.log('📡 Offline - sync skipped');
      return;
    }

    // Check if enough time has passed since last sync
    const now = Date.now();
    const timeSinceLastSync = now - this.lastSyncTime;
    const minSyncInterval = this.settings.syncInterval * 60 * 1000;

    if (!force && timeSinceLastSync < minSyncInterval) {
      console.log('⏭️ Sync skipped - not enough time passed');
      return;
    }

    try {
      console.log('🔄 Starting sync...');
      console.log('👤 User UID:', this.user.uid);
      
      // IMPORTANT: Check Firebase auth state
      const { firebaseAuth } = await import('./firebase.js');
      const currentUser = firebaseAuth.currentUser;
      
      if (!currentUser) {
        console.error('❌ Firebase user not authenticated');
        this.showToast('⚠️ Необходимо войти снова');
        return;
      }
      
      if (currentUser.uid !== this.user.uid) {
        console.error('❌ User ID mismatch between app and Firebase');
        console.error('App user:', this.user.uid);
        console.error('Firebase user:', currentUser.uid);
        this.showToast('⚠️ Ошибка аутентификации');
        return;
      }
      
      console.log('✅ Firebase auth verified');
      
      const pendingScans = await storage.getPendingScans();
      
      if (pendingScans.length === 0) {
        console.log('ℹ️ No pending scans to sync');
        await storage.saveLastSyncTime(now);
        this.lastSyncTime = now;
        return;
      }

      this.showToast(`🔄 Синхронизация ${pendingScans.length} сканирований...`);

      // FIXED: Get gamification data to sync coins and achievements
      const gamificationData = gamification.data;
      
      // Sync data including gamification and user info for leaderboard
      const result = await syncUserData(
        this.user.uid, 
        this.stats, 
        pendingScans, 
        gamificationData,
        { name: this.user.name, avatar: this.user.avatar }
      );

      if (result.success) {
        // Mark scans as synced
        const scanIds = pendingScans.map(s => s.id);
        await storage.markScansAsSynced(scanIds);
        
        // Update last sync time
        await storage.saveLastSyncTime(now);
        this.lastSyncTime = now;
        
        // Clear old synced scans
        await storage.clearSyncedScans();
        
        this.updatePendingScansBadge();
        this.showToast(`✅ Синхронизировано ${result.count} сканирований`);
        console.log(`✅ Sync complete - ${result.count} scans uploaded`);
      } else {
        this.showToast('⚠️ Ошибка синхронизации');
        console.error('Sync failed:', result.error);
      }
    } catch (error) {
      console.error('Sync error:', error);
      this.showToast('⚠️ Ошибка синхронизации');
    }
  }

  async updatePendingScansBadge() {
    try {
      const count = await storage.getPendingScansCount();
      const badge = document.getElementById('pending-scans-badge');
      
      if (badge) {
        badge.textContent = count;
        console.log(`🔔 Badge update: ${count} pending scans`);
        
        // Show badge if count > 0, hide if 0
        if (count > 0) {
          badge.classList.add('visible');
          badge.classList.add('has-pending');
          console.log('✅ Badge visible');
        } else {
          badge.classList.remove('visible');
          badge.classList.remove('has-pending');
          console.log('👻 Badge hidden (no pending scans)');
        }
      } else {
        console.error('❌ Badge element not found!');
      }
    } catch (error) {
      console.error('❌ Error updating badge:', error);
    }
  }

  updateUI() {
    if (!this.user) return;

    // Update user info
    const updateElements = (ids, value) => {
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      });
    };

    updateElements(
      ['user-name-display', 'profile-name'],
      this.user.name
    );

    updateElements(
      ['user-avatar-text', 'profile-avatar-text'],
      this.user.avatar
    );

    updateElements(['profile-email'], this.user.email);

    // Update stats
    updateElements(
      ['user-points', 'profile-points', 'total-points-stats'],
      this.stats.points
    );

    updateElements(
      ['user-level', 'profile-level'],
      this.stats.level
    );

    updateElements(['profile-items', 'total-items'], this.stats.items);

    const weightEl = document.getElementById('total-weight');
    if (weightEl) weightEl.textContent = this.stats.weight.toFixed(1) + ' кг';

    // Update waste type counters
    updateElements(['stat-plastic'], this.stats.plastic);
    updateElements(['stat-paper'], this.stats.paper);
    updateElements(['stat-glass'], this.stats.glass);
    updateElements(['stat-metal'], this.stats.metal);

    // Update breakdown with progress bars
    const wasteConfig = {
      plastic: { points: 10 },
      paper: { points: 8 },
      glass: { points: 15 },
      metal: { points: 12 }
    };

    const maxCount = Math.max(this.stats.plastic, this.stats.paper, this.stats.glass, this.stats.metal, 1);

    ['plastic', 'paper', 'glass', 'metal'].forEach(type => {
      const count = this.stats[type];
      const points = count * wasteConfig[type].points;
      const percent = (count / maxCount) * 100;
      
      const countEl = document.getElementById(`breakdown-${type}`);
      const pointsEl = document.getElementById(`breakdown-${type}-points`);
      const progressEl = document.getElementById(`progress-${type}`);
      
      if (countEl) countEl.textContent = count;
      if (pointsEl) pointsEl.textContent = points + ' б';
      if (progressEl) progressEl.style.width = percent + '%';
    });

    // Update progress bar
    const pointsPerLevel = 300;
    const currentLevelPoints = this.stats.points % pointsPerLevel;
    const progressPercent = (currentLevelPoints / pointsPerLevel) * 100;

    const progressFill = document.getElementById('progress-fill');
    if (progressFill) {
      progressFill.style.width = progressPercent + '%';
    }

    const progressCurrent = document.getElementById('progress-current');
    if (progressCurrent) {
      progressCurrent.textContent = currentLevelPoints;
    }

    // Update activity list
    this.updateActivityList();

    // Update scan history
    this.updateScanHistory();

    // Update achievements
    this.updateAchievements();

    // Update activity chart if on stats screen
    if (this.currentScreen === 'stats') {
      this.updateActivityChart();
    }
    
    // Update extended UI elements (gamification, eco footprint, etc.)
    if (this.extensions) {
      this.extensions.updateExtendedUI();
    }
  }

  updateActivityList() {
    const activityList = document.getElementById('activity-list');
    if (!activityList) return;

    const recentHistory = this.stats.history.slice(0, 5);
    
    if (recentHistory.length === 0) {
      activityList.innerHTML = `
        <div class="empty-state">
          <p>Пока нет активности</p>
          <p class="empty-state-hint">Отсканируйте ваш первый предмет!</p>
        </div>
      `;
      return;
    }

    activityList.innerHTML = recentHistory.map(item => {
      const date = new Date(item.timestamp);
      const timeAgo = this.getTimeAgo(date);
      
      return `
        <div class="activity-item">
          <div class="activity-icon">${item.emoji}</div>
          <div class="activity-info">
            <div class="activity-title">${item.name}</div>
            <div class="activity-time">${timeAgo}</div>
          </div>
          <div class="activity-points">+${item.points}</div>
        </div>
      `;
    }).join('');
  }

  updateScanHistory() {
    const historyContainer = document.getElementById('scan-history');
    if (!historyContainer) return;

    if (this.stats.history.length === 0) {
      historyContainer.innerHTML = '<div class="empty-state"><p>История пуста</p></div>';
      return;
    }

    historyContainer.innerHTML = this.stats.history.map(item => {
      const date = new Date(item.timestamp);
      const dateStr = date.toLocaleDateString('ru-RU', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `
        <div class="history-item">
          <div class="history-icon">${item.emoji}</div>
          <div class="history-info">
            <div class="history-type">${item.name}</div>
            <div class="history-date">${dateStr}</div>
          </div>
          <div class="history-points">+${item.points}</div>
        </div>
      `;
    }).join('');
  }

  updateAchievements() {
    // First scan achievement
    const firstScanCard = document.querySelector('.achievement-card:nth-child(1)');
    if (firstScanCard && this.stats.items >= 1) {
      firstScanCard.classList.remove('locked');
      firstScanCard.classList.add('unlocked');
    }

    // 100 points achievement
    const pointsCard = document.querySelector('.achievement-card:nth-child(2)');
    if (pointsCard && this.stats.points >= 100) {
      pointsCard.classList.remove('locked');
      pointsCard.classList.add('unlocked');
    }

    // Level 5 achievement
    const levelCard = document.querySelector('.achievement-card:nth-child(3)');
    if (levelCard && this.stats.level >= 5) {
      levelCard.classList.remove('locked');
      levelCard.classList.add('unlocked');
    }
  }

  getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'только что';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин назад`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч назад`;
    return `${Math.floor(seconds / 86400)} дн назад`;
  }

  // SETTINGS MODAL
  async showSettingsModal() {
    console.log('🔧 showSettingsModal called');
    const modal = document.getElementById('settings-modal');
    
    if (!modal) {
      console.error('❌ Settings modal element not found in DOM!');
      this.showToast('❌ Settings modal not available');
      return;
    }

    console.log('✅ Modal found, loading settings...');

    try {
      // Load current settings
      const autoSyncEl = document.getElementById('setting-auto-sync');
      const notifEl = document.getElementById('setting-notifications');
      const soundEl = document.getElementById('setting-sound');
      const vibrationEl = document.getElementById('setting-vibration');
      const confirmScansEl = document.getElementById('setting-confirm-scans');
      const intervalEl = document.getElementById('setting-sync-interval');
      const languageEl = document.getElementById('setting-language'); // FIXED: Added language selector
      
      if (autoSyncEl) autoSyncEl.checked = this.settings.autoSync;
      if (notifEl) notifEl.checked = this.settings.notifications;
      if (soundEl) soundEl.checked = this.settings.sound;
      if (vibrationEl) vibrationEl.checked = this.settings.vibration;
      if (confirmScansEl) confirmScansEl.checked = this.settings.confirmScans;
      if (intervalEl) intervalEl.value = this.settings.syncInterval;
      if (languageEl) languageEl.value = lang.getLanguage(); // FIXED: Set current language

      // Update storage info
      const storageInfo = await storage.getStorageInfo();
      const storageInfoEl = document.getElementById('storage-info');
      if (storageInfoEl) {
        storageInfoEl.textContent = storageInfo 
          ? `${storageInfo.usageInMB} MB / ${storageInfo.quotaInMB} MB`
          : 'Недоступно';
      }

      // Update pending scans count
      const pendingCount = await storage.getPendingScansCount();
      const pendingInfoEl = document.getElementById('pending-scans-info');
      if (pendingInfoEl) {
        pendingInfoEl.textContent = pendingCount;
      }

      console.log('✅ Settings loaded, showing modal');
      
      // Show modal
      modal.classList.add('show');
      console.log('✅ Modal shown with class "show"');

      // Setup event listeners if not already set up
      if (!this.settingsListenersInitialized) {
        this.initSettingsListeners();
        this.settingsListenersInitialized = true;
      }
    } catch (error) {
      console.error('❌ Error showing settings modal:', error);
      this.showToast('❌ Error loading settings');
    }
  }

  initSettingsListeners() {
    const modal = document.getElementById('settings-modal');
    
    // Close button
    document.getElementById('btn-close-settings')?.addEventListener('click', () => {
      this.hideSettingsModal();
    });

    // Click outside to close
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.hideSettingsModal();
      }
    });

    // Auto-sync toggle
    document.getElementById('setting-auto-sync')?.addEventListener('change', async (e) => {
      this.settings.autoSync = e.target.checked;
      await storage.saveSettings(this.settings);
      
      if (this.settings.autoSync) {
        this.startAutoSync();
        this.showToast('✅ Автосинхронизация включена');
      } else {
        this.stopAutoSync();
        this.showToast('⏸️ Автосинхронизация отключена');
      }
    });

    // Sync interval change
    document.getElementById('setting-sync-interval')?.addEventListener('change', async (e) => {
      this.settings.syncInterval = parseInt(e.target.value);
      await storage.saveSettings(this.settings);
      
      // Restart auto-sync with new interval
      if (this.settings.autoSync) {
        this.stopAutoSync();
        this.startAutoSync();
      }
      
      this.showToast(`✅ Интервал изменен: ${this.settings.syncInterval} мин`);
    });

    // FIXED: Language selector
    document.getElementById('setting-language')?.addEventListener('change', async (e) => {
      const newLang = e.target.value;
      lang.setLanguage(newLang);
      this.settings.language = newLang;
      await storage.saveSettings(this.settings);
      this.showToast('✅ Язык изменен / Language changed');
      // Reload page to apply language changes
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    });

    // Notifications toggle
    document.getElementById('setting-notifications')?.addEventListener('change', async (e) => {
      this.settings.notifications = e.target.checked;
      await storage.saveSettings(this.settings);
    });

    // Sound toggle
    document.getElementById('setting-sound')?.addEventListener('change', async (e) => {
      this.settings.sound = e.target.checked;
      await storage.saveSettings(this.settings);
    });

    // Vibration toggle
    document.getElementById('setting-vibration')?.addEventListener('change', async (e) => {
      this.settings.vibration = e.target.checked;
      await storage.saveSettings(this.settings);
    });

    // Confirm scans toggle
    document.getElementById('setting-confirm-scans')?.addEventListener('change', async (e) => {
      this.settings.confirmScans = e.target.checked;
      await storage.saveSettings(this.settings);
      const status = e.target.checked ? 'включено' : 'отключено';
      this.showToast(`Подтверждение сканирований ${status}`);
    });

    // Manual sync button
    document.getElementById('btn-manual-sync')?.addEventListener('click', async () => {
      await this.performSync(true);
    });

    // Clear cache button
    document.getElementById('btn-clear-cache')?.addEventListener('click', async () => {
      if (confirm('Очистить кэш? Несинхронизированные данные будут потеряны.')) {
        await storage.clear();
        this.showToast('✅ Кэш очищен');
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    });
  }

  hideSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  async showNotifications() {
    console.log('showNotifications called');
    const count = await storage.getPendingScansCount();
    const lastSync = this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleString('ru-RU') : 'Никогда';
    
    const message = `📊 Не синхронизировано: ${count}\n⏰ Последняя синхронизация: ${lastSync}`;
    console.log('Toast message:', message);
    this.showToast(message);
    
    // Offer manual sync
    if (count > 0 && isOnline()) {
      if (confirm(`Синхронизировать ${count} сканирований сейчас?`)) {
        await this.performSync(true);
      }
    }
  }

  playSuccessSound() {
    // Create simple success beep
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Sound not supported');
    }
  }

  async updateActivityChart() {
    const chartBars = document.getElementById('chart-bars');
    if (!chartBars) return;

    try {
      let days = this.selectedPeriod === 'all' ? 365 : parseInt(this.selectedPeriod);
      const periodStats = await storage.getStatsByPeriod(days);
      
      if (!periodStats || !periodStats.daily) {
        chartBars.innerHTML = '<div class="empty-state"><p>Нет данных за выбранный период</p></div>';
        return;
      }

      // Get last N days based on period
      const daysToShow = this.selectedPeriod === 'all' ? 30 : Math.min(days, 30);
      const dailyData = Object.entries(periodStats.daily)
        .sort((a, b) => new Date(a[0]) - new Date(b[0]))
        .slice(-daysToShow); // Show last N days on chart

      if (dailyData.length === 0) {
        chartBars.innerHTML = '<div class="empty-state"><p>Нет данных за выбранный период</p></div>';
        return;
      }

      const maxScans = Math.max(...dailyData.map(([, data]) => data.scans), 1);

      chartBars.innerHTML = dailyData.map(([date, data]) => {
        const dateObj = new Date(date);
        const dayName = dateObj.toLocaleDateString('ru-RU', { weekday: 'short' });
        const height = (data.scans / maxScans) * 100;

        return `
          <div class="chart-bar">
            <div class="bar-container">
              ${data.scans > 0 ? `<div class="bar-value">${data.scans}</div>` : ''}
              <div class="bar" style="height: ${height}%"></div>
            </div>
            <div class="bar-label">${dayName}</div>
          </div>
        `;
      }).join('');

    } catch (error) {
      console.error('Error updating activity chart:', error);
      chartBars.innerHTML = '<div class="empty-state"><p>Ошибка загрузки данных</p></div>';
    }
  }

  showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.classList.toggle('show', show);
    }
  }

  showToast(message) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

// Initialize app when DOM and modules are ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.app = new App(), CONFIG.APP_INIT_DELAY_MS);
  });
} else {
  setTimeout(() => window.app = new App(), CONFIG.APP_INIT_DELAY_MS);
}

export default App;

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.btn-back').forEach(btn => {
    btn.addEventListener('click', () => {
      window.location.reload(); // Перезагрузка страницы
    });
  });
});