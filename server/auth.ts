import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

// Fix: Replace namespace with module augmentation
declare module "express-serve-static-core" {
  interface User extends SelectUser {}
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express): void {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'your-default-secret-key',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email', // Use email as username field
        passwordField: 'password'
      },
      async (email: string, password: string, done) => {
        try {
          const user = await storage.getUserByUsernameOrEmail(email);
          if (!user) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          const isValidPassword = await comparePasswords(password, user.password);
          if (!isValidPassword) {
            return done(null, false, { message: 'Invalid email or password' });
          }
          
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: SelectUser, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, email, password } = req.body;

      // Validate input
      if (!username || !email || !password) {
        return res.status(400).json({ 
          error: "Username, email, and password are required" 
        });
      }

      if (password.length < 6) {
        return res.status(400).json({ 
          error: "Password must be at least 6 characters long" 
        });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByUsernameOrEmail(username);
      if (existingUser) {
        return res.status(400).json({ 
          error: "Username already exists" 
        });
      }

      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ 
          error: "Email already exists" 
        });
      }

      // Create new user
      const hashedPassword = await hashPassword(password);
      const user = await storage.createUser({
        username,
        email,
        password: hashedPassword,
      });

      // Log the user in automatically
      req.login(user, (err) => {
        if (err) {
          console.error('Login error after registration:', err);
          return next(err);
        }
        
        // Don't send password in response
        const { password: _, ...userWithoutPassword } = user;
        res.status(201).json({ 
          message: "Registration successful",
          user: userWithoutPassword 
        });
      });

    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: "An error occurred during registration" 
      });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser | false, info: any) => {
      if (err) {
        console.error('Login error:', err);
        return res.status(500).json({ error: "An error occurred during login" });
      }
      
      if (!user) {
        return res.status(401).json({ 
          error: info?.message || "Invalid email or password" 
        });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error('Login session error:', loginErr);
          return res.status(500).json({ error: "Login failed" });
        }
        
        // Don't send password in response
        const { password: _, ...userWithoutPassword } = user;
        res.status(200).json({ 
          message: "Login successful",
          user: userWithoutPassword 
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return next(err);
      }
      res.status(200).json({ message: "Logout successful" });
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    // Don't send password in response
    const user = req.user as SelectUser;
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  // Check authentication status
  app.get("/api/auth/status", (req, res) => {
    res.json({ 
      authenticated: req.isAuthenticated(),
      user: req.isAuthenticated() ? req.user : null 
    });
  });
}
