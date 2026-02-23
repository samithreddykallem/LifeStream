import Database from "better-sqlite3";
import bcrypt from "bcryptjs";

const db = new Database("organ_donation.db");

async function seed() {
  console.log("Seeding data...");

  // Initialize Database Tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      name TEXT,
      age INTEGER,
      gender TEXT,
      blood_group TEXT,
      contact TEXT,
      role TEXT
    );

    CREATE TABLE IF NOT EXISTS organs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      organ_type TEXT,
      blood_group TEXT,
      donor_id INTEGER,
      availability_status TEXT DEFAULT 'AVAILABLE',
      date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (donor_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS organ_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_id INTEGER,
      organ_type TEXT,
      blood_group TEXT,
      urgency_level TEXT,
      status TEXT DEFAULT 'PENDING',
      date_requested DATETIME DEFAULT CURRENT_TIMESTAMP,
      admin_note TEXT,
      FOREIGN KEY (recipient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donor_id INTEGER,
      recipient_id INTEGER,
      organ_id INTEGER,
      request_id INTEGER,
      organ_type TEXT,
      matched_on DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'PENDING',
      FOREIGN KEY (donor_id) REFERENCES users(id),
      FOREIGN KEY (recipient_id) REFERENCES users(id),
      FOREIGN KEY (organ_id) REFERENCES organs(id),
      FOREIGN KEY (request_id) REFERENCES organ_requests(id)
    );
  `);

  // Clear existing data
  db.exec("DELETE FROM matches");
  db.exec("DELETE FROM organ_requests");
  db.exec("DELETE FROM organs");
  db.exec("DELETE FROM users");

  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  // Users
  db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("admin", adminPassword, "System Admin", 35, "Male", "O+", "1234567890", "ADMIN");

  const donor1 = db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("donor1", userPassword, "John Doe", 28, "Male", "O-", "9876543210", "DONOR");

  const donor2 = db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("donor2", userPassword, "Jane Smith", 32, "Female", "A+", "5556667777", "DONOR");

  const recipient1 = db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("recipient1", userPassword, "Alice Brown", 45, "Female", "AB+", "1112223333", "RECIPIENT");

  const recipient2 = db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("recipient2", userPassword, "Bob Wilson", 50, "Male", "B-", "4445556666", "RECIPIENT");

  // Sravan Reddy (from user request)
  db.prepare(`
    INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run("sravan13", userPassword, "Sravan Reddy", 25, "Male", "B+", "9988776655", "DONOR");

  // Organs
  db.prepare(`
    INSERT INTO organs (organ_type, blood_group, donor_id)
    VALUES (?, ?, ?)
  `).run("KIDNEY", "O-", donor1.lastInsertRowid);

  db.prepare(`
    INSERT INTO organs (organ_type, blood_group, donor_id)
    VALUES (?, ?, ?)
  `).run("LIVER", "A+", donor2.lastInsertRowid);

  // Requests
  db.prepare(`
    INSERT INTO organ_requests (recipient_id, organ_type, blood_group, urgency_level)
    VALUES (?, ?, ?, ?)
  `).run(recipient1.lastInsertRowid, "KIDNEY", "AB+", "CRITICAL");

  db.prepare(`
    INSERT INTO organ_requests (recipient_id, organ_type, blood_group, urgency_level)
    VALUES (?, ?, ?, ?)
  `).run(recipient2.lastInsertRowid, "LIVER", "B-", "MEDIUM");

  console.log("Seed completed successfully!");
}

seed().catch(console.error);
