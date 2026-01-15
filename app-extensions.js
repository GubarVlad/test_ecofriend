// App Extensions - New features integration
// This file extends the main app with gamification, quests, shop, etc.

import { gamification } from './gamification.js';
import { barcodeScanner } from './barcode.js';
import { lang } from './lang.js';
import { storage } from './storage.js';
import { getLeaderboard } from './firebase.js';

export class AppExtensions {
  constructor(app) {
    this.app = app;
    this.init();
  }

  async init() {
    console.log('🎮 Initializing app extensions...');
    
    // Initialize gamification
    await gamification.init();
    
    // Initialize barcode scanner
    await barcodeScanner.init();
    
    // Setup new event listeners
    this.initExtensionListeners();
    
    // Listen for barcode detection
    window.addEventListener('barcodedetected', (e) => this.handleBarcodeDetected(e));
    
    console.log('✅ App extensions initialized');
  }

  initExtensionListeners() {
    // Note: Bottom nav items are handled by main app's initEventListeners
    // These are for direct navigation if needed
    
    // Quests screen - handled by nav
    // Shop screen - handled by nav  
    // Leaderboard screen - handled by nav
    // Battles screen - handled by nav
    
    // Navigation is handled by main app's navigateToScreen
    // No duplicate handlers needed

    // Footprint modal - FIXED: Support touch events on Safari iPhone
    const footprintBtn = document.getElementById('btn-view-footprint');
    if (footprintBtn) {
      footprintBtn.addEventListener('click', () => this.showFootprintModal());
      footprintBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.showFootprintModal();
      });
    }

    const closeFootprintBtn = document.getElementById('btn-close-footprint');
    if (closeFootprintBtn) {
      closeFootprintBtn.addEventListener('click', () => this.hideFootprintModal());
    }

    // Share footprint
    const shareFootprintBtn = document.getElementById('btn-share-footprint');
    if (shareFootprintBtn) {
      shareFootprintBtn.addEventListener('click', () => this.shareFootprint());
    }

    // Shop button from profile - FIXED: Support touch events on Safari iPhone
    const viewShopBtn = document.getElementById('btn-view-shop');
    if (viewShopBtn) {
      viewShopBtn.addEventListener('click', () => {
        this.app.navigateToScreen('shop');
      });
      viewShopBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.app.navigateToScreen('shop');
      });
    }

    // Eco fact modal close - FIXED: Multiple ways to close
    // Ensure modal is hidden on init
    const ecoFactModal = document.getElementById('eco-fact-modal');
    if (ecoFactModal) {
      // Hide modal on init (in case it was shown by mistake)
      ecoFactModal.classList.remove('show');
      
      // Close button
      const closeFactBtn = document.getElementById('btn-close-fact');
      if (closeFactBtn) {
        // Remove any existing listeners
        const newCloseBtn = closeFactBtn.cloneNode(true);
        closeFactBtn.parentNode.replaceChild(newCloseBtn, closeFactBtn);
        
        newCloseBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('✅ Closing eco fact modal via button');
          this.hideEcoFactModal();
        });
      }

      // Close modal when clicking outside (on backdrop)
      ecoFactModal.addEventListener('click', (e) => {
        // Close if clicking on the modal backdrop (not the content)
        if (e.target === ecoFactModal) {
          console.log('✅ Closing eco fact modal via backdrop click');
          this.hideEcoFactModal();
        }
      });
    }

    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        const modal = document.getElementById('eco-fact-modal');
        if (modal && modal.classList.contains('show')) {
          console.log('✅ Closing eco fact modal via Escape key');
          this.hideEcoFactModal();
        }
      }
    });

    // Battle join button
    const joinBattleBtn = document.getElementById('btn-join-battle');
    if (joinBattleBtn) {
      joinBattleBtn.addEventListener('click', () => this.joinBattle());
    }

    console.log('✅ Extension listeners initialized');
  }

  // ===== Quests Screen =====
  showQuestsScreen() {
    // Update streak display
    const streakEl = document.getElementById('streak-days');
    if (streakEl) {
      streakEl.textContent = gamification.getStreak();
    }

    // Render daily quests
    this.renderDailyQuests();
  }

  renderDailyQuests() {
    const questsList = document.getElementById('daily-quests-list');
    if (!questsList) return;

    const quests = gamification.getDailyQuests();

    if (quests.length === 0) {
      questsList.innerHTML = `
        <div class="empty-state">
          <p>Квесты на сегодня загружаются...</p>
        </div>
      `;
      return;
    }

    questsList.innerHTML = quests.map(quest => {
      const progress = Math.min((quest.progress / quest.target) * 100, 100);
      const isCompleted = quest.completed;
      
      // Translate quest names if they are i18n keys
      const questName = quest.name.startsWith('quest.') ? lang.t(quest.name) : quest.name;
      
      return `
        <div class="quest-card ${isCompleted ? 'completed' : ''}">
          <div class="quest-icon">${quest.icon}</div>
          <div class="quest-info">
            <h4 class="quest-name">${questName}</h4>
            <p class="quest-desc">${questName}</p>
            <div class="quest-progress">
              <div class="quest-progress-bar">
                <div class="quest-progress-fill" style="width: ${progress}%"></div>
              </div>
              <span class="quest-progress-text">${quest.progress} / ${quest.target}</span>
            </div>
          </div>
          <div class="quest-reward">
            ${quest.reward.ecocoins ? `<div class="reward-item">💰 ${quest.reward.ecocoins}</div>` : ''}
            ${quest.reward.points ? `<div class="reward-item">⭐ ${quest.reward.points}</div>` : ''}
            ${isCompleted ? '<div class="quest-badge">✓ Выполнено</div>' : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  // ===== Shop Screen =====
  showShopScreen() {
    // Update EcoCoins balance
    const balanceEl = document.getElementById('shop-balance');
    if (balanceEl) {
      balanceEl.textContent = gamification.getEcoCoins();
    }

    // Render shop items
    this.renderShopThemes();
    this.renderShopAvatars();
  }

  renderShopThemes() {
    const themesGrid = document.getElementById('themes-grid');
    if (!themesGrid) return;

    const themes = [
      { id: 'light', name: 'Светлая', icon: '☀️', price: 0, unlocked: true },
      { id: 'dark', name: 'Темная', icon: '🌙', price: 100, unlocked: false },
      { id: 'nature', name: 'Природа', icon: '🌿', price: 200, unlocked: false },
      { id: 'ocean', name: 'Океан', icon: '🌊', price: 250, unlocked: false },
      { id: 'sunset', name: 'Закат', icon: '🌅', price: 300, unlocked: false }
    ];

    const unlockedThemes = gamification.getUnlockedThemes();
    const currentTheme = gamification.getCurrentTheme();
    const balance = gamification.getEcoCoins();

    themesGrid.innerHTML = themes.map(theme => {
      const isUnlocked = unlockedThemes.includes(theme.id);
      const isCurrent = currentTheme === theme.id;
      const canAfford = balance >= theme.price;

      return `
        <div class="shop-item ${isUnlocked ? 'unlocked' : ''} ${isCurrent ? 'active' : ''}">
          <div class="shop-item-icon">${theme.icon}</div>
          <h4 class="shop-item-name">${theme.name}</h4>
          ${isUnlocked ? 
            (isCurrent ? 
              '<button class="btn-shop-item active">Используется</button>' :
              `<button class="btn-shop-item" onclick="window.appExtensions.setTheme('${theme.id}')">Применить</button>`
            ) :
            (canAfford ?
              `<button class="btn-shop-item" onclick="window.appExtensions.buyTheme('${theme.id}', ${theme.price})">
                <span class="coin-icon">💰</span> ${theme.price}
              </button>` :
              `<button class="btn-shop-item locked" disabled>
                <span class="coin-icon">💰</span> ${theme.price}
              </button>`
            )
          }
        </div>
      `;
    }).join('');
  }

  renderShopAvatars() {
    const avatarsGrid = document.getElementById('avatars-grid');
    if (!avatarsGrid) return;

    const avatars = [
      { id: 'default', name: 'По умолчанию', icon: '👤', price: 0, unlocked: true },
      { id: 'eco_hero', name: 'Эко-герой', icon: '🦸', price: 150, unlocked: false },
      { id: 'tree', name: 'Дерево', icon: '🌳', price: 100, unlocked: false },
      { id: 'recycle', name: 'Переработка', icon: '♻️', price: 120, unlocked: false },
      { id: 'earth', name: 'Планета', icon: '🌍', price: 200, unlocked: false }
    ];

    const balance = gamification.getEcoCoins();

    avatarsGrid.innerHTML = avatars.map(avatar => {
      const isUnlocked = avatar.unlocked;
      const canAfford = balance >= avatar.price;

      return `
        <div class="shop-item ${isUnlocked ? 'unlocked' : ''}">
          <div class="shop-item-icon">${avatar.icon}</div>
          <h4 class="shop-item-name">${avatar.name}</h4>
          ${isUnlocked ?
            '<button class="btn-shop-item active">Куплено</button>' :
            (canAfford ?
              `<button class="btn-shop-item" onclick="window.appExtensions.buyAvatar('${avatar.id}', ${avatar.price})">
                <span class="coin-icon">💰</span> ${avatar.price}
              </button>` :
              `<button class="btn-shop-item locked" disabled>
                <span class="coin-icon">💰</span> ${avatar.price}
              </button>`
            )
          }
        </div>
      `;
    }).join('');
  }

  async buyTheme(themeId, price) {
    const success = await gamification.purchaseTheme(themeId, price);
    if (success) {
      this.app.showToast(`✅ Тема "${themeId}" приобретена!`);
      await gamification.setTheme(themeId);
      this.renderShopThemes();
      this.updateEcoCoinsDisplay();
    } else {
      this.app.showToast('❌ Недостаточно ЭкоМонет');
    }
  }

  async buyAvatar(avatarId, price) {
    const success = await gamification.purchaseAvatar(avatarId, price);
    if (success) {
      this.app.showToast(`✅ Аватар "${avatarId}" приобретен!`);
      this.renderShopAvatars();
      this.updateEcoCoinsDisplay();
    } else {
      this.app.showToast('❌ Недостаточно ЭкоМонет');
    }
  }

  async setTheme(themeId) {
    const success = await gamification.setTheme(themeId);
    if (success) {
      this.app.showToast(`✅ Тема применена`);
      this.renderShopThemes();
    }
  }

  updateEcoCoinsDisplay() {
    const balanceEl = document.getElementById('shop-balance');
    if (balanceEl) {
      balanceEl.textContent = gamification.getEcoCoins();
    }

    const profileCoinsEl = document.getElementById('profile-ecocoins');
    if (profileCoinsEl) {
      profileCoinsEl.textContent = gamification.getEcoCoins();
    }
  }

  // ===== Leaderboard Screen =====
  showLeaderboardScreen() {
    this.renderLeaderboard('global');

    // Listen for type change (ensure we don't attach multiple times)
    const typeSelect = document.getElementById('leaderboard-type');
    if (typeSelect) {
      if (!typeSelect._leaderboardListenerAttached) {
        typeSelect.addEventListener('change', (e) => {
          this.renderLeaderboard(e.target.value);
        });
        typeSelect._leaderboardListenerAttached = true;
      }
    }
  }

  async renderLeaderboard(type = 'global') {
    const list = document.getElementById('leaderboard-list');
    if (!list) {
      console.error('❌ Leaderboard list element not found');
      return;
    }

    list.innerHTML = '<div class="loading-state">Загрузка...</div>';

    try {
      // Load real leaderboard data from Firebase
      const currentUserId = this.app.user ? this.app.user.uid : null;
      console.log('📊 Loading leaderboard, currentUserId:', currentUserId);
      
      // Try to get leaderboard data
      let entries = [];
      try {
        entries = await getLeaderboard(type, 50, currentUserId); // Get more entries
        console.log('📊 Leaderboard entries loaded:', entries?.length || 0);
      } catch (fetchError) {
        console.error('❌ Error fetching leaderboard:', fetchError);
        // Try to load from local storage as fallback
        const { storage } = await import('./storage.js');
        const localStats = await storage.getStats();
        if (localStats && localStats.points > 0) {
          entries = [{
            id: currentUserId || 'local',
            name: this.app.user?.name || 'Вы',
            avatar: this.app.user?.avatar || '👤',
            points: localStats.points || 0,
            items: localStats.items || 0,
            level: localStats.level || 1,
            isYou: true
          }];
        }
      }

      if (!entries || entries.length === 0) {
        list.innerHTML = `
          <div class="empty-state">
            <p>Пока нет данных для таблицы лидеров</p>
            <p class="empty-state-hint">Сканируйте отходы и синхронизируйте данные</p>
            <button class="btn btn-primary" style="margin-top: 16px;" onclick="window.app?.performSync(true)">
              Синхронизировать сейчас
            </button>
          </div>
        `;
        return;
      }

      // Sort by points (descending), then by items, then by level
      const sorted = entries.slice().sort((a, b) => {
        const pointsDiff = (b.points || 0) - (a.points || 0);
        if (pointsDiff !== 0) return pointsDiff;
        const itemsDiff = (b.items || 0) - (a.items || 0);
        if (itemsDiff !== 0) return itemsDiff;
        return (b.level || 1) - (a.level || 1);
      });

      // Limit to top 20 for display
      const displayEntries = sorted.slice(0, 20);

      list.innerHTML = displayEntries.map((entry, index) => {
        const isCurrentUser = entry.isYou || (currentUserId && entry.id === currentUserId);
        const medal = index < 3 ? ['🥇', '🥈', '🥉'][index] : '';

        return `
          <div class="leaderboard-item ${isCurrentUser ? 'current-user' : ''}">
            <div class="leaderboard-rank">${medal || (index + 1)}</div>
            <div class="leaderboard-avatar">${entry.avatar || '👤'}</div>
            <div class="leaderboard-info">
              <div class="leaderboard-name">${entry.name || 'Пользователь'} ${isCurrentUser ? '(Вы)' : ''}</div>
              <div class="leaderboard-stats">${entry.items || 0} предметов · Уровень ${entry.level || 1}</div>
            </div>
            <div class="leaderboard-points">${entry.points || 0}</div>
          </div>
        `;
      }).join('');
    } catch (error) {
      console.error('❌ Error rendering leaderboard:', error);
      list.innerHTML = `
        <div class="empty-state">
          <p>Ошибка загрузки лидерборда</p>
          <p class="empty-state-hint">${error.message || 'Попробуйте позже'}</p>
          <button class="btn btn-primary" style="margin-top: 16px;" onclick="window.app?.extensions?.renderLeaderboard()">
            Попробовать снова
          </button>
        </div>
      `;
    }
  }

  generateMockLeaderboard(type) {
    const names = ['Анна', 'Иван', 'Мария', 'Петр', 'Елена', 'Дмитрий', 'Ольга', 'Сергей'];
    const avatars = ['👤', '🦸', '🌳', '♻️', '🌍', '🌱', '🌿', '🌊'];
    
    const data = Array.from({ length: 10 }, (_, i) => ({
      name: names[i % names.length] + ' ' + String.fromCharCode(65 + i),
      avatar: avatars[i % avatars.length],
      points: Math.floor(Math.random() * 1000) + 100,
      items: Math.floor(Math.random() * 100) + 10,
      isYou: i === 5 // Mock: user is at position 6
    }));

    return data.sort((a, b) => b.points - a.points);
  }

  // ===== Battles Screen =====
  showBattlesScreen() {
    this.updateBattleTimer();
    this.renderBattleLeaderboard();
    
    // Update timer every second
    setInterval(() => this.updateBattleTimer(), 1000);
  }

  updateBattleTimer() {
    // Calculate time until next Monday
    const now = new Date();
    const nextMonday = new Date();
    nextMonday.setDate(now.getDate() + ((1 + 7 - now.getDay()) % 7 || 7));
    nextMonday.setHours(0, 0, 0, 0);
    
    const diff = nextMonday - now;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    const timerEl = document.getElementById('battle-time-left');
    if (timerEl) {
      timerEl.textContent = `${days} дн ${hours} ч`;
    }
  }

  renderBattleLeaderboard() {
    const list = document.getElementById('battle-leaderboard');
    if (!list) return;

    // Mock battle data
    const mockData = this.generateMockLeaderboard('battle').slice(0, 5);

    list.innerHTML = mockData.map((entry, index) => {
      const medal = ['🥇', '🥈', '🥉'][index] || '';
      
      return `
        <div class="battle-rank-item">
          <span class="rank-badge">${medal || (index + 1)}</span>
          <span class="rank-name">${entry.name}</span>
          <span class="rank-score">${entry.points}</span>
        </div>
      `;
    }).join('');
  }

  joinBattle() {
    // In a real app, this would register the user for the battle
    this.app.showToast('✅ Вы присоединились к битве!');
    
    const btn = document.getElementById('btn-join-battle');
    if (btn) {
      btn.textContent = 'Участвуете';
      btn.disabled = true;
    }
  }

  // ===== Eco Footprint Modal =====
  showFootprintModal() {
    const modal = document.getElementById('footprint-modal');
    if (!modal) return;

    // Calculate footprint
    const footprint = gamification.calculateEcoFootprint(this.app.stats);

    // Update values
    document.getElementById('co2-saved').textContent = footprint.co2 + ' кг';
    document.getElementById('trees-saved').textContent = footprint.trees;
    
    // Water saved (estimate: 1.5L per item)
    const waterSaved = (this.app.stats.items * 1.5).toFixed(0);
    document.getElementById('water-saved').textContent = waterSaved + ' л';
    
    // Energy saved (estimate: 0.5 kWh per item)
    const energySaved = (this.app.stats.items * 0.5).toFixed(1);
    document.getElementById('energy-saved').textContent = energySaved + ' кВт·ч';

    modal.classList.add('show');
  }

  hideFootprintModal() {
    const modal = document.getElementById('footprint-modal');
    if (modal) {
      modal.classList.remove('show');
    }
  }

  async shareFootprint() {
    const footprint = gamification.calculateEcoFootprint(this.app.stats);
    
    const text = `🌍 Мой вклад в EcoFriend:\n✅ ${this.app.stats.items} предметов переработано\n☁️ ${footprint.co2} кг CO₂ сохранено\n🌳 ${footprint.trees} деревьев спасено\n\nПрисоединяйтесь!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'EcoFriend - Мои достижения',
          text: text
        });
        this.app.showToast('✅ Поделились!');
      } catch (error) {
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      this.app.showToast('✅ Скопировано в буфер обмена');
    }
  }

  // ===== Eco Fact Toast (FIXED: Show below navbar) =====
  showEcoFactToast(fact) {
    // Create or get eco fact toast
    let toast = document.getElementById('eco-fact-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'eco-fact-toast';
      toast.className = 'eco-fact-toast';
      document.body.appendChild(toast);
    }
    
    toast.innerHTML = `
      <div class="eco-fact-content">
        <span class="eco-fact-icon">💡</span>
        <span class="eco-fact-text">${fact}</span>
      </div>
    `;
    
    // Show toast
    toast.classList.add('show');
    
    // Auto-hide after 6 seconds
    setTimeout(() => {
      toast.classList.remove('show');
    }, 6000);
  }

  // Keep modal methods for other uses
  showEcoFactModal(fact) {
    const modal = document.getElementById('eco-fact-modal');
    const textEl = document.getElementById('eco-fact-text');
    
    if (modal && textEl) {
      textEl.textContent = fact;
      modal.classList.add('show');
      
      // Ensure close button is working
      const closeBtn = document.getElementById('btn-close-fact');
      if (closeBtn) {
        closeBtn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.hideEcoFactModal();
        };
      }
      
      // Auto-hide after 8 seconds (increased from 5)
      this.ecoFactTimeout = setTimeout(() => {
        this.hideEcoFactModal();
      }, 8000);
    }
  }

  hideEcoFactModal() {
    const modal = document.getElementById('eco-fact-modal');
    if (modal) {
      modal.classList.remove('show');
      
      // Clear auto-hide timeout if exists
      if (this.ecoFactTimeout) {
        clearTimeout(this.ecoFactTimeout);
        this.ecoFactTimeout = null;
      }
    }
  }

  // ===== Barcode Detection =====
  async handleBarcodeDetected(event) {
    const { barcode, localProduct } = event.detail;

    console.log('📦 Barcode detected:', barcode, localProduct);

    // Prefer local product mapping if available (faster / offline)
    let wasteType = localProduct?.type || null;
    let productName = localProduct?.name || 'Неизвестный продукт';
    let confidence = localProduct?.confidence || 0.0;

    // Try to enhance info via OpenFoodFacts
    let plasticType = null;
    let impactInfo = null;
    let greenScore = null;

    try {
      this.app.showToast(`Поиск продукта в OpenFoodFacts...`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.status === 1 && data.product) {
          const p = data.product;
          productName = p.product_name || productName;

          // Heuristic waste type detection from packaging / categories
          const packagingText = [
            p.packaging,
            ...(p.packaging_materials_tags || []),
            ...(p.packaging_tags || []),
            ...(p.categories_tags || [])
          ].join(' ').toLowerCase();

          if (!wasteType) {
            if (packagingText.includes('plastic') || packagingText.includes('plastique')) {
              wasteType = 'plastic';
            } else if (packagingText.includes('glass') || packagingText.includes('verre')) {
              wasteType = 'glass';
            } else if (packagingText.includes('metal') || packagingText.includes('aluminium') || packagingText.includes('steel')) {
              wasteType = 'metal';
            } else if (packagingText.includes('paper') || packagingText.includes('cardboard') || packagingText.includes('papier')) {
              wasteType = 'paper';
            }
          }

          // Plastic subtype
          if (packagingText.includes('pet')) plasticType = 'PET';
          else if (packagingText.includes('hdpe')) plasticType = 'HDPE';
          else if (packagingText.includes('pvc')) plasticType = 'PVC';
          else if (packagingText.includes('ldpe')) plasticType = 'LDPE';
          else if (packagingText.includes('pp')) plasticType = 'PP';
          else if (packagingText.includes('ps')) plasticType = 'PS';

          // Environmental impact and "Green score"
          if (p.environment_impact_level_tag) {
            impactInfo = `Уровень воздействия: ${p.environment_impact_level_tag}`;
          } else if (typeof p.carbon_footprint_from_known_ingredients_100g === 'number') {
            impactInfo = `Углеродный след: ${p.carbon_footprint_from_known_ingredients_100g} г CO₂/100г`;
          }

          if (p.ecoscore_grade) {
            greenScore = `Eco-Score: ${p.ecoscore_grade.toUpperCase()}`;
          } else if (p.nutriscore_grade) {
            greenScore = `Nutri-Score: ${p.nutriscore_grade.toUpperCase()}`;
          }

          confidence = Math.max(confidence, 0.9);
        } else {
          console.log('⚠️ Product not found in OpenFoodFacts');
        }
      } else {
        console.log('⚠️ OpenFoodFacts API returned error:', response.status);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.warn('⏱️ OpenFoodFacts request timed out');
      } else {
        console.warn('❌ OpenFoodFacts lookup failed:', err);
      }
    }

    // If no waste type found, immediately show manual selection
    if (!wasteType) {
      console.log('⚠️ No waste type detected, showing manual selection');
      this.app.showToast('Товар не найден. Выберите тип отходов вручную.');
      this.app.showWasteTypeModal({ source: 'barcode', barcode });
      return;
    }

    // Get recycling advice and environmental rating
    const recyclingAdvice = this.getRecyclingAdvice(wasteType, plasticType);
    const envRating = this.getEnvironmentalRating(wasteType, plasticType, greenScore);

    // Update barcode result UI
    const resultEl = document.getElementById('barcode-result');
    const nameEl = document.getElementById('barcode-product-name');
    const wasteBadgeEl = document.getElementById('barcode-waste-badge');
    const wasteEl = document.getElementById('barcode-waste-type');
    const plasticEl = document.getElementById('barcode-plastic-type');
    const plasticRowEl = document.getElementById('barcode-plastic-row');
    const impactEl = document.getElementById('barcode-impact');
    const greenEl = document.getElementById('barcode-green-score');
    const tipsEl = document.getElementById('barcode-recycling-tips');
    const adviceEl = document.getElementById('barcode-recycling-advice');
    const saveBtnEl = document.getElementById('btn-save-barcode-scan');

    // Show result container
    if (resultEl) resultEl.style.display = 'block';

    // Update product name
    if (nameEl) nameEl.textContent = productName || 'Неизвестный продукт';

    // Update waste type with proper display name
    const wasteTypeName = this.getWasteTypeName(wasteType);
    if (wasteEl) wasteEl.textContent = wasteTypeName || 'Неопределено';
    if (wasteBadgeEl) {
      wasteBadgeEl.textContent = this.getEmojiForType(wasteType) + ' ' + wasteTypeName;
      wasteBadgeEl.className = 'barcode-waste-badge waste-type-' + (wasteType || 'unknown');
    }

    // Update plastic type (only if available)
    if (plasticType && plasticEl && plasticRowEl) {
      plasticEl.textContent = plasticType;
      plasticRowEl.style.display = 'flex';
    } else if (plasticRowEl) {
      plasticRowEl.style.display = 'none';
    }

    // Update environmental impact
    if (impactEl) {
      impactEl.textContent = impactInfo || envRating.impact || 'Нет данных';
    }

    // Update green score with rating
    if (greenEl) {
      if (greenScore) {
        greenEl.textContent = greenScore;
        greenEl.className = 'green-score-value score-' + (greenScore.toLowerCase().includes('a') ? 'excellent' : 
                                                          greenScore.toLowerCase().includes('b') ? 'good' :
                                                          greenScore.toLowerCase().includes('c') ? 'fair' : 'poor');
      } else {
        greenEl.textContent = envRating.score;
        greenEl.className = 'green-score-value score-' + envRating.level;
      }
    }

    // Update recycling tips
    if (tipsEl && adviceEl && recyclingAdvice) {
      adviceEl.textContent = recyclingAdvice;
      tipsEl.style.display = 'block';
    } else if (tipsEl) {
      tipsEl.style.display = 'none';
    }

    // Show save button
    if (saveBtnEl) {
      saveBtnEl.style.display = 'block';
      saveBtnEl.onclick = async () => {
        if (!wasteType) {
          this.app.showWasteTypeModal({ source: 'barcode', barcode });
          return;
        }
        const config = {
          emoji: this.getEmojiForType(wasteType),
          name: productName,
          points: this.getPointsForType(wasteType),
          weight: this.getWeightForType(wasteType)
        };
        this.app.pendingRecognition = {
          result: {
            type: wasteType,
            confidence,
            source: 'barcode',
            barcode,
            plasticType,
            impactInfo,
            greenScore: greenScore || envRating.score
          },
          config
        };
        await this.app.saveScanResult(
          this.app.pendingRecognition.result,
          this.app.pendingRecognition.config,
          { barcode, source: 'barcode' }
        );
        this.app.showToast('✅ Скан сохранен!');
        this.app.closeBarcodeScanner();
      };
    }

    if (!wasteType) {
      // Product not found or cannot infer waste type -> ask user
      this.app.showToast('Товар не найден в базе. Выберите тип отходов вручную.');
      this.app.showWasteTypeModal({ source: 'barcode', barcode });
      return;
    }

    // Show confirmation with product info
    this.app.showToast(`✅ Найден: ${productName} (${wasteTypeName})`);
  }

  getEmojiForType(type) {
    const emojis = {
      plastic: '🧃',
      paper: '📄',
      glass: '🍾',
      metal: '🥫'
    };
    return emojis[type] || '❓';
  }

  getPointsForType(type) {
    const points = {
      plastic: 10,
      paper: 8,
      glass: 15,
      metal: 12
    };
    return points[type] || 5;
  }

  getWeightForType(type) {
    const weights = {
      plastic: 0.15,
      paper: 0.10,
      glass: 0.30,
      metal: 0.25
    };
    return weights[type] || 0.10;
  }

  getWasteTypeName(type) {
    const names = {
      plastic: 'Пластик',
      paper: 'Бумага',
      glass: 'Стекло',
      metal: 'Металл',
      organic: 'Органика',
      other: 'Другое'
    };
    return names[type] || type;
  }

  getRecyclingAdvice(wasteType, plasticType = null) {
    const advice = {
      plastic: {
        default: 'Пластик можно переработать. Промойте упаковку перед сдачей в переработку. Удалите этикетки и крышки.',
        PET: 'PET (1) - один из самых перерабатываемых типов пластика. Промойте и сдайте в переработку.',
        HDPE: 'HDPE (2) - безопасный и легко перерабатываемый пластик. Промойте перед сдачей.',
        PVC: 'PVC (3) - сложно перерабатывается. Проверьте, принимает ли ваш пункт приема этот тип.',
        LDPE: 'LDPE (4) - мягкий пластик, перерабатывается в ограниченных объемах.',
        PP: 'PP (5) - полипропилен, хорошо перерабатывается. Промойте перед сдачей.',
        PS: 'PS (6) - полистирол, перерабатывается редко. По возможности избегайте.'
      },
      paper: 'Бумагу и картон можно переработать. Убедитесь, что бумага сухая и не загрязнена. Удалите скотч и пластиковые элементы.',
      glass: 'Стекло можно переработать бесконечно. Промойте бутылки и банки, удалите крышки. Не разбивайте стекло - это усложняет переработку.',
      metal: 'Металл полностью перерабатывается. Промойте банки, удалите этикетки. Алюминий и сталь перерабатываются отдельно.',
      organic: 'Органические отходы можно компостировать. Не кладите в компост мясо, молочные продукты и масла.',
      other: 'Проверьте местные правила переработки для этого типа отходов.'
    };

    if (wasteType === 'plastic' && plasticType && advice.plastic[plasticType]) {
      return advice.plastic[plasticType];
    }
    return advice[wasteType] || advice.plastic?.default || advice.other;
  }

  getEnvironmentalRating(wasteType, plasticType = null, greenScore = null) {
    // Parse green score if available
    if (greenScore) {
      const scoreMatch = greenScore.match(/[ABCDE]/i);
      if (scoreMatch) {
        const grade = scoreMatch[0].toUpperCase();
        const levels = { A: 'excellent', B: 'good', C: 'fair', D: 'poor', E: 'poor' };
        return {
          score: greenScore,
          level: levels[grade] || 'fair',
          impact: grade === 'A' ? 'Низкое воздействие' : grade === 'B' ? 'Умеренное воздействие' : 'Высокое воздействие'
        };
      }
    }

    // Default ratings by waste type
    const ratings = {
      glass: { score: 'Эко-оценка: A', level: 'excellent', impact: 'Стекло полностью перерабатывается' },
      metal: { score: 'Эко-оценка: A', level: 'excellent', impact: 'Металл полностью перерабатывается' },
      paper: { score: 'Эко-оценка: B', level: 'good', impact: 'Бумага хорошо перерабатывается' },
      plastic: {
        PET: { score: 'Эко-оценка: B', level: 'good', impact: 'PET хорошо перерабатывается' },
        HDPE: { score: 'Эко-оценка: B', level: 'good', impact: 'HDPE хорошо перерабатывается' },
        PP: { score: 'Эко-оценка: C', level: 'fair', impact: 'PP перерабатывается ограниченно' },
        default: { score: 'Эко-оценка: C', level: 'fair', impact: 'Пластик перерабатывается частично' }
      },
      organic: { score: 'Эко-оценка: A', level: 'excellent', impact: 'Органика компостируется' },
      other: { score: 'Эко-оценка: D', level: 'poor', impact: 'Проверьте возможность переработки' }
    };

    if (wasteType === 'plastic' && plasticType && ratings.plastic[plasticType]) {
      return ratings.plastic[plasticType];
    }
    if (wasteType === 'plastic') {
      return ratings.plastic.default;
    }
    return ratings[wasteType] || ratings.other;
  }

  // ===== Scan Enhancement =====
  async enhanceScanWithGamification(scan, stats) {
    // Call gamification on scan
    const result = await gamification.onScan(scan, stats);
    
    // Show eco fact randomly (30% chance)
    if (result.ecoFact && Math.random() < 0.3) {
      setTimeout(() => {
        this.showEcoFactModal(result.ecoFact);
      }, 1500);
    }

    // Show streak notification
    if (result.streakUpdated && result.streak > 1) {
      setTimeout(() => {
        this.app.showToast(`🔥 Серия ${result.streak} дней!`);
      }, 2000);
    }

    // Show quest completion
    if (result.completedQuests && result.completedQuests.length > 0) {
      setTimeout(() => {
        result.completedQuests.forEach(quest => {
          this.app.showToast(`✅ Квест выполнен: ${quest.name}`);
        });
      }, 2500);
    }

    // Show achievement unlocks
    if (result.unlockedAchievements && result.unlockedAchievements.length > 0) {
      setTimeout(() => {
        result.unlockedAchievements.forEach(achievement => {
          this.app.showToast(`🏆 Достижение: ${achievement.name}`);
        });
      }, 3000);
    }

    // Update EcoCoins display
    this.updateEcoCoinsDisplay();

    return result;
  }

  // ===== Update UI =====
  updateExtendedUI() {
    // Update EcoCoins in profile
    this.updateEcoCoinsDisplay();

    // Update footprint preview
    const footprint = gamification.calculateEcoFootprint(this.app.stats);
    const co2El = document.getElementById('preview-co2');
    const treesEl = document.getElementById('preview-trees');
    
    if (co2El) co2El.textContent = `${footprint.co2} кг CO₂`;
    if (treesEl) treesEl.textContent = `${footprint.trees} деревьев`;

    // Update streak in quests screen
    const streakEl = document.getElementById('streak-days');
    if (streakEl) {
      streakEl.textContent = gamification.getStreak();
    }

    // FIXED: Update streak on main screen
    const mainStreakBadge = document.getElementById('main-streak-badge');
    const mainStreakDays = document.getElementById('main-streak-days');
    const currentStreak = gamification.getStreak();
    
    if (mainStreakBadge && mainStreakDays) {
      if (currentStreak > 0) {
        mainStreakBadge.style.display = 'flex';
        mainStreakDays.textContent = currentStreak;
      } else {
        mainStreakBadge.style.display = 'none';
      }
    }
  }
}

// Make it globally available for onclick handlers
window.appExtensions = null;

export function initializeExtensions(app) {
  window.appExtensions = new AppExtensions(app);
  return window.appExtensions;
}
