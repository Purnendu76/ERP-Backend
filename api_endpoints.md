# 🌐 ERP System API Reference

This file contains the complete specification of all API endpoints available on the ERP backend server.

* **Base URL**: `http://localhost:5000/api`
* **Health Check**: `http://localhost:5000/`
* **Authorization Header**: All protected endpoints require a signed JWT token passed via the `Authorization` header:
  ```http
  Authorization: Bearer <your_jwt_token>
  ```

---

## 🔑 1. Authentication & Users (`/auth`)

### 📌 1.1 User Login
* **Method**: `POST`
* **Path**: `/api/auth/login`
* **Access**: **Public** (No Token Required)
* **Description**: Authenticates existing credentials and returns a secure JWT token along with user context.
* **Request Body**:
  ```json
  {
    "email": "admin@example.com",
    "password": "admin123"
  }
  ```
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": "1e15f580-f1ce-4b3a-8d4f-08e619b8bf28",
      "name": "System Admin",
      "email": "admin@example.com",
      "role": "Admin",
      "status": "Active",
      "photo": null,
      "createdAt": "2026-05-21T00:25:00.625Z",
      "updatedAt": "2026-05-21T00:25:00.625Z"
    }
  }
  ```

### 📌 1.2 Register User
* **Method**: `POST`
* **Path**: `/api/auth/register`
* **Access**: **Public** (No Token Required)
* **Description**: Creates a new user record. Securely salts and hashes the password using `bcryptjs`.
* **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "userpass123",
    "role": "Staff",
    "status": "Active", 
    "photo": "http://photo-url.com" 
  }
  ```
* **Success Response (`201 Created`)**: Returns the new user record with the `password` property stripped.

### 📌 1.3 Fetch Users
* **Method**: `GET`
* **Path**: `/api/auth/users`
* **Access**: **Protected** (Requires `Admin` or `Manager` role)
* **Description**: Returns all users stored in the database.
* **Success Response (`200 OK`)**: Array of user records.

### 📌 1.4 Update User
* **Method**: `PUT`
* **Path**: `/api/auth/users/:id`
* **Access**: **Protected** (Requires `Admin` role only)
* **Description**: Updates user details (name, email, password, role, status, or photo). Generates and hashes the password securely on the backend if passed.
* **Success Response (`200 OK`)**: Returns the updated user record with the `password` property stripped.

### 📌 1.5 Delete User
* **Method**: `DELETE`
* **Path**: `/api/auth/users/:id`
* **Access**: **Protected** (Requires `Admin` role only)
* **Description**: Deletes the specified user record.
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "User deleted successfully"
  }
  ```

---

## 📦 2. Product Management (`/products`)

### 📌 2.1 Get All Products
* **Method**: `GET`
* **Path**: `/api/products`
* **Access**: **Protected** (All Roles: `Admin`, `Manager`, `Staff`)
* **Success Response (`200 OK`)**: Array of product records.

### 📌 2.2 Create Product
* **Method**: `POST`
* **Path**: `/api/products`
* **Access**: **Protected** (Requires `Admin` or `Manager` role)
* **Request Body**:
  ```json
  {
    "name": "Wireless Mouse",
    "sku": "PROD-MSE-001",
    "category": "Electronics",
    "price": 29.99,
    "stock": 100,
    "status": "In Stock", // Options: "In Stock" | "Low Stock" | "Out of Stock"
    "image": "http://image-url.com" // Optional
  }
  ```
* **Success Response (`201 Created`)**: Newly created product object.

### 📌 2.3 Update Product
* **Method**: `PUT`
* **Path**: `/api/products/:id`
* **Access**: **Protected** (Requires `Admin` or `Manager` role)
* **Request Body**: Pass any properties to update.
* **Success Response (`200 OK`)**: The updated product object.

### 📌 2.4 Delete Product
* **Method**: `DELETE`
* **Path**: `/api/products/:id`
* **Access**: **Protected** (Requires `Admin` role only)
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Product deleted successfully"
  }
  ```

---

## 💸 3. Expense Tracking (`/expenses`)

### 📌 3.1 Get All Expenses
* **Method**: `GET`
* **Path**: `/api/expenses`
* **Access**: **Protected** (All Roles: `Admin`, `Manager`, `Staff`)
* **Success Response (`200 OK`)**: Array of expense objects.

### 📌 3.2 Create Expense
* **Method**: `POST`
* **Path**: `/api/expenses`
* **Access**: **Protected** (All Roles: `Admin`, `Manager`, `Staff`)
* **Request Body**:
  ```json
  {
    "title": "Cloud Server Subscription",
    "category": "Hosting",
    "amount": 150.00,
    "paymentMethod": "Credit Card", // "Cash" | "Credit Card" | "Bank Transfer"
    "expenseDate": "2026-05-21T00:00:00.000Z",
    "submittedBy": "System Admin",
    "status": "Approved" // "Approved" | "Pending" | "Rejected"
  }
  ```
