
document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* =========================================
     VELORA DIGITAL BUSINESS OS
     OWNER DASHBOARD
  ========================================= */

  const OWNER_ID = "2137a1e3-f59a-4afb-bbb3-a148b7b6df60";
  const $ = (id) => document.getElementById(id);

  const loginView = $("loginView");
  const appView = $("appView");
  const loginForm = $("loginForm");
  const loginMessage = $("loginMessage");

  let client = null;
  let currentUser = null;
  let allCustomerRows = [];

  /* =========================================
     SUPABASE CONFIGURATION
  ========================================= */

  if (
    !window.supabase ||
    !window.VELORA_SUPABASE_URL ||
    !window.VELORA_SUPABASE_KEY
  ) {
    loginMessage.textContent =
      "Supabase configuration is missing. Check supabase-config.js.";
    $("loginButton").disabled = true;
    console.error("VELORA Supabase configuration is missing.");
    return;
  }

  client = window.supabase.createClient(
    window.VELORA_SUPABASE_URL,
    window.VELORA_SUPABASE_KEY
  );

  /* =========================================
     COMMON HELPERS
  ========================================= */

  function showLogin(message = "") {
    loginView.hidden = false;
    appView.hidden = true;
    loginMessage.textContent = message;
  }

  function showApp(name) {
    loginView.hidden = true;
    appView.hidden = false;

    $("ownerName").textContent = name || "Owner";
    $("welcomeName").textContent = name
      ? "Welcome back, " + name + "."
      : "Your business, in focus.";
  }

  function makeCell(value) {
    const td = document.createElement("td");
    td.textContent =
      value === null || value === undefined || value === ""
        ? "—"
        : String(value);
    return td;
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? "—"
      : date.toLocaleString();
  }

  function makeButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
  }

  function showError(target, message) {
    target.textContent = message;
  }

  /* =========================================
     OWNER VERIFICATION
  ========================================= */

  async function verifyOwner(user) {
    if (!user || user.id !== OWNER_ID) {
      await client.auth.signOut();
      currentUser = null;
      showLogin("This account is not authorized for the Velora owner dashboard.");
      return false;
    }

    const { data: profile, error } = await client
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Owner profile verification failed:", error);
      showLogin(
        "We couldn't verify your owner profile. Please check database permissions."
      );
      return false;
    }

    if (!profile || profile.role !== "owner") {
      await client.auth.signOut();
      currentUser = null;
      showLogin("Owner access is required for this dashboard.");
      return false;
    }

    currentUser = user;
    showApp(profile.full_name || user.email);

    await loadDashboard();
    return true;
  }

  /* =========================================
     LOGIN
  ========================================= */

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const button = $("loginButton");
    button.disabled = true;
    button.textContent = "Signing in...";
    loginMessage.textContent = "";

    const email = $("loginEmail").value.trim();
    const password = $("loginPassword").value;

    const { data, error } = await client.auth.signInWithPassword({
      email,
      password
    });

    button.disabled = false;
    button.textContent = "Sign In Securely →";

    if (error) {
      console.error("Login failed:", error);
      loginMessage.textContent = error.message;
      return;
    }

    await verifyOwner(data.user);
  });

  /* =========================================
     LOGOUT
  ========================================= */

  $("logoutButton").addEventListener("click", async () => {
    const { error } = await client.auth.signOut();

    if (error) {
      console.error("Logout failed:", error);
      alert("Unable to sign out. Please try again.");
      return;
    }

    currentUser = null;
    showLogin("You have successfully signed out.");
  });

  /* =========================================
     DATABASE COUNTS
  ========================================= */

  async function countRows(table) {
    const { count, error } = await client
      .from(table)
      .select("*", {
        count: "exact",
        head: true
      });

    if (error) {
      console.warn("Could not count " + table + ":", error.message);
      return "—";
    }

    return count ?? 0;
  }

  async function loadDashboard() {
    if (!currentUser) return;

    const [enquiries, customers, projects, invoices] =
      await Promise.all([
        countRows("enquiries"),
        countRows("customers"),
        countRows("projects"),
        countRows("invoices")
      ]);

    $("statEnquiries").textContent = enquiries;
    $("statCustomers").textContent = customers;
    $("statProjects").textContent = projects;
    $("statInvoices").textContent = invoices;

    $("enquiryNavCount").textContent =
      enquiries === "—" ? "—" : enquiries;

    await loadEnquiries();
  }

  /* =========================================
     ENQUIRY STATUS DROPDOWN
  ========================================= */

  function createStatusSelect(row) {
    const select = document.createElement("select");
    select.className = "status-select";

    const statuses = [
      "new",
      "contacted",
      "discussion",
      "confirmed",
      "converted",
      "closed"
    ];

    statuses.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent =
        status.charAt(0).toUpperCase() + status.slice(1);
      select.appendChild(option);
    });

    select.value = statuses.includes(row.status)
      ? row.status
      : "new";

    select.addEventListener("change", async () => {
      const previousStatus = row.status || "new";
      select.disabled = true;

      const { error } = await client
        .from("enquiries")
        .update({ status: select.value })
        .eq("id", row.id);

      select.disabled = false;

      if (error) {
        console.error("Status update failed:", error);
        select.value = previousStatus;
        alert("Could not update enquiry status: " + error.message);
        return;
      }

      row.status = select.value;
    });

    return select;
  }

  /* =========================================
     ONE-CLICK ENQUIRY TO CUSTOMER CONVERSION
  ========================================= */

  async function convertEnquiry(row, button) {
    if (!currentUser) {
      alert("Please sign in again.");
      return;
    }

    if (row.customer_id) {
      alert("This enquiry is already linked to a customer.");
      await loadEnquiries();
      return;
    }

    const confirmed = window.confirm(
      "Convert " + row.customer_name +
      " into a Velora customer?\n\n" +
      "Their contact details will be copied into Customers."
    );

    if (!confirmed) return;

    button.disabled = true;
    button.textContent = "Converting...";

    const { data, error } = await client.rpc(
      "convert_enquiry_to_customer",
      {
        p_enquiry_id: row.id
      }
    );

    if (error) {
      console.error("Customer conversion failed:", error);
      button.disabled = false;
      button.textContent = "Convert to Customer";

      alert(
        "Conversion failed. Please check the database permissions and try again.\n\n" +
        error.message
      );

      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result || !result.customer_uuid) {
      button.disabled = false;
      button.textContent = "Convert to Customer";
      alert("The database did not return a customer record. Please refresh.");
      return;
    }

    row.customer_id = result.customer_uuid;
    row.status = "converted";

    alert(
      result.already_converted
        ? "This enquiry was already converted.\nCustomer ID: " +
          (result.customer_number || "Created")
        : "Customer created successfully!\n\nCustomer: " +
          result.full_name +
          "\nCustomer ID: " +
          (result.customer_number || "Generated")
    );

    await loadDashboard();

    if (!$("customersView").hidden) {
      await loadCustomers();
    }
  }

  /* =========================================
     ENQUIRY TABLE
  ========================================= */

  function renderEnquiryTable(target, rows, compact = false) {
    if (!rows || rows.length === 0) {
      target.innerHTML =
        '<div class="empty-state">No enquiries found yet.</div>';
      return;
    }

    const table = document.createElement("table");
    table.className = "data-table";

    const headers = compact
      ? ["Customer", "Service", "Received"]
      : [
          "Customer",
          "Contact",
          "Service",
          "Budget",
          "Status",
          "Received",
          "Action"
        ];

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    headers.forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      if (compact) {
        tr.appendChild(makeCell(row.customer_name));
        tr.appendChild(makeCell(row.service));
        tr.appendChild(
          makeCell(
            row.created_at
              ? new Date(row.created_at).toLocaleDateString()
              : "—"
          )
        );
      } else {
        tr.appendChild(makeCell(row.customer_name));
        tr.appendChild(
          makeCell(
            [row.phone, row.email].filter(Boolean).join(" · ")
          )
        );
        tr.appendChild(makeCell(row.service));
        tr.appendChild(makeCell(row.budget));

        const statusCell = document.createElement("td");
        statusCell.appendChild(createStatusSelect(row));
        tr.appendChild(statusCell);

        tr.appendChild(makeCell(formatDate(row.created_at)));

        const actionCell = document.createElement("td");

        if (row.customer_id) {
          const converted = document.createElement("span");
          converted.className = "muted";
          converted.textContent = "✓ Converted";
          actionCell.appendChild(converted);
        } else {
          const convertButton = makeButton(
            "Convert to Customer",
            "secondary-btn",
            () => convertEnquiry(row, convertButton)
          );

          convertButton.style.whiteSpace = "nowrap";
          convertButton.style.fontSize = "11px";
          convertButton.style.padding = "9px 11px";

          actionCell.appendChild(convertButton);
        }

        tr.appendChild(actionCell);
      }

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    target.replaceChildren(table);
  }

  /* =========================================
     LOAD ENQUIRIES
  ========================================= */

  async function loadEnquiries() {
    if (!currentUser) return;

    $("recentEnquiries").textContent = "Loading enquiries...";
    $("allEnquiries").textContent = "Loading enquiries...";

    const { data, error } = await client
      .from("enquiries")
      .select(`
        id,
        customer_name,
        phone,
        email,
        service,
        budget,
        status,
        customer_id,
        created_at
      `)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Could not load enquiries:", error);
      showError(
        $("recentEnquiries"),
        "Unable to load enquiries: " + error.message
      );
      showError(
        $("allEnquiries"),
        "Unable to load enquiries: " + error.message
      );
      return;
    }

    const enquiries = data || [];

    renderEnquiryTable(
      $("recentEnquiries"),
      enquiries.slice(0, 5),
      true
    );

    renderEnquiryTable(
      $("allEnquiries"),
      enquiries,
      false
    );
  }

  /* =========================================
     CUSTOMER MODULE INTERFACE
  ========================================= */

  function setupCustomerInterface() {
    const section = $("customersView");
    if (!section) return;

    section.innerHTML = `
      <div class="section-card">
        <div class="section-head">
          <div>
            <p class="eyebrow">CLIENT RELATIONSHIPS</p>
            <h3>Customer Management</h3>
            <p class="muted">
              Manage customer profiles, customer IDs and contact details.
            </p>
          </div>
          <button class="secondary-btn" id="refreshCustomers" type="button">
            ↻ Refresh
          </button>
        </div>

        <input
          id="customerSearch"
          type="search"
          placeholder="Search by customer ID, name, phone or email..."
          aria-label="Search customers"
          style="
            width:100%;
            padding:13px 15px;
            margin:10px 0 18px;
            border-radius:10px;
            border:1px solid rgba(255,255,255,.12);
            background:#0c0b15;
            color:white;
            outline:none;
          "
        >

        <div id="customerCount" class="muted" style="margin-bottom:12px">
          Loading customers...
        </div>

        <div id="allCustomers" class="table-wrap">
          <p class="muted pad">Loading customers...</p>
        </div>
      </div>
    `;

    $("customerSearch").addEventListener("input", () => {
      renderCustomers($("customerSearch").value);
    });

    $("refreshCustomers").addEventListener("click", async () => {
      const button = $("refreshCustomers");
      button.disabled = true;
      button.textContent = "Refreshing...";

      await loadCustomers();

      button.disabled = false;
      button.textContent = "↻ Refresh";
    });
  }

  /* =========================================
     CUSTOMER TABLE
  ========================================= */

  function renderCustomers(searchTerm = "") {
    const target = $("allCustomers");
    if (!target) return;

    const query = searchTerm.trim().toLowerCase();

    const filtered = allCustomerRows.filter((customer) => {
      const searchable = [
        customer.customer_number,
        customer.customer_id,
        customer.full_name,
        customer.phone,
        customer.email,
        customer.company_name
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });

    $("customerCount").textContent =
      filtered.length + " customer(s) found";

    if (filtered.length === 0) {
      target.innerHTML =
        '<div class="empty-state">No matching customers found.</div>';
      return;
    }

    const table = document.createElement("table");
    table.className = "data-table";

    const headers = [
      "Customer ID",
      "Customer Name",
      "Phone",
      "Email",
      "Company",
      "Created"
    ];

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    headers.forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    filtered.forEach((customer) => {
      const tr = document.createElement("tr");

      tr.appendChild(
        makeCell(
          customer.customer_number ||
          customer.customer_id ||
          customer.id
        )
      );

      tr.appendChild(makeCell(customer.full_name));
      tr.appendChild(makeCell(customer.phone));
      tr.appendChild(makeCell(customer.email));
      tr.appendChild(makeCell(customer.company_name));
      tr.appendChild(makeCell(formatDate(customer.created_at)));

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    target.replaceChildren(table);
  }

  /* =========================================
     LOAD CUSTOMERS
  ========================================= */

  async function loadCustomers() {
    if (!currentUser) return;

    const target = $("allCustomers");
    if (!target) return;

    target.textContent = "Loading customers...";

    const { data, error } = await client
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Could not load customers:", error);
      target.textContent =
        "Unable to load customers: " + error.message;
      $("customerCount").textContent = "";
      return;
    }

    allCustomerRows = data || [];
    renderCustomers($("customerSearch").value);
  }

  /* =========================================
     NAVIGATION
  ========================================= */

  function activateView(view) {
    document.querySelectorAll(".view-section").forEach((section) => {
      section.hidden = section.id !== view + "View";
    });

    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.view === view
      );
    });

    const labels = {
      overview: "Overview",
      enquiries: "Enquiries",
      customers: "Customers",
      projects: "Projects",
      finance: "Quotations & Invoices",
      expenses: "Expenses",
      reminders: "Tasks & Reminders"
    };

    $("pageTitle").textContent = labels[view] || "Overview";

    if (view === "enquiries") loadEnquiries();
    if (view === "customers") loadCustomers();
  }

  document.querySelectorAll(".nav-item[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      activateView(button.dataset.view);
    });
  });

  document.querySelectorAll("[data-open-view]").forEach((button) => {
    button.addEventListener("click", () => {
      activateView(button.dataset.openView);
    });
  });

  /* =========================================
     REFRESH ENQUIRIES
  ========================================= */

  $("refreshEnquiries").addEventListener("click", async () => {
    const button = $("refreshEnquiries");

    button.disabled = true;
    button.textContent = "Refreshing...";

    await loadEnquiries();

    button.disabled = false;
    button.textContent = "↻ Refresh";
  });

  /* =========================================
     INITIALIZE DASHBOARD
  ========================================= */

  async function initializeDashboard() {
    setupCustomerInterface();

    const { data, error } = await client.auth.getSession();

    if (error) {
      console.error("Session check failed:", error);
      showLogin("Unable to check your login session.");
      return;
    }

    if (data.session) {
      await verifyOwner(data.session.user);
    } else {
      showLogin();
    }
  }

  client.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") {
      currentUser = null;
      showLogin();
    }
  });

  initializeDashboard();
});
