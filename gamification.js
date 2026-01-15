// Gamification Module
// Handles quests, streaks, achievements, EcoCoins, and level system

import { storage } from './storage.js';
import { lang } from './lang.js';

// Eco facts database
const ECO_FACTS = [
  'fact.plastic_ocean',
  'fact.plastic_decompose',
  'fact.paper_trees',
  'fact.recycle_saves',
  'fact.glass_forever',
  'Переработка 1 тонны пластика экономит 5774 кВт*ч энергии',
  'Каждый человек производит около 2 кг мусора в день',
  'Алюминиевая банка полностью разлагается через 200 лет',
  'Переработка стекла снижает загрязнение воздуха на 20%',
  'Бумага из переработанной макулатуры использует на 70% меньше энергии'
];

// Achievements configuration
const ACHIEVEMENTS = {
  newbie: {
    id: 'newbie',
    name: 'achievement.newbie',
    desc: 'achievement.newbie_desc',
    icon: '🌱',
    condition: (stats) => stats.items >= 1,
    reward: { ecocoins: 50 }
  },
  eco_hero: {
    id: 'eco_hero',
    name: 'achievement.eco_hero',
    desc: 'achievement.eco_hero_desc',
    icon: '♻️',
    condition: (stats) => stats.points >= 100,
    reward: { ecocoins: 100 }
  },
  master: {
    id: 'master',
    name: 'achievement.master',
    desc: 'achievement.master_desc',
    icon: '🏆',
    condition: (stats) => stats.level >= 5,
    reward: { ecocoins: 250 }
  },
  streak_7: {
    id: 'streak_7',
    name: 'achievement.streak_7',
    desc: 'achievement.streak_7_desc',
    icon: '🔥',
    condition: (stats, gamification) => gamification.streak >= 7,
    reward: { ecocoins: 150 }
  },
  streak_30: {
    id: 'streak_30',
    name: 'achievement.streak_30',
    desc: 'achievement.streak_30_desc',
    icon: '💫',
    condition: (stats, gamification) => gamification.streak >= 30,
    reward: { ecocoins: 500 }
  },
  collector_plastic: {
    id: 'collector_plastic',
    name: 'Коллекционер пластика',
    desc: 'Отсканируй 50 пластиковых предметов',
    icon: '🧃',
    condition: (stats) => stats.plastic >= 50,
    reward: { ecocoins: 200 }
  },
  collector_paper: {
    id: 'collector_paper',
    name: 'Спаситель деревьев',
    desc: 'Отсканируй 50 бумажных предметов',
    icon: '📄',
    condition: (stats) => stats.paper >= 50,
    reward: { ecocoins: 200 }
  },
  collector_glass: {
    id: 'collector_glass',
    name: 'Мастер стекла',
    desc: 'Отсканируй 50 стеклянных предметов',
    icon: '🍾',
    condition: (stats) => stats.glass >= 50,
    reward: { ecocoins: 200 }
  },
  eco_warrior: {
    id: 'eco_warrior',
    name: 'Эко-воин',
    desc: 'Достигни 10 уровня',
    icon: '⚔️',
    condition: (stats) => stats.level >= 10,
    reward: { ecocoins: 500 }
  },
  century_club: {
    id: 'century_club',
    name: 'Клуб сотни',
    desc: 'Отсканируй 100 предметов',
    icon: '💯',
    condition: (stats) => stats.items >= 100,
    reward: { ecocoins: 300 }
  },
  // FIXED: Added more achievements
  metal_master: {
    id: 'metal_master',
    name: 'Мастер металла',
    desc: 'Отсканируй 50 металлических предметов',
    icon: '🥫',
    condition: (stats) => stats.metal >= 50,
    reward: { ecocoins: 200 }
  },
  point_master: {
    id: 'point_master',
    name: 'Мастер баллов',
    desc: 'Заработай 500 баллов',
    icon: '⭐',
    condition: (stats) => stats.points >= 500,
    reward: { ecocoins: 150 }
  },
  point_legend: {
    id: 'point_legend',
    name: 'Легенда баллов',
    desc: 'Заработай 1000 баллов',
    icon: '🌟',
    condition: (stats) => stats.points >= 1000,
    reward: { ecocoins: 400 }
  },
  early_bird: {
    id: 'early_bird',
    name: 'Ранняя пташка',
    desc: 'Отсканируй 10 предметов',
    icon: '🐦',
    condition: (stats) => stats.items >= 10,
    reward: { ecocoins: 50 }
  },
  consistent: {
    id: 'consistent',
    name: 'Постоянство',
    desc: 'Отсканируй предметы 3 дня подряд',
    icon: '📅',
    condition: (stats, gamification) => gamification.streak >= 3,
    reward: { ecocoins: 75 }
  },
  dedicated: {
    id: 'dedicated',
    name: 'Преданность',
    desc: 'Достигни 3 уровня',
    icon: '🎖️',
    condition: (stats) => stats.level >= 3,
    reward: { ecocoins: 100 }
  },
  weight_champion: {
    id: 'weight_champion',
    name: 'Чемпион веса',
    desc: 'Переработай 5 кг отходов',
    icon: '⚖️',
    condition: (stats) => stats.weight >= 5,
    reward: { ecocoins: 250 }
  },
  diversity: {
    id: 'diversity',
    name: 'Разнообразие',
    desc: 'Отсканируй каждый тип отходов минимум 5 раз',
    icon: '🎨',
    condition: (stats) => stats.plastic >= 5 && stats.paper >= 5 && stats.glass >= 5 && stats.metal >= 5,
    reward: { ecocoins: 200 }
  },
  quest_master: {
    id: 'quest_master',
    name: 'Мастер квестов',
    desc: 'Выполни 10 ежедневных квестов',
    icon: '📋',
    condition: (stats, gamification) => {
      // Track completed quests count in gamification data
      return (gamification.totalCompletedQuests || 0) >= 10;
    },
    reward: { ecocoins: 300 }
  }
};

