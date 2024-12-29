// Initialize WebSocket connection
const ws = new WebSocket("ws://localhost:3000");

// WebSocket event handlers
ws.onopen = () => {
    console.log("WebSocket connection established");
};

ws.onclose = (event) => {
    console.log(`WebSocket connection closed. Code: ${event.code}, Reason: ${event.reason || "none"}`);
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Order update received:", data);

    // Update only the affected row in the table
    const tableBody = document.querySelector("#order-table tbody");
    const rows = tableBody.querySelectorAll("tr");

    rows.forEach((row) => {
        const orderIdCell = row.cells[0];
        if (orderIdCell.textContent === data.orderId.toString()) {
            row.cells[2].textContent = data.status; // Update the status cell
        }
    });
};

// Function to populate the order table
function populateOrders(orders) {
    const tableBody = document.querySelector("#order-table tbody");
    tableBody.innerHTML = ""; // Clear existing rows

    orders.forEach((order) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${order.id}</td>
            <td>${order.customer_name}</td>
            <td>${order.status}</td>
            <td>${order.total_price}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Fetch orders and update the table
function updateTable() {
    fetch("/api/orders")
        .then((response) => response.json())
        .then((orders) => populateOrders(orders))
        .catch((error) => console.error("Error fetching orders:", error));
}

// Fetch orders when the page loads
document.addEventListener("DOMContentLoaded", updateTable);

// Handle new order creation
document.querySelector("#order-form").addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent default form submission

    const customer_name = document.querySelector("#customer_name").value;
    const total_price = document.querySelector("#total_price").value;
    const status = document.querySelector("#status").value;

    // Send a POST request to the server to create a new order
    fetch("/api/orders", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ customer_name, total_price, status }),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log(data.message);
            updateTable(); // Refresh the table
            document.querySelector("#order-form").reset(); // Reset the form
        })
        .catch((error) => console.error("Error creating order:", error));
});

// Handle order status updates
document.querySelector("#update-status-form").addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent default form submission

    const orderId = document.querySelector("#update_order_id").value;
    const status = document.querySelector("#update_status").value;

    // Send a PUT request to update the order status
    fetch(`/api/orders/${orderId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
    })
        .then((response) => response.json())
        .then((data) => {
            console.log(data.message);
            updateTable(); // Refresh the table
            document.querySelector("#update-status-form").reset(); // Reset the form
        })
        .catch((error) => console.error("Error updating order status:", error));
});

// Role-based access control
document.querySelector("#role-selector").addEventListener("change", (event) => {
    const role = event.target.value; // Get the selected role
    const roleInfo = document.querySelector("#role-info");
    const createOrderForm = document.querySelector("#order-form");
    const updateStatusForm = document.querySelector("#update-status-form");

    // Show or hide forms based on the role
    if (role === "manager") {
        roleInfo.textContent = "Logged in as Manager: You can view, create, and update orders.";
        createOrderForm.style.display = "block";
        updateStatusForm.style.display = "block";
    } else if (role === "agent") {
        roleInfo.textContent = "Logged in as Agent: You can only view orders.";
        createOrderForm.style.display = "none";
        updateStatusForm.style.display = "none";
    }
});

// Default role on page load
document.addEventListener("DOMContentLoaded", () => {
    document.querySelector("#role-selector").value = "agent";
    document.querySelector("#role-selector").dispatchEvent(new Event("change")); // Trigger the change event
});

// Fetch and display reports
document.querySelector("#fetch-reports-btn").addEventListener("click", () => {
    fetch("/api/reports/orders")
        .then((response) => response.json())
        .then((reports) => {
            const reportsTableBody = document.querySelector("#reports-table tbody");
            reportsTableBody.innerHTML = ""; // Clear existing rows

            reports.forEach((report) => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${report.status}</td>
                    <td>${report.count}</td>
                `;
                reportsTableBody.appendChild(row);
            });
        })
        .catch((error) => console.error("Error fetching reports:", error));
});
