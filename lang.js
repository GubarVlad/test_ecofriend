// Multi-language support module
// Supports RU and EN with automatic detection

const translations = {
  ru: {
    // Welcome screen
    'app.title': 'EcoFriend',
    'welcome.subtitle': 'Сканируй отходы, зарабатывай баллы\nи делай мир чище',
    'welcome.start': 'Начать',
    'welcome.have_account': 'У меня есть аккаунт',
    
    // Auth
    'auth.register': 'Регистрация',
    'auth.login': 'Вход',
    'auth.name': 'Имя',
    'auth.email': 'Email',
    'auth.password': 'Пароль',
    'auth.password_hint': 'Минимум 6 символов',
    'auth.create_account': 'Создать аккаунт',
    'auth.login_button': 'Войти',
    'auth.logout': 'Выйти',
    
    // Main screen
    'main.title': 'Главная',
    'main.level': 'Уровень',
    'main.points': 'баллов',
    'main.to_next_level': 'До следующего уровня',
    'main.scan_waste': 'Сканировать отходы',
    'main.recent_activity': 'Недавняя активность',
    'main.no_activity': 'Пока нет активности',
    'main.scan_first': 'Отсканируйте ваш первый предмет!',
    
    // Waste types
    'waste.plastic': 'Пластик',
    'waste.paper': 'Бумага',
    'waste.glass': 'Стекло',
    'waste.metal': 'Металл',
    
    // Scanner
    'scanner.init': 'Инициализация камеры...',
    'scanner.capture': 'Сфотографировать',
    'scanner.recognizing': 'Распознавание...',
    'scanner.not_recognized': 'Предмет не распознан',
    'scanner.confirm_title': 'Распознавание верное?',
    'scanner.confirm_yes': 'Да, сохранить',
    'scanner.confirm_no': 'Нет, повторить',
    
    // Stats
    'stats.title': 'Статистика',
    'stats.period_7': '7 дней',
    'stats.period_30': '30 дней',
    'stats.period_all': 'Всё время',
    'stats.total_items': 'Всего предметов',
    'stats.total_weight': 'Общий вес',
    'stats.total_points': 'Всего баллов',
    'stats.by_type': 'По типам отходов',
    'stats.history': 'История сканирований',
    'stats.activity': 'Активность за период',
    'stats.empty': 'История пуста',
    
    // Profile
    'profile.title': 'Профиль',
    'profile.level': 'Уровень',
    'profile.points': 'Баллов',
    'profile.items': 'Предметов',
    'profile.achievements': 'Достижения',
    'profile.eco_footprint': 'Экологический след',
    'profile.co2_saved': 'Сохранено CO₂',
    'profile.trees_saved': 'Деревьев спасено',
    
    // Achievements
    'achievement.newbie': 'Новичок',
    'achievement.newbie_desc': 'Отсканируй первый предмет',
    'achievement.eco_hero': 'Эко-герой',
    'achievement.eco_hero_desc': 'Набери 100 баллов',
    'achievement.master': 'Мастер',
    'achievement.master_desc': 'Достигни 5 уровня',
    'achievement.streak_7': 'Неделя успеха',
    'achievement.streak_7_desc': 'Сканируй 7 дней подряд',
    'achievement.streak_30': 'Месяц успеха',
    'achievement.streak_30_desc': 'Сканируй 30 дней подряд',
    
    // Quests
    'quest.daily': 'Ежедневные квесты',
    'quest.scan_5': 'Отсканируй 5 предметов',
    'quest.scan_plastic': 'Отсканируй 3 пластиковых предмета',
    'quest.earn_50': 'Заработай 50 баллов',
    
    // Shop
    'shop.title': 'Магазин',
    'shop.balance': 'Баланс',
    'shop.ecocoins': 'ЭкоМонет',
    'shop.themes': 'Темы',
    'shop.avatars': 'Аватары',
    'shop.backgrounds': 'Фоны',
    'shop.buy': 'Купить',
    'shop.owned': 'Куплено',
    
    // Leaderboard
    'leaderboard.title': 'Таблица лидеров',
    'leaderboard.friends': 'Друзья',
    'leaderboard.region': 'Регион',
    'leaderboard.global': 'Весь мир',
    'leaderboard.you': 'Вы',
    
    // Battles
    'battle.title': 'Битвы',
    'battle.weekly': 'Еженедельная битва',
    'battle.time_left': 'Осталось времени',
    'battle.join': 'Присоединиться',
    'battle.your_rank': 'Ваше место',
    
    // Settings
    'settings.title': 'Настройки',
    'settings.sync': 'Синхронизация',
    'settings.auto_sync': 'Автоматическая синхронизация',
    'settings.auto_sync_desc': 'Синхронизировать данные с облаком автоматически',
    'settings.sync_interval': 'Интервал синхронизации',
    'settings.sync_now': 'Синхронизировать сейчас',
    'settings.notifications': 'Уведомления',
    'settings.sound': 'Звук',
    'settings.vibration': 'Вибрация',
    'settings.confirm_scans': 'Подтверждение распознавания',
    'settings.confirm_scans_desc': 'Спрашивать подтверждение после каждого сканирования',
    'settings.language': 'Язык',
    'settings.theme': 'Тема',
    'settings.clear_cache': 'Очистить кэш',
    'settings.version': 'Версия',
    'settings.storage': 'Хранилище',
    'settings.pending_scans': 'Несинхронизированных сканирований',
    
    // Theme names
    'theme.light': 'Светлая',
    'theme.dark': 'Темная',
    'theme.nature': 'Природа',
    
    // Notifications
    'notif.level_up': 'Уровень {level}! +{points} баллов!',
    'notif.points_earned': '+{points} баллов!',
    'notif.quest_complete': 'Квест завершен!',
    'notif.achievement': 'Достижение разблокировано!',
    'notif.streak': 'Серия {days} дней!',
    'notif.synced': 'Синхронизировано {count} сканирований',
    'notif.offline': 'Нет соединения (работаем офлайн)',
    'notif.online': 'Соединение восстановлено',
    
    // Eco facts
    'fact.plastic_ocean': 'Каждый год в океан попадает 8 млн тонн пластика',
    'fact.plastic_decompose': 'Пластиковая бутылка разлагается 450 лет',
    'fact.paper_trees': '1 тонна бумаги = 17 деревьев',
    'fact.recycle_saves': 'Переработка экономит 95% энергии',
    'fact.glass_forever': 'Стекло можно перерабатывать бесконечно',
    
    // Time
    'time.just_now': 'только что',
    'time.min_ago': '{n} мин назад',
    'time.hours_ago': '{n} ч назад',
    'time.days_ago': '{n} дн назад',
    
    // Navigation
    'nav.home': 'Главная',
    'nav.stats': 'Статистика',
    'nav.profile': 'Профиль',
    'nav.shop': 'Магазин',
    'nav.leaderboard': 'Лидеры',
    'nav.quests': 'Квесты',
    'nav.battles': 'Битвы'
  },
  
  en: {
    // Welcome screen
    'app.title': 'EcoFriend',
    'welcome.subtitle': 'Scan waste, earn points\nand make the world cleaner',
    'welcome.start': 'Get Started',
    'welcome.have_account': 'I have an account',
    
    // Auth
    'auth.register': 'Sign Up',
    'auth.login': 'Log In',
    'auth.name': 'Name',
    'auth.email': 'Email',
    'auth.password': 'Password',
    'auth.password_hint': 'At least 6 characters',
    'auth.create_account': 'Create Account',
    'auth.login_button': 'Log In',
    'auth.logout': 'Log Out',
    
    // Main screen
    'main.title': 'Home',
    'main.level': 'Level',
    'main.points': 'points',
    'main.to_next_level': 'To next level',
    'main.scan_waste': 'Scan Waste',
    'main.recent_activity': 'Recent Activity',
    'main.no_activity': 'No activity yet',
    'main.scan_first': 'Scan your first item!',
    
    // Waste types
    'waste.plastic': 'Plastic',
    'waste.paper': 'Paper',
    'waste.glass': 'Glass',
    'waste.metal': 'Metal',
    
    // Scanner
    'scanner.init': 'Initializing camera...',
    'scanner.capture': 'Take Photo',
    'scanner.recognizing': 'Recognizing...',
    'scanner.not_recognized': 'Item not recognized',
    'scanner.confirm_title': 'Is this correct?',
    'scanner.confirm_yes': 'Yes, save',
    'scanner.confirm_no': 'No, retry',
    
    // Stats
    'stats.title': 'Statistics',
    'stats.period_7': '7 days',
    'stats.period_30': '30 days',
    'stats.period_all': 'All time',
    'stats.total_items': 'Total items',
    'stats.total_weight': 'Total weight',
    'stats.total_points': 'Total points',
    'stats.by_type': 'By waste type',
    'stats.history': 'Scan history',
    'stats.activity': 'Activity for period',
    'stats.empty': 'History is empty',
    
    // Profile
    'profile.title': 'Profile',
    'profile.level': 'Level',
    'profile.points': 'Points',
    'profile.items': 'Items',
    'profile.achievements': 'Achievements',
    'profile.eco_footprint': 'Eco Footprint',
    'profile.co2_saved': 'CO₂ Saved',
    'profile.trees_saved': 'Trees Saved',
    
    // Achievements
    'achievement.newbie': 'Newbie',
    'achievement.newbie_desc': 'Scan your first item',
    'achievement.eco_hero': 'Eco Hero',
    'achievement.eco_hero_desc': 'Earn 100 points',
    'achievement.master': 'Master',
    'achievement.master_desc': 'Reach level 5',
    'achievement.streak_7': 'Week Streak',
    'achievement.streak_7_desc': 'Scan for 7 days in a row',
    'achievement.streak_30': 'Month Streak',
    'achievement.streak_30_desc': 'Scan for 30 days in a row',
    
    // Quests
    'quest.daily': 'Daily Quests',
    'quest.scan_5': 'Scan 5 items',
    'quest.scan_plastic': 'Scan 3 plastic items',
    'quest.earn_50': 'Earn 50 points',
    
    // Shop
    'shop.title': 'Shop',
    'shop.balance': 'Balance',
    'shop.ecocoins': 'EcoCoins',
    'shop.themes': 'Themes',
    'shop.avatars': 'Avatars',
    'shop.backgrounds': 'Backgrounds',
    'shop.buy': 'Buy',
    'shop.owned': 'Owned',
    
    // Leaderboard
    'leaderboard.title': 'Leaderboard',
    'leaderboard.friends': 'Friends',
    'leaderboard.region': 'Region',
    'leaderboard.global': 'Global',
    'leaderboard.you': 'You',
    
    // Battles
    'battle.title': 'Battles',
    'battle.weekly': 'Weekly Battle',
    'battle.time_left': 'Time Left',
    'battle.join': 'Join',
    'battle.your_rank': 'Your Rank',
    
    // Settings
    'settings.title': 'Settings',
    'settings.sync': 'Synchronization',
    'settings.auto_sync': 'Auto Sync',
    'settings.auto_sync_desc': 'Automatically sync data to cloud',
    'settings.sync_interval': 'Sync Interval',
    'settings.sync_now': 'Sync Now',
    'settings.notifications': 'Notifications',
    'settings.sound': 'Sound',
    'settings.vibration': 'Vibration',
    'settings.confirm_scans': 'Confirm Recognition',
    'settings.confirm_scans_desc': 'Ask confirmation after each scan',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.clear_cache': 'Clear Cache',
    'settings.version': 'Version',
    'settings.storage': 'Storage',
    'settings.pending_scans': 'Pending scans',
    
    // Theme names
    'theme.light': 'Light',
    'theme.dark': 'Dark',
    'theme.nature': 'Nature',
    
    // Notifications
    'notif.level_up': 'Level {level}! +{points} points!',
    'notif.points_earned': '+{points} points!',
    'notif.quest_complete': 'Quest completed!',
    'notif.achievement': 'Achievement unlocked!',
    'notif.streak': '{days} day streak!',
    'notif.synced': 'Synced {count} scans',
    'notif.offline': 'No connection (working offline)',
    'notif.online': 'Connection restored',
    
    // Eco facts
    'fact.plastic_ocean': '8 million tons of plastic enter the ocean each year',
    'fact.plastic_decompose': 'Plastic bottles take 450 years to decompose',
    'fact.paper_trees': '1 ton of paper = 17 trees',
    'fact.recycle_saves': 'Recycling saves 95% of energy',
    'fact.glass_forever': 'Glass can be recycled infinitely',
    
    // Time
    'time.just_now': 'just now',
    'time.min_ago': '{n} min ago',
    'time.hours_ago': '{n}h ago',
    'time.days_ago': '{n}d ago',
    
    // Navigation
    'nav.home': 'Home',
    'nav.stats': 'Stats',
    'nav.profile': 'Profile',
    'nav.shop': 'Shop',
    'nav.leaderboard': 'Leaders',
    'nav.quests': 'Quests',
    'nav.battles': 'Battles'
  }
};