// Daily quests configuration
const DAILY_QUESTS_POOL = [
  {
    id: 'scan_5',
    name: 'quest.scan_5',
    desc: 'Отсканируй 5 предметов',
    icon: '📸',
    target: 5,
    type: 'scan_count',
    reward: { ecocoins: 30, points: 20 }
  },
  {
    id: 'scan_plastic_3',
    name: 'quest.scan_plastic',
    desc: 'Отсканируй 3 пластиковых предмета',
    icon: '🧃',
    target: 3,
    type: 'scan_type',
    wasteType: 'plastic',
    reward: { ecocoins: 25, points: 15 }
  },
  {
    id: 'earn_50',
    name: 'quest.earn_50',
    desc: 'Заработай 50 баллов',
    icon: '⭐',
    target: 50,
    type: 'earn_points',
    reward: { ecocoins: 40 }
  },
  {
    id: 'scan_paper_2',
    name: 'Бумажная миссия',
    desc: 'Отсканируй 2 бумажных предмета',
    icon: '📄',
    target: 2,
    type: 'scan_type',
    wasteType: 'paper',
    reward: { ecocoins: 20, points: 10 }
  },
  {
    id: 'scan_glass_1',
    name: 'Стеклянный вызов',
    desc: 'Отсканируй стеклянный предмет',
    icon: '🍾',
    target: 1,
    type: 'scan_type',
    wasteType: 'glass',
    reward: { ecocoins: 30, points: 15 }
  }
];

class GamificationManager {
  constructor() {
    this.data = {
      ecocoins: 0,
      streak: 0,
      lastScanDate: null,
      achievements: {},
      dailyQuests: [],
      questsProgress: {},
      unlockedThemes: ['light'],
      unlockedAvatars: ['default'],
      unlockedBackgrounds: ['default'],
      currentTheme: 'light',
      currentAvatar: 'default',
      currentBackground: 'default',
      totalCO2Saved: 0, // in kg
      totalTreesSaved: 0,
      totalCompletedQuests: 0 // FIXED: Track total completed quests for achievements
    };
    
    this.init();
  }

  async init() {
    await this.loadData();
    await this.checkAndUpdateStreak();
    await this.generateDailyQuests();
    console.log('🎮 Gamification module initialized');
  }

  async loadData() {
    const saved = await storage.get('gamification');
    if (saved) {
      this.data = { ...this.data, ...saved };
    }
  }

  async saveData() {
    await storage.set('gamification', this.data);
  }

