-- Discount Coupons Table Schema
-- Run this in your MySQL database to create the coupons table

CREATE TABLE IF NOT EXISTS coupons (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    discount_type ENUM('percentage', 'fixed_amount', 'free_shipping') DEFAULT 'percentage',
    discount_value DECIMAL(10, 2) NOT NULL,
    min_order_value DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2) NULL,
    usage_limit INT NULL,
    usage_count INT DEFAULT 0,
    user_limit INT DEFAULT 1, -- Max uses per user
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    applicable_categories JSON NULL, -- Array of category IDs
    applicable_products JSON NULL, -- Array of product IDs
    free_shipping BOOLEAN DEFAULT FALSE,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT NULL,
    INDEX idx_code (code),
    INDEX idx_active (active),
    INDEX idx_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Coupon Usage Tracking Table
CREATE TABLE IF NOT EXISTS coupon_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    coupon_id INT NOT NULL,
    order_id INT NOT NULL,
    user_id INT NULL,
    user_email VARCHAR(255) NOT NULL,
    discount_amount DECIMAL(10, 2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    INDEX idx_coupon_id (coupon_id),
    INDEX idx_order_id (order_id),
    INDEX idx_user_email (user_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