class LanguageManager {
  constructor() {
    this.currentLang = this.detectLanguage();
    this.translations = translations;
  }

  detectLanguage() {
    // Check saved preference
    const saved = localStorage.getItem('language');
    if (saved && translations[saved]) {
      return saved;
    }

    // Detect from browser
    const browserLang = navigator.language || navigator.userLanguage;
    
    if (browserLang.startsWith('ru')) {
      return 'ru';
    } else if (browserLang.startsWith('en')) {
      return 'en';
    }

    // Default to English
    return 'en';
  }

  setLanguage(lang) {
    if (!translations[lang]) {
      console.error('Language not supported:', lang);
      return;
    }

    this.currentLang = lang;
    localStorage.setItem('language', lang);
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
    
    // Trigger update event
    window.dispatchEvent(new CustomEvent('languagechange', { detail: { lang } }));
  }

  t(key, params = {}) {
    let text = translations[this.currentLang][key] || translations['en'][key] || key;
    
    // Replace parameters
    Object.keys(params).forEach(param => {
      text = text.replace(`{${param}}`, params[param]);
    });
    
    return text;
  }

  getLanguage() {
    return this.currentLang;
  }

  getSupportedLanguages() {
    return Object.keys(translations);
  }
}

// Create and export singleton
export const lang = new LanguageManager();
export default lang;