  // Streak management
  async checkAndUpdateStreak() {
    const today = new Date().toDateString();
    const lastScan = this.data.lastScanDate;

    if (!lastScan) {
      // First scan ever
      this.data.streak = 0;
      return;
    }

    const lastScanDate = new Date(lastScan).toDateString();
    
    if (lastScanDate === today) {
      // Already scanned today, keep streak
      return;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    if (lastScanDate === yesterdayStr) {
      // Scanned yesterday, increment streak
      this.data.streak++;
    } else {
      // Missed a day, reset streak
      this.data.streak = 1;
    }

    await this.saveData();
  }

  async updateStreakOnScan() {
    const today = new Date().toDateString();
    const lastScan = this.data.lastScanDate;

    if (!lastScan || new Date(lastScan).toDateString() !== today) {
      // First scan of the day
      await this.checkAndUpdateStreak();
      this.data.lastScanDate = new Date().toISOString();
      await this.saveData();
      
      return true; // Streak updated
    }

    return false; // Already scanned today
  }

  // Daily quests - FIXED: Generate at midnight local time
  async generateDailyQuests() {
    const now = new Date();
    const today = now.toDateString();
    const questsDate = this.data.questsDate;

    // Check if we need new quests
    if (questsDate === today && this.data.dailyQuests.length > 0) {
      console.log('ℹ️ Daily quests already generated for today');
      return; // Quests already generated for today
    }

    console.log('🔄 Generating new daily quests for', today);
    
    // Generate 3 random quests
    const shuffled = [...DAILY_QUESTS_POOL].sort(() => Math.random() - 0.5);
    this.data.dailyQuests = shuffled.slice(0, 3).map(q => ({
      ...q,
      id: `${q.id}_${Date.now()}`
    }));
    this.data.questsDate = today;
    this.data.questsProgress = {};

    await this.saveData();
    console.log('📝 Generated new daily quests:', this.data.dailyQuests.length);
    
    // Schedule next check at midnight
    this.scheduleMidnightQuestRefresh();
  }

  // FIXED: Schedule quest refresh at midnight
  scheduleMidnightQuestRefresh() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 1, 0, 0); // 00:01 AM next day
    
    const timeUntilMidnight = tomorrow - now;
    
    setTimeout(() => {
      console.log('🌅 Midnight reached - refreshing quests');
      this.generateDailyQuests();
    }, timeUntilMidnight);
    
