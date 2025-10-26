import * as SQLite from 'expo-sqlite';

// Interface definitions
interface UserData {
  username: string;
  device_id: string;
  body_type?: string;
  skin_tone?: string;
  style_preference?: string;
  location?: string;
}

interface ClothingItemData {
  user_id: number;
  name: string;
  image_uri: string;
  clothing_type?: string;
  primary_color?: string;
  secondary_color?: string;
  fabric_type?: string;
  style_category?: string;
  season_suitability?: string;
  brand?: string;
  size?: string;
  price?: number;
  ai_analysis?: string;
}

// Helper function to convert undefined to null for SQLite
const toSQLiteValue = (value: any): any => {
  return value === undefined ? null : value;
};

class DatabaseService {
  private static instance: DatabaseService;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitializing: boolean = false;

  // ✅ Private constructor prevents multiple instances
  private constructor() {}

  // ✅ Get singleton instance
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  // ✅ Initialize database (call once in app/_layout.tsx)
  async initialize(): Promise<void> {
    if (this.db) {
      console.log('✅ Database already initialized');
      return;
    }

    if (this.isInitializing) {
      console.log('⏳ Database initialization in progress...');
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    this.isInitializing = true;

    try {
      console.log('🔄 Initializing database...');
      this.db = await SQLite.openDatabaseAsync('almari.db', {
        useNewConnection: true,
      });
      await this.createTables();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  // ✅ Get database instance (throws error if not initialized)
  getDatabase(): SQLite.SQLiteDatabase {
    if (!this.db) {
      throw new Error('❌ Database not initialized. Call initialize() first in app/_layout.tsx');
    }
    return this.db;
  }

  private async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        device_id TEXT UNIQUE NOT NULL,
        body_type TEXT,
        skin_tone TEXT,
        style_preference TEXT,
        location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS clothing_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        image_uri TEXT NOT NULL,
        clothing_type TEXT,
        primary_color TEXT,
        secondary_color TEXT,
        fabric_type TEXT,
        style_category TEXT,
        season_suitability TEXT,
        brand TEXT,
        size TEXT,
        price REAL,
        laundry_status TEXT DEFAULT 'clean',
        is_favorite INTEGER DEFAULT 0,
        wear_count INTEGER DEFAULT 0,
        ai_analysis TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS sticky_notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clothing_item_id INTEGER,
        note_text TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (clothing_item_id) REFERENCES clothing_items (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS outfit_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        outfit_name TEXT,
        occasion TEXT NOT NULL,
        weather TEXT,
        mood TEXT,
        date_worn DATETIME NOT NULL,
        user_rating INTEGER,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);

    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        message TEXT NOT NULL,
        is_user_message INTEGER NOT NULL,
        context_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      );
    `);
  }

  // ✅ All your existing methods, using getDatabase()
  async createUser(userData: UserData): Promise<number | null> {
    const db = this.getDatabase();
    
    const result = await db.runAsync(
      'INSERT INTO users (username, device_id, body_type, skin_tone, style_preference, location) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userData.username,
        userData.device_id,
        toSQLiteValue(userData.body_type),
        toSQLiteValue(userData.skin_tone),
        toSQLiteValue(userData.style_preference),
        toSQLiteValue(userData.location),
      ]
    );
    return result.lastInsertRowId;
  }

  async getUserByDeviceId(deviceId: string): Promise<any> {
    const db = this.getDatabase();
    
    const result = await db.getFirstAsync(
      'SELECT * FROM users WHERE device_id = ?',
      [deviceId]
    );
    return result;
  }

  async addClothingItem(itemData: ClothingItemData): Promise<number | null> {
    const db = this.getDatabase();
    
    const result = await db.runAsync(
      `INSERT INTO clothing_items (
        user_id, name, image_uri, clothing_type, primary_color,
        secondary_color, fabric_type, style_category, season_suitability,
        brand, size, price, ai_analysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemData.user_id,
        itemData.name,
        itemData.image_uri,
        toSQLiteValue(itemData.clothing_type),
        toSQLiteValue(itemData.primary_color),
        toSQLiteValue(itemData.secondary_color),
        toSQLiteValue(itemData.fabric_type),
        toSQLiteValue(itemData.style_category),
        toSQLiteValue(itemData.season_suitability),
        toSQLiteValue(itemData.brand),
        toSQLiteValue(itemData.size),
        toSQLiteValue(itemData.price),
        toSQLiteValue(itemData.ai_analysis),
      ]
    );
    return result.lastInsertRowId;
  }

  async getUserClothing(userId: number): Promise<any[]> {
    const db = this.getDatabase();
    
    const result = await db.getAllAsync(
      'SELECT * FROM clothing_items WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return result;
  }

  async deleteClothingItem(itemId: number): Promise<string | null> {
    const db = this.getDatabase();
    
    const item = (await db.getFirstAsync(
      'SELECT image_uri FROM clothing_items WHERE id = ?',
      [itemId]
    )) as any;

    await db.runAsync('DELETE FROM clothing_items WHERE id = ?', [itemId]);

    console.log('✅ Deleted item from database:', itemId);
    return item?.image_uri || null;
  }

  async updateClothingItem(
    itemId: number,
    updates: Partial<ClothingItemData>
  ): Promise<void> {
    const db = this.getDatabase();
    
    const setClause = Object.keys(updates)
      .map(key => `${key} = ?`)
      .join(', ');
    const values = [
      ...Object.values(updates).map(val => toSQLiteValue(val)),
      itemId,
    ];

    await db.runAsync(
      `UPDATE clothing_items SET ${setClause} WHERE id = ?`,
      values
    );
  }

  async addStickyNote(
    clothingItemId: number,
    noteText: string
  ): Promise<number | null> {
    const db = this.getDatabase();
    
    const result = await db.runAsync(
      'INSERT INTO sticky_notes (clothing_item_id, note_text) VALUES (?, ?)',
      [clothingItemId, noteText]
    );
    return result.lastInsertRowId;
  }

  async getStickyNotes(clothingItemId: number): Promise<any[]> {
    const db = this.getDatabase();
    
    const result = await db.getAllAsync(
      'SELECT * FROM sticky_notes WHERE clothing_item_id = ? ORDER BY created_at DESC',
      [clothingItemId]
    );
    return result;
  }

  async addChatMessage(
    userId: number,
    message: string,
    isUserMessage: boolean,
    contextData?: string
  ): Promise<number | null> {
    const db = this.getDatabase();
    
    const result = await db.runAsync(
      'INSERT INTO chat_history (user_id, message, is_user_message, context_data) VALUES (?, ?, ?, ?)',
      [userId, message, isUserMessage ? 1 : 0, toSQLiteValue(contextData)]
    );
    return result.lastInsertRowId;
  }

  async getChatHistory(userId: number, limit: number = 50): Promise<any[]> {
    const db = this.getDatabase();
    
    const result = await db.getAllAsync(
      'SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return result.reverse();
  }
  
  // Close connection
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      console.log('✅ Database connection closed');
    }
  }
}

// Export types
export type { ClothingItemData, UserData };

// Export singleton instance
export default DatabaseService.getInstance();
