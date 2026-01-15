// Local Storage Module - Handles localStorage and IndexedDB operations
// Priority: Use IndexedDB for better performance, fallback to localStorage

const DB_NAME = 'EcoFriendDB';
const DB_VERSION = 2; // Increased version for new stores
const STORE_NAME = 'userData';
const PENDING_SCANS_STORE = 'pendingScans';

class Storage {
  constructor() {
    this.db = null;
    this.useIndexedDB = false;
    this.init();
  }

  async init() {
    // Try to initialize IndexedDB
    if ('indexedDB' in window) {
      try {
        this.db = await this.openIndexedDB();
        this.useIndexedDB = true;
        console.log('✅ IndexedDB initialized');
      } catch (error) {
        console.warn('⚠️ IndexedDB failed, falling back to localStorage:', error);
        this.useIndexedDB = false;
      }
    } else {
      console.log('ℹ️ IndexedDB not available, using localStorage');
      this.useIndexedDB = false;
    }
  }

  openIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          console.log('📦 IndexedDB userData store created');
        }

        // Create pending scans store
        if (!db.objectStoreNames.contains(PENDING_SCANS_STORE)) {
          const scanStore = db.createObjectStore(PENDING_SCANS_STORE, { keyPath: 'id', autoIncrement: true });
          scanStore.createIndex('timestamp', 'timestamp', { unique: false });
          scanStore.createIndex('synced', 'synced', { unique: false });
          console.log('📦 IndexedDB pendingScans store created');
        }
      };
    });
  }

  // Generic get method
  async get(key) {
    if (this.useIndexedDB && this.db) {
      return await this.getFromIndexedDB(key);
    } else {
      return this.getFromLocalStorage(key);
    }
  }

  // Generic set method
  async set(key, value) {
    if (this.useIndexedDB && this.db) {
      return await this.setToIndexedDB(key, value);
    } else {
      return this.setToLocalStorage(key, value);
    }
  }

  // IndexedDB operations
  async getFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(key);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };

        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  async setToIndexedDB(key, value) {
    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ key, value });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      } catch (error) {
        reject(error);
      }
    });
  }

  // localStorage operations
  getFromLocalStorage(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return null;
    }
  }

  setToLocalStorage(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      throw error;
    }
  }

  // User-specific methods
  async getUser() {
    return await this.get('user');
  }

  async saveUser(user) {
    await this.set('user', user);
  }

  async getStats() {
    return await this.get('stats');
  }

  async saveStats(stats) {
    await this.set('stats', stats);
  }

  async getSettings() {
    return await this.get('settings') || {
      notifications: true,
      sound: true,
      vibration: true,
      darkMode: false,
      autoSync: true,
      syncInterval: 30, // minutes
      confirmScans: true, // Confirm scans before saving
      language: 'ru',
      theme: 'light'
    };
  }

  async saveSettings(settings) {
    await this.set('settings', settings);
  }

  async getLastSyncTime() {
    return await this.get('lastSyncTime') || 0;
  }

  async saveLastSyncTime(timestamp) {
    await this.set('lastSyncTime', timestamp);
  }

  // Pending scans queue operations
  async addPendingScan(scan) {
    const scanData = {
      ...scan,
      timestamp: scan.timestamp || Date.now(),
      synced: false,
      createdAt: new Date().toISOString()
    };

    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([PENDING_SCANS_STORE], 'readwrite');
          const store = transaction.objectStore(PENDING_SCANS_STORE);
          const request = store.add(scanData);

          request.onsuccess = () => {
            console.log('📝 Scan added to pending queue');
            resolve(request.result);
          };
          request.onerror = () => reject(request.error);
        } catch (error) {
          reject(error);
        }
      });
    } else {
      // Fallback to localStorage
      const pendingScans = this.getFromLocalStorage('pendingScans') || [];
      scanData.id = Date.now() + Math.random();
      pendingScans.push(scanData);
      this.setToLocalStorage('pendingScans', pendingScans);
      console.log('📝 Scan added to pending queue (localStorage)');
      return scanData.id;
    }
  }

  async getPendingScans() {
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([PENDING_SCANS_STORE], 'readonly');
          const store = transaction.objectStore(PENDING_SCANS_STORE);
          const request = store.getAll(); // Get all scans

          request.onsuccess = () => {
            // Filter unsynced scans in JavaScript instead of using index
            const allScans = request.result || [];
            const pendingScans = allScans.filter(scan => !scan.synced);
            resolve(pendingScans);
          };
          request.onerror = () => reject(request.error);
        } catch (error) {
          reject(error);
        }
      });
    } else {
      const pendingScans = this.getFromLocalStorage('pendingScans') || [];
      return pendingScans.filter(scan => !scan.synced);
    }
  }

  async markScansAsSynced(scanIds) {
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([PENDING_SCANS_STORE], 'readwrite');
          const store = transaction.objectStore(PENDING_SCANS_STORE);
          
          const promises = scanIds.map(id => {
            return new Promise((res, rej) => {
              const request = store.get(id);
              request.onsuccess = () => {
                const scan = request.result;
                if (scan) {
                  scan.synced = true;
                  const updateRequest = store.put(scan);
                  updateRequest.onsuccess = () => res();
                  updateRequest.onerror = () => rej(updateRequest.error);
                } else {
                  res();
                }
              };
              request.onerror = () => rej(request.error);
            });
          });

          Promise.all(promises)
            .then(() => {
              console.log(`✅ Marked ${scanIds.length} scans as synced`);
              resolve();
            })
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      });
    } else {
      const pendingScans = this.getFromLocalStorage('pendingScans') || [];
      pendingScans.forEach(scan => {
        if (scanIds.includes(scan.id)) {
          scan.synced = true;
        }
      });
      this.setToLocalStorage('pendingScans', pendingScans);
      console.log(`✅ Marked ${scanIds.length} scans as synced (localStorage)`);
    }
  }

  async clearSyncedScans() {
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([PENDING_SCANS_STORE], 'readwrite');
          const store = transaction.objectStore(PENDING_SCANS_STORE);
          const request = store.openCursor(); // Get all scans

          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              // Delete if synced
              if (cursor.value.synced === true) {
                cursor.delete();
              }
              cursor.continue();
            } else {
              console.log('🗑️ Cleared synced scans');
              resolve();
            }
          };
          request.onerror = () => reject(request.error);
        } catch (error) {
          reject(error);
        }
      });
    } else {
      const pendingScans = this.getFromLocalStorage('pendingScans') || [];
      const unsynced = pendingScans.filter(scan => !scan.synced);
      this.setToLocalStorage('pendingScans', unsynced);
      console.log('🗑️ Cleared synced scans (localStorage)');
    }
  }

  async getPendingScansCount() {
    const scans = await this.getPendingScans();
    return scans.length;
  }

  // Clear all data
  async clear() {
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([STORE_NAME, PENDING_SCANS_STORE], 'readwrite');
          
          const store1 = transaction.objectStore(STORE_NAME);
          const store2 = transaction.objectStore(PENDING_SCANS_STORE);
          
          store1.clear();
          store2.clear();

          transaction.oncomplete = () => {
            console.log('✅ IndexedDB cleared');
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        } catch (error) {
          reject(error);
        }
      });
    } else {
      localStorage.clear();
      console.log('✅ localStorage cleared');
    }
  }

  // Delete specific key
  async delete(key) {
    if (this.useIndexedDB && this.db) {
      return new Promise((resolve, reject) => {
        try {
          const transaction = this.db.transaction([STORE_NAME], 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const request = store.delete(key);

          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        } catch (error) {
          reject(error);
        }
      });
    } else {
      localStorage.removeItem(key);
    }
  }

  // Get storage usage info
  async getStorageInfo() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage,
          quota: estimate.quota,
          usageInMB: (estimate.usage / (1024 * 1024)).toFixed(2),
          quotaInMB: (estimate.quota / (1024 * 1024)).toFixed(2),
          percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
        };
      } catch (error) {
        console.error('Error getting storage estimate:', error);
        return null;
      }
    }
    return null;
  }

  // Get all history with optional filters
  async getAllHistory(filters = {}) {
    const stats = await this.getStats();
    if (!stats || !stats.history) return [];
    
    let history = [...stats.history];
    
    // Apply filters
    if (filters.type) {
      history = history.filter(item => item.type === filters.type);
    }
    
    if (filters.startDate) {
      const start = new Date(filters.startDate).getTime();
      history = history.filter(item => new Date(item.timestamp).getTime() >= start);
    }
    
    if (filters.endDate) {
      const end = new Date(filters.endDate).getTime();
      history = history.filter(item => new Date(item.timestamp).getTime() <= end);
    }
    
    return history;
  }

  // Get statistics for a time period
  async getStatsByPeriod(days = 7) {
    const stats = await this.getStats();
    if (!stats || !stats.history) return null;
    
    const now = Date.now();
    const periodStart = now - (days * 24 * 60 * 60 * 1000);
    
    const periodHistory = stats.history.filter(item => {
      const itemTime = new Date(item.timestamp).getTime();
      return itemTime >= periodStart;
    });
    
    // Calculate stats
    const result = {
      totalScans: periodHistory.length,
      totalPoints: periodHistory.reduce((sum, item) => sum + (item.points || 0), 0),
      totalWeight: periodHistory.reduce((sum, item) => sum + (item.weight || 0), 0),
      byType: {
        plastic: periodHistory.filter(i => i.type === 'plastic').length,
        paper: periodHistory.filter(i => i.type === 'paper').length,
        glass: periodHistory.filter(i => i.type === 'glass').length,
        metal: periodHistory.filter(i => i.type === 'metal').length
      },
      daily: this.groupByDay(periodHistory, days)
    };
    
    return result;
  }

  groupByDay(history, days) {
    const daily = {};
    const now = new Date();
    
    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      daily[dateKey] = { scans: 0, points: 0 };
    }
    
    // Fill with actual data
    history.forEach(item => {
      const dateKey = new Date(item.timestamp).toISOString().split('T')[0];
      if (daily[dateKey]) {
        daily[dateKey].scans++;
        daily[dateKey].points += item.points || 0;
      }
    });
    
    return daily;
  }
}

// Create and export singleton instance
export const storage = new Storage();