    console.log(`⏰ Quest refresh scheduled in ${Math.round(timeUntilMidnight / 1000 / 60 / 60)} hours`);
  }

  async updateQuestProgress(scan) {
    const updated = [];

    for (const quest of this.data.dailyQuests) {
      if (this.data.questsProgress[quest.id]?.completed) {
        continue; // Already completed
      }

      let progress = this.data.questsProgress[quest.id]?.progress || 0;
      let progressUpdated = false;

      switch (quest.type) {
        case 'scan_count':
          progress++;
          progressUpdated = true;
          break;

        case 'scan_type':
          if (scan.type === quest.wasteType) {
            progress++;
            progressUpdated = true;
          }
          break;

        case 'earn_points':
          progress += scan.points || 0;
          progressUpdated = true;
          break;
      }

      if (progressUpdated) {
        this.data.questsProgress[quest.id] = { progress, completed: false };

        // Check if completed
        if (progress >= quest.target) {
          this.data.questsProgress[quest.id].completed = true;
          await this.rewardQuest(quest);
          updated.push(quest);
        }
      }
    }

    if (updated.length > 0) {
      await this.saveData();
    }

    return updated;
  }

  async rewardQuest(quest) {
    if (quest.reward.ecocoins) {
      this.data.ecocoins += quest.reward.ecocoins;
    }
    
    // FIXED: Track total completed quests
    this.data.totalCompletedQuests = (this.data.totalCompletedQuests || 0) + 1;
    
    console.log(`✅ Quest completed: ${quest.id}, reward: ${quest.reward.ecocoins} EcoCoins`);
  }

  // Achievements
  async checkAchievements(stats) {
    const unlocked = [];

    for (const achievement of Object.values(ACHIEVEMENTS)) {
      if (this.data.achievements[achievement.id]) {
        continue; // Already unlocked
      }

      if (achievement.condition(stats, this.data)) {
        this.data.achievements[achievement.id] = {
          unlockedAt: new Date().toISOString(),
          seen: false
        };
        
        // Award EcoCoins
        if (achievement.reward.ecocoins) {
          this.data.ecocoins += achievement.reward.ecocoins;
        }

        unlocked.push(achievement);
        console.log(`🏆 Achievement unlocked: ${achievement.id}`);
      }
    }

    if (unlocked.length > 0) {
      await this.saveData();
    }

    return unlocked;
  }

  // EcoCoins management
  async addEcoCoins(amount, reason) {
    this.data.ecocoins += amount;
    await this.saveData();
    console.log(`💰 +${amount} EcoCoins (${reason})`);
  }

  async spendEcoCoins(amount, item) {
    if (this.data.ecocoins < amount) {
      return false; // Not enough coins
    }

    this.data.ecocoins -= amount;
    await this.saveData();
    console.log(`💸 -${amount} EcoCoins (${item})`);
    return true;
  }

  // Shop items
  async purchaseTheme(themeId, price) {
    if (!await this.spendEcoCoins(price, `theme: ${themeId}`)) {
      return false;
    }

    this.data.unlockedThemes.push(themeId);
    await this.saveData();
    
    if (window.app && window.app.user) {
      await window.app.performSync(true);
    }
    
    return true;
  }

  async purchaseAvatar(avatarId, price) {
    if (!await this.spendEcoCoins(price, `avatar: ${avatarId}`)) {
      return false;
    }

    this.data.unlockedAvatars.push(avatarId);
    await this.saveData();
    
    if (window.app && window.app.user) {
      await window.app.performSync(true);
    }
    
    return true;
  }

  async purchaseBackground(bgId, price) {
    if (!await this.spendEcoCoins(price, `background: ${bgId}`)) {
      return false;
    }

    this.data.unlockedBackgrounds.push(bgId);
    await this.saveData();
    
    if (window.app && window.app.user) {
      await window.app.performSync(true);
    }
    
    return true;
  }

  async setTheme(themeId) {
    if (!this.data.unlockedThemes.includes(themeId)) {
      return false;
    }

    this.data.currentTheme = themeId;
    await this.saveData();
    
    // Apply theme
    document.body.setAttribute('data-theme', themeId);
    return true;
  }

  // Eco footprint calculations
  calculateEcoFootprint(stats) {
    // CO2 savings per waste type (in kg)
    const co2PerType = {
      plastic: 2.5,  // kg CO2 saved per plastic item
      paper: 1.5,    // kg CO2 saved per paper item
      glass: 0.8,    // kg CO2 saved per glass item
      metal: 3.0     // kg CO2 saved per metal item
    };

    // Trees saved per waste type
    const treesPerType = {
      plastic: 0.01,
      paper: 0.05,  // Paper recycling saves more trees
      glass: 0.005,
      metal: 0.02
    };

    let totalCO2 = 0;
    let totalTrees = 0;

    for (const type in co2PerType) {
      totalCO2 += (stats[type] || 0) * co2PerType[type];
      totalTrees += (stats[type] || 0) * treesPerType[type];
    }

    this.data.totalCO2Saved = totalCO2;
    this.data.totalTreesSaved = totalTrees;

    return {
      co2: totalCO2.toFixed(2),
      trees: totalTrees.toFixed(2)
    };
  }

  // Random eco fact
  getRandomEcoFact() {
    const fact = ECO_FACTS[Math.floor(Math.random() * ECO_FACTS.length)];
    
    // If it's a translation key, translate it
    if (fact.startsWith('fact.')) {
      return lang.t(fact);
    }
    
    return fact;
  }

  // On scan hook - update all gamification features
  async onScan(scan, stats) {
    // Award base EcoCoins for scan
    const coinsPerScan = 5;
    await this.addEcoCoins(coinsPerScan, 'scan');

    // Update streak
    const streakUpdated = await this.updateStreakOnScan();
    if (streakUpdated && this.data.streak > 1) {
      // Bonus for streak
      const streakBonus = Math.min(this.data.streak * 2, 50);
      await this.addEcoCoins(streakBonus, 'streak bonus');
    }

    // Update quests
    const completedQuests = await this.updateQuestProgress(scan);

    // Check achievements
    const unlockedAchievements = await this.checkAchievements(stats);

    // Calculate eco footprint
    const footprint = this.calculateEcoFootprint(stats);

    return {
      ecocoinsEarned: coinsPerScan,
      streak: this.data.streak,
      streakUpdated,
      completedQuests,
      unlockedAchievements,
      footprint,
      ecoFact: this.getRandomEcoFact()
    };
  }

  // Getters
  getEcoCoins() {
    return this.data.ecocoins;
  }

  getStreak() {
    return this.data.streak;
  }

  getDailyQuests() {
    return this.data.dailyQuests.map(q => ({
      ...q,
      progress: this.data.questsProgress[q.id]?.progress || 0,
      completed: this.data.questsProgress[q.id]?.completed || false
    }));
  }

  getAchievements() {
    return Object.entries(ACHIEVEMENTS).map(([id, achievement]) => ({
      ...achievement,
      unlocked: !!this.data.achievements[id],
      unlockedAt: this.data.achievements[id]?.unlockedAt
    }));
  }

  getUnlockedThemes() {
    return this.data.unlockedThemes;
  }

  getCurrentTheme() {
    return this.data.currentTheme;
  }
}

// Export singleton
export const gamification = new GamificationManager();
export default gamification;
