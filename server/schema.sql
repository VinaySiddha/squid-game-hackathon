CREATE DATABASE IF NOT EXISTS squid_game_hackathon;
USE squid_game_hackathon;

CREATE TABLE IF NOT EXISTS participants (
    id INT AUTO_INCREMENT PRIMARY KEY,
    player_number VARCHAR(3) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    photo_url VARCHAR(500),
    is_alive BOOLEAN DEFAULT TRUE,
    is_checked_in BOOLEAN DEFAULT FALSE,
    registration_token VARCHAR(64) UNIQUE,
    email_sent_at TIMESTAMP NULL,
    department VARCHAR(255),
    roll_number VARCHAR(50),
    section VARCHAR(10),
    contact_number VARCHAR(15),
    year VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_name VARCHAR(255) NOT NULL,
    leader_id INT NOT NULL,
    is_submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (leader_id) REFERENCES participants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    participant_id INT NOT NULL,
    role ENUM('leader', 'member') NOT NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_participant (team_id, participant_id)
);

CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    `key` VARCHAR(100) NOT NULL UNIQUE,
    value TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO settings (`key`, value) VALUES
    ('timer_end_time', NULL),
    ('timer_running', 'false'),
    ('timer_paused_remaining', NULL)
ON DUPLICATE KEY UPDATE `key` = `key`;

-- Game Sessions (shared across all 4 games)
CREATE TABLE IF NOT EXISTS game_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    game_type ENUM('rlgl', 'dalgona', 'mingle', 'tugofwar', 'glassbridge') NOT NULL,
    config JSON NOT NULL,
    status ENUM('waiting', 'active', 'finished') DEFAULT 'waiting',
    current_signal ENUM('red', 'green') DEFAULT 'green',
    started_at DATETIME NULL,
    ended_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Game Players (tracks each player's state within a session)
CREATE TABLE IF NOT EXISTS game_players (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id INT NOT NULL,
    participant_id INT NOT NULL,
    team_id INT NULL,
    progress INT DEFAULT 0,
    strikes_used INT DEFAULT 0,
    is_finished BOOLEAN DEFAULT FALSE,
    is_eliminated BOOLEAN DEFAULT FALSE,
    eliminated_reason VARCHAR(100) NULL,
    extra JSON NULL,
    finished_at DATETIME NULL,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
    UNIQUE KEY unique_session_participant (session_id, participant_id)
);
