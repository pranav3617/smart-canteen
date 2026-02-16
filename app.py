import json
import os
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# ---------------- ADMIN FILE ----------------
ADMIN_FILE = "admin.json"

def load_admin():
    if not os.path.exists(ADMIN_FILE):
        return {"username": "admin", "password": "canteen123"}
    with open(ADMIN_FILE, "r") as f:
        return json.load(f)

def save_admin(data):
    with open(ADMIN_FILE, "w") as f:
        json.dump(data, f, indent=4)

admin_data = load_admin()

# ---------------- MENU DATA ----------------
menu = [
    {"id": 1, "name": "Burger", "price": 50, "available": True},
    {"id": 2, "name": "Pizza", "price": 80, "available": True},
    {"id": 3, "name": "Tea", "price": 20, "available": True},
    {"id": 4, "name": "Vadapav", "price": 20, "available": True},
    {"id": 5, "name": "Samosa", "price": 20, "available": True},
    {"id": 6, "name": "Bread patis", "price": 20, "available": True},
    {"id": 7, "name": "Pohe", "price": 25, "available": True},
    {"id": 8, "name": "Idli", "price": 40, "available": True},

    # 🔥 NEW ITEMS
    {"id": 9, "name": "Cold Coffee", "price": 35, "available": True},
    {"id": 10, "name": "Paneer Roll", "price": 45, "available": True},
    {"id": 11, "name": "Masala Dosa", "price": 50, "available": True},
    {"id": 12, "name": "Veg Thali", "price": 70, "available": True}
]


# ---------------- DISABLE ALL ITEMS ----------------
def disable_all_items():
    for item in menu:
        item["available"] = False

# ---------------- ORDERS FILE ----------------
ORDERS_FILE = "orders.json"

def load_orders():
    if not os.path.exists(ORDERS_FILE):
        return []
    try:
        with open(ORDERS_FILE, "r") as f:
            return json.load(f)
    except:
        return []

def save_orders(data):
    with open(ORDERS_FILE, "w") as f:
        json.dump(data, f, indent=4)

# ---------------- ROUTES ----------------
@app.route("/")
def login_page():
    return render_template("login.html")

@app.route("/student")
def student_page():
    return render_template("student.html")

@app.route("/admin")
def admin_page():
    disable_all_items()  # 🔥 RESET MENU WHEN ADMIN OPENS PANEL
    return render_template("admin.html")

# ---------------- LOGIN ----------------
@app.route("/login", methods=["POST"])
def login():
    data = request.json or {}
    user_id = data.get("id", "").lower()
    password = data.get("password", "")

    if user_id == admin_data["username"].lower() and password == admin_data["password"]:
        return jsonify({"role": "admin"})
    else:
        return jsonify({"role": "student"})

# ---------------- GET MENU ----------------
@app.route("/menu")
def get_menu():
    return jsonify(menu)

# ---------------- PLACE ORDER ----------------
@app.route("/order", methods=["POST"])
def place_order():
    data = request.json or {}
    orders = load_orders()

    student = data.get("student", "").lower()
    item = data.get("item")
    qty = data.get("qty")

    if not student or not item or not qty:
        return jsonify({"error": "Invalid order data"}), 400

    # check availability
    for m in menu:
        if m["name"] == item and not m["available"]:
            return jsonify({"error": "Item not available"}), 400

    orders.append({
        "student": student,
        "item": item,
        "qty": qty,
        "status": "Pending"
    })

    save_orders(orders)
    return jsonify({"message": "Order placed successfully"})

# ---------------- GET ORDERS (ADMIN) ----------------
@app.route("/orders")
def get_orders():
    return jsonify(load_orders())

# ---------------- UPDATE ORDER STATUS ----------------
@app.route("/update", methods=["POST"])
def update_status():
    data = request.json or {}
    orders = load_orders()

    student = data.get("student")
    item = data.get("item")
    status = data.get("status")

    for o in orders:
        if o["student"] == student and o["item"] == item and o["status"] != "Delivered":
            o["status"] = status
            save_orders(orders)
            return jsonify({"message": "Order updated"})

    return jsonify({"error": "Order not found"}), 400

# ---------------- TOGGLE MENU AVAILABILITY ----------------
@app.route("/toggle", methods=["POST"])
def toggle_menu():
    data = request.json or {}
    index = data.get("index")

    if index is None or index >= len(menu):
        return jsonify({"error": "Invalid menu index"}), 400

    menu[index]["available"] = not menu[index]["available"]
    return jsonify({"message": "Menu availability updated"})

# ---------------- STUDENT ORDERS ----------------
@app.route("/student_orders/<student_name>")
def student_orders(student_name):
    orders = load_orders()
    student_name = student_name.lower()
    return jsonify([o for o in orders if o["student"] == student_name])

# ---------------- ADMIN PROFILE UPDATE ----------------
@app.route("/admin_update", methods=["POST"])
def admin_update():
    global admin_data
    data = request.json or {}
    old_password = data.get("old_password")
    new_username = data.get("username")
    new_password = data.get("password")

    if old_password != admin_data["password"]:
        return jsonify({"error": "Old password is incorrect"})

    if not new_username or not new_password:
        return jsonify({"error": "Username and password cannot be empty"})

    admin_data["username"] = new_username.lower()
    admin_data["password"] = new_password
    save_admin(admin_data)
    return jsonify({"message": "Admin credentials updated successfully"})

# ---------------- RUN ----------------
if __name__ == "__main__":
    app.run(debug=True)

