import Database from "better-sqlite3";
import pg from "pg";
const { Pool } = pg;
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface DbInterface {
  prepare(sql: string): {
    run(...args: any[]): Promise<{ lastInsertRowid?: number | string }>;
    get(...args: any[]): Promise<any>;
    all(...args: any[]): Promise<any[]>;
  };
  exec(sql: string): Promise<void>;
}

async function initDb(): Promise<DbInterface> {
  const dbUrl = process.env.DATABASE_URL;

  if (dbUrl) {
    console.log("[SEED] Connecting to Remote Postgres...");
    const pool = new Pool({
      connectionString: dbUrl,
      ssl: { rejectUnauthorized: false }
    });

    return {
      prepare: (sql: string) => {
        const pgSql = sql.replace(/\?/g, (_, offset, s) => `$${(s.slice(0, offset).match(/\?/g) || []).length + 1}`);
        return {
          run: async (...args: any[]) => {
            const res = await pool.query(pgSql, args);
            // Try to get ID if it was an insert
            return { lastInsertRowid: (res.rows[0] as any)?.id };
          },
          get: async (...args: any[]) => {
            const res = await pool.query(pgSql, args);
            return res.rows[0];
          },
          all: async (...args: any[]) => {
            const res = await pool.query(pgSql, args);
            return res.rows;
          }
        };
      },
      exec: async (sql: string) => {
        await pool.query(sql);
      }
    };
  }

  console.log("[SEED] Connecting to Local SQLite...");
  const dbPath = path.resolve(process.cwd(), "organ_donation.db");
  const instance = new Database(dbPath);

  return {
    prepare: (sql: string) => {
      const stmt = instance.prepare(sql);
      return {
        run: async (...args: any[]) => {
          const info = stmt.run(...args);
          return { lastInsertRowid: info.lastInsertRowid };
        },
        get: async (...args: any[]) => stmt.get(...args),
        all: async (...args: any[]) => stmt.all(...args)
      };
    },
    exec: async (sql: string) => {
      instance.exec(sql);
    }
  };
}

async function seed() {
  console.log("Seeding data...");
  const db = await initDb();

  const isPostgres = !!process.env.DATABASE_URL;
  const serialType = isPostgres ? "SERIAL" : "INTEGER PRIMARY KEY AUTOINCREMENT";
  const timestampType = isPostgres ? "TIMESTAMP" : "DATETIME";

  // Initialize Database Tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id ${serialType},
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      age INTEGER,
      gender TEXT,
      blood_group TEXT,
      contact TEXT,
      role TEXT
      ${isPostgres ? ", PRIMARY KEY (id)" : ""}
    );

    CREATE TABLE IF NOT EXISTS organs (
      id ${serialType},
      organ_type TEXT,
      blood_group TEXT,
      donor_id INTEGER,
      availability_status TEXT DEFAULT 'AVAILABLE',
      date_added ${timestampType} DEFAULT CURRENT_TIMESTAMP
      ${isPostgres ? ", PRIMARY KEY (id)" : ""}
    );

    CREATE TABLE IF NOT EXISTS organ_requests (
      id ${serialType},
      recipient_id INTEGER,
      organ_type TEXT,
      blood_group TEXT,
      urgency_level TEXT,
      status TEXT DEFAULT 'PENDING',
      date_requested ${timestampType} DEFAULT CURRENT_TIMESTAMP,
      admin_note TEXT
      ${isPostgres ? ", PRIMARY KEY (id)" : ""}
    );

    CREATE TABLE IF NOT EXISTS matches (
      id ${serialType},
      donor_id INTEGER,
      recipient_id INTEGER,
      organ_id INTEGER,
      request_id INTEGER,
      organ_type TEXT,
      matched_on ${timestampType} DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'PENDING'
      ${isPostgres ? ", PRIMARY KEY (id)" : ""}
    );
  `);

  // Clear existing data
  await db.exec("DELETE FROM matches");
  await db.exec("DELETE FROM organ_requests");
  await db.exec("DELETE FROM organs");
  await db.exec("DELETE FROM users");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  // Users
  await db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("admin", adminPassword, "System Admin", 35, "Male", "O+", "1234567890", "ADMIN");

  const donor1 = await db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ${isPostgres ? "RETURNING id" : ""}
  `).run("donor1", userPassword, "Rahul Sharma", 28, "Male", "O+", "9876543210", "DONOR");

  const donor2 = await db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ${isPostgres ? "RETURNING id" : ""}
  `).run("donor2", userPassword, "Priya Patel", 32, "Female", "A+", "9876543211", "DONOR");

  const recipient1 = await db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ${isPostgres ? "RETURNING id" : ""}
  `).run("recipient1", userPassword, "Amit Kumar", 45, "Female", "AB+", "1112223333", "RECIPIENT");

  const recipient2 = await db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ${isPostgres ? "RETURNING id" : ""}
  `).run("recipient2", userPassword, "Sneha Reddy", 50, "Male", "B-", "4445556666", "RECIPIENT");

  // Organs
  await db.prepare(`
    INSERT INTO organs (organ_type, blood_group, donor_id)
    VALUES (?, ?, ?)
  `).run("KIDNEY", "O+", donor1.lastInsertRowid);

  await db.prepare(`
    INSERT INTO organs (organ_type, blood_group, donor_id)
    VALUES (?, ?, ?)
  `).run("LIVER", "A+", donor2.lastInsertRowid);

  // Requests - No need for lastInsertRowid here for now
  await db.prepare(`
    INSERT INTO organ_requests (recipient_id, organ_type, blood_group, urgency_level)
    VALUES (?, ?, ?, ?)
  `).run(recipient1.lastInsertRowid, "KIDNEY", "AB+", "CRITICAL");

  await db.prepare(`
    INSERT INTO organ_requests (recipient_id, organ_type, blood_group, urgency_level)
    VALUES (?, ?, ?, ?)
  `).run(recipient2.lastInsertRowid, "LIVER", "B-", "MEDIUM");

  console.log("Seed completed successfully!");
}

seed().catch(console.error);
