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
    if (target) target.textContent = message;
  }

  /* =========================================
     OWNER VERIFICATION
  ========================================= */

  async function verifyOwner(user) {
    if (!user || user.id !== OWNER_ID) {
      await client.auth.signOut();
      currentUser = null;
      showLogin(
        "This account is not authorized for the Velora owner dashboard."
      );
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

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Login failed:", error);
        loginMessage.textContent = error.message;
        return;
      }

      await verifyOwner(data.user);
    } catch (error) {
      console.error("Unexpected login error:", error);
      loginMessage.textContent =
        "Login failed. Please refresh the page and try again.";
    } finally {
      button.disabled = false;
      button.textContent = "Sign In Securely →";
    }
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

  async function loadDashboardCounts() {
    const [
      enquiries,
      customers,
      projects,
      invoices
    ] = await Promise.all([
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
  }

  async function loadDashboard() {
    if (!currentUser) return;

    await loadDashboardCounts();
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
      <div class="section-card" id="customerListPanel">
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

      <div id="customerProfilePanel" hidden></div>
    `;

    ensureCustomerProfileStyles();

    $("customerSearch").addEventListener("input", () => {
      renderCustomers($("customerSearch")?.value || "");
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

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    [
      "Customer ID",
      "Customer Name",
      "Phone",
      "Email",
      "Company",
      "Created",
      "Action"
    ].forEach((label) => {
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

      const actionCell = document.createElement("td");

      const viewButton = makeButton(
        "View Profile →",
        "secondary-btn",
        () => openCustomerProfile(customer.id)
      );

      viewButton.style.whiteSpace = "nowrap";
      actionCell.appendChild(viewButton);

      tr.appendChild(actionCell);
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
    renderCustomers($("customerSearch")?.value || "");
  }

  /* =========================================
     CUSTOMER PROFILE — VIEW, EDIT & HISTORY
  ========================================= */

  function ensureCustomerProfileStyles() {
    if ($("customerProfileStyles")) return;

    const style = document.createElement("style");
    style.id = "customerProfileStyles";

    style.textContent = `
      .customer-profile-grid{
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:14px
      }

      .customer-profile-field{
        display:flex;
        flex-direction:column;
        gap:7px
      }

      .customer-profile-field label{
        font-size:12px;
        color:#b9b5ca
      }

      .customer-profile-field input,
      .customer-profile-field textarea{
        box-sizing:border-box;
        width:100%;
        padding:12px 13px;
        border-radius:10px;
        border:1px solid rgba(255,255,255,.14);
        background:#0c0b15;
        color:#fff;
        font:inherit;
        outline:none
      }

      .customer-profile-field textarea{
        min-height:85px;
        resize:vertical
      }

      .customer-profile-wide{
        grid-column:1/-1
      }

      .customer-profile-actions{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:15px
      }

      .customer-profile-meta{
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:12px;
        margin:16px 0
      }

      .customer-profile-meta div{
        padding:13px;
        border:1px solid rgba(255,255,255,.12);
        border-radius:11px;
        background:rgba(255,255,255,.035);
        overflow-wrap:anywhere
      }

      .customer-profile-meta small{
        display:block;
        color:#aaa5bb;
        margin-bottom:6px
      }

      .customer-profile-section{
        margin-top:16px
      }

      .customer-profile-head{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        flex-wrap:wrap
      }

      .customer-profile-note{
        margin-top:12px;
        color:#b9b5ca;
        font-size:13px
      }

      @media(max-width:700px){
        .customer-profile-grid,
        .customer-profile-meta{
          grid-template-columns:1fr
        }
      }
    `;

    document.head.appendChild(style);
  }

  function profileField(label, name, value, type = "text", wide = false) {
    const wrap = document.createElement("div");

    wrap.className =
      "customer-profile-field" +
      (wide ? " customer-profile-wide" : "");

    const inputId = "customerProfile_" + name;

    const labelEl = document.createElement("label");
    labelEl.htmlFor = inputId;
    labelEl.textContent = label;

    const input =
      type === "textarea"
        ? document.createElement("textarea")
        : document.createElement("input");

    input.id = inputId;
    input.name = name;

    if (type !== "textarea") {
      input.type = type;
    }

    input.value = value || "";

    wrap.append(labelEl, input);
    return wrap;
  }

  function profileSection(title, description, contentId) {
    const card = document.createElement("div");
    card.className = "section-card customer-profile-section";

    const head = document.createElement("div");
    head.className = "section-head";

    const heading = document.createElement("div");

    const h = document.createElement("h3");
    h.textContent = title;

    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = description;

    heading.append(h, p);
    head.appendChild(heading);
    card.appendChild(head);

    const content = document.createElement("div");
    content.id = contentId;
    content.className = "table-wrap";

    card.appendChild(content);
    return card;
  }

  function renderRelatedTable(target, headers, rows, emptyMessage) {
    if (!target) return;

    if (!rows || rows.length === 0) {
      target.innerHTML = '<div class="empty-state"></div>';
      target.firstElementChild.textContent = emptyMessage;
      return;
    }

    const table = document.createElement("table");
    table.className = "data-table";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");

    headers.forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.appendChild(th);
    });

    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      row.forEach((value) => {
        tr.appendChild(makeCell(value));
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    target.replaceChildren(table);
  }

  async function openCustomerProfile(customerId) {
    if (!currentUser) return;

    const customer = allCustomerRows.find(
      (item) => item.id === customerId
    );

    if (!customer) {
      alert("Customer record not found. Please refresh the list.");
      return;
    }

    const listPanel = $("customerListPanel");
    const profilePanel = $("customerProfilePanel");

    if (!listPanel || !profilePanel) return;

    ensureCustomerProfileStyles();

    listPanel.hidden = true;
    profilePanel.hidden = false;
    profilePanel.textContent = "Loading customer profile...";

    const card = document.createElement("div");
    card.className = "section-card";

    const head = document.createElement("div");
    head.className = "customer-profile-head";

    const titleWrap = document.createElement("div");

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "CUSTOMER PROFILE";

    const title = document.createElement("h3");
    title.textContent = customer.full_name || "Customer";

    const sub = document.createElement("p");
    sub.className = "muted";
    sub.textContent =
      (customer.customer_number || customer.customer_id || customer.id) +
      " · Created " +
      formatDate(customer.created_at);

    titleWrap.append(eyebrow, title, sub);

    const back = makeButton(
      "← Back to Customers",
      "secondary-btn",
      () => {
        profilePanel.hidden = true;
        listPanel.hidden = false;
        renderCustomers($("customerSearch")?.value || "");
      }
    );

    head.append(titleWrap, back);
    card.appendChild(head);

    const meta = document.createElement("div");
    meta.className = "customer-profile-meta";

    [
      [
        "CUSTOMER ID",
        customer.customer_number || customer.customer_id || customer.id
      ],
      ["PHONE", customer.phone],
      ["EMAIL", customer.email]
    ].forEach(([label, value]) => {
      const box = document.createElement("div");

      const small = document.createElement("small");
      small.textContent = label;

      const strong = document.createElement("strong");
      strong.textContent = value || "—";

      box.append(small, strong);
      meta.appendChild(box);
    });

    card.appendChild(meta);

    const editCard = document.createElement("div");
    editCard.className = "section-card customer-profile-section";

    const editTitle = document.createElement("h3");
    editTitle.textContent = "Contact & Business Details";

    const form = document.createElement("form");
    form.id = "customerProfileForm";

    const grid = document.createElement("div");
    grid.className = "customer-profile-grid";

    grid.append(
      profileField("Full name", "full_name", customer.full_name),
      profileField("Phone", "phone", customer.phone, "tel"),
      profileField("Email", "email", customer.email, "email"),
      profileField("Company name", "company_name", customer.company_name),
      profileField("Address", "address", customer.address, "textarea", true),
      profileField("Notes", "notes", customer.notes, "textarea", true)
    );

    const actions = document.createElement("div");
    actions.className = "customer-profile-actions";

    const save = document.createElement("button");
    save.type = "submit";
    save.className = "primary-btn";
    save.textContent = "Save Customer Details";

    const cancel = makeButton(
      "Cancel",
      "secondary-btn",
      () => openCustomerProfile(customer.id)
    );

    actions.append(save, cancel);

    const notice = document.createElement("div");
    notice.id = "customerProfileNotice";
    notice.className = "customer-profile-note";

    form.append(grid, actions, notice);
    editCard.append(editTitle, form);

    profilePanel.replaceChildren(
      card,
      editCard,
      profileSection(
        "Enquiry History",
        "Website enquiries linked to this customer.",
        "customerEnquiryHistory"
      ),
      profileSection(
        "Projects",
        "Projects associated with this customer.",
        "customerProjectHistory"
      ),
      profileSection(
        "Quotations",
        "Quotations prepared for this customer.",
        "customerQuotationHistory"
      ),
      profileSection(
        "Invoices",
        "Invoices and payment balances for this customer.",
        "customerInvoiceHistory"
      ),
      profileSection(
        "Payments",
        "Payments recorded against this customer's invoices.",
        "customerPaymentHistory"
      )
    );

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = {
        full_name: form.elements.full_name.value.trim(),
        phone: form.elements.phone.value.trim() || null,
        email: form.elements.email.value.trim() || null,
        company_name: form.elements.company_name.value.trim() || null,
        address: form.elements.address.value.trim() || null,
        notes: form.elements.notes.value.trim() || null
      };

      if (!payload.full_name) {
        notice.textContent =
          "Please enter the customer's full name.";
        form.elements.full_name.focus();
        return;
      }

      save.disabled = true;
      save.textContent = "Saving...";
      notice.textContent = "";

      const { data, error } = await client
        .from("customers")
        .update(payload)
        .eq("id", customer.id)
        .select("*")
        .single();

      save.disabled = false;
      save.textContent = "Save Customer Details";

      if (error) {
        console.error("Customer update failed:", error);
        notice.textContent =
          "Could not save customer details: " + error.message;
        return;
      }

      const index = allCustomerRows.findIndex(
        (item) => item.id === customer.id
      );

      if (index >= 0) {
        allCustomerRows[index] = data;
      }

      alert("Customer details saved successfully.");

      await loadDashboardCounts();
      await openCustomerProfile(customer.id);
    });

    await loadCustomerHistory(customer.id);
  }

  /* =========================================
     CUSTOMER HISTORY
  ========================================= */

  async function loadCustomerHistory(customerId) {
    const [
      enquiries,
      projects,
      quotations,
      invoices
    ] = await Promise.all([
      client
        .from("enquiries")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),

      client
        .from("projects")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),

      client
        .from("quotations")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false }),

      client
        .from("invoices")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
    ]);

    if (enquiries.error) {
      showError(
        $("customerEnquiryHistory"),
        "Unable to load enquiries: " + enquiries.error.message
      );
    } else {
      renderRelatedTable(
        $("customerEnquiryHistory"),
        ["Service", "Budget", "Status", "Received"],
        (enquiries.data || []).map((r) => [
          r.service,
          r.budget,
          r.status,
          formatDate(r.created_at)
        ]),
        "No enquiries linked to this customer yet."
      );
    }

    if (projects.error) {
      showError(
        $("customerProjectHistory"),
        "Unable to load projects: " + projects.error.message
      );
    } else {
      renderRelatedTable(
        $("customerProjectHistory"),
        [
          "Project ID",
          "Project",
          "Service",
          "Status",
          "Progress",
          "Budget"
        ],
        (projects.data || []).map((r) => [
          r.project_number || r.project_id || r.id,
          r.project_name,
          r.service_type,
          r.status,
          r.progress == null ? "—" : r.progress + "%",
          r.budget == null ? "—" : "₹" + r.budget
        ]),
        "No projects linked to this customer yet."
      );
    }

    if (quotations.error) {
      showError(
        $("customerQuotationHistory"),
        "Unable to load quotations: " + quotations.error.message
      );
    } else {
      renderRelatedTable(
        $("customerQuotationHistory"),
        ["Quotation ID", "Status", "Total", "Created"],
        (quotations.data || []).map((r) => [
          r.quote_number || r.quote_id || r.id,
          r.status,
          r.total == null ? "—" : "₹" + r.total,
          formatDate(r.created_at)
        ]),
        "No quotations linked to this customer yet."
      );
    }

    if (invoices.error) {
      showError(
        $("customerInvoiceHistory"),
        "Unable to load invoices: " + invoices.error.message
      );

      showError(
        $("customerPaymentHistory"),
        "Payments cannot be loaded until invoices are available."
      );
    } else {
      const invoiceRows = invoices.data || [];

      renderRelatedTable(
        $("customerInvoiceHistory"),
        [
          "Invoice ID",
          "Status",
          "Total",
          "Paid",
          "Balance",
          "Due Date"
        ],
        invoiceRows.map((r) => [
          r.invoice_number || r.invoice_id || r.id,
          r.status,
          r.total == null ? "—" : "₹" + r.total,
          r.amount_paid == null ? "—" : "₹" + r.amount_paid,
          r.balance == null ? "—" : "₹" + r.balance,
          formatDate(r.due_date)
        ]),
        "No invoices linked to this customer yet."
      );

      const invoiceIds = invoiceRows
        .map((row) => row.id)
        .filter(Boolean);

      if (invoiceIds.length === 0) {
        renderRelatedTable(
          $("customerPaymentHistory"),
          ["Date", "Amount", "Method", "Reference", "Notes"],
          [],
          "No payments recorded for this customer yet."
        );
      } else {
        const paymentResult = await client
          .from("payments")
          .select("*")
          .in("invoice_id", invoiceIds)
          .order("payment_date", { ascending: false });

        if (paymentResult.error) {
          showError(
            $("customerPaymentHistory"),
            "Unable to load payments: " + paymentResult.error.message
          );
        } else {
          renderRelatedTable(
            $("customerPaymentHistory"),
            ["Date", "Amount", "Method", "Reference", "Notes"],
            (paymentResult.data || []).map((r) => [
              formatDate(r.payment_date),
              r.amount == null ? "—" : "₹" + r.amount,
              r.payment_method,
              r.transaction_reference,
              r.notes
            ]),
            "No payments recorded for this customer yet."
          );
        }
      }
    }
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

    if (view === "enquiries") {
      loadEnquiries();
    }

    if (view === "customers") {
      loadCustomers();
    }
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
