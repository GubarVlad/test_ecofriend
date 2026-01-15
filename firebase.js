// Firebase Module - Handles all Firebase operations with optimized batching
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.2/firebase-app.js";
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc,
  writeBatch,
  collection,
  serverTimestamp,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/11.0.2/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCkQsJ5Q29buQVyARSZwblz5NuJC8pgAI0",
  authDomain: "ecofriend-522b9.firebaseapp.com",
  projectId: "ecofriend-522b9",
  storageBucket: "ecofriend-522b9.firebasestorage.app",
  messagingSenderId: "979751268015",
  appId: "1:979751268015:web:17a5d9a00ae8b0da57ae5a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const authInstance = getAuth(app);
const db = getFirestore(app);

console.log('🔥 Firebase initialized');

// Auth wrapper
export const auth = {
  // Register new user
  async register(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
      console.log('✅ User registered:', userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error('❌ Registration error:', error);
      throw error;
    }
  },

  // Login existing user
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
      console.log('✅ User logged in:', userCredential.user.uid);
      return userCredential;
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  },

  // Logout user
  async logout() {
    try {
      await signOut(authInstance);
      console.log('✅ User logged out');
    } catch (error) {
      console.error('❌ Logout error:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser() {
    return authInstance.currentUser;
  },

  // Auth state observer
  onAuthStateChanged(callback) {
    return onAuthStateChanged(authInstance, callback);
  }
};

// Firestore operations
export async function saveUserData(userId, userData) {
  try {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      updatedAt: serverTimestamp()
    }, { merge: true });
    console.log('✅ User data saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving user data:', error);
    throw error;
  }
}

export async function getUserData(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      console.log('✅ User data retrieved from Firestore');
      return userSnap.data();
    } else {
      console.log('ℹ️ No user data found in Firestore');
      return null;
    }
  } catch (error) {
    console.error('❌ Error getting user data:', error);
    throw error;
  }
}

export async function updateUserStats(userId, stats) {
  // Check if user is authenticated
  const currentUser = authInstance.currentUser;
  if (!currentUser) {
    console.error('❌ User not authenticated for stats update');
    return; // Don't throw - allow app to continue working offline
  }

  // Verify userId matches authenticated user
  if (currentUser.uid !== userId) {
    console.error('❌ User ID mismatch for stats update');
    return;
  }

  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      stats: stats,
      updatedAt: serverTimestamp()
    });
    console.log('✅ User stats updated in Firestore');
  } catch (error) {
    console.error('❌ Error updating stats:', error);
    console.error('Error code:', error.code);
    // Don't throw - allow app to continue working offline
  }
}

