// Application Constants
export const CONFIG = {
  // Timing
  SYNC_INTERVAL_MS: 30 * 60 * 1000,
  MODULE_INIT_DELAY_MS: 150,
  APP_INIT_DELAY_MS: 50,
  BADGE_UPDATE_INTERVAL_MS: 5000,
  TOAST_DURATION_MS: 3000,
  ECO_FACT_DURATION_MS: 6000,
  
  // Gamification
  POINTS_PER_LEVEL: 100,
  ECO_FACT_CHANCE: 0.3,
  DAILY_QUEST_COUNT: 3,
  QUEST_REFRESH_HOUR: 0,
  QUEST_REFRESH_MINUTE: 1,
  
  // Firebase
  BATCH_SIZE: 500,
  MAX_RETRIES: 3,
  
  // Z-Index Layers
  Z_INDEX: {
    NAVBAR: 9999,
    TOAST: 9998,
    MODAL: 10000,
    OVERLAY: 10001,
    LOADING: 10002
  },
  
  // Debug
  DEBUG: false
};

// Logging utility
export const log = (...args) => CONFIG.DEBUG && console.log(...args);
export const warn = (...args) => CONFIG.DEBUG && console.warn(...args);
export const error = (...args) => console.error(...args); // Always log errors

export default CONFIG;
