import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
let dbPromise: Promise<any> | null = null;

async function initDb() {
  if (dbPromise) return dbPromise;
  
  dbPromise = (async () => {
    try {
      console.log("Attempting to load better-sqlite3...");
      // Dynamic import to avoid bundling issues on Vercel
      const { default: Database } = await import("better-sqlite3");
      
      const dbPath = process.env.VERCEL ? ":memory:" : "organ_donation.db";
      console.log(`Initializing Database at: ${dbPath}`);
      const instance = new Database(dbPath);
      
      instance.exec(`
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
          date_added DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS organ_requests (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          recipient_id INTEGER,
          organ_type TEXT,
          blood_group TEXT,
          urgency_level TEXT,
          status TEXT DEFAULT 'PENDING',
          date_requested DATETIME DEFAULT CURRENT_TIMESTAMP,
          admin_note TEXT
        );
        CREATE TABLE IF NOT EXISTS matches (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          donor_id INTEGER,
          recipient_id INTEGER,
          organ_id INTEGER,
          request_id INTEGER,
          organ_type TEXT,
          matched_on DATETIME DEFAULT CURRENT_TIMESTAMP,
          status TEXT DEFAULT 'PENDING'
        );
      `);

      // Check if admin exists
      const admin = instance.prepare("SELECT * FROM users WHERE username = 'admin'").get();
      if (!admin) {
        console.log("Creating default admin user...");
        const adminPassword = await bcrypt.hash("admin123", 10);
        instance.prepare(`
          INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run("admin", adminPassword, "System Admin", 35, "Male", "O+", "1234567890", "ADMIN");
      }

      db = instance;
      console.log("Database initialized successfully.");
      return db;
    } catch (err) {
      console.error("Database initialization failed, using mock mode:", err);
      db = setupMockDb();
      return db;
    }
  })();
  
  return dbPromise;
}

function setupMockDb() {
  console.log("⚠️ RUNNING IN MOCK MODE: Data will not persist.");
  return {
    prepare: (sql: string) => ({
      run: (...args: any[]) => {
        console.log(`[MOCK RUN] ${sql}`, args);
        return { lastInsertRowid: Math.floor(Math.random() * 1000) };
      },
      get: (...args: any[]) => {
        console.log(`[MOCK GET] ${sql}`, args);
        return null;
      },
      all: (...args: any[]) => {
        console.log(`[MOCK ALL] ${sql}`, args);
        return [];
      }
    }),
    transaction: (cb: any) => cb,
    exec: (sql: string) => {
      console.log(`[MOCK EXEC] ${sql}`);
    }
  };
}

const app = express();
app.use(express.json());

// Middleware to ensure DB is initialized
app.use(async (req, res, next) => {
  if (!db) {
    await initDb();
  }
  next();
});

// Request Logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.all("*", (req, res, next) => {
  console.log(`[DEBUG] Incoming: ${req.method} ${req.url}`);
  next();
});

const apiRouter = express.Router();

// Health check
apiRouter.get("/health", (req, res) => res.json({ status: "ok" }));
apiRouter.get("/ping", (req, res) => res.json({ message: "pong" }));

const JWT_SECRET = process.env.JWT_SECRET || "organ-donation-secret-key";

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  if (req.user.role !== "ADMIN") return res.status(403).json({ error: "Forbidden" });
  next();
};

// --- AUTH ROUTES ---

apiRouter.post(["/auth/register", "/auth/register/"], async (req, res) => {
  console.log("Registration request received:", req.body?.username);
  const { username, password, name, age, gender, blood_group, contact, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    const info = db.prepare(`
      INSERT INTO users (username, password, name, age, gender, blood_group, contact, role)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(username, hashedPassword, name, age, gender, blood_group, contact, role);
    console.log("User registered successfully:", username);
    res.json({ id: info.lastInsertRowid });
  } catch (err: any) {
    console.error("Registration error:", err.message);
    res.status(400).json({ error: err.message });
  }
});

apiRouter.post(["/auth/login", "/auth/login/"], async (req, res) => {
  console.log("Login request received:", req.body?.username);
  const { username, password } = req.body;
  const user: any = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    console.log("Invalid login attempt for:", username);
    return res.status(401).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
  const { password: _, ...userWithoutPassword } = user;
  console.log("User logged in successfully:", username);
  res.json({ token, user: userWithoutPassword });
});

apiRouter.get("/auth/me", authenticate, (req: any, res) => {
  const user = db.prepare("SELECT id, username, name, role, age, gender, blood_group, contact FROM users WHERE id = ?").get(req.user.id);
  res.json(user);
});

// --- ORGAN ROUTES ---

apiRouter.get("/organs", authenticate, (req: any, res) => {
  const { type, bloodGroup } = req.query;
  let query = "SELECT organs.*, users.name as donor_name FROM organs JOIN users ON organs.donor_id = users.id WHERE availability_status = 'AVAILABLE'";
  const params: any[] = [];
  if (type) {
    query += " AND organ_type = ?";
    params.push(type);
  }
  if (bloodGroup) {
    query += " AND blood_group = ?";
    params.push(bloodGroup);
  }
  const organs = db.prepare(query).all(...params);
  res.json(organs);
});

apiRouter.post("/organs", authenticate, (req: any, res) => {
  const { organ_type, blood_group } = req.body;
  const info = db.prepare(`
    INSERT INTO organs (organ_type, blood_group, donor_id)
    VALUES (?, ?, ?)
  `).run(organ_type, blood_group, req.user.id);
  res.json({ id: info.lastInsertRowid });
});

// --- REQUEST ROUTES ---

apiRouter.post("/requests", authenticate, (req: any, res) => {
  const { organ_type, blood_group, urgency_level } = req.body;
  const info = db.prepare(`
    INSERT INTO organ_requests (recipient_id, organ_type, blood_group, urgency_level)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, organ_type, blood_group, urgency_level);
  res.json({ id: info.lastInsertRowid });
});

apiRouter.get("/requests/my", authenticate, (req: any, res) => {
  const requests = db.prepare("SELECT * FROM organ_requests WHERE recipient_id = ? ORDER BY date_requested DESC").all(req.user.id);
  res.json(requests);
});

// --- ADMIN ROUTES ---

apiRouter.get("/admin/stats", authenticate, isAdmin, (req, res) => {
  const totalDonors = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'DONOR'").get() as any;
  const totalRecipients = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'RECIPIENT'").get() as any;
  const pendingRequests = db.prepare("SELECT COUNT(*) as count FROM organ_requests WHERE status = 'PENDING'").get() as any;
  const matchedOrgans = db.prepare("SELECT COUNT(*) as count FROM matches").get() as any;
  res.json({
    donors: totalDonors.count,
    recipients: totalRecipients.count,
    pending: pendingRequests.count,
    matches: matchedOrgans.count
  });
});

apiRouter.get("/admin/requests", authenticate, isAdmin, (req, res) => {
  const requests = db.prepare(`
    SELECT organ_requests.*, users.name as recipient_name 
    FROM organ_requests 
    JOIN users ON organ_requests.recipient_id = users.id 
    ORDER BY 
      CASE urgency_level 
        WHEN 'CRITICAL' THEN 1 
        WHEN 'HIGH' THEN 2 
        WHEN 'MEDIUM' THEN 3 
        WHEN 'LOW' THEN 4 
      END ASC,
      date_requested DESC
  `).all();
  res.json(requests);
});

apiRouter.post("/admin/requests/:id/status", authenticate, isAdmin, (req, res) => {
  const { status, admin_note } = req.body;
  const { id } = req.params;
  db.prepare("UPDATE organ_requests SET status = ?, admin_note = ? WHERE id = ?").run(status, admin_note, id);
  res.json({ success: true });
});

apiRouter.get("/admin/matches/suggest/:requestId", authenticate, isAdmin, (req, res) => {
  const { requestId } = req.params;
  const request: any = db.prepare("SELECT * FROM organ_requests WHERE id = ?").get(requestId);
  if (!request) return res.status(404).json({ error: "Request not found" });

  const availableOrgans = db.prepare(`
    SELECT organs.*, users.name as donor_name, users.blood_group as donor_blood_group
    FROM organs 
    JOIN users ON organs.donor_id = users.id 
    WHERE organ_type = ? AND availability_status = 'AVAILABLE'
  `).all(request.organ_type) as any[];

  const suggestions = availableOrgans.filter(organ => {
    const bloodCompatibility: Record<string, string[]> = {
      "O-": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
      "O+": ["O+", "A+", "B+", "AB+"],
      "A-": ["A-", "A+", "AB-", "AB+"],
      "A+": ["A+", "AB+"],
      "B-": ["B-", "B+", "AB-", "AB+"],
      "B+": ["B+", "AB+"],
      "AB-": ["AB-", "AB+"],
      "AB+": ["AB+"]
    };
    const compatibleRecipients = bloodCompatibility[organ.donor_blood_group] || [];
    return compatibleRecipients.includes(request.blood_group);
  });

  res.json(suggestions);
});

apiRouter.post("/admin/matches", authenticate, isAdmin, (req, res) => {
  const { donor_id, recipient_id, organ_id, request_id, organ_type } = req.body;
  
  const transaction = db.transaction(() => {
    db.prepare(`
      INSERT INTO matches (donor_id, recipient_id, organ_id, request_id, organ_type, status)
      VALUES (?, ?, ?, ?, ?, 'COMPLETED')
    `).run(donor_id, recipient_id, organ_id, request_id, organ_type);

    db.prepare("UPDATE organs SET availability_status = 'MATCHED' WHERE id = ?").run(organ_id);
    db.prepare("UPDATE organ_requests SET status = 'APPROVED', admin_note = 'Matched with compatible donor' WHERE id = ?").run(request_id);
  });

  try {
    transaction();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.get("/admin/matches", authenticate, isAdmin, (req, res) => {
  const matches = db.prepare(`
    SELECT matches.*, d.name as donor_name, r.name as recipient_name
    FROM matches
    JOIN users d ON matches.donor_id = d.id
    JOIN users r ON matches.recipient_id = r.id
    ORDER BY matched_on DESC
  `).all();
  res.json(matches);
});

apiRouter.get("/admin/users", authenticate, isAdmin, (req, res) => {
  const users = db.prepare("SELECT id, username, name, role, blood_group, contact FROM users WHERE role != 'ADMIN'").all();
  res.json(users);
});

apiRouter.delete("/admin/users/:id", authenticate, isAdmin, (req, res) => {
  const { id } = req.params;
  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM matches WHERE donor_id = ? OR recipient_id = ?").run(id, id);
    db.prepare("DELETE FROM organ_requests WHERE recipient_id = ?").run(id);
    db.prepare("DELETE FROM organs WHERE donor_id = ?").run(id);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });
  try {
    transaction();
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Mount API Router
app.use("/api", apiRouter);

// --- VITE MIDDLEWARE & STARTUP ---

async function startServer() {
  console.log("Initializing server...");
  await initDb();
  
  const PORT = 3000;
  
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    console.log("Starting in DEVELOPMENT mode with Vite...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { 
          middlewareMode: true,
          host: '0.0.0.0',
          port: PORT
        },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached successfully.");
    } catch (viteError) {
      console.error("Failed to start Vite:", viteError);
    }
  } else {
    console.log("Starting in PRODUCTION/VERCEL mode...");
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  // Only listen if not in a serverless environment
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 LifeStream Server is live at http://0.0.0.0:${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  }
}

// Start the server
startServer().catch(err => {
  console.error("FATAL: Server failed to start:", err);
});

// Export for Vercel
export default app;
