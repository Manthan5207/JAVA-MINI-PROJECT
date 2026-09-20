import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {
    // Database configuration constants (Supports Cloud Environment Variables with local XAMPP fallback)
    private static final String DEFAULT_URL = "jdbc:mysql://localhost:3306/contact_management?useSSL=false&allowPublicKeyRetrieval=true";
    private static final String DEFAULT_USER = "root";
    private static final String DEFAULT_PASSWORD = "";

    // Static block to load MySQL JDBC Driver
    static {
        try {
            Class.forName("com.mysql.cj.jdbc.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("Error: MySQL JDBC Driver not found! Ensure the connector JAR is added to the classpath.");
        }
    }

    // Method to obtain database connection
    public static Connection getConnection() throws SQLException {
        String envUrl = System.getenv("DB_URL");
        if (envUrl == null || envUrl.trim().isEmpty()) {
            envUrl = System.getenv("MYSQL_URL");
        }
        String url = (envUrl != null && !envUrl.trim().isEmpty()) ? envUrl : DEFAULT_URL;

        String envUser = System.getenv("DB_USER");
        if (envUser == null || envUser.trim().isEmpty()) {
            envUser = System.getenv("MYSQL_USER");
        }
        String user = (envUser != null) ? envUser : DEFAULT_USER;

        String envPass = System.getenv("DB_PASSWORD");
        if (envPass == null) {
            envPass = System.getenv("MYSQL_PASSWORD");
        }
        String password = (envPass != null) ? envPass : DEFAULT_PASSWORD;

        return DriverManager.getConnection(url, user, password);
    }
}
