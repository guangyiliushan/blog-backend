CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4(),
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    nickname TEXT NOT NULL,
    avatar TEXT DEFAULT 'default.png',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    birthday DATE,
    location TEXT
);

CREATE TABLE IF NOT EXISTS posts (
    id VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    published BOOLEAN DEFAULT FALSE,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    author_id VARCHAR(36) REFERENCES users(id) ON DELETE CASCADE,
    category TEXT,
    tags TEXT[]
);

