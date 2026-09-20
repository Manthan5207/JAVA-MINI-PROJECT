import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.awt.Desktop;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class WebServer {
    private static final int PORT = 8080;
    private static final ContactDAO contactDAO = new ContactDAO();

    public static void main(String[] args) {
        try {
            HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);
            server.setExecutor(Executors.newCachedThreadPool());

            // API Endpoints
            server.createContext("/api/health", new HealthHandler());
            server.createContext("/api/contacts", new ContactApiHandler());

            // Static Web Assets Handler
            server.createContext("/", new StaticFileHandler());

            server.start();

            System.out.println("=========================================================");
            System.out.println("       CONTACTVAULT WEB SERVER IS RUNNING                ");
            System.out.println("=========================================================");
            System.out.println("  Local URL: http://localhost:" + PORT);
            System.out.println("  Database : MySQL (via ContactDAO)");
            System.out.println("  Press Ctrl+C in this terminal to stop the server.");
            System.out.println("=========================================================");

            // Proactively open default browser if supported
            tryOpenBrowser("http://localhost:" + PORT);

        } catch (IOException e) {
            System.err.println("Failed to start WebServer: " + e.getMessage());
        }
    }

    private static void tryOpenBrowser(String url) {
        if (Desktop.isDesktopSupported() && Desktop.getDesktop().isSupported(Desktop.Action.BROWSE)) {
            try {
                Desktop.getDesktop().browse(new URI(url));
            } catch (Exception ignored) {
                // Non-critical if headless or unsupported
            }
        }
    }

    // ==========================================
    // Health Check Handler
    // ==========================================
    static class HealthHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);

            if ("OPTIONS".equalsIgnoreCase(exchange.getRequestMethod())) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            boolean dbOk = false;
            try (Connection conn = DatabaseConnection.getConnection()) {
                dbOk = (conn != null && !conn.isClosed());
            } catch (Exception e) {
                dbOk = false;
            }

            String jsonResponse = "{\"status\":\"UP\",\"dbConnected\":" + dbOk + "}";
            sendJsonResponse(exchange, 200, jsonResponse);
        }
    }

    // ==========================================
    // Contact REST API Handler (/api/contacts)
    // ==========================================
    static class ContactApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            addCorsHeaders(exchange);

            String method = exchange.getRequestMethod().toUpperCase();
            if ("OPTIONS".equals(method)) {
                exchange.sendResponseHeaders(204, -1);
                return;
            }

            URI requestURI = exchange.getRequestURI();
            String path = requestURI.getPath(); // e.g. /api/contacts or /api/contacts/5

            // Extract sub-path ID if present
            Integer contactId = extractIdFromPath(path);

            try {
                switch (method) {
                    case "GET":
                        handleGet(exchange, requestURI, contactId);
                        break;
                    case "POST":
                        handlePost(exchange);
                        break;
                    case "PUT":
                        handlePut(exchange, contactId);
                        break;
                    case "DELETE":
                        handleDelete(exchange, contactId);
                        break;
                    default:
                        sendJsonResponse(exchange, 405, "{\"error\":\"Method Not Allowed\"}");
                }
            } catch (Exception ex) {
                ex.printStackTrace();
                sendJsonResponse(exchange, 500, "{\"error\":\"Internal Server Error: " + escapeJson(ex.getMessage()) + "\"}");
            }
        }

        private void handleGet(HttpExchange exchange, URI uri, Integer id) throws IOException {
            if (id != null) {
                Contact c = contactDAO.getContactById(id);
                if (c != null) {
                    sendJsonResponse(exchange, 200, contactToJson(c));
                } else {
                    sendJsonResponse(exchange, 404, "{\"error\":\"Contact not found\"}");
                }
                return;
            }

            // Check query params for search keyword
            Map<String, String> queryParams = parseQueryParams(uri.getQuery());
            String keyword = queryParams.get("search");

            List<Contact> contacts;
            if (keyword != null && !keyword.trim().isEmpty()) {
                contacts = contactDAO.searchContacts(keyword.trim());
            } else {
                contacts = contactDAO.getAllContacts();
            }

            sendJsonResponse(exchange, 200, contactsToJsonArray(contacts));
        }

        private void handlePost(HttpExchange exchange) throws IOException {
            String body = readRequestBody(exchange);
            String name = parseJsonField(body, "name");
            String phone = parseJsonField(body, "phone");
            String email = parseJsonField(body, "email");
            String address = parseJsonField(body, "address");
            String category = parseJsonField(body, "category");

            if (name == null || name.trim().isEmpty() || phone == null || phone.trim().isEmpty()) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Name and phone are required\"}");
                return;
            }

            Contact newContact = new Contact(
                name.trim(),
                phone.trim(),
                email != null ? email.trim() : "",
                address != null ? address.trim() : "",
                category != null ? category.trim() : "Friend"
            );

            boolean success = contactDAO.addContact(newContact);
            if (success) {
                sendJsonResponse(exchange, 201, "{\"success\":true,\"message\":\"Contact added successfully\"}");
            } else {
                sendJsonResponse(exchange, 500, "{\"error\":\"Database failed to insert contact\"}");
            }
        }

        private void handlePut(HttpExchange exchange, Integer pathId) throws IOException {
            String body = readRequestBody(exchange);
            Integer id = pathId;
            if (id == null) {
                String idStr = parseJsonField(body, "id");
                if (idStr != null && !idStr.isEmpty()) {
                    try {
                        id = Integer.parseInt(idStr);
                    } catch (NumberFormatException ignored) {}
                }
            }

            if (id == null) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Contact ID is required for update\"}");
                return;
            }

            Contact existing = contactDAO.getContactById(id);
            if (existing == null) {
                sendJsonResponse(exchange, 404, "{\"error\":\"Contact not found\"}");
                return;
            }

            String name = parseJsonField(body, "name");
            String phone = parseJsonField(body, "phone");
            String email = parseJsonField(body, "email");
            String address = parseJsonField(body, "address");
            String category = parseJsonField(body, "category");

            if (name != null && !name.trim().isEmpty()) existing.setName(name.trim());
            if (phone != null && !phone.trim().isEmpty()) existing.setPhone(phone.trim());
            if (email != null) existing.setEmail(email.trim());
            if (address != null) existing.setAddress(address.trim());
            if (category != null && !category.trim().isEmpty()) existing.setCategory(category.trim());

            boolean success = contactDAO.updateContact(existing);
            if (success) {
                sendJsonResponse(exchange, 200, "{\"success\":true,\"message\":\"Contact updated successfully\"}");
            } else {
                sendJsonResponse(exchange, 500, "{\"error\":\"Database failed to update contact\"}");
            }
        }

        private void handleDelete(HttpExchange exchange, Integer pathId) throws IOException {
            if (pathId == null) {
                sendJsonResponse(exchange, 400, "{\"error\":\"Contact ID is required for deletion\"}");
                return;
            }

            boolean success = contactDAO.deleteContact(pathId);
            if (success) {
                sendJsonResponse(exchange, 200, "{\"success\":true,\"message\":\"Contact deleted successfully\"}");
            } else {
                sendJsonResponse(exchange, 404, "{\"error\":\"Failed to delete. Contact may not exist.\"}");
            }
        }

        private Integer extractIdFromPath(String path) {
            // e.g. /api/contacts/12
            String[] parts = path.split("/");
            if (parts.length >= 4 && "contacts".equals(parts[2])) {
                try {
                    return Integer.parseInt(parts[3]);
                } catch (NumberFormatException e) {
                    return null;
                }
            }
            return null;
        }
    }

    // ==========================================
    // Static Web File Handler
    // ==========================================
    static class StaticFileHandler implements HttpHandler {
        private final File webDir = new File("web");

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String path = exchange.getRequestURI().getPath();
            if (path.equals("/") || path.isEmpty()) {
                path = "/index.html";
            }

            // Sanitize path to prevent directory traversal
            path = path.replace("..", "").replace("//", "/");
            File file = new File(webDir, path.substring(1));

            if (!file.exists() || file.isDirectory()) {
                String notFound = "<h1>404 Not Found</h1><p>Resource " + escapeJson(path) + " was not found.</p>";
                exchange.getResponseHeaders().set("Content-Type", "text/html; charset=UTF-8");
                byte[] bytes = notFound.getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(404, bytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(bytes);
                }
                return;
            }

            String contentType = getContentType(file.getName());
            exchange.getResponseHeaders().set("Content-Type", contentType);
            exchange.sendResponseHeaders(200, file.length());

            try (InputStream is = new FileInputStream(file);
                 OutputStream os = exchange.getResponseBody()) {
                byte[] buffer = new byte[8192];
                int bytesRead;
                while ((bytesRead = is.read(buffer)) != -1) {
                    os.write(buffer, 0, bytesRead);
                }
            }
        }

        private String getContentType(String filename) {
            String lower = filename.toLowerCase();
            if (lower.endsWith(".html")) return "text/html; charset=UTF-8";
            if (lower.endsWith(".css")) return "text/css; charset=UTF-8";
            if (lower.endsWith(".js")) return "application/javascript; charset=UTF-8";
            if (lower.endsWith(".json")) return "application/json; charset=UTF-8";
            if (lower.endsWith(".svg")) return "image/svg+xml";
            if (lower.endsWith(".png")) return "image/png";
            if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
            if (lower.endsWith(".ico")) return "image/x-icon";
            return "application/octet-stream";
        }
    }

    // ==========================================
    // Utilities & JSON Handling
    // ==========================================
    private static void addCorsHeaders(HttpExchange exchange) {
        exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
        exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    }

    private static void sendJsonResponse(HttpExchange exchange, int statusCode, String json) throws IOException {
        exchange.getResponseHeaders().set("Content-Type", "application/json; charset=UTF-8");
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(statusCode, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static String readRequestBody(HttpExchange exchange) throws IOException {
        try (InputStream is = exchange.getRequestBody()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }

    private static Map<String, String> parseQueryParams(String query) {
        Map<String, String> map = new HashMap<>();
        if (query == null || query.isEmpty()) return map;
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            int idx = pair.indexOf("=");
            if (idx > 0 && idx < pair.length() - 1) {
                String key = URLDecoder.decode(pair.substring(0, idx), StandardCharsets.UTF_8);
                String val = URLDecoder.decode(pair.substring(idx + 1), StandardCharsets.UTF_8);
                map.put(key, val);
            }
        }
        return map;
    }

    private static String parseJsonField(String json, String field) {
        if (json == null) return null;
        // Match "field": "value" or "field": value
        Pattern p = Pattern.compile("\"" + Pattern.quote(field) + "\"\\s*:\\s*(?:\"([^\"]*)\"|([^,}\\]\\s]+))");
        Matcher m = p.matcher(json);
        if (m.find()) {
            if (m.group(1) != null) {
                return m.group(1);
            }
            String raw = m.group(2);
            if ("null".equals(raw)) return null;
            return raw;
        }
        return null;
    }

    private static String escapeJson(String str) {
        if (str == null) return "";
        return str
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\b", "\\b")
            .replace("\f", "\\f")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }

    private static String contactToJson(Contact c) {
        return String.format(
            "{\"id\":%d,\"name\":\"%s\",\"phone\":\"%s\",\"email\":\"%s\",\"address\":\"%s\",\"category\":\"%s\"}",
            c.getId(),
            escapeJson(c.getName()),
            escapeJson(c.getPhone()),
            escapeJson(c.getEmail() != null ? c.getEmail() : ""),
            escapeJson(c.getAddress() != null ? c.getAddress() : ""),
            escapeJson(c.getCategory() != null ? c.getCategory() : "Other")
        );
    }

    private static String contactsToJsonArray(List<Contact> contacts) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < contacts.size(); i++) {
            sb.append(contactToJson(contacts.get(i)));
            if (i < contacts.size() - 1) {
                sb.append(",");
            }
        }
        sb.append("]");
        return sb.toString();
    }
}
