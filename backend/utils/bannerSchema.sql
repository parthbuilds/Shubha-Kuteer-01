-- Banners Table Schema
-- Run this in your MySQL database to create the banners table

CREATE TABLE IF NOT EXISTS banners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    banner_type ENUM('hero', 'category', 'promotional', 'sidebar', 'footer') DEFAULT 'promotional',
    image_url VARCHAR(500) NOT NULL,
    mobile_image_url VARCHAR(500) NULL,
    link_url VARCHAR(500) NULL,
    link_target ENUM('_self', '_blank') DEFAULT '_self',
    position INT DEFAULT 0,
    page_location VARCHAR(100) NULL, -- e.g., 'home', 'shop', 'category:bed-linen'
    start_date DATETIME NULL,
    end_date DATETIME NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    INDEX idx_type (banner_type),
    INDEX idx_active (active),
    INDEX idx_position (position),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
