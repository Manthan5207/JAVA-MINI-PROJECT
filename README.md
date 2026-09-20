# Contact Management System

A clean, modular, and optimized console-based Contact Management System built with **Core Java**, **JDBC**, and **MySQL**. Designed specifically as a college-level academic project demonstrating Object-Oriented Programming, database connectivity, parameterized CRUD operations, and clean error handling.

---

## 📌 Project Overview

This application provides a simple command-line interface for managing personal and professional contacts. All contact records are stored permanently in a MySQL database using JDBC (`java.sql`).

Key highlights:
- **Zero bloat**: No Spring, no Hibernate, no Maven/Gradle complexity, no unnecessary design patterns.
- **Pure Core Java + JDBC**: Clean separation between Model (`Contact`), DAO (`ContactDAO`), Connection Factory (`DatabaseConnection`), and Console UI (`Main`).
- **Secure SQL**: Uses `PreparedStatement` exclusively with parameterized queries to prevent SQL injection.
- **Robust Resource Handling**: Uses Java 7+ `try-with-resources` to automatically close database connections, statements, and result sets.

---

## 🛠️ Technologies Used

- **Programming Language**: Java (JDK 8 or higher, tested on modern Java 17/21/26)
- **Database**: MySQL 5.7+ / 8.0+
- **Connectivity**: JDBC (MySQL Connector/J 8.4.0 included in `lib/`)
- **Web Interface**: HTML5, Vanilla CSS3 (Glassmorphism & Responsive Design), Vanilla JavaScript (REST API client)
- **Embedded Web Server**: Core Java `com.sun.net.httpserver.HttpServer` (Zero external web framework dependencies)
- **Command-Line Interface**: Classic Console Menu

---

## ✨ Features

1. **Dual Interface**:
   - **Modern Web Interface**: Beautiful, responsive browser application accessible at `http://localhost:8080` with card grid & table views, real-time search, category filters, and modal dialogues.
   - **Console Interface**: Classic interactive terminal menu for quick command-line operations.
2. **Add Contact**:
   - Collects Name, Phone, Email, Address, Category (Friend, Work, Family, etc.).
   - Validates non-empty name, phone format, and basic email structure.
3. **View All Contacts**:
   - Displays all stored contacts in a clean, formatted card grid or table.
4. **Search Contact**:
   - Real-time client-side and server-side search by name, phone, email, or address using parameterized wildcard SQL queries.
5. **Update Contact**:
   - Locate by Contact ID.
   - Update fields easily via modal form or interactive console.
6. **Delete Contact**:
   - Locate by Contact ID with safety confirmation before permanent removal.
7. **Offline Demo Fallback**:
   - The web interface works directly connected to MySQL via Java REST API, and also includes seamless local preview fallback if MySQL is offline.

---

## 📁 Project Structure

```text
ContactManagementSystem/
│
├── src/
│   ├── Contact.java              # Entity class representing a contact
│   ├── DatabaseConnection.java   # Centralized JDBC connection manager
│   ├── ContactDAO.java           # Data Access Object with CRUD queries
│   ├── Main.java                 # Interactive console menu & validation
│   └── WebServer.java            # Built-in HTTP server & REST API endpoints
│
├── web/
│   ├── index.html                # Modern web application interface
│   ├── style.css                 # Vanilla CSS design system & glassmorphic theme
│   └── app.js                    # Client application logic & REST API integration
│
├── database/
│   └── database.sql              # Database schema & sample seed data
│
├── lib/
│   └── mysql-connector-j-8.4.0.jar # Official MySQL JDBC Driver
│
├── run.bat                       # Interactive launcher (Web or Console)
├── run_web.bat                   # 1-click compile and launch Web Application
└── README.md                     # Project documentation
```

---

## ⚙️ Prerequisites & Setup

### 1. Requirements
- **Java Development Kit (JDK)**: JDK 8 or later installed and configured in `PATH`.
- **MySQL Server**: Installed and running (e.g., MySQL Community Server, XAMPP, or WampServer).

### 2. Database Setup
1. Start your MySQL server (via MySQL Command Line, MySQL Workbench, or XAMPP Control Panel).
2. Open MySQL console or Workbench and run the script located at `database/database.sql`, or execute:

```sql
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

-- (Optional) Insert sample data:
INSERT INTO contacts (name, phone, email, address, category) VALUES
('Rahul Sharma', '9876543210', 'rahul.sharma@example.com', 'Mumbai, Maharashtra', 'Friend'),
('Aman Patel', '9876501234', 'aman.patel@example.com', 'Ahmedabad, Gujarat', 'Work'),
('Priya Singh', '9123456780', 'priya.singh@example.com', 'Bengaluru, Karnataka', 'Family');
```

### 3. Configure Database Credentials (if needed)
Open `src/DatabaseConnection.java` and adjust `USER` and `PASSWORD` if your MySQL configuration uses a custom password:

```java
private static final String URL = "jdbc:mysql://localhost:3306/contact_management?useSSL=false&allowPublicKeyRetrieval=true";
private static final String USER = "root";
private static final String PASSWORD = ""; // Set your MySQL root password here if applicable
```

---

## 🚀 How to Run

### Method 1: Web Interface (Recommended)
Double-click `run_web.bat` or run:
```cmd
.\run_web.bat
```
This will compile the project, boot the embedded Java web server on port 8080, and automatically open your default browser to `http://localhost:8080`.

### Method 2: Interactive Launcher (`run.bat`)
Double-click `run.bat` or run:
```cmd
.\run.bat
```
Choose `[1]` for the Web Browser Interface or `[2]` for the classic Console Menu.

### Method 3: Manual Terminal Commands
Open terminal / command prompt in the project root:

**Step 1: Compile all sources**
```cmd
javac -cp ".;lib/*" -d bin src/*.java
```

**Step 2: Run Web Application**
```cmd
java -cp "bin;lib/*" WebServer
```
Then visit `http://localhost:8080` in your browser.

**Or Run Classic Console Application**
```cmd
java -cp "bin;lib/*" Main
```

*(On Linux / macOS, use `:` instead of `;` for classpath separator: `javac -cp ".:lib/*" -d bin src/*.java` and `java -cp "bin:lib/*" Main`)*

---

## 💡 Quick Viva / Exam Explanation

When presenting this project during a college viva, keep these points in mind:

1. **What is JDBC?**
   - *Java Database Connectivity* is an API in Java that allows Java programs to interact with relational database management systems (RDBMS) like MySQL.
2. **Why use `PreparedStatement` instead of `Statement`?**
   - **Security**: Prepares parameterized queries that prevent SQL Injection attacks.
   - **Performance**: Pre-compiled on the database engine.
   - **Convenience**: Automatically handles datatype escaping (strings, dates, integers).
3. **What is the DAO pattern?**
   - *Data Access Object (DAO)* separates data persistence logic (`ContactDAO`) from the user interface/business logic (`Main`). If the database or schema changes, only the DAO needs modification.
4. **Why use `try-with-resources`?**
   - Guarantees that database resources (`Connection`, `PreparedStatement`, `ResultSet`) are automatically closed when the block finishes, preventing database connection leaks.
5. **How does search work?**
   - Uses SQL `LIKE` operator with wildcard `%` passed via `ps.setString(1, "%" + keyword + "%")`.
