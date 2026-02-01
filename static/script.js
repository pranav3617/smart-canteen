// ================= PAYMENT TEMP STORAGE =================
let pendingOrder = null;

// ================= LOGIN FUNCTION =================
function login() {
  const id = document.getElementById("id").value.trim();
  const password = document.getElementById("password")?.value || "";

  if (!id) {
    alert("Please enter ID");
    return;
  }

  // clear previous role
  localStorage.removeItem("role");
  localStorage.removeItem("studentName");

  fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: id.toLowerCase(), password })
  })
    .then(res => res.json())
    .then(data => {
      if (data.role === "admin") {
        localStorage.setItem("role", "admin");
        location.href = "/admin";  // go to admin panel
      } else if (data.role === "student") {
        localStorage.setItem("role", "student");
        localStorage.setItem("studentName", id.toLowerCase());
        location.href = "/student"; // go to student panel
      } else {
        alert("Invalid credentials");
      }
    })
    .catch(err => {
      console.error("Login error:", err);
      alert("Login failed. Try again.");
    });
}


// ================= STUDENT ORDER (PAYMENT FIRST) =================
function order(item, i) {
  const qty = document.getElementById("q" + i).value;
  const studentName = localStorage.getItem("studentName");

  if (!studentName) {
    alert("Login again");
    return;
  }

  if (!qty || qty <= 0) {
    alert("Invalid quantity");
    return;
  }

  // store pending order for payment
  pendingOrder = { student: studentName, item: item, qty: qty };

  document.getElementById("payment-info").innerHTML =
    `<b>Item:</b> ${item}<br><b>Quantity:</b> ${qty}`;
  document.getElementById("payment-modal").classList.remove("hidden");
}

function confirmPayment() {
  if (!pendingOrder) return;

  fetch("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pendingOrder)
  })
    .then(res => res.json())
    .then(() => {
      alert("Payment successful. Order placed!");
      pendingOrder = null;
      closePayment();
      loadStudentOrders();
    });
}

function closePayment() {
  pendingOrder = null;
  document.getElementById("payment-modal").classList.add("hidden");
}

// ================= STUDENT MENU DISPLAY =================
if (document.getElementById("menu")) {
  function loadMenu() {
    fetch("/menu")
      .then(res => res.json())
      .then(menu => {
        const div = document.getElementById("menu");
        div.innerHTML = "";

        menu.forEach((item, i) => {
          div.innerHTML += `
            <div class="card">
              ${item.name} - ₹${item.price}<br>
              ${
                item.available
                  ? `<input type="number" id="q${i}" value="1" min="1">
                     <button onclick="order('${item.name}', ${i})">Order</button>`
                  : `<span class="na">Not Available</span>`
              }
            </div>
          `;
        });
      });
  }

  loadMenu();
  setInterval(loadMenu, 3000);
}

// ================= STUDENT ORDER STATUS =================
function loadStudentOrders() {
  const studentName = localStorage.getItem("studentName");
  if (!studentName) return;

  fetch(`/student_orders/${studentName}`)
    .then(res => res.json())
    .then(data => {
      const div = document.getElementById("status");
      div.innerHTML = "";

      if (data.length === 0) {
        div.innerHTML = "<p>No orders yet</p>";
        return;
      }

      data.forEach(o => {
        let statusColor = "yellow";
        if (o.status === "Accepted") statusColor = "green";
        else if (o.status === "Rejected") statusColor = "red";
        else if (o.status === "Delivered") statusColor = "blue";

        div.innerHTML += `
          <div class="card">
            <b>${o.item}</b> (Qty: ${o.qty})<br>
            <b>Status:</b>
            <span style="color:${statusColor}; font-weight:bold">${o.status}</span>
          </div>
        `;
      });
    });
}

if (document.getElementById("status")) {
  loadStudentOrders();
  setInterval(loadStudentOrders, 1500);
}

// ================= ADMIN ORDERS =================
if (document.getElementById("orders")) {
  function loadAdminOrders() {
    fetch("/orders")
      .then(res => res.json())
      .then(data => {
        const div = document.getElementById("orders");
        div.innerHTML = "";

        // filter out Delivered & Rejected orders
        const activeOrders = data.filter(
          o => o.status !== "Delivered" && o.status !== "Rejected"
        );

        if (activeOrders.length === 0) {
          div.innerHTML = "<p>No active orders</p>";
          return;
        }

        activeOrders.forEach(o => {
          let buttons = "";

          if (o.status === "Pending") {
            buttons = `
              <button class="accept" onclick="updateOrder('${o.student}','${o.item}','Accepted')">Accept</button>
              <button class="reject" onclick="updateOrder('${o.student}','${o.item}','Rejected')">Reject</button>
            `;
          } else if (o.status === "Accepted") {
            buttons = `
              <button class="deliver" onclick="updateOrder('${o.student}','${o.item}','Delivered')">Deliver</button>
            `;
          }

          let statusColor = "yellow";
          if (o.status === "Accepted") statusColor = "green";
          else if (o.status === "Rejected") statusColor = "red";
          else if (o.status === "Delivered") statusColor = "blue";

          div.innerHTML += `
            <div class="card">
              <b>${o.student}</b> ordered <b>${o.item}</b> (Qty: ${o.qty})<br>
              <b>Status:</b>
              <span style="color:${statusColor}; font-weight:bold">${o.status}</span><br><br>
              ${buttons}
            </div>
          `;
        });
      });
  }

  loadAdminOrders();
  setInterval(loadAdminOrders, 3000);
}

// ================= UPDATE ORDER FUNCTION (ADMIN) =================
function updateOrder(student, item, status) {
  fetch("/update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ student, item, status })
  }).then(() => {
    loadAdminOrders(); // refresh immediately
  });
}

// ================= ADMIN MENU AVAILABILITY =================
if (document.getElementById("menu-admin")) {
  function loadAdminMenu() {
    fetch("/menu")
      .then(res => res.json())
      .then(menu => {
        const div = document.getElementById("menu-admin");
        div.innerHTML = "";

        menu.forEach((item, i) => {
          div.innerHTML += `
            <div class="card">
              ${item.name} - ₹${item.price}
              <button onclick="toggleAvailability(${i})">
                ${item.available ? "Disable" : "Enable"}
              </button>
            </div>
          `;
        });
      });
  }

  loadAdminMenu();
  setInterval(loadAdminMenu, 5000);
}

function toggleAvailability(i) {
  fetch("/toggle", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ index: i })
  }).then(loadAdminMenu);
}

// ================= ADMIN PROFILE UPDATE =================
function updateAdmin() {
  const oldPass = document.getElementById("oldAdminPass").value.trim();
  const username = document.getElementById("newAdminName").value.trim().toLowerCase();
  const newPass = document.getElementById("newAdminPass").value.trim();

  if (!oldPass || !username || !newPass) {
    alert("All fields are required");
    return;
  }

  fetch("/admin_update", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ old_password: oldPass, username, password: newPass })
  })
    .then(res => res.json())
    .then(data => {
      if (data.error) alert(data.error);
      else alert(data.message);
    });
}
