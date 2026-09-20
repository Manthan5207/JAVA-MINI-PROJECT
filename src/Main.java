import java.util.List;
import java.util.Scanner;

public class Main {
    private static final ContactDAO contactDAO = new ContactDAO();
    private static final Scanner scanner = new Scanner(System.in);

    public static void main(String[] args) {
        while (true) {
            System.out.println("\n========================================");
            System.out.println("       CONTACT MANAGEMENT SYSTEM        ");
            System.out.println("========================================");
            System.out.println("1. Add Contact");
            System.out.println("2. View All Contacts");
            System.out.println("3. Search Contact");
            System.out.println("4. Update Contact");
            System.out.println("5. Delete Contact");
            System.out.println("6. Exit");
            System.out.print("Enter your choice: ");

            String input = scanner.nextLine().trim();
            int choice;
            try {
                choice = Integer.parseInt(input);
            } catch (NumberFormatException e) {
                System.out.println("Invalid input! Please enter a valid number (1-6).");
                continue;
            }

            switch (choice) {
                case 1:
                    addContact();
                    break;
                case 2:
                    viewAllContacts();
                    break;
                case 3:
                    searchContact();
                    break;
                case 4:
                    updateContact();
                    break;
                case 5:
                    deleteContact();
                    break;
                case 6:
                    System.out.println("\nThank you for using Contact Management System. Goodbye!");
                    return;
                default:
                    System.out.println("Invalid choice! Please choose between 1 and 6.");
            }
        }
    }

    private static void addContact() {
        System.out.println("\n--- Add New Contact ---");

        String name;
        while (true) {
            System.out.print("Enter Name: ");
            name = scanner.nextLine().trim();
            if (!name.isEmpty()) {
                break;
            }
            System.out.println("Validation Error: Name cannot be empty.");
        }

        String phone;
        while (true) {
            System.out.print("Enter Phone: ");
            phone = scanner.nextLine().trim();
            if (phone.matches("^[0-9+ -]{7,15}$")) {
                break;
            }
            System.out.println("Validation Error: Please enter a valid phone number (at least 7 digits).");
        }

        String email;
        while (true) {
            System.out.print("Enter Email (optional): ");
            email = scanner.nextLine().trim();
            if (email.isEmpty() || (email.contains("@") && email.contains("."))) {
                break;
            }
            System.out.println("Validation Error: Please enter a valid email address (or leave blank).");
        }

        System.out.print("Enter Address: ");
        String address = scanner.nextLine().trim();

        System.out.print("Enter Category (e.g., Friend, Work, Family): ");
        String category = scanner.nextLine().trim();

        Contact contact = new Contact(name, phone, email, address, category);
        if (contactDAO.addContact(contact)) {
            System.out.println("\nContact added successfully.");
        } else {
            System.out.println("\nFailed to add contact. Please check your database connection.");
        }
    }

    private static void viewAllContacts() {
        System.out.println("\n--- All Contacts ---");
        List<Contact> contacts = contactDAO.getAllContacts();
        printContactTable(contacts);
    }

    private static void searchContact() {
        System.out.println("\n--- Search Contact ---");
        System.out.print("Enter name or phone to search: ");
        String keyword = scanner.nextLine().trim();

        if (keyword.isEmpty()) {
            System.out.println("Search keyword cannot be empty.");
            return;
        }

        List<Contact> results = contactDAO.searchContacts(keyword);
        printContactTable(results);
    }

    private static void updateContact() {
        System.out.println("\n--- Update Contact ---");
        System.out.print("Enter Contact ID: ");
        int id;
        try {
            id = Integer.parseInt(scanner.nextLine().trim());
        } catch (NumberFormatException e) {
            System.out.println("Invalid Contact ID.");
            return;
        }

        Contact existing = contactDAO.getContactById(id);
        if (existing == null) {
            System.out.println("Contact with ID " + id + " not found.");
            return;
        }

        System.out.println("Updating contact: " + existing.getName());
        System.out.println("(Press Enter directly to keep existing value)");

        System.out.print("Enter New Name [" + existing.getName() + "]: ");
        String name = scanner.nextLine().trim();
        if (!name.isEmpty()) {
            existing.setName(name);
        }

        System.out.print("Enter New Phone [" + existing.getPhone() + "]: ");
        String phone = scanner.nextLine().trim();
        if (!phone.isEmpty()) {
            if (phone.matches("^[0-9+ -]{7,15}$")) {
                existing.setPhone(phone);
            } else {
                System.out.println("Invalid phone format. Keeping previous phone.");
            }
        }

        System.out.print("Enter New Email [" + existing.getEmail() + "]: ");
        String email = scanner.nextLine().trim();
        if (!email.isEmpty()) {
            if (email.contains("@") && email.contains(".")) {
                existing.setEmail(email);
            } else {
                System.out.println("Invalid email format. Keeping previous email.");
            }
        }

        System.out.print("Enter New Address [" + existing.getAddress() + "]: ");
        String address = scanner.nextLine().trim();
        if (!address.isEmpty()) {
            existing.setAddress(address);
        }

        System.out.print("Enter New Category [" + existing.getCategory() + "]: ");
        String category = scanner.nextLine().trim();
        if (!category.isEmpty()) {
            existing.setCategory(category);
        }

        if (contactDAO.updateContact(existing)) {
            System.out.println("\nContact updated successfully.");
        } else {
            System.out.println("\nFailed to update contact.");
        }
    }

    private static void deleteContact() {
        System.out.println("\n--- Delete Contact ---");
        System.out.print("Enter Contact ID: ");
        int id;
        try {
            id = Integer.parseInt(scanner.nextLine().trim());
        } catch (NumberFormatException e) {
            System.out.println("Invalid Contact ID.");
            return;
        }

        Contact existing = contactDAO.getContactById(id);
        if (existing == null) {
            System.out.println("Contact with ID " + id + " not found.");
            return;
        }

        System.out.print("Are you sure you want to delete contact '" + existing.getName() + "'? (Y/N): ");
        String confirm = scanner.nextLine().trim();
        if (confirm.equalsIgnoreCase("Y")) {
            if (contactDAO.deleteContact(id)) {
                System.out.println("\nContact deleted successfully.");
            } else {
                System.out.println("\nFailed to delete contact.");
            }
        } else {
            System.out.println("Deletion cancelled.");
        }
    }

    private static void printContactTable(List<Contact> contacts) {
        if (contacts.isEmpty()) {
            System.out.println("No contacts found.");
            return;
        }

        System.out.println("-----------------------------------------------------------------------------------------------------------------");
        System.out.printf("%-5s | %-18s | %-13s | %-24s | %-20s | %-10s%n", "ID", "NAME", "PHONE", "EMAIL", "ADDRESS", "CATEGORY");
        System.out.println("-----------------------------------------------------------------------------------------------------------------");
        for (Contact c : contacts) {
            System.out.printf("%-5d | %-18s | %-13s | %-24s | %-20s | %-10s%n",
                c.getId(),
                truncate(c.getName(), 18),
                truncate(c.getPhone(), 13),
                truncate(c.getEmail() != null ? c.getEmail() : "-", 24),
                truncate(c.getAddress() != null ? c.getAddress() : "-", 20),
                truncate(c.getCategory() != null ? c.getCategory() : "-", 10)
            );
        }
        System.out.println("-----------------------------------------------------------------------------------------------------------------");
        System.out.println("Total Records: " + contacts.size());
    }

    private static String truncate(String val, int maxLen) {
        if (val == null) return "";
        return val.length() > maxLen ? val.substring(0, maxLen - 2) + ".." : val;
    }
}
