require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const PgSession = require('connect-pg-simple')(session);
const db = require('./db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = 5000;

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
    store: new PgSession({
        pool: db.pool,
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || 'super-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    }
}));

app.use(passport.initialize());
app.use(passport.session());

const scopes = ['identify', 'email', 'guilds'];
const callbackURL = process.env.DISCORD_CALLBACK_URL || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co/auth/discord/callback`;

passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: callbackURL,
    scope: scopes
}, async (accessToken, refreshToken, profile, done) => {
    try {
        const user = await db.findOrCreateUser(profile, { accessToken, refreshToken });
        return done(null, { ...profile, dbUser: user, accessToken });
    } catch (error) {
        return done(error, null);
    }
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

app.get('/', (req, res) => {
    res.render('index', { user: req.user });
});

app.get('/login', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.render('login');
});

app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback',
    passport.authenticate('discord', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error('Logout error:', err);
        res.redirect('/');
    });
});

app.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.user });
});

app.get('/dashboard/server/:id', isAuthenticated, async (req, res) => {
    const guild = req.user.guilds?.find(g => g.id === req.params.id);
    if (!guild) {
        return res.redirect('/dashboard');
    }
    
    const settings = await db.getGuildSettings(req.params.id);
    res.render('server', { user: req.user, guild, settings });
});

app.get('/commands', (req, res) => {
    res.render('commands', { user: req.user });
});

app.get('/features', (req, res) => {
    res.render('features', { user: req.user });
});

app.get('/status', (req, res) => {
    res.render('status', { user: req.user });
});

app.use('/api', apiRoutes);

async function startServer() {
    try {
        await db.initializeDatabase();
        console.log('Database initialized');
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Website running on http://0.0.0.0:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
