import Database from "better-sqlite3";
const db = new Database("organ_donation.db");
const users = db.prepare("SELECT username FROM users").all();
console.log(JSON.stringify(users, null, 2));