* **Success Response (`201 Created`)**: Returns the created expense object.

### 📌 3.3 Update Expense
* **Method**: `PUT`
* **Path**: `/api/expenses/:id`
* **Access**: **Protected** (Requires `Admin` or `Manager` role)
* **Success Response (`200 OK`)**: Returns the updated expense.

### 📌 3.4 Delete Expense
* **Method**: `DELETE`
* **Path**: `/api/expenses/:id`
* **Access**: **Protected** (Requires `Admin` role only)
* **Success Response (`200 OK`)**:
  ```json
  {
    "message": "Expense deleted successfully"
  }
  ```

---

## 📄 4. Invoice Billing (`/invoices`)

### 📌 4.1 Get All Invoices (With Nested Items)
* **Method**: `GET`
* **Path**: `/api/invoices`
* **Access**: **Protected** (All Roles: `Admin`, `Manager`, `Staff`)
* **Success Response (`200 OK`)**: Returns complete details of invoices, including nested lists of purchase line items retrieved via SQL transactions.
* **Response Payload Example**:
  ```json
  [
    {
      "id": "e9fa82a1-0f7c-473d-9f44-7cf6b17c9802",
      "invoiceNumber": "INV-2026-001",
      "customerName": "Alice Vance",
      "customerEmail": "alice@gmail.com",
      "invoiceDate": "2026-05-21T00:00:00.000Z",
      "dueDate": "2026-06-21T00:00:00.000Z",
      "taxRate": "10.00",
      "subtotal": "500.00",
      "tax": "50.00",
      "total": "550.00",
      "status": "Paid",
      "items": [
        {
          "id": "2c6a0890-482a-43a9-bf0c-25a7a8d5db28",
          "invoiceId": "e9fa82a1-0f7c-473d-9f44-7cf6b17c9802",
          "itemName": "Consulting Services",
          "quantity": 5,
          "price": "100.00",
          "total": "500.00"
        }
      ]
    }
  ]
  ```

### 📌 4.2 Create Invoice (Transaction-Safe)
* **Method**: `POST`
* **Path**: `/api/invoices`
* **Access**: **Protected** (Requires `Admin` or `Manager` role)
* **Description**: Inserts parent invoice and multiple nested child line items safely inside a transaction database session.
* **Request Body**:
  ```json
  {
    "invoiceNumber": "INV-2026-003",
    "customerName": "Damon Salv",
    "customerEmail": "damon@example.com",
    "invoiceDate": "2026-05-21T00:00:00.000Z",
    "dueDate": "2026-06-21T00:00:00.000Z",
    "taxRate": 10.00,
    "subtotal": 200.00,
    "tax": 20.00,
    "total": 220.00,
    "status": "Pending",
    "items": [
      {
        "itemName": "High Speed Router",
        "quantity": 2,
        "price": 100.00
      }
    ]
  }
  ```
* **Success Response (`201 Created`)**: Returns the inserted invoice record and nested line items.

### 📌 4.3 Update Invoice
* **Method**: `PUT`
* **Path**: `/api/invoices/:id`
* **Access**: **Protected** (Requires `Admin` or `Manager` role)

### 📌 4.4 Delete Invoice (Cascading)
* **Method**: `DELETE`
* **Path**: `/api/invoices/:id`
* **Access**: **Protected** (Requires `Admin` role only)
* **Description**: Deletes the specified invoice. Database foreign-key constraints will automatically cascade delete all line items.

---

## 🪵 5. Audit Logging (`/audit-logs`)

### 📌 5.1 Fetch Audit Trail
* **Method**: `GET`
* **Path**: `/api/audit-logs`
* **Access**: **Protected** (Requires `Admin` or `Manager` role)
* **Success Response (`200 OK`)**: Array of audit logging entries.

### 📌 5.2 Create Audit Log
* **Method**: `POST`
* **Path**: `/api/audit-logs`
* **Access**: **Protected** (All Roles: `Admin`, `Manager`, `Staff`)
* **Request Body**:
  ```json
  {
    "action": "UPDATE", // Options: "CREATE" | "UPDATE" | "DELETE" | "LOGIN"
    "entity": "Invoice",
    "userName": "System Admin",
    "userEmail": "admin@example.com",
    "ipAddress": "127.0.0.1",
    "details": "Updated Invoice #INV-2026-001 status to Paid"
  }
  ```

### 📌 5.3 Clear Audit Logs
* **Method**: `DELETE`
* **Path**: `/api/audit-logs`
* **Access**: **Protected** (Requires `Admin` role only)
