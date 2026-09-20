-- ============================================================
-- Contact Management System Database Script
-- Database: contact_management
-- Table: contacts
-- ============================================================

CREATE DATABASE IF NOT EXISTS contact_management;
USE contact_management;

CREATE TABLE IF NOT EXISTS contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    address VARCHAR(255),
    category VARCHAR(50)
);

-- Optional starter sample data
INSERT INTO contacts (name, phone, email, address, category) VALUES
('Rahul Sharma', '9876543210', 'rahul.sharma@example.com', 'Mumbai, Maharashtra', 'Friend'),
('Aman Patel', '9876501234', 'aman.patel@example.com', 'Ahmedabad, Gujarat', 'Work'),
('Priya Singh', '9123456780', 'priya.singh@example.com', 'Bengaluru, Karnataka', 'Family');
