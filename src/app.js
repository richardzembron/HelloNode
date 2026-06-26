'use strict';

const express          = require('express');
const session          = require('express-session');
const passport         = require('passport');
const { getPool }      = require('./db');

const helloRouter      = require('./routes/hello');
const hellologRouter   = require('./routes/hellolog');
const developerRouter  = require('./routes/developer');
const loginRouter      = require('./routes/login');
const authRouter       = require('./routes/auth');
const dashboardRouter  = require('./routes/dashboard');
const problemRouter    = require('./routes/problem');

const app = express();

// Trust Fly.io / reverse-proxy headers so req.secure = true behind HTTPS edge
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session store
const pool = getPool();
const sessionConfig = {
  key:               'hellonode.sid',
  secret:            process.env.SESSION_SECRET || 'dev-secret-change-me',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   24 * 60 * 60 * 1000,
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
};

if (pool) {
  const MySQLStore = require('express-mysql-session')(session);
  sessionConfig.store = new MySQLStore({ createDatabaseTable: true }, pool);
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.use('/hello',     helloRouter);
app.use('/hellolog',  hellologRouter);
app.use('/developer', developerRouter);
app.use('/login',     loginRouter);
app.use('/auth',      authRouter);
app.use('/dashboard', dashboardRouter);
app.use('/problem',   problemRouter);

// Test-only login route — never active in production
if (process.env.NODE_ENV !== 'production') {
  app.post('/auth/test-login', (req, res) => {
    req.session.passport = { user: { googleId: 'test-google-id', email: 'test@example.com', name: 'Test User', picture: null, localId: 1, blocked: false } };
    res.status(200).json({ ok: true });
  });
}

app.get('/', (req, res) => {
  if (req.isAuthenticated()) return res.redirect('/dashboard');
  res.status(200).type('text').send(
    `HelloNode is running.\nEnvironment: ${process.env.NODE_ENV || 'development'}\n` +
    `Routes: /hello  /hellolog  /developer  /login  /dashboard  /problem`
  );
});

app.use((req, res) => {
  res.status(404).type('text').send('Error: Not Found');
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).type('text').send('Error: Internal Server Error');
});

module.exports = app;