// OPTIMIZED: Batch upload multiple scans in one request
export async function batchUploadScans(userId, scans) {
  // Check if user is authenticated
  const currentUser = authInstance.currentUser;
  if (!currentUser) {
    console.error('❌ User not authenticated');
    return { success: false, error: 'User not authenticated', count: 0 };
  }

  // Verify userId matches authenticated user
  if (currentUser.uid !== userId) {
    console.error('❌ User ID mismatch');
    return { success: false, error: 'User ID does not match authenticated user', count: 0 };
  }

  if (!scans || scans.length === 0) {
    console.log('ℹ️ No scans to upload');
    return { success: true, count: 0 };
  }

  try {
    console.log(`🔄 Starting batch upload of ${scans.length} scans for user ${userId}`);
    
    // Firebase batch has a limit of 500 operations
    const BATCH_SIZE = 500;
    const batches = [];
    
    // Split scans into chunks of 500
    for (let i = 0; i < scans.length; i += BATCH_SIZE) {
      const chunk = scans.slice(i, i + BATCH_SIZE);
      batches.push(chunk);
    }

    let totalUploaded = 0;

    // Process each batch
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const currentBatch = batches[batchIndex];
      const writeBatchInstance = writeBatch(db);
      
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length} (${currentBatch.length} scans)`);
      
      // Add each scan to the batch
      currentBatch.forEach(scan => {
        // Create a new document reference in users/{userId}/scans subcollection
        const scanRef = doc(collection(db, 'users', userId, 'scans'));
        
        // Prepare scan data
        const scanData = {
          type: scan.type || 'unknown',
          name: scan.name || 'Unknown',
          emoji: scan.emoji || '❓',
          points: scan.points || 0,
          weight: scan.weight || 0,
          confidence: scan.confidence || 0,
          timestamp: scan.timestamp || new Date().toISOString(),
          uploadedAt: serverTimestamp(),
          userId: userId // Add userId for security
        };
        
        // Add to batch
        writeBatchInstance.set(scanRef, scanData);
      });

      // Commit the batch
      await writeBatchInstance.commit();
      totalUploaded += currentBatch.length;
      console.log(`✅ Batch ${batchIndex + 1} uploaded successfully (${totalUploaded}/${scans.length} total)`);
    }

    console.log(`✅ All scans uploaded successfully: ${totalUploaded} scans to users/${userId}/scans`);
    return { success: true, count: totalUploaded };
  } catch (error) {
    console.error('❌ Error batch uploading scans:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return { success: false, error: error.message, count: 0 };
  }
}

// OPTIMIZED: Update stats and upload scans in batch
// FIXED: Now includes gamification data (EcoCoins, achievements, etc.)
export async function syncUserData(userId, stats, pendingScans, gamificationData = null, userInfo = null) {
  try {
    console.log(`🔄 Syncing data: ${pendingScans.length} scans, updating stats...`);

    // Update stats and gamification data together
    const dataToSync = {
      stats: stats,
      updatedAt: serverTimestamp()
    };
    
    // FIXED: Include gamification data (coins, achievements, quests progress, purchases)
    if (gamificationData) {
      dataToSync.gamification = {
        ecocoins: gamificationData.ecocoins || 0,
        streak: gamificationData.streak || 0,
        achievements: gamificationData.achievements || {},
        totalCompletedQuests: gamificationData.totalCompletedQuests || 0,
        lastScanDate: gamificationData.lastScanDate,
        unlockedThemes: gamificationData.unlockedThemes || ['light'],
        unlockedAvatars: gamificationData.unlockedAvatars || [],
        unlockedBackgrounds: gamificationData.unlockedBackgrounds || [],
        currentTheme: gamificationData.currentTheme || 'light'
      };
    }

    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, dataToSync);

    // ALSO: update public leaderboard entry so leaderboards stay in sync
    // Pass userInfo (name, avatar) to leaderboard
    try {
      await updatePublicLeaderboard(userId, stats, dataToSync.gamification || null, userInfo);
    } catch (err) {
      console.error('⚠️ Failed to update public leaderboard:', err);
      // Don't fail whole sync because of leaderboard issues
    }

    // Batch upload scans
    const result = await batchUploadScans(userId, pendingScans);

    console.log(`✅ Sync complete: ${result.count} scans uploaded`);
    return result;
  } catch (error) {
    console.error('❌ Error syncing user data:', error);
    return { success: false, error: error.message, count: 0 };
  }
}

// ===== Leaderboard helpers =====

/**
 * Update (or create) a public leaderboard entry for the given user.
 * Stored under: public/leaderboard/{userId}
 */
export async function updatePublicLeaderboard(userId, stats, gamificationData = null, userInfo = null) {
  try {
    // Store public leaderboard entries in top-level "leaderboard" collection
    const leaderboardRef = doc(db, 'leaderboard', userId);

    // Get user data if not provided
    let name = 'Пользователь';
    let avatar = '👤';
    
    if (userInfo) {
      name = userInfo.name || name;
      avatar = userInfo.avatar || avatar;
    } else {
      // Try to get from users collection
      try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          name = userData.name || name;
          avatar = (userData.name || 'U').charAt(0).toUpperCase();
        }
      } catch (e) {
        console.warn('Could not fetch user info for leaderboard:', e);
      }
    }

    const payload = {
      userId,
      name: name,
      avatar: avatar,
      points: stats?.points || 0,
      items: stats?.items || 0,
      level: stats?.level || 1,
      updatedAt: serverTimestamp()
    };

    if (gamificationData && typeof gamificationData.ecocoins === 'number') {
      payload.ecocoins = gamificationData.ecocoins;
    }

    await setDoc(leaderboardRef, payload, { merge: true });
    console.log('✅ Public leaderboard updated for user', userId, 'with name:', name);
  } catch (error) {
    console.error('❌ Error updating public leaderboard:', error);
    // Do not throw – leaderboard is non-critical
  }
}

/**
 * Fetch top users for leaderboard.
 * Currently returns global leaderboard (top N by points).
 * Scope parameter is reserved for future region/friends filters.
 */
export async function getLeaderboard(scope = 'global', limitCount = 20, currentUserId = null) {
  try {
    // Read from top-level "leaderboard" collection
    const usersCollection = collection(db, 'leaderboard');
    const q = query(usersCollection, orderBy('points', 'desc'), limit(limitCount));
    const snapshot = await getDocs(q);

    const entries = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      entries.push({
        id: docSnap.id,
        name: data.name || 'Пользователь',
        avatar: data.avatar || '👤',
        points: data.points || 0,
        items: data.items || 0,
        level: data.level || 1,
        isYou: currentUserId ? docSnap.id === currentUserId : false
      });
    });

    return entries;
  } catch (error) {
    console.error('❌ Error loading leaderboard:', error);
    return [];
  }
}

export async function saveActivity(userId, activity) {
  try {
    const activityRef = doc(db, 'users', userId, 'activities', Date.now().toString());
    await setDoc(activityRef, {
      ...activity,
      createdAt: serverTimestamp()
    });
    console.log('✅ Activity saved to Firestore');
  } catch (error) {
    console.error('❌ Error saving activity:', error);
    // Don't throw - allow app to continue working offline
  }
}

// Get Firebase connection status
export function isOnline() {
  return navigator.onLine;
}

// Export helpers
export { app, authInstance as firebaseAuth, db };
