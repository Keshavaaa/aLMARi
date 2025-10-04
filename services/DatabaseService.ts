import * as SQLite from 'expo-sqlite';
// At the bottom of DatabaseService.ts, add:
export type { ClothingItemData, UserData };

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

// ✅ Helper function to convert undefined to null for SQLite
const toSQLiteValue = (value: any): any => {
  return value === undefined ? null : value;
};

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  constructor() {
    this.initDatabase();
  }

  async initDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync('almari.db');
      await this.createTables();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization error:', error);
    }
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

  // ✅ FIX: User methods with proper null conversion
  async createUser(userData: UserData): Promise<number | null> {
    if (!this.db) return null;
    
    const result = await this.db.runAsync(
      'INSERT INTO users (username, device_id, body_type, skin_tone, style_preference, location) VALUES (?, ?, ?, ?, ?, ?)',
      [
        userData.username, 
        userData.device_id, 
        toSQLiteValue(userData.body_type), 
        toSQLiteValue(userData.skin_tone), 
        toSQLiteValue(userData.style_preference), 
        toSQLiteValue(userData.location)
      ]
    );
    return result.lastInsertRowId;
  }

  async getUserByDeviceId(deviceId: string): Promise<any> {
    if (!this.db) return null;
    
    const result = await this.db.getFirstAsync(
      'SELECT * FROM users WHERE device_id = ?',
      [deviceId]
    );
    return result;
  }

  // ✅ FIX: Clothing methods with proper null conversion
  async addClothingItem(itemData: ClothingItemData): Promise<number | null> {
    if (!this.db) return null;
    
    const result = await this.db.runAsync(`
      INSERT INTO clothing_items (
        user_id, name, image_uri, clothing_type, primary_color, 
        secondary_color, fabric_type, style_category, season_suitability, 
        brand, size, price, ai_analysis
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      itemData.user_id, 
      itemData.name, 
      itemData.image_uri, 
      toSQLiteValue(itemData.clothing_type),
      toSQLiteValue(itemData.primary_color),
      toSQLiteValue(itemData.secondary_color),  // ✅ Convert undefined to null
      toSQLiteValue(itemData.fabric_type),
      toSQLiteValue(itemData.style_category),
      toSQLiteValue(itemData.season_suitability),
      toSQLiteValue(itemData.brand),
      toSQLiteValue(itemData.size),
      toSQLiteValue(itemData.price),
      toSQLiteValue(itemData.ai_analysis)
    ]);
    return result.lastInsertRowId;
  }

  async getUserClothing(userId: number): Promise<any[]> {
    if (!this.db) return [];
    
    const result = await this.db.getAllAsync(
      'SELECT * FROM clothing_items WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    return result;
  }
  // ✅ FIX: Update method with proper null conversion
  async updateClothingItem(itemId: number, updates: Partial<ClothingItemData>): Promise<void> {
    if (!this.db) return;
    
    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [
      ...Object.values(updates).map(val => toSQLiteValue(val)),  // ✅ Convert all undefined to null
      itemId
    ];
    
    await this.db.runAsync(
      `UPDATE clothing_items SET ${setClause} WHERE id = ?`,
      values
    );
  }

  // ✅ FIX: Sticky notes with proper null conversion
  async addStickyNote(clothingItemId: number, noteText: string): Promise<number | null> {
    if (!this.db) return null;
    
    const result = await this.db.runAsync(
      'INSERT INTO sticky_notes (clothing_item_id, note_text) VALUES (?, ?)',
      [clothingItemId, noteText]
    );
    return result.lastInsertRowId;
  }

  async getStickyNotes(clothingItemId: number): Promise<any[]> {
    if (!this.db) return [];
    
    const result = await this.db.getAllAsync(
      'SELECT * FROM sticky_notes WHERE clothing_item_id = ? ORDER BY created_at DESC',
      [clothingItemId]
    );
    return result;
  }

  // ✅ FIX: Chat history with proper null conversion
  async addChatMessage(userId: number, message: string, isUserMessage: boolean, contextData?: string): Promise<number | null> {
    if (!this.db) return null;
    
    const result = await this.db.runAsync(
      'INSERT INTO chat_history (user_id, message, is_user_message, context_data) VALUES (?, ?, ?, ?)',
      [userId, message, isUserMessage ? 1 : 0, toSQLiteValue(contextData)]  // ✅ Convert undefined to null
    );
    return result.lastInsertRowId;
  }

  async getChatHistory(userId: number, limit: number = 50): Promise<any[]> {
    if (!this.db) return [];
    
    const result = await this.db.getAllAsync(
      'SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
      [userId, limit]
    );
    return result.reverse();
  }
}

export default new DatabaseService();
