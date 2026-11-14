/* ============================================================
   VELORA DIGITAL — BUSINESS OPERATING SYSTEM
   Complete Owner Dashboard
   Supabase JS v2
   ============================================================ */

document.addEventListener("DOMContentLoaded", () => {
  "use strict";

  /* ==========================================================
     1. CONFIGURATION
  ========================================================== */

  const OWNER_ID = "2137a1e3-f59a-4afb-bbb3-a148b7b6df60";

  const STORAGE_BUCKET = "velora-private-documents";

  const $ = (id) => document.getElementById(id);

  let db = null;
  let currentUser = null;
  let currentProfile = null;

  let customersCache = [];
  let enquiriesCache = [];
  let projectsCache = [];
  let quotationsCache = [];
  let invoicesCache = [];
  let paymentsCache = [];
  let expenseCategoriesCache = [];
  let currentFinanceTab = "quotations";

  const INR = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2
  });

  const DATE = (value) => {
    if (!value) return "—";

    const d = new Date(value);

    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-IN");
  };

  const DATETIME = (value) => {
    if (!value) return "—";

    const d = new Date(value);

    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleString("en-IN");
  };

  const TODAY = () => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 10);
  };

  /* ==========================================================
     2. SUPABASE INITIALIZATION
  ========================================================== */

  const loginView = $("loginView");
  const appView = $("appView");
  const loginForm = $("loginForm");
  const loginMessage = $("loginMessage");

  if (
    !window.supabase ||
    !window.VELORA_SUPABASE_URL ||
    !window.VELORA_SUPABASE_KEY
  ) {
    if (loginMessage) {
      loginMessage.textContent =
        "Supabase configuration is missing. Check supabase-config.js.";
    }

    if ($("loginButton")) {
      $("loginButton").disabled = true;
    }

    console.error("VELORA: Supabase configuration missing.");
    return;
  }

  db = window.supabase.createClient(
    window.VELORA_SUPABASE_URL,
    window.VELORA_SUPABASE_KEY
  );

  /* ==========================================================
     3. COMMON HELPERS
  ========================================================== */

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function money(value) {
    return INR.format(Number(value || 0));
  }

  function number(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function notify(message, type = "info") {
    let container = $("veloraToastContainer");

    if (!container) {
      container = document.createElement("div");
      container.id = "veloraToastContainer";

      Object.assign(container.style, {
        position: "fixed",
        right: "20px",
        bottom: "20px",
        zIndex: "99999",
        display: "grid",
        gap: "10px",
        maxWidth: "360px"
      });

      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.textContent = message;

    Object.assign(toast.style, {
      padding: "14px 18px",
      borderRadius: "12px",
      background: type === "error"
        ? "#7f1d35"
        : type === "success"
          ? "#14532d"
          : "#29243d",
      color: "#fff",
      boxShadow: "0 10px 30px rgba(0,0,0,.3)",
      fontSize: "13px",
      lineHeight: "1.5"
    });

    container.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
  }

  function showError(target, message) {
    if (!target) return;

    target.textContent = message;
    target.classList.add("error-message");
  }

  function makeButton(label, className, handler) {
    const button = document.createElement("button");

    button.type = "button";
    button.className = className || "secondary-btn";
    button.textContent = label;

    button.addEventListener("click", handler);

    return button;
  }

  function makeCell(value) {
    const td = document.createElement("td");

    td.textContent =
      value === null ||
      value === undefined ||
      value === ""
        ? "—"
        : String(value);

    return td;
  }

  function setText(id, value) {
    const element = $(id);

    if (element) {
      element.textContent = value ?? "—";
    }
  }

  function setHTML(id, html) {
    const element = $(id);

    if (element) {
      element.innerHTML = html;
    }
  }

  function setLoading(target, message = "Loading...") {
    if (target) {
      target.textContent = message;
    }
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
      element.className = className;
    }

    if (text !== undefined) {
      element.textContent = text;
    }

    return element;
  }

  function badge(value) {
    const span = document.createElement("span");

    span.className = "status-badge";
    span.textContent = value || "—";

    return span;
  }

  function safeFilename(value) {
    return String(value || "document")
      .replace(/[^a-zA-Z0-9._-]/g, "_");
  }

  async function query(table, options = {}) {
    let request = db.from(table).select(options.select || "*");

    if (options.order) {
      request = request.order(options.order, {
        ascending: options.ascending ?? false
      });
    }

    if (options.limit) {
      request = request.limit(options.limit);
    }

    if (options.filters) {
      options.filters.forEach((filter) => {
        request = request[filter.method](
          filter.column,
          filter.value
        );
      });
    }

    return request;
  }

  async function logActivity(
    action,
    module,
    recordId = null,
    description = "",
    metadata = {}
  ) {
    if (!currentUser) return;

    const { error } = await db
      .from("activity_logs")
      .insert({
        actor_id: currentUser.id,
        action,
        module,
        record_id: recordId,
        description,
        metadata
      });

    if (error) {
      console.warn("Activity log could not be saved:", error.message);
    }
  }

  async function createNotification(
    title,
    message,
    type = "info",
    module = null,
    recordId = null
  ) {
    const { error } = await db
      .from("notifications")
      .insert({
        title,
        message,
        notification_type: type,
        related_module: module,
        related_record_id: recordId
      });

    if (error) {
      console.warn("Notification could not be created:", error.message);
    }
  }

  async function countRows(table, filters = []) {
    let request = db
      .from(table)
      .select("*", {
        count: "exact",
        head: true
      });

    filters.forEach((filter) => {
      request = request[filter.method](
        filter.column,
        filter.value
      );
    });

    const { count, error } = await request;

    if (error) {
      console.warn("Count error:", table, error.message);
      return 0;
    }

    return count || 0;
  }

  function requireOwner() {
    if (!currentUser || currentUser.id !== OWNER_ID) {
      notify("Owner authentication required.", "error");
      return false;
    }

    return true;
  }

  /* ==========================================================
     4. DYNAMIC INTERFACE STYLES
  ========================================================== */

  function installStyles() {
    if ($("veloraDynamicStyles")) return;

    const style = document.createElement("style");
    style.id = "veloraDynamicStyles";

    style.textContent = `
      .velora-module-head {
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:14px;
        flex-wrap:wrap;
        margin-bottom:18px;
      }

      .velora-toolbar {
        display:flex;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
        margin:14px 0;
      }

      .velora-toolbar input,
      .velora-toolbar select,
      .velora-form input,
      .velora-form select,
      .velora-form textarea {
        box-sizing:border-box;
        padding:12px 14px;
        border:1px solid rgba(255,255,255,.14);
        border-radius:9px;
        background:#0c0b15;
        color:#fff;
        font:inherit;
        width:100%;
      }

      .velora-toolbar input {
        max-width:360px;
      }

      .velora-form {
        display:grid;
        gap:14px;
      }

      .velora-form-grid {
        display:grid;
        grid-template-columns:repeat(2,minmax(0,1fr));
        gap:14px;
      }

      .velora-form label {
        display:grid;
        gap:7px;
        font-size:13px;
        color:#c7c2d7;
      }

      .velora-form .wide {
        grid-column:1/-1;
      }

      .velora-form textarea {
        min-height:90px;
        resize:vertical;
      }

      .velora-actions {
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      }

      .velora-actions button {
        white-space:nowrap;
      }

      .velora-tabs {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin:15px 0;
      }

      .velora-tab {
        border:1px solid rgba(255,255,255,.15);
        background:#171426;
        color:#fff;
        padding:10px 15px;
        border-radius:9px;
        cursor:pointer;
      }

      .velora-tab.active {
        background:#7549d8;
        border-color:#9470ed;
      }

      .velora-modal-backdrop {
        position:fixed;
        inset:0;
        z-index:10000;
        background:rgba(0,0,0,.78);
        display:flex;
        justify-content:center;
        align-items:center;
        padding:18px;
        overflow:auto;
      }

      .velora-modal {
        width:min(760px,100%);
        max-height:92vh;
        overflow:auto;
        background:#171426;
        color:#fff;
        border:1px solid rgba(255,255,255,.12);
        border-radius:16px;
        padding:22px;
        box-shadow:0 25px 80px rgba(0,0,0,.5);
      }

      .velora-modal-head {
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:12px;
        margin-bottom:18px;
      }

      .velora-modal-close {
        border:0;
        background:transparent;
        color:#fff;
        font-size:25px;
        cursor:pointer;
      }

      .velora-summary-grid {
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:12px;
                margin:15px 0;
      }

      .velora-summary {
        background:rgba(255,255,255,.04);
        border:1px solid rgba(255,255,255,.09);
        border-radius:12px;
        padding:15px;
      }

      .velora-summary small {
        display:block;
        color:#aaa5bb;
        margin-bottom:8px;
      }

      .velora-summary strong {
        font-size:18px;
        overflow-wrap:anywhere;
      }

      .velora-empty {
        padding:24px;
        text-align:center;
        color:#aaa5bb;
      }

      .velora-inline-note {
        color:#aaa5bb;
        font-size:12px;
        line-height:1.5;
      }

      .velora-danger {
        background:#70243a !important;
        color:#fff !important;
      }

      .velora-progress {
        width:100%;
        height:8px;
        background:#29243d;
        border-radius:20px;
        overflow:hidden;
      }

      .velora-progress span {
        display:block;
        height:100%;
        background:#9270ed;
      }

      .velora-upload-list {
        display:grid;
        gap:8px;
      }

      .velora-upload-list a {
        color:#bba6ff;
      }

      @media(max-width:700px) {
        .velora-form-grid,
        .velora-summary-grid {
          grid-template-columns:1fr;
        }

        .velora-modal {
          padding:15px;
        }
      }
    `;

    document.head.appendChild(style);
  }

  /* ==========================================================
     5. MODAL AND FORM HELPERS
  ========================================================== */

  function closeModal() {
    $("veloraModalBackdrop")?.remove();
  }

  function openModal(title, content) {
    closeModal();

    const backdrop = createElement(
      "div",
      "velora-modal-backdrop"
    );

    backdrop.id = "veloraModalBackdrop";

    const modal = createElement("div", "velora-modal");

    const header = createElement("div", "velora-modal-head");
    const heading = createElement("h3", "", title);
    const close = createElement("button", "velora-modal-close", "×");

    close.type = "button";
    close.addEventListener("click", closeModal);

    header.append(heading, close);
    modal.append(header, content);
    backdrop.appendChild(modal);

    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) closeModal();
    });

    document.body.appendChild(backdrop);

    return modal;
  }

  function field(label, name, value = "", type = "text", options = {}) {
    const wrapper = createElement("label");

    if (options.wide) {
      wrapper.classList.add("wide");
    }

    wrapper.appendChild(
      createElement("span", "", label)
    );

    let input;

    if (type === "textarea") {
      input = document.createElement("textarea");
    } else if (type === "select") {
      input = document.createElement("select");

      (options.choices || []).forEach((choice) => {
        const option = document.createElement("option");

        option.value = choice.value;
        option.textContent = choice.label;

        input.appendChild(option);
      });
    } else {
      input = document.createElement("input");
      input.type = type;
    }

    input.name = name;

    if (type === "checkbox") {
      input.checked = Boolean(value);
    } else {
      input.value = value ?? "";
    }

    if (options.required) {
      input.required = true;
    }

    if (options.min !== undefined) {
      input.min = options.min;
    }

    if (options.max !== undefined) {
      input.max = options.max;
    }

    if (options.step !== undefined) {
      input.step = options.step;
    }

    if (options.placeholder) {
      input.placeholder = options.placeholder;
    }

    wrapper.appendChild(input);

    return wrapper;
  }

  function formGrid() {
    return createElement("div", "velora-form-grid");
  }

  function actionRow() {
    return createElement("div", "velora-actions");
  }

  function addSubmit(form, label = "Save") {
    const button = document.createElement("button");

    button.type = "submit";
    button.className = "primary-btn";
    button.textContent = label;

    form.appendChild(button);

    return button;
  }

  function formValue(form, name) {
    return form.elements[name]?.value?.trim() ?? "";
  }

  function nullable(value) {
    return value === "" ? null : value;
  }

  /* ==========================================================
     6. LOGIN AND OWNER VERIFICATION
  ========================================================== */

  function showLogin(message = "") {
    if (loginView) loginView.hidden = false;
    if (appView) appView.hidden = true;

    if (loginMessage) {
      loginMessage.textContent = message;
    }
  }

  function showApp(name) {
    if (loginView) loginView.hidden = true;
    if (appView) appView.hidden = false;

    setText("ownerName", name || "Owner");

    setText(
      "welcomeName",
      name
        ? "Welcome back, " + name + "."
        : "Your business, in focus."
    );
  }

  async function verifyOwner(user) {
    if (!user || user.id !== OWNER_ID) {
      await db.auth.signOut();

      currentUser = null;
      currentProfile = null;

      showLogin(
        "This account is not authorized for the Velora owner dashboard."
      );

      return false;
    }

    const { data: profile, error } = await db
      .from("profiles")
      .select("full_name, role")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("Profile verification failed:", error);

      showLogin(
        "Unable to verify your owner profile: " + error.message
      );

      return false;
    }

    if (!profile || profile.role !== "owner") {
      await db.auth.signOut();

      currentUser = null;
      currentProfile = null;

      showLogin("Owner access is required.");

      return false;
    }

    currentUser = user;
    currentProfile = profile;

    showApp(profile.full_name || user.email);

    await initializeWorkspace();

    return true;
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
      event.preventDefault();

      const button = $("loginButton");

      if (button) {
        button.disabled = true;
        button.textContent = "Signing in...";
      }

      if (loginMessage) loginMessage.textContent = "";

      try {
        const { data, error } = await db.auth.signInWithPassword({
          email: $("loginEmail").value.trim(),
          password: $("loginPassword").value
        });

        if (error) throw error;

        await verifyOwner(data.user);

      } catch (error) {
        console.error("Login error:", error);

        if (loginMessage) {
          loginMessage.textContent = error.message;
        }

      } finally {
        if (button) {
          button.disabled = false;
          button.textContent = "Sign In Securely →";
        }
      }
    });
  }

  $("logoutButton")?.addEventListener("click", async () => {
    if (!confirm("Are you sure you want to sign out?")) return;

    const { error } = await db.auth.signOut();

    if (error) {
      notify(error.message, "error");
      return;
    }

    currentUser = null;
    currentProfile = null;

    showLogin("You have successfully signed out.");
  });

  /* ==========================================================
     7. TABLE RENDERING
  ========================================================== */

  function renderTable(target, headers, rows, emptyMessage) {
    if (!target) return;

    if (!rows || rows.length === 0) {
      target.replaceChildren(
        createElement("div", "velora-empty", emptyMessage)
      );
      return;
    }

    const table = document.createElement("table");
    table.className = "data-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    headers.forEach((header) => {
      const th = createElement("th", "", header);
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      row.forEach((value) => {
        if (value instanceof Node) {
          const td = document.createElement("td");
          td.appendChild(value);
          tr.appendChild(td);
        } else {
          tr.appendChild(makeCell(value));
        }
      });

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    target.replaceChildren(table);
  }

  function makeModuleHeader(title, description, buttonText, handler) {
    const wrapper = createElement("div", "velora-module-head");

    const left = document.createElement("div");

    left.append(
      createElement("h3", "", title),
      createElement("p", "muted", description)
    );

    const button = makeButton(
      buttonText,
      "primary-btn",
      handler
    );

    wrapper.append(left, button);

    return wrapper;
  }

  function createSearch(target, placeholder, onChange) {
    const input = document.createElement("input");

    input.type = "search";
    input.placeholder = placeholder;
    input.setAttribute("aria-label", placeholder);

    input.addEventListener("input", () => {
      onChange(input.value.toLowerCase());
    });

    target.appendChild(input);

    return input;
  }

  /* ==========================================================
     8. NAVIGATION
  ========================================================== */

  const VIEW_LABELS = {
    overview: "Overview",
    enquiries: "Enquiries",
    customers: "Customers",
    projects: "Projects",
    finance: "Quotations & Invoices",
    expenses: "Expenses",
    reminders: "Tasks & Reminders"
  };

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

    setText("pageTitle", VIEW_LABELS[view] || "Overview");

    if (!currentUser) return;

    const loaders = {
      overview: loadDashboard,
      enquiries: loadEnquiries,
      customers: loadCustomers,
      projects: loadProjects,
      finance: loadFinance,
      expenses: loadExpenses,
      reminders: loadReminders
    };

    if (loaders[view]) {
      loaders[view]();
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

  /* ==========================================================
     9. ENQUIRIES
  ========================================================== */

  function createEnquiryStatusSelect(row) {
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
      const oldStatus = row.status;

      select.disabled = true;

      const { error } = await db
        .from("enquiries")
        .update({ status: select.value })
        .eq("id", row.id);

      select.disabled = false;

      if (error) {
        select.value = oldStatus;
        notify(error.message, "error");
        return;
      }

      row.status = select.value;

      await logActivity(
        "updated",
        "enquiries",
        row.id,
        "Enquiry status changed to " + row.status
      );

      notify("Enquiry status updated.", "success");
    });

    return select;
  }

  async function convertEnquiry(row, button) {
    if (!requireOwner()) return;

    if (row.customer_id) {
      notify("This enquiry is already linked to a customer.");
      return;
    }

    if (!confirm(
      "Convert " + row.customer_name +
      " into a Velora customer?"
    )) return;

    button.disabled = true;
    button.textContent = "Converting...";

    const { data, error } = await db.rpc(
      "convert_enquiry_to_customer",
      {
        p_enquiry_id: row.id
      }
    );

    button.disabled = false;
    button.textContent = "Convert to Customer";

    if (error) {
      notify("Conversion failed: " + error.message, "error");
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.customer_uuid) {
      notify("The database did not return a customer record.", "error");
      return;
    }

    row.customer_id = result.customer_uuid;
    row.status = "converted";

    await logActivity(
      "converted",
      "enquiries",
      row.id,
      "Enquiry converted into customer"
    );

    await createNotification(
      "New Customer Created",
      result.full_name + " was added as a customer.",
      "success",
      "customers",
      result.customer_uuid
    );

    notify(
      "Customer created successfully: " +
      (result.customer_number || result.full_name),
      "success"
    );

    await loadEnquiries();
    await loadDashboardCounts();
  }

  function renderEnquiries(target, rows, compact = false) {
    if (!target) return;

    if (!rows.length) {
      target.innerHTML =
        '<div class="velora-empty">No enquiries found.</div>';
      return;
    }

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

    const table = document.createElement("table");
    table.className = "data-table";

    const thead = document.createElement("thead");
    const trHead = document.createElement("tr");

    headers.forEach((header) => {
      trHead.appendChild(createElement("th", "", header));
    });

    thead.appendChild(trHead);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    rows.forEach((row) => {
      const tr = document.createElement("tr");

      if (compact) {
        tr.append(
          makeCell(row.customer_name),
          makeCell(row.service),
          makeCell(DATE(row.created_at))
        );
      } else {
        tr.append(
          makeCell(row.customer_name),
          makeCell(
            [row.phone, row.email].filter(Boolean).join(" · ")
          ),
          makeCell(row.service),
          makeCell(row.budget)
        );

        const statusCell = document.createElement("td");
        statusCell.appendChild(createEnquiryStatusSelect(row));
        tr.appendChild(statusCell);

        tr.appendChild(makeCell(DATETIME(row.created_at)));

        const actionCell = document.createElement("td");

        if (row.customer_id) {
          actionCell.textContent = "✓ Converted";
        } else {
          actionCell.appendChild(
            makeButton(
              "Convert to Customer",
              "secondary-btn",
              (event) => convertEnquiry(row, event.currentTarget)
            )
          );
        }

        tr.appendChild(actionCell);
      }

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    target.replaceChildren(table);
  }

  async function loadEnquiries() {
    if (!requireOwner()) return;

    setLoading($("allEnquiries"), "Loading enquiries...");
    setLoading($("recentEnquiries"), "Loading enquiries...");

    const { data, error } = await db
      .from("enquiries")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      showError($("allEnquiries"), error.message);
      return;
    }

    enquiriesCache = data || [];

    renderEnquiries(
      $("allEnquiries"),
      enquiriesCache,
      false
    );

    renderEnquiries(
      $("recentEnquiries"),
      enquiriesCache.slice(0, 5),
      true
    );
  }

  $("refreshEnquiries")?.addEventListener("click", loadEnquiries);

  /* ==========================================================
     10. CUSTOMERS
  ========================================================== */

  function setupCustomerInterface() {
    const section = $("customersView");

    if (!section) return;

    section.innerHTML = `
      <div class="section-card" id="customerListPanel">
        <div class="section-head">
          <div>
            <p class="eyebrow">CLIENT RELATIONSHIPS</p>
            <h3>Customer Management</h3>
            <p class="muted">Manage customers and their business history.</p>
          </div>

          <button class="secondary-btn" id="refreshCustomers" type="button">
            ↻ Refresh
          </button>
        </div>

        <input
          id="customerSearch"
          type="search"
          placeholder="Search customer ID, name, phone or email..."
          style="width:100%;padding:13px;margin:15px 0"
        >

        <div id="customerCount" class="muted"></div>

        <div id="allCustomers" class="table-wrap">
          Loading customers...
        </div>
      </div>

      <div id="customerProfilePanel" hidden></div>
    `;

    $("customerSearch").addEventListener("input", () => {
      renderCustomers($("customerSearch").value);
    });

    $("refreshCustomers").addEventListener("click", loadCustomers);
  }

  function renderCustomers(search = "") {
    const target = $("allCustomers");
    if (!target) return;

    const filtered = customersCache.filter((customer) => {
      const value = [
        customer.customer_number,
        customer.customer_id,
        customer.full_name,
        customer.phone,
        customer.email,
        customer.company_name
      ].join(" ").toLowerCase();

      return value.includes(search.toLowerCase());
    });

    setText(
      "customerCount",
      filtered.length + " customer(s) found"
    );

    const rows = filtered.map((customer) => {
      const viewButton = makeButton(
        "View Profile →",
        "secondary-btn",
        () => openCustomerProfile(customer.id)
      );

      return [
        customer.customer_number || customer.customer_id || customer.id,
        customer.full_name,
        customer.phone,
        customer.email,
        customer.company_name,
        DATE(customer.created_at),
        viewButton
      ];
    });

    renderTable(
      target,
      [
        "Customer ID",
        "Name",
        "Phone",
        "Email",
        "Company",
        "Created",
        "Action"
      ],
      rows,
      "No customers found."
    );
  }

  async function loadCustomers() {
    if (!requireOwner()) return;

    setLoading($("allCustomers"), "Loading customers...");

    const { data, error } = await db
      .from("customers")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      showError($("allCustomers"), error.message);
      return;
    }

    customersCache = data || [];

    renderCustomers($("customerSearch")?.value || "");
  }

  function customerOptions(selected = "") {
    return customersCache.map((customer) => ({
      value: customer.id,
      label:
        (customer.customer_number || customer.id) +
        " — " + customer.full_name,
      selected: customer.id === selected
    }));
  }

  async function openCustomerProfile(customerId) {
    const customer = customersCache.find(
      (item) => item.id === customerId
    );

    if (!customer) {
      notify("Customer not found.", "error");
      return;
    }

    $("customerListPanel").hidden = true;

    const panel = $("customerProfilePanel");
    panel.hidden = false;
    panel.innerHTML = "Loading customer profile...";

    const card = createElement("div", "section-card");

    const header = createElement("div", "velora-module-head");

    const title = document.createElement("div");
    title.append(
      createElement("p", "eyebrow", "CUSTOMER PROFILE"),
      createElement("h2", "", customer.full_name),
      createElement(
        "p",
        "muted",
        "Customer ID: " +
        (customer.customer_number || customer.id)
      )
    );

    const back = makeButton(
      "← Back to Customers",
      "secondary-btn",
      () => {
        panel.hidden = true;
        $("customerListPanel").hidden = false;
      }
    );

    header.append(title, back);

    const form = document.createElement("form");
    form.className = "velora-form";

    const grid = formGrid();

    grid.append(
      field("Full name", "full_name", customer.full_name, "text", {
        required: true
      }),
      field("Phone", "phone", customer.phone, "tel"),
      field("Email", "email", customer.email, "email"),
      field("Company", "company_name", customer.company_name),
      field("Address", "address", customer.address, "textarea", {
        wide: true
      }),
      field("Notes", "notes", customer.notes, "textarea", {
        wide: true
      })
    );

    form.appendChild(grid);
    const save = addSubmit(form, "Save Customer Details");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      save.disabled = true;

      const payload = {
        full_name: formValue(form, "full_name"),
        phone: formValue(form, "phone"),
        email: nullable(formValue(form, "email")),
        company_name: nullable(formValue(form, "company_name")),
        address: nullable(formValue(form, "address")),
        notes: nullable(formValue(form, "notes"))
      };

      const { data, error } = await db
        .from("customers")
        .update(payload)
        .eq("id", customer.id)
        .select("*")
        .single();

      save.disabled = false;

      if (error) {
        notify(error.message, "error");
        return;
      }

      const index = customersCache.findIndex(
        (item) => item.id === customer.id
      );

      if (index >= 0) customersCache[index] = data;

      await logActivity(
        "updated",
        "customers",
        customer.id,
        "Customer profile updated"
      );

      notify("Customer profile updated.", "success");

      await loadCustomers();
      await openCustomerProfile(customer.id);
    });

    const history = createElement("div", "section-card");
    history.innerHTML = `
      <h3>Customer Business History</h3>
      <div id="customerHistoryContent">Loading history...</div>
    `;

    card.append(header, form, history);
    panel.replaceChildren(card);

    await loadCustomerHistory(customer.id);
  }

  async function loadCustomerHistory(customerId) {
    const target = $("customerHistoryContent");
    if (!target) return;

    const tables = [
      ["enquiries", "Enquiries", "created_at"],
      ["projects", "Projects", "created_at"],
             ["quotations", "Quotations", "created_at"],
      ["invoices", "Invoices", "created_at"]
    ];

    const results = await Promise.all(
      tables.map(async ([table, label, order]) => {
        const { data, error } = await db
          .from(table)
          .select("*")
          .eq("customer_id", customerId)
          .order(order, { ascending: false });

        return { table, label, data, error };
      })
    );

    target.replaceChildren();

    results.forEach((result) => {
      const section = createElement("div", "customer-profile-section");

      section.appendChild(
        createElement("h4", "", result.label)
      );

      if (result.error) {
        section.appendChild(
          createElement("p", "muted", result.error.message)
        );
        target.appendChild(section);
        return;
      }

      let headers = [];
      let rows = [];

      if (result.table === "enquiries") {
        headers = ["Service", "Status", "Received"];

        rows = (result.data || []).map((row) => [
          row.service,
          row.status,
          DATE(row.created_at)
        ]);
      }

      if (result.table === "projects") {
        headers = ["Project", "Status", "Progress", "Budget"];

        rows = (result.data || []).map((row) => [
          row.project_name,
          row.status,
          row.progress + "%",
          money(row.budget)
        ]);
      }

      if (result.table === "quotations") {
        headers = ["Quotation", "Status", "Total"];

        rows = (result.data || []).map((row) => [
          row.quote_number,
          row.status,
          money(row.total)
        ]);
      }

      if (result.table === "invoices") {
        headers = ["Invoice", "Status", "Total", "Paid", "Balance"];

        rows = (result.data || []).map((row) => [
          row.invoice_number,
          row.status,
          money(row.total),
          money(row.amount_paid),
          money(row.balance)
        ]);
      }

      const tableContainer = document.createElement("div");
      tableContainer.className = "table-wrap";

      renderTable(
        tableContainer,
        headers,
        rows,
        "No " + result.label.toLowerCase() + " found."
      );

      section.appendChild(tableContainer);
      target.appendChild(section);
    });

    const invoices = results.find(
      (result) => result.table === "invoices"
    );

    const invoiceIds = (invoices?.data || []).map(
      (invoice) => invoice.id
    );

    const paymentSection = createElement(
      "div",
      "customer-profile-section"
    );

    paymentSection.appendChild(
      createElement("h4", "", "Payment History")
    );

    if (invoiceIds.length) {
      const { data, error } = await db
        .from("payments")
        .select("*")
        .in("invoice_id", invoiceIds)
        .order("payment_date", { ascending: false });

      if (error) {
        paymentSection.appendChild(
          createElement("p", "muted", error.message)
        );
      } else {
        const container = document.createElement("div");
        container.className = "table-wrap";

        renderTable(
          container,
          ["Date", "Amount", "Method", "Reference"],
          (data || []).map((payment) => [
            DATE(payment.payment_date),
            money(payment.amount),
            payment.payment_method,
            payment.transaction_reference
          ]),
          "No payments recorded."
        );

        paymentSection.appendChild(container);
      }
    } else {
      paymentSection.appendChild(
        createElement("p", "muted", "No payments recorded.")
      );
    }

    target.appendChild(paymentSection);
  }

  /* ==========================================================
     11. PROJECT MANAGEMENT
  ========================================================== */

  function ensureProjectInterface() {
    const section = $("projectsView");
    if (!section || $("projectsModule")) return;

    section.innerHTML = `
      <div id="projectsModule" class="section-card">
        <div id="projectsHeader"></div>

        <div class="velora-summary-grid">
          <div class="velora-summary">
            <small>Total Projects</small>
            <strong id="projectTotal">0</strong>
          </div>

          <div class="velora-summary">
            <small>In Progress</small>
            <strong id="projectActive">0</strong>
          </div>

          <div class="velora-summary">
            <small>Completed</small>
            <strong id="projectCompleted">0</strong>
          </div>
        </div>

        <div id="projectsTable" class="table-wrap"></div>
      </div>
    `;
  }

  async function loadProjects() {
    if (!requireOwner()) return;

    ensureProjectInterface();

    setLoading($("projectsTable"));

    const { data, error } = await db
      .from("projects")
      .select("*, customers(full_name, customer_number)")
      .order("created_at", { ascending: false });

    if (error) {
      showError($("projectsTable"), error.message);
      return;
    }

    projectsCache = data || [];

    setText("projectTotal", projectsCache.length);

    setText(
      "projectActive",
      projectsCache.filter((p) =>
        ["in_progress", "active"].includes(p.status)
      ).length
    );

    setText(
      "projectCompleted",
      projectsCache.filter((p) => p.status === "completed").length
    );

    $("projectsHeader").replaceChildren(
      makeModuleHeader(
        "Project Management",
        "Manage projects, clients, deadlines and delivery progress.",
        "+ New Project",
        openProjectForm
      )
    );

    renderProjects();
  }

  function renderProjects(search = "") {
    const filtered = projectsCache.filter((project) => {
      const value = [
        project.project_name,
        project.project_number,
        project.service_type,
        project.status
      ].join(" ").toLowerCase();

      return value.includes(search);
    });

    renderTable(
      $("projectsTable"),
      [
        "Project ID",
        "Project",
        "Customer",
        "Status",
        "Progress",
        "Deadline",
        "Actions"
      ],
      filtered.map((project) => {
        const actions = actionRow();

        actions.append(
          makeButton(
            "Manage",
            "secondary-btn",
            () => openProjectDetails(project.id)
          ),
          makeButton(
            "Edit",
            "secondary-btn",
            () => openProjectForm(project)
          )
        );

        return [
          project.project_number,
          project.project_name,
          project.customers?.full_name || "—",
          badge(project.status),
          project.progress + "%",
          DATE(project.deadline),
          actions
        ];
      }),
      "No projects found."
    );
  }

  function openProjectForm(project = null) {
    if (!requireOwner()) return;

    const form = document.createElement("form");
    form.className = "velora-form";

    const grid = formGrid();

    grid.append(
      field("Customer", "customer_id", project?.customer_id || "", "select", {
        required: true,
        choices: [
          { value: "", label: "Select customer" },
          ...customerOptions(project?.customer_id)
        ]
      }),
      field("Project name", "project_name", project?.project_name || "", "text", {
        required: true
      }),
      field("Service type", "service_type", project?.service_type || ""),
      field("Budget (₹)", "budget", project?.budget ?? 0, "number", {
        min: 0,
        step: "0.01"
      }),
      field("Status", "status", project?.status || "pending", "select", {
        choices: [
          { value: "pending", label: "Pending" },
          { value: "in_progress", label: "In Progress" },
          { value: "completed", label: "Completed" },
          { value: "on_hold", label: "On Hold" },
          { value: "cancelled", label: "Cancelled" }
        ]
      }),
      field("Progress (%)", "progress", project?.progress ?? 0, "number", {
        min: 0,
        max: 100,
        step: 1
      }),
      field("Start date", "start_date", project?.start_date || "", "date"),
      field("Deadline", "deadline", project?.deadline || "", "date"),
      field("Description", "description", project?.description || "", "textarea", {
        wide: true
      }),
      field("Notes", "notes", project?.notes || "", "textarea", {
        wide: true
      })
    );

    form.appendChild(grid);

    const save = addSubmit(
      form,
      project ? "Update Project" : "Create Project"
    );

    openModal(
      project ? "Edit Project" : "Create New Project",
      form
    );

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const payload = {
        customer_id: formValue(form, "customer_id"),
        project_name: formValue(form, "project_name"),
        service_type: nullable(formValue(form, "service_type")),
        budget: number(formValue(form, "budget")),
        status: formValue(form, "status"),
        progress: Math.min(
          100,
          Math.max(0, number(formValue(form, "progress")))
        ),
        start_date: nullable(formValue(form, "start_date")),
        deadline: nullable(formValue(form, "deadline")),
        description: nullable(formValue(form, "description")),
        notes: nullable(formValue(form, "notes"))
      };

      save.disabled = true;

      let result;

      if (project) {
        result = await db
          .from("projects")
          .update(payload)
          .eq("id", project.id)
          .select("*")
          .single();
      } else {
        result = await db
          .from("projects")
          .insert(payload)
          .select("*")
          .single();
      }

      save.disabled = false;

      if (result.error) {
        notify(result.error.message, "error");
        return;
      }

      await logActivity(
        project ? "updated" : "created",
        "projects",
        result.data.id,
        payload.project_name
      );

      await createNotification(
        project ? "Project Updated" : "New Project Created",
        payload.project_name,
        "info",
        "projects",
        result.data.id
      );

      closeModal();
      notify("Project saved successfully.", "success");

      await loadProjects();
      await loadDashboardCounts();
    });
  }

  async function openProjectDetails(projectId) {
    const project = projectsCache.find(
      (item) => item.id === projectId
    );

    if (!project) return;

    const wrapper = document.createElement("div");

    wrapper.append(
      createElement("h3", "", project.project_name),
      createElement("p", "muted", "Project #" + project.project_number),
      createElement(
        "p",
        "",
        "Customer: " + (project.customers?.full_name || "—")
      ),
      createElement(
        "p",
        "",
        "Progress: " + project.progress + "%"
      )
    );

    const progress = createElement("div", "velora-progress");
    const bar = document.createElement("span");

    bar.style.width = project.progress + "%";
    progress.appendChild(bar);
    wrapper.appendChild(progress);

    const actions = actionRow();

    actions.append(
      makeButton(
        "Edit Project",
        "secondary-btn",
        () => {
          closeModal();
          openProjectForm(project);
        }
      ),
      makeButton(
        "Add Project Update",
        "secondary-btn",
        () => {
          closeModal();
          openProjectUpdateForm(project.id);
        }
      ),
      makeButton(
        "Add Task",
        "secondary-btn",
        () => {
          closeModal();
          openTaskForm(project.id);
        }
      ),
      makeButton(
        "View Tasks",
        "secondary-btn",
        () => {
          closeModal();
          openProjectTasks(project.id);
        }
      )
    );

    wrapper.appendChild(actions);

    const updateContainer = createElement("div", "customer-profile-section");
    updateContainer.innerHTML = "<h4>Project Updates</h4><div>Loading...</div>";

    wrapper.appendChild(updateContainer);

    openModal("Project Details", wrapper);

    const { data, error } = await db
      .from("project_updates")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false });

    const list = updateContainer.lastElementChild;
    list.replaceChildren();

    if (error) {
      list.textContent = error.message;
      return;
    }

    (data || []).forEach((update) => {
             const item = createElement("div", "section-card");

      item.append(
        createElement("strong", "", update.title),
        createElement("p", "muted", update.update_description || ""),
        createElement("small", "muted", DATETIME(update.created_at))
      );

      list.appendChild(item);
    });

    if (!data?.length) {
      list.textContent = "No project updates yet.";
    }
  }

  function openProjectUpdateForm(projectId) {
    const form = document.createElement("form");
    form.className = "velora-form";

    const grid = formGrid();

    grid.append(
      field("Update title", "title", "", "text", { required: true }),
      field("Description", "update_description", "", "textarea", {
        wide: true
      }),
      field("Image URL", "image_url", "", "url"),
      field("Visible to customer", "is_public", false, "checkbox")
    );

    form.appendChild(grid);
    const save = addSubmit(form, "Save Project Update");

    openModal("Add Project Update", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      save.disabled = true;

      const payload = {
        project_id: projectId,
        title: formValue(form, "title"),
        update_description: nullable(
          formValue(form, "update_description")
        ),
        image_url: nullable(formValue(form, "image_url")),
        is_public: form.elements.is_public.checked
      };

      const { data, error } = await db
        .from("project_updates")
        .insert(payload)
        .select("*")
        .single();

      save.disabled = false;

      if (error) {
        notify(error.message, "error");
        return;
      }

      await logActivity(
        "created",
        "project_updates",
        data.id,
        payload.title
      );

      closeModal();
      notify("Project update saved.", "success");

      await openProjectDetails(projectId);
    });
  }

  /* ==========================================================
     12. TASKS
  ========================================================== */

  function openTaskForm(projectId = "") {
    const form = document.createElement("form");
    form.className = "velora-form";

    const choices = [
      { value: "", label: "Select project" },
      ...projectsCache.map((project) => ({
        value: project.id,
        label: project.project_name
      }))
    ];

    const grid = formGrid();

    grid.append(
      field("Project", "project_id", projectId, "select", {
        required: true,
        choices
      }),
      field("Task title", "title", "", "text", {
        required: true
      }),
      field("Priority", "priority", "medium", "select", {
        choices: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" }
        ]
      }),
      field("Status", "status", "todo", "select", {
        choices: [
          { value: "todo", label: "To Do" },
          { value: "in_progress", label: "In Progress" },
          { value: "completed", label: "Completed" }
        ]
      }),
      field("Due date", "due_date", "", "date"),
      field("Description", "description", "", "textarea", {
        wide: true
      })
    );

    form.appendChild(grid);
    const save = addSubmit(form, "Create Task");

    openModal("Create Project Task", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      save.disabled = true;

      const status = formValue(form, "status");

      const payload = {
        project_id: formValue(form, "project_id"),
        title: formValue(form, "title"),
        description: nullable(formValue(form, "description")),
        priority: formValue(form, "priority"),
        status,
        due_date: nullable(formValue(form, "due_date")),
        completed_at: status === "completed"
          ? new Date().toISOString()
          : null,
        assigned_to: currentUser.id
      };

      const { data, error } = await db
        .from("project_tasks")
        .insert(payload)
        .select("*")
        .single();

      save.disabled = false;

      if (error) {
        notify(error.message, "error");
        return;
      }

      await logActivity(
        "created",
        "project_tasks",
        data.id,
        payload.title
      );

      closeModal();
      notify("Task created.", "success");
    });
  }

  async function openProjectTasks(projectId) {
    const wrapper = document.createElement("div");

    const top = actionRow();

    top.appendChild(
      makeButton(
        "+ Add Task",
        "primary-btn",
        () => {
          closeModal();
          openTaskForm(projectId);
        }
      )
    );

    const table = document.createElement("div");
    table.className = "table-wrap";
    table.textContent = "Loading tasks...";

    wrapper.append(top, table);

    openModal("Project Tasks", wrapper);

    const { data, error } = await db
      .from("project_tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      table.textContent = error.message;
      return;
    }

    renderTable(
      table,
      ["Task", "Priority", "Status", "Due Date", "Action"],
      (data || []).map((task) => {
        const actions = actionRow();

        actions.append(
          makeButton(
            "Update Status",
            "secondary-btn",
            () => updateTaskStatus(task)
          ),
          makeButton(
            "Delete",
            "secondary-btn",
            () => deleteTask(task)
          )
        );

        return [
          task.title,
          task.priority,
          task.status,
          DATE(task.due_date),
          actions
        ];
      }),
      "No tasks for this project."
    );
  }

  async function updateTaskStatus(task) {
    const statuses = ["todo", "in_progress", "completed"];

    const current = statuses.indexOf(task.status);
    const next = statuses[(current + 1) % statuses.length];

    const payload = {
      status: next,
      completed_at: next === "completed"
        ? new Date().toISOString()
        : null
    };

    const { error } = await db
      .from("project_tasks")
      .update(payload)
      .eq("id", task.id);

    if (error) {
      notify(error.message, "error");
      return;
    }

    notify("Task status changed to " + next, "success");
    await openProjectTasks(task.project_id);
  }

  async function deleteTask(task) {
    if (!confirm("Delete this task?")) return;

    const { error } = await db
      .from("project_tasks")
      .delete()
      .eq("id", task.id);

    if (error) {
      notify(error.message, "error");
      return;
    }

    notify("Task deleted.", "success");
    await openProjectTasks(task.project_id);
  }

  /* ==========================================================
     13. QUOTATIONS AND INVOICES
  ========================================================== */

  function ensureFinanceInterface() {
    const section = $("financeView");
    if (!section || $("financeModule")) return;

    section.innerHTML = `
      <div class="section-card" id="financeModule">
        <p class="eyebrow">BUSINESS FINANCE</p>
        <h3>Quotations & Invoices</h3>
        <p class="muted">
          Manage quotations, invoices, payments and balances.
        </p>

        <div class="velora-summary-grid">
          <div class="velora-summary">
            <small>Quotation Value</small>
            <strong id="quotationValue">₹0</strong>
          </div>

          <div class="velora-summary">
            <small>Invoice Value</small>
            <strong id="invoiceValue">₹0</strong>
          </div>

          <div class="velora-summary">
            <small>Outstanding Balance</small>
            <strong id="outstandingValue">₹0</strong>
          </div>
        </div>

        <div class="velora-tabs" id="financeTabs">
          <button class="velora-tab active" data-finance="quotations">
            Quotations
          </button>

          <button class="velora-tab" data-finance="invoices">
            Invoices
          </button>

          <button class="velora-tab" data-finance="payments">
            Payments
          </button>
        </div>

        <div id="financeHeader"></div>
        <div id="financeTable" class="table-wrap"></div>
      </div>
    `;

    document.querySelectorAll("[data-finance]").forEach((button) => {
      button.addEventListener("click", () => {
        currentFinanceTab = button.dataset.finance;

        document.querySelectorAll("[data-finance]").forEach((item) => {
          item.classList.toggle(
            "active",
            item.dataset.finance === currentFinanceTab
          );
        });

        renderFinanceTab();
      });
    });
  }

  async function loadFinance() {
    if (!requireOwner()) return;

    ensureFinanceInterface();

    const results = await Promise.all([
      db.from("quotations").select("*").order("created_at", {
        ascending: false
      }),
      db.from("invoices").select("*").order("created_at", {
        ascending: false
      }),
      db.from("customers").select("*").order("created_at", {
        ascending: false
      }),
      db.from("projects").select("*").order("created_at", {
        ascending: false
      }),
      db.from("projects").select("*").order("created_at", {
       ascending: false
       })
       db.from("payments").select("*").order("payment_date", {
         ascending: false
       })
       ]);

    for (const result of results) {
      if (result.error) {
        notify(result.error.message, "error");
        return;
      }
    }

    quotationsCache = results[0].data || [];
    invoicesCache = results[1].data || [];
    customersCache = results[2].data || [];
    projectsCache = results[3].data || [];
    paymentsCache = results[5].data || [];

    setText(
      "quotationValue",
      money(quotationsCache.reduce((sum, row) => sum + number(row.total), 0))
    );

    setText(
      "invoiceValue",
      money(invoicesCache.reduce((sum, row) => sum + number(row.total), 0))
    );

    setText(
      "outstandingValue",
      money(invoicesCache.reduce((sum, row) => sum + number(row.balance), 0))
    );
     setText(
    "financeAmountReceived",
    money(paymentsCache.reduce((sum, payment) => sum + number(payment.amount), 0))
   );

    renderFinanceTab();
  }

  function renderFinanceTab() {
    if (currentFinanceTab === "quotations") {
      $("financeHeader").replaceChildren(
        makeModuleHeader(
          "Quotations",
          "Prepare and manage client quotations.",
          "+ New Quotation",
          () => openDocumentForm("quotation")
        )
      );

      renderTable(
        $("financeTable"),
        [
          "Quotation",
          "Customer",
          "Issue Date",
          "Valid Until",
          "Total",
          "Status",
          "Actions"
        ],
        quotationsCache.map((quote) => {
          const actions = actionRow();

          actions.append(
            makeButton(
              "View",
              "secondary-btn",
              () => viewFinancialDocument("quotation", quote.id)
            ),
            makeButton(
              "Edit",
              "secondary-btn",
              () => openDocumentForm("quotation", quote)
            ),
            makeButton(
              "Print",
              "secondary-btn",
              () => printFinancialDocument("quotation", quote.id)
            )
          );

          return [
            quote.quote_number,
            customersCache.find((c) => c.id === quote.customer_id)?.full_name || "—",
            DATE(quote.issue_date),
            DATE(quote.valid_until),
            money(quote.total),
            quote.status,
            actions
          ];
        }),
        "No quotations created yet."
      );
    }

    if (currentFinanceTab === "invoices") {
      $("financeHeader").replaceChildren(
        makeModuleHeader(
          "Invoices",
          "Create invoices and track outstanding balances.",
          "+ New Invoice",
          () => openDocumentForm("invoice")
        )
      );

      renderTable(
        $("financeTable"),
        [
          "Invoice",
          "Customer",
          "Issue Date",
          "Due Date",
          "Total",
          "Paid",
          "Balance",
          "Status",
          "Actions"
        ],
        invoicesCache.map((invoice) => {
          const actions = actionRow();

          actions.append(
            makeButton(
              "View",
              "secondary-btn",
              () => viewFinancialDocument("invoice", invoice.id)
            ),
            makeButton(
              "Edit",
              "secondary-btn",
              () => openDocumentForm("invoice", invoice)
            ),
            makeButton(
              "Payment",
              "secondary-btn",
              () => openPaymentForm(invoice)
                           ),
            makeButton(
              "Print",
              "secondary-btn",
              () => printFinancialDocument("invoice", invoice.id)
            )
          );

          return [
            invoice.invoice_number,
            customersCache.find((c) => c.id === invoice.customer_id)?.full_name || "—",
            DATE(invoice.issue_date),
            DATE(invoice.due_date),
            money(invoice.total),
            money(invoice.amount_paid),
            money(invoice.balance),
            invoice.status,
            actions
          ];
        }),
        "No invoices created yet."
      );
    }

    if (currentFinanceTab === "payments") {
      $("financeHeader").replaceChildren(
        makeModuleHeader(
          "Payment Records",
          "Review payment transactions.",
          "Refresh Payments",
          loadPayments
        )
      );

      loadPayments();
    }
  }

  function itemEditor(container, existingItems = []) {
    const wrapper = createElement("div", "customer-profile-section");

    wrapper.appendChild(
      createElement("h4", "", "Line Items")
    );

    const table = document.createElement("table");
    table.className = "data-table";

    table.innerHTML = `
      <thead>
        <tr>
          <th>Description</th>
          <th>Quantity</th>
          <th>Unit Price (₹)</th>
          <th></th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

    const tbody = table.querySelector("tbody");

    function addItem(item = {}) {
      const tr = document.createElement("tr");

      const description = document.createElement("input");
      description.name = "description";
      description.required = true;
      description.placeholder = "Service / item";
      description.value = item.description || "";

      const quantity = document.createElement("input");
      quantity.name = "quantity";
      quantity.type = "number";
      quantity.min = "0.01";
      quantity.step = "0.01";
      quantity.value = item.quantity ?? 1;

      const price = document.createElement("input");
      price.name = "unit_price";
      price.type = "number";
      price.min = "0";
      price.step = "0.01";
      price.value = item.unit_price ?? 0;

      [description, quantity, price].forEach((input) => {
        input.style.width = "100%";
        input.style.padding = "9px";
        input.style.background = "#0c0b15";
        input.style.color = "#fff";
        input.style.border = "1px solid rgba(255,255,255,.15)";
        input.style.borderRadius = "7px";
      });

      const remove = makeButton(
        "×",
        "secondary-btn",
        () => tr.remove()
      );

      const cells = [description, quantity, price, remove];

      cells.forEach((element) => {
        const td = document.createElement("td");
        td.appendChild(element);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    }

    if (existingItems.length) {
      existingItems.forEach(addItem);
    } else {
      addItem();
    }

    wrapper.appendChild(table);

    const add = makeButton(
      "+ Add Item",
      "secondary-btn",
      () => addItem()
    );

    wrapper.appendChild(add);

    container.appendChild(wrapper);

    return function collectItems() {
      return [...tbody.querySelectorAll("tr")].map((tr) => ({
        description: tr.querySelector('[name="description"]').value.trim(),
        quantity: number(tr.querySelector('[name="quantity"]').value),
        unit_price: number(tr.querySelector('[name="unit_price"]').value)
      })).filter((item) => item.description);
    };
  }

  async function openDocumentForm(type, existing = null) {
    if (!requireOwner()) return;

    const isInvoice = type === "invoice";
    const table = isInvoice ? "invoices" : "quotations";
    const itemTable = isInvoice ? "invoice_items" : "quotation_items";
    const idColumn = isInvoice ? "invoice_id" : "quotation_id";

    let oldItems = [];

    if (existing) {
      const { data, error } = await db
        .from(itemTable)
        .select("*")
        .eq(idColumn, existing.id)
        .order("created_at");

      if (error) {
        notify(error.message, "error");
        return;
      }

      oldItems = data || [];
    }

    const form = document.createElement("form");
    form.className = "velora-form";

    const grid = formGrid();

    const customerChoices = [
      { value: "", label: "Select customer" },
      ...customerOptions(existing?.customer_id)
    ];

    const projectChoices = [
      { value: "", label: "No project selected" },
      ...projectsCache.map((project) => ({
        value: project.id,
        label: project.project_name
      }))
    ];

    grid.append(
      field("Customer", "customer_id", existing?.customer_id || "", "select", {
        required: true,
        choices: customerChoices
      }),
      field("Project", "project_id", existing?.project_id || "", "select", {
        choices: projectChoices
      }),
      field(
        isInvoice ? "Issue Date" : "Quotation Date",
        "issue_date",
        existing?.issue_date || TODAY(),
        "date",
        { required: true }
      ),
      field(
        isInvoice ? "Due Date" : "Valid Until",
        isInvoice ? "due_date" : "valid_until",
        existing?.[isInvoice ? "due_date" : "valid_until"] || "",
        "date"
      ),
      field("Discount (₹)", "discount", existing?.discount ?? 0, "number", {
        min: 0,
        step: "0.01"
      }),
      field("Tax (₹)", "tax", existing?.tax ?? 0, "number", {
        min: 0,
        step: "0.01"
      }),
      field("Payment Terms", "payment_terms", existing?.payment_terms || ""),
      field(
        "Status",
        "status",
        existing?.status || (isInvoice ? "unpaid" : "draft"),
        "select",
        {
          choices: isInvoice
            ? [
                { value: "draft", label: "Draft" },
                { value: "unpaid", label: "Unpaid" },
                { value: "partially_paid", label: "Partially Paid" },
                { value: "paid", label: "Paid" },
                { value: "overdue", label: "Overdue" },
                { value: "cancelled", label: "Cancelled" }
              ]
            : [
                { value: "draft", label: "Draft" },
                { value: "sent", label: "Sent" },
                { value: "accepted", label: "Accepted" },
                { value: "rejected", label: "Rejected" },
                { value: "expired", label: "Expired" },
                { value: "converted", label: "Converted" }
              ]
        }
      ),
      field("Notes", "notes", existing?.notes || "", "textarea", {
        wide: true
      })
    );

    form.appendChild(grid);

    const collectItems = itemEditor(form, oldItems);

    const hint = createElement(
      "p",
      "velora-inline-note",
      "The database automatically calculates subtotal, discount, tax, total and invoice balance from saved line items. Totals are refreshed after saving."
    );

    form.appendChild(hint);

    const save = addSubmit(
      form,
      existing
        ? "Update " + (isInvoice ? "Invoice" : "Quotation")
        : "Create " + (isInvoice ? "Invoice" : "Quotation")
    );

    openModal(
      existing ? "Edit " : "Create " +
        (isInvoice ? "Invoice" : "Quotation"),
      form
    );

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const items = collectItems();

      if (!items.length) {
        notify("Add at least one line item.", "error");
        return;
      }

      if (items.some((item) =>
        item.quantity <= 0 || item.unit_price < 0
      )) {
        notify("Check item quantities and prices.", "error");
        return;
      }

      const payload = {
        customer_id: formValue(form, "customer_id"),
        project_id: nullable(formValue(form, "project_id")),
        issue_date: formValue(form, "issue_date"),
        discount: number(formValue(form, "discount")),
        tax: number(formValue(form, "tax")),
        payment_terms: nullable(formValue(form, "payment_terms")),
        notes: nullable(formValue(form, "notes")),
        status: formValue(form, "status")
      };

      if (isInvoice) {
        payload.due_date = nullable(formValue(form, "due_date"));
      } else {
        payload.valid_until = nullable(formValue(form, "valid_until"));
      }

      save.disabled = true;
      save.textContent = "Saving...";

      let documentResult;

      if (existing) {
        documentResult = await db
          .from(table)
          .update(payload)
          .eq("id", existing.id)
          .select("*")
          .single();
      } else {
        documentResult = await db
          .from(table)
          .insert(payload)
          .select("*")
          .single();
      }

      if (documentResult.error) {
        save.disabled = false;
        save.textContent = "Save";
        notify(documentResult.error.message, "error");
        return;
      }

      const documentId = documentResult.data.id;

      if (existing) {
        const { error: deleteError } = await db
          .from(itemTable)
          .delete()
          .eq(idColumn, documentId);

        if (deleteError) {
          save.disabled = false;
          notify(
            "Document saved, but old items could not be replaced: " +
            deleteError.message,
            "error"
          );
          return;
        }
      }

      const itemPayload = items.map((item) => ({
        [idColumn]: documentId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price
      }));

      const { error: itemError } = await db
        .from(itemTable)
        .insert(itemPayload);

      if (itemError) {
        save.disabled = false;

        notify(
          "Document saved, but items could not be saved: " +
          itemError.message,
          "error"
        );

        return;
      }

      await logActivity(
        existing ? "updated" : "created",
        table,
        documentId,
        isInvoice ? "Invoice saved" : "Quotation saved"
      );

      await createNotification(
        isInvoice ? "Invoice Updated" : "Quotation Created",
        (isInvoice ? "Invoice #" : "Quotation #") +
          documentResult.data[isInvoice ? "invoice_number" : "quote_number"],
        "info",
        table,
        documentId
      );

      closeModal();

      notify(
        (isInvoice ? "Invoice" : "Quotation") +
        " saved. Refreshing database totals...",
        "success"
      );

      await loadFinance();
      await loadDashboardCounts();
    });
  }

  async function viewFinancialDocument(type, id) {
    const isInvoice = type === "invoice";
    const table = isInvoice ? "invoices" : "quotations";
    const itemTable = isInvoice ? "invoice_items" : "quotation_items";
    const idColumn = isInvoice ? "invoice_id" : "quotation_id";

    const { data: document, error } = await db
      .from(table)
      .select("*, customers(full_name, phone, email, address), projects(project_name)")
      .eq("id", id)
      .single();

    if (error) {
      notify(error.message, "error");
      return;
    }

    const { data: items, error: itemError } = await db
      .from(itemTable)
      .select("*")
      .eq(idColumn, id);

    if (itemError) {
      notify(itemError.message, "error");
      return;
    }

    const wrapper = createElement("div");

    wrapper.append(
      createElement(
        "h2",
        "",
        (isInvoice ? "Invoice #" : "Quotation #") +
        (isInvoice ? document.invoice_number : document.quote_number)
      ),
      createElement("p", "", document.customers?.full_name || "Customer"),
      createElement(
        "p",
        "muted",
        "Issue date: " + DATE(document.issue_date)
      ),
      createElement(
        "p",
        "muted",
        (isInvoice ? "Due date: " : "Valid until: ") +
        DATE(isInvoice ? document.due_date : document.valid_until)
      )
    );

    const itemTableElement = document.createElement("div");
    itemTableElement.className = "table-wrap";

    renderTable(
      itemTableElement,
      ["Description", "Quantity", "Unit Price", "Amount"],
      (items || []).map((item) => [
        item.description,
        item.quantity,
        money(item.unit_price),
        money(item.amount)
      ]),
      "No line items."
    );

    wrapper.appendChild(itemTableElement);

    const totals = createElement("div", "customer-profile-section");

    totals.append(
      createElement("p", "", "Subtotal: " + money(document.subtotal)),
      createElement("p", "", "Discount: " + money(document.discount)),
      createElement("p", "", "Tax: " + money(document.tax)),
      createElement("h3", "", "Total: " + money(document.total))
    );

    if (isInvoice) {
      totals.append(
        createElement("p", "", "Paid: " + money(document.amount_paid)),
        createElement("h3", "", "Balance: " + money(document.balance))
      );
    }

    wrapper.append(totals);

    wrapper.append(
      createElement("p", "muted", "Status: " + document.status),
      createElement("p", "muted", document.notes || "")
    );

    const buttons = actionRow();

    buttons.appendChild(
      makeButton(
        "Print Document",
        "primary-btn",
        () => printFinancialDocument(type, id)
      )
    );

    if (isInvoice) {
      buttons.appendChild(
                 makeButton(
          "Record Payment",
          "secondary-btn",
          () => {
            closeModal();
            openPaymentForm(document);
          }
        )
      );
    }

    wrapper.appendChild(buttons);

    openModal(
      isInvoice ? "Invoice Details" : "Quotation Details",
      wrapper
    );
  }

  async function printFinancialDocument(type, id) {
    const isInvoice = type === "invoice";
    const table = isInvoice ? "invoices" : "quotations";
    const itemTable = isInvoice ? "invoice_items" : "quotation_items";
    const idColumn = isInvoice ? "invoice_id" : "quotation_id";

    const { data: document, error } = await db
      .from(table)
      .select("*, customers(full_name, phone, email, address)")
      .eq("id", id)
      .single();

    if (error) {
      notify(error.message, "error");
      return;
    }

    const { data: items, error: itemError } = await db
      .from(itemTable)
      .select("*")
      .eq(idColumn, id);

    if (itemError) {
      notify(itemError.message, "error");
      return;
    }

    const reference = isInvoice
      ? document.invoice_number
      : document.quote_number;

    const rows = (items || []).map((item) => `
      <tr>
        <td>${escapeHTML(item.description)}</td>
        <td>${escapeHTML(item.quantity)}</td>
        <td>${escapeHTML(money(item.unit_price))}</td>
        <td>${escapeHTML(money(item.amount))}</td>
      </tr>
    `).join("");

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      notify("Allow pop-ups to print this document.", "error");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${isInvoice ? "Invoice" : "Quotation"} ${reference}</title>
        <style>
          body{font-family:Arial,sans-serif;padding:40px;color:#222}
          h1{color:#32205f}
          table{width:100%;border-collapse:collapse;margin-top:25px}
          th,td{border:1px solid #ddd;padding:12px;text-align:left}
          th{background:#f1eef8}
          .total{text-align:right;margin-top:30px;line-height:2}
          .brand{font-weight:bold;letter-spacing:2px}
          @media print{button{display:none}}
        </style>
      </head>
      <body>
        <div class="brand">VELORA DIGITAL</div>
        <p>DIGITAL PRESENCE. ELEVATED.</p>

        <h1>${isInvoice ? "INVOICE" : "QUOTATION"} #${reference}</h1>

        <h3>${escapeHTML(document.customers?.full_name || "")}</h3>
        <p>${escapeHTML(document.customers?.phone || "")}</p>
        <p>${escapeHTML(document.customers?.email || "")}</p>
        <p>${escapeHTML(document.customers?.address || "")}</p>

        <p>Issue date: ${DATE(document.issue_date)}</p>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="total">
          <div>Subtotal: ${money(document.subtotal)}</div>
          <div>Discount: ${money(document.discount)}</div>
          <div>Tax: ${money(document.tax)}</div>
          <h2>Total: ${money(document.total)}</h2>
          ${isInvoice ? `
            <div>Paid: ${money(document.amount_paid)}</div>
            <h2>Balance: ${money(document.balance)}</h2>
          ` : ""}
        </div>

        <p>${escapeHTML(document.payment_terms || "")}</p>
        <p>${escapeHTML(document.notes || "")}</p>

        <hr>
        <p>Thank you for choosing VELORA DIGITAL.</p>

        <script>
          window.onload = () => window.print();
        <\\/script>
      </body>
      </html>
    `);

    printWindow.document.close();
  }

  /* ==========================================================
     14. PAYMENTS
  ========================================================== */

  async function openPaymentForm(invoice) {
    if (!invoice) return;

    const form = document.createElement("form");
    form.className = "velora-form";

    const grid = formGrid();

    grid.append(
      field("Invoice", "invoice", invoice.invoice_number, "text"),
      field("Outstanding Balance", "balance", money(invoice.balance), "text"),
      field("Payment Amount (₹)", "amount", "", "number", {
        required: true,
        min: "0.01",
        step: "0.01"
      }),
      field("Payment Date", "payment_date", TODAY(), "date", {
        required: true
      }),
      field("Payment Method", "payment_method", "cash", "select", {
        choices: [
          { value: "cash", label: "Cash" },
          { value: "upi", label: "UPI" },
          { value: "bank_transfer", label: "Bank Transfer" },
          { value: "card", label: "Card" },
          { value: "other", label: "Other" }
        ]
      }),
      field("Transaction Reference", "transaction_reference", ""),
      field("Notes", "notes", "", "textarea", {
        wide: true
      })
    );

    form.appendChild(grid);

    const save = addSubmit(form, "Record Payment");

    openModal("Record Invoice Payment", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const amount = number(formValue(form, "amount"));

      if (amount <= 0) {
        notify("Enter a valid payment amount.", "error");
        return;
      }

      if (amount > number(invoice.balance)) {
        if (!confirm(
          "This payment is greater than the displayed balance. Continue?"
        )) return;
      }

      save.disabled = true;

      const payload = {
        invoice_id: invoice.id,
        amount,
        payment_date: formValue(form, "payment_date"),
        payment_method: formValue(form, "payment_method"),
        transaction_reference: nullable(
          formValue(form, "transaction_reference")
        ),
        notes: nullable(formValue(form, "notes"))
      };

      const { data, error } = await db
        .from("payments")
        .insert(payload)
        .select("*")
        .single();

      save.disabled = false;

      if (error) {
        notify(error.message, "error");
        return;
      }

      await logActivity(
        "created",
        "payments",
        data.id,
        "Payment recorded: " + money(amount)
      );

      await createNotification(
        "Payment Received",
        money(amount) + " recorded for invoice #" + invoice.invoice_number,
        "success",
        "payments",
        data.id
      );

      closeModal();

      notify("Payment recorded. Updating invoice balance...", "success");

      await loadFinance();
      await loadDashboardCounts();
    });
  }

  async function loadPayments() {
    const target = $("financeTable");

    setLoading(target, "Loading payments...");

    const { data, error } = await db
      .from("payments")
      .select("*, invoices(invoice_number, customer_id)")
      .order("payment_date", { ascending: false })
      .limit(1000);

    if (error) {
      showError(target, error.message);
      return;
    }

    const rows = data || [];

    renderTable(
      target,
      [
        "Date",
        "Invoice",
        "Amount",
        "Method",
        "Reference",
        "Notes"
      ],
      rows.map((payment) => [
        DATE(payment.payment_date),
        payment.invoices?.invoice_number || payment.invoice_id,
        money(payment.amount),
        payment.payment_method,
        payment.transaction_reference,
        payment.notes
      ]),
      "No payments recorded."
    );
  }

  /* ==========================================================
     15. EXPENSE MANAGEMENT
  ========================================================== */

  function ensureExpenseInterface() {
    const section = $("expensesView");
    if (!section || $("expenseModule")) return;

    section.innerHTML = `
      <div class="section-card" id="expenseModule">
        <p class="eyebrow">COST CONTROL</p>
        <h3>Business Expenses</h3>

        <div class="velora-summary-grid">
          <div class="velora-summary">
            <small>Total Expenses</small>
            <strong id="expenseTotal">₹0</strong>
          </div>

          <div class="velora-summary">
            <small>This Month</small>
            <strong id="expenseMonthTotal">₹0</strong>
          </div>

          <div class="velora-summary">
            <small>Expense Records</small>
            <strong id="expenseCount">0</strong>
          </div>
        </div>

        <div id="expenseHeader"></div>
        <div id="expenseTable" class="table-wrap"></div>
      </div>
    `;
  }

  async function loadExpenses() {
    if (!requireOwner()) return;

    ensureExpenseInterface();

    setLoading($("expenseTable"));

    const [expensesResult, categoriesResult] = await Promise.all([
      db.from("expenses").select("*, expense_categories(name)")
        .order("expense_date", { ascending: false }),
      db.from("expense_categories").select("*")
        .order("name", { ascending: true })
    ]);

    if (expensesResult.error) {
      showError($("expenseTable"), expensesResult.error.message);
      return;
    }

    if (categoriesResult.error) {
      notify(categoriesResult.error.message, "error");
      return;
    }

    const expenses = expensesResult.data || [];

    expenseCategoriesCache = categoriesResult.data || [];

    const total = expenses.reduce(
      (sum, item) => sum + number(item.amount),
      0
    );

    const month = TODAY().slice(0, 7);

    const monthly = expenses
      .filter((item) => item.expense_date?.startsWith(month))
      .reduce((sum, item) => sum + number(item.amount), 0);

    setText("expenseTotal", money(total));
    setText("expenseMonthTotal", money(monthly));
    setText("expenseCount", expenses.length);

    $("expenseHeader").replaceChildren(
      makeModuleHeader(
        "Expense Records",
        "Track purchases, operating costs and vendor payments.",
        "+ Add Expense",
        () => openExpenseForm()
      )
    );

    const categoryButton = makeButton(
      "Manage Categories",
      "secondary-btn",
      openExpenseCategoryForm
    );

    $("expenseHeader").appendChild(categoryButton);

    renderTable(
      $("expenseTable"),
      [
        "Expense ID",
        "Date",
        "Title",
        "Category",
        "Vendor",
        "Amount",
        "Method",
        "Action"
      ],
      expenses.map((expense) => {
        const actions = actionRow();

        actions.append(
          makeButton(
            "Edit",
            "secondary-btn",
            () => openExpenseForm(expense)
          ),
          makeButton(
            "Delete",
            "secondary-btn",
            () => deleteExpense(expense)
          )
        );

        return [
          expense.expense_number,
          DATE(expense.expense_date),
          expense.title,
          expense.expense_categories?.name || "Uncategorized",
          expense.vendor_name,
          money(expense.amount),
          expense.payment_method,
          actions
        ];
      }),
      "No expenses recorded."
    );
  }

  function openExpenseForm(expense = null) {
    const form = document.createElement("form");
    form.className = "velora-form";

    const categoryChoices = [
      { value: "", label: "No category" },
      ...expenseCategoriesCache.map((category) => ({
        value: category.id,
        label: category.name
      }))
    ];

    const grid = formGrid();

    grid.append(
      field("Expense title", "title", expense?.title || "", "text", {
        required: true
      }),
      field("Amount (₹)", "amount", expense?.amount ?? "", "number", {
        required: true,
        min: "0.01",
        step: "0.01"
      }),
      field("Category", "category_id", expense?.category_id || "", "select", {
        choices: categoryChoices
      }),
      field("Expense date", "expense_date", expense?.expense_date || TODAY(), "date", {
        required: true
      }),
      field("Payment method", "payment_method", expense?.payment_method || "other", "select", {
        choices: [
          { value: "cash", label: "Cash" },
          { value: "upi", label: "UPI" },
          { value: "bank_transfer", label: "Bank Transfer" },
          { value: "card", label: "Card" },
          { value: "other", label: "Other" }
        ]
      }),
      field("Vendor name", "vendor_name", expense?.vendor_name || ""),
      field("Description", "description", expense?.description || "", "textarea", {
        wide: true
      }),
      field("Receipt URL", "receipt_url", expense?.receipt_url || "", "url"),
      field("Notes", "notes", expense?.notes || "", "textarea", {
        wide: true
      })
    );

    form.appendChild(grid);

    const save = addSubmit(
      form,
      expense ? "Update Expense" : "Save Expense"
    );

    openModal(
      expense ? "Edit Expense" : "Add Business Expense",
      form
    );

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      save.disabled = true;

      const payload = {
        title: formValue(form, "title"),
        amount: number(formValue(form, "amount")),
        category_id: nullable(formValue(form, "category_id")),
        expense_date: formValue(form, "expense_date"),
        payment_method: formValue(form, "payment_method"),
        vendor_name: nullable(formValue(form, "vendor_name")),
        description: nullable(formValue(form, "description")),
        receipt_url: nullable(formValue(form, "receipt_url")),
        notes: nullable(formValue(form, "notes"))
      };
             let result;

      if (expense) {
        result = await db
          .from("expenses")
          .update(payload)
          .eq("id", expense.id)
          .select("*")
          .single();
      } else {
        const { data: latest, error: latestError } = await db
          .from("expenses")
          .select("expense_number")
          .order("expense_number", { ascending: false })
          .limit(1);

        if (latestError) {
          save.disabled = false;
          notify(latestError.message, "error");
          return;
        }

        const nextNumber = latest?.length
          ? Number(latest[0].expense_number) + 1
          : 1001;

        result = await db
          .from("expenses")
          .insert({
            ...payload,
            expense_number: nextNumber
          })
          .select("*")
          .single();
      }

      save.disabled = false;

      if (result.error) {
        notify(result.error.message, "error");
        return;
      }

      await logActivity(
        expense ? "updated" : "created",
        "expenses",
        result.data.id,
        payload.title
      );

      closeModal();
      notify("Expense saved.", "success");

      await loadExpenses();
    });
  }

  function openExpenseCategoryForm() {
    const form = document.createElement("form");
    form.className = "velora-form";

    const grid = formGrid();

    grid.append(
      field("Category name", "name", "", "text", {
        required: true
      }),
      field("Description", "description", "", "textarea", {
        wide: true
      })
    );

    form.appendChild(grid);

    const save = addSubmit(form, "Create Category");

    const list = createElement("div", "customer-profile-section");
    list.innerHTML = "<h4>Existing Categories</h4>";

    const existing = createElement("div", "table-wrap");

    renderTable(
      existing,
      ["Category", "Description", "Created"],
      expenseCategoriesCache.map((category) => [
        category.name,
        category.description,
        DATE(category.created_at)
      ]),
      "No categories created."
    );

    list.appendChild(existing);
    form.appendChild(list);

    openModal("Expense Categories", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      save.disabled = true;

      const { error } = await db
        .from("expense_categories")
        .insert({
          name: formValue(form, "name"),
          description: nullable(formValue(form, "description"))
        });

      save.disabled = false;

      if (error) {
        notify(error.message, "error");
        return;
      }

      notify("Expense category created.", "success");
      closeModal();
      await loadExpenses();
    });
  }

  async function deleteExpense(expense) {
    if (!confirm("Delete this expense record?")) return;

    const { error } = await db
      .from("expenses")
      .delete()
      .eq("id", expense.id);

    if (error) {
      notify(error.message, "error");
      return;
    }

    await logActivity(
      "deleted",
      "expenses",
      expense.id,
      expense.title
    );

    notify("Expense deleted.", "success");
    await loadExpenses();
  }

  /* ==========================================================
     16. REMINDERS
  ========================================================== */

  function ensureReminderInterface() {
    const section = $("remindersView");
    if (!section || $("reminderModule")) return;

    section.innerHTML = `
      <div class="section-card" id="reminderModule">
        <p class="eyebrow">DAILY OPERATIONS</p>
        <h3>Tasks & Reminders</h3>

        <div class="velora-tabs">
          <button class="velora-tab active" data-reminder-tab="reminders">
            Business Reminders
          </button>

          <button class="velora-tab" data-reminder-tab="tasks">
            Project Tasks
          </button>
        </div>

        <div id="reminderHeader"></div>
        <div id="reminderTable" class="table-wrap"></div>
      </div>
    `;

    section.querySelectorAll("[data-reminder-tab]").forEach((button) => {
      button.addEventListener("click", () => {
        section.querySelectorAll("[data-reminder-tab]").forEach((item) => {
          item.classList.toggle(
            "active",
            item === button
          );
        });

        if (button.dataset.reminderTab === "tasks") {
          loadAllTasks();
        } else {
          loadReminders();
        }
      });
    });
  }

  async function loadReminders() {
    if (!requireOwner()) return;

    ensureReminderInterface();

    $("reminderHeader").replaceChildren(
      makeModuleHeader(
        "Business Reminders",
        "Track follow-ups, meetings and important dates.",
        "+ Add Reminder",
        openReminderForm
      )
    );

    setLoading($("reminderTable"));

    const { data, error } = await db
      .from("business_reminders")
      .select("*, customers(full_name), projects(project_name)")
      .order("reminder_at", { ascending: true });

    if (error) {
      showError($("reminderTable"), error.message);
      return;
    }

    renderTable(
      $("reminderTable"),
      [
        "Reminder",
        "Date & Time",
        "Priority",
        "Customer",
        "Project",
        "Status",
        "Action"
      ],
      (data || []).map((reminder) => {
        const actions = actionRow();

        actions.append(
          makeButton(
            reminder.status === "completed" ? "Completed" : "Complete",
            "secondary-btn",
            () => completeReminder(reminder)
          ),
          makeButton(
            "Delete",
            "secondary-btn",
            () => deleteReminder(reminder)
          )
        );

        return [
          reminder.title,
          DATETIME(reminder.reminder_at),
          reminder.priority,
          reminder.customers?.full_name,
          reminder.projects?.project_name,
          reminder.status,
          actions
        ];
      }),
      "No reminders found."
    );
  }

  function openReminderForm() {
    const form = document.createElement("form");
    form.className = "velora-form";

    const grid = formGrid();

    grid.append(
      field("Reminder title", "title", "", "text", {
        required: true
      }),
      field("Reminder date and time", "reminder_at", "", "datetime-local", {
        required: true
      }),
      field("Priority", "priority", "medium", "select", {
        choices: [
          { value: "low", label: "Low" },
          { value: "medium", label: "Medium" },
          { value: "high", label: "High" }
        ]
      }),
      field("Customer", "customer_id", "", "select", {
        choices: [
          { value: "", label: "No customer" },
          ...customerOptions()
        ]
      }),
      field("Project", "project_id", "", "select", {
        choices: [
          { value: "", label: "No project" },
          ...projectsCache.map((project) => ({
            value: project.id,
            label: project.project_name
          }))
        ]
      }),
      field("Description", "description", "", "textarea", {
        wide: true
      })
    );

    form.appendChild(grid);
    const save = addSubmit(form, "Save Reminder");

    openModal("Create Business Reminder", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      save.disabled = true;

      const reminderDate = new Date(
        formValue(form, "reminder_at")
      );

      if (Number.isNaN(reminderDate.getTime())) {
        save.disabled = false;
        notify("Enter a valid reminder date.", "error");
        return;
      }

      const payload = {
        title: formValue(form, "title"),
        description: nullable(formValue(form, "description")),
        reminder_at: reminderDate.toISOString(),
        priority: formValue(form, "priority"),
        status: "pending",
        customer_id: nullable(formValue(form, "customer_id")),
        project_id: nullable(formValue(form, "project_id"))
      };

      const { data, error } = await db
        .from("business_reminders")
        .insert(payload)
        .select("*")
        .single();

      save.disabled = false;

      if (error) {
        notify(error.message, "error");
        return;
      }

      await logActivity(
        "created",
        "business_reminders",
        data.id,
        payload.title
      );

      closeModal();
      notify("Reminder saved.", "success");

      await loadReminders();
    });
  }

  async function completeReminder(reminder) {
    const completed = reminder.status !== "completed";

    const { error } = await db
      .from("business_reminders")
      .update({
        status: completed ? "completed" : "pending",
        completed_at: completed ? new Date().toISOString() : null
      })
      .eq("id", reminder.id);

    if (error) {
      notify(error.message, "error");
      return;
    }

    notify(
      completed ? "Reminder completed." : "Reminder reopened.",
      "success"
    );

    await loadReminders();
  }

  async function deleteReminder(reminder) {
    if (!confirm("Delete this reminder?")) return;

    const { error } = await db
      .from("business_reminders")
      .delete()
      .eq("id", reminder.id);

    if (error) {
      notify(error.message, "error");
      return;
    }

    notify("Reminder deleted.", "success");
    await loadReminders();
  }

  async function loadAllTasks() {
    $("reminderHeader").replaceChildren(
      makeModuleHeader(
        "Project Tasks",
        "All tasks across your projects.",
        "+ New Task",
        () => openTaskForm("")
      )
    );

    setLoading($("reminderTable"));

    const { data, error } = await db
      .from("project_tasks")
      .select("*, projects(project_name)")
      .order("due_date", { ascending: true });

    if (error) {
      showError($("reminderTable"), error.message);
      return;
    }

    renderTable(
      $("reminderTable"),
      ["Task", "Project", "Priority", "Status", "Due Date", "Action"],
      (data || []).map((task) => {
        const actions = actionRow();

        actions.append(
          makeButton(
            "Update Status",
            "secondary-btn",
            () => updateTaskStatus(task)
          ),
          makeButton(
            "Delete",
            "secondary-btn",
            () => deleteTask(task)
          )
        );

        return [
          task.title,
          task.projects?.project_name,
          task.priority,
          task.status,
          DATE(task.due_date),
          actions
        ];
      }),
      "No tasks found."
    );
  }

  /* ==========================================================
     17. COMMUNICATION LOGS
  ========================================================== */

  function ensureCommunicationInterface() {
    const section = $("appView");
    if (!section || $("communicationView")) return;

    const main = document.querySelector(".main-area");

    const view = document.createElement("section");
    view.id = "communicationView";
    view.className = "view-section";
    view.hidden = true;

    view.innerHTML = `
      <div class="section-card">
        <p class="eyebrow">CLIENT COMMUNICATION</p>
        <h3>Communication History</h3>
        <p class="muted">
          Record calls, WhatsApp messages, emails and other conversations.
        </p>

        <div id="communicationHeader"></div>
        <div id="communicationTable" class="table-wrap"></div>
      </div>
    `;

    main.insertBefore(view, document.querySelector(".app-footer"));

    const sidebar = document.querySelector(".sidebar");

    const nav = makeButton(
      "Communication",
      "nav-item",
      () => activateExtraView("communication")
    );

    nav.dataset.extraView = "communication";
    sidebar.insertBefore(nav, document.querySelector(".sidebar-bottom"));
  }

  function activateExtraView(view) {
    document.querySelectorAll(".view-section").forEach((section) => {
      section.hidden = section.id !== view + "View";
    });

    document.querySelectorAll(".nav-item").forEach((button) => {
      button.classList.toggle(
                 "active",
        button.dataset.extraView === view
      );
    });

    setText("pageTitle", "Communication");

    if (view === "communication") loadCommunications();
    if (view === "templates") loadTemplates();
    if (view === "notifications") loadNotifications();
    if (view === "documents") loadDocuments();
    if (view === "activity") loadActivityLogs();
  }

  async function loadCommunications() {
    if (!requireOwner()) return;

    $("communicationHeader").replaceChildren(
      makeModuleHeader(
        "Communication Records",
        "Maintain customer communication history.",
        "+ Log Communication",
        openCommunicationForm
      )
    );

    setLoading($("communicationTable"));

    const { data, error } = await db
      .from("communication_logs")
      .select("*, customers(full_name), projects(project_name)")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      showError($("communicationTable"), error.message);
      return;
    }

    renderTable(
      $("communicationTable"),
      [
        "Date",
        "Customer",
        "Channel",
        "Direction",
        "Subject",
        "Recipient",
        "Status"
      ],
      (data || []).map((item) => [
        DATETIME(item.created_at),
        item.customers?.full_name,
        item.channel,
        item.direction,
        item.subject,
        item.recipient,
        item.status
      ]),
      "No communication records found."
    );
  }

  function openCommunicationForm() {
    const form = document.createElement("form");
    form.className = "velora-form";

    const grid = formGrid();

    grid.append(
      field("Customer", "customer_id", "", "select", {
        choices: [
          { value: "", label: "No customer selected" },
          ...customerOptions()
        ]
      }),
      field("Project", "project_id", "", "select", {
        choices: [
          { value: "", label: "No project selected" },
          ...projectsCache.map((project) => ({
            value: project.id,
            label: project.project_name
          }))
        ]
      }),
      field("Channel", "channel", "whatsapp", "select", {
        choices: [
          { value: "whatsapp", label: "WhatsApp" },
          { value: "phone", label: "Phone Call" },
          { value: "email", label: "Email" },
          { value: "meeting", label: "Meeting" },
          { value: "other", label: "Other" }
        ]
      }),
      field("Direction", "direction", "outgoing", "select", {
        choices: [
          { value: "outgoing", label: "Outgoing" },
          { value: "incoming", label: "Incoming" }
        ]
      }),
      field("Subject", "subject", ""),
      field("Recipient", "recipient", ""),
      field("Status", "status", "logged"),
      field("Message", "message", "", "textarea", {
        wide: true
      })
    );

    form.appendChild(grid);
    const save = addSubmit(form, "Save Communication Record");

    openModal("Log Communication", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      save.disabled = true;

      const payload = {
        customer_id: nullable(formValue(form, "customer_id")),
        project_id: nullable(formValue(form, "project_id")),
        channel: formValue(form, "channel"),
        direction: formValue(form, "direction"),
        subject: nullable(formValue(form, "subject")),
        recipient: nullable(formValue(form, "recipient")),
        status: formValue(form, "status"),
        message: nullable(formValue(form, "message"))
      };

      const { data, error } = await db
        .from("communication_logs")
        .insert(payload)
        .select("*")
        .single();

      save.disabled = false;

      if (error) {
        notify(error.message, "error");
        return;
      }

      await logActivity(
        "created",
        "communication_logs",
        data.id,
        payload.channel + " communication logged"
      );

      closeModal();
      notify("Communication saved.", "success");

      await loadCommunications();
    });
  }

  /* ==========================================================
     18. MESSAGE TEMPLATES
  ========================================================== */

  function ensureTemplateInterface() {
    if ($("templatesView")) return;

    const main = document.querySelector(".main-area");

    const view = document.createElement("section");
    view.id = "templatesView";
    view.className = "view-section";
    view.hidden = true;

    view.innerHTML = `
      <div class="section-card">
        <p class="eyebrow">MESSAGING</p>
        <h3>Message Templates</h3>
        <p class="muted">
          Manage reusable WhatsApp and email message templates.
        </p>

        <div id="templatesHeader"></div>
        <div id="templatesTable" class="table-wrap"></div>
      </div>
    `;

    main.insertBefore(view, document.querySelector(".app-footer"));

    const nav = makeButton(
      "Message Templates",
      "nav-item",
      () => activateExtraView("templates")
    );

    nav.dataset.extraView = "templates";

    document.querySelector(".sidebar").insertBefore(
      nav,
      document.querySelector(".sidebar-bottom")
    );
  }

  async function loadTemplates() {
    if (!requireOwner()) return;

    ensureTemplateInterface();

    $("templatesHeader").replaceChildren(
      makeModuleHeader(
        "Message Templates",
        "Edit and reuse saved customer messages.",
        "+ New Template",
        () => openTemplateForm()
      )
    );

    setLoading($("templatesTable"));

    const { data, error } = await db
      .from("message_templates")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      showError($("templatesTable"), error.message);
      return;
    }

    renderTable(
      $("templatesTable"),
      ["Template", "Category", "Channel", "Active", "Action"],
      (data || []).map((template) => {
        const actions = actionRow();

        actions.append(
          makeButton(
            "Edit",
            "secondary-btn",
            () => openTemplateForm(template)
          ),
          makeButton(
            "Use",
            "secondary-btn",
            () => useTemplate(template)
          ),
          makeButton(
            "Delete",
            "secondary-btn",
            () => deleteTemplate(template)
          )
        );

        return [
          template.template_name,
          template.category,
          template.channel,
          template.is_active ? "Yes" : "No",
          actions
        ];
      }),
      "No message templates found."
    );
  }

  function openTemplateForm(template = null) {
    const form = document.createElement("form");
    form.className = "velora-form";

    const grid = formGrid();

    grid.append(
      field("Template name", "template_name", template?.template_name || "", "text", {
        required: true
      }),
      field("Category", "category", template?.category || "general"),
      field("Channel", "channel", template?.channel || "whatsapp", "select", {
        choices: [
          { value: "whatsapp", label: "WhatsApp" },
          { value: "email", label: "Email" },
          { value: "sms", label: "SMS" }
        ]
      }),
      field("Subject", "subject", template?.subject || ""),
      field("Message", "message", template?.message || "", "textarea", {
        wide: true,
        required: true
      }),
      field("Active", "is_active", template?.is_active ?? true, "checkbox")
    );

    form.appendChild(grid);

    form.appendChild(
      createElement(
        "p",
        "velora-inline-note",
        "Supported placeholders can include {{customer_name}}, {{service}}, {{invoice_id}}, {{total}}, {{due_date}}, {{balance}}, {{project_name}}, {{progress}} and {{quote_id}}."
      )
    );

    const save = addSubmit(
      form,
      template ? "Update Template" : "Create Template"
    );

    openModal("Message Template", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      save.disabled = true;

      const payload = {
        template_name: formValue(form, "template_name"),
        category: formValue(form, "category"),
        channel: formValue(form, "channel"),
        subject: nullable(formValue(form, "subject")),
        message: formValue(form, "message"),
        is_active: form.elements.is_active.checked
      };

      const result = template
        ? await db.from("message_templates")
            .update(payload)
            .eq("id", template.id)
        : await db.from("message_templates").insert(payload);

      save.disabled = false;

      if (result.error) {
        notify(result.error.message, "error");
        return;
      }

      closeModal();
      notify("Message template saved.", "success");

      await loadTemplates();
    });
  }

  function useTemplate(template) {
    const wrapper = document.createElement("div");

    const message = document.createElement("textarea");
    message.value = template.message;
    message.style.width = "100%";
    message.style.minHeight = "200px";

    const subject = document.createElement("input");
    subject.value = template.subject || "";
    subject.placeholder = "Subject";
    subject.style.width = "100%";

    const buttons = actionRow();

    buttons.append(
      makeButton(
        "Copy Message",
        "primary-btn",
        async () => {
          try {
            await navigator.clipboard.writeText(message.value);
            notify("Message copied.", "success");
          } catch {
            message.select();
            notify("Select and copy the message manually.");
          }
        }
      ),
      makeButton(
        "Open WhatsApp",
        "secondary-btn",
        () => {
          const url =
            "https://wa.me/?text=" +
            encodeURIComponent(message.value);

          window.open(url, "_blank", "noopener");
        }
      )
    );

    wrapper.append(subject, message, buttons);

    openModal("Use Message Template", wrapper);
  }

  async function deleteTemplate(template) {
    if (!confirm("Delete this template?")) return;

    const { error } = await db
      .from("message_templates")
      .delete()
      .eq("id", template.id);

    if (error) {
      notify(error.message, "error");
      return;
    }

    notify("Template deleted.", "success");
    await loadTemplates();
  }

  /* ==========================================================
     19. NOTIFICATIONS
  ========================================================== */

  function ensureNotificationInterface() {
    if ($("notificationsView")) return;

    const main = document.querySelector(".main-area");

    const view = document.createElement("section");
    view.id = "notificationsView";
    view.className = "view-section";
    view.hidden = true;

    view.innerHTML = `
      <div class="section-card">
        <p class="eyebrow">WORKSPACE ALERTS</p>
        <h3>Notifications</h3>

        <div id="notificationsHeader"></div>
        <div id="notificationsTable" class="table-wrap"></div>
      </div>
    `;

    main.insertBefore(view, document.querySelector(".app-footer"));

    const nav = makeButton(
      "Notifications",
      "nav-item",
      () => activateExtraView("notifications")
    );

    nav.dataset.extraView = "notifications";

    document.querySelector(".sidebar").insertBefore(
      nav,
      document.querySelector(".sidebar-bottom")
    );
  }

  async function loadNotifications() {
    if (!requireOwner()) return;

    ensureNotificationInterface();

    $("notificationsHeader").replaceChildren(
      makeModuleHeader(
        "Workspace Notifications",
        "Review and manage your business alerts.",
        "+ New Notification",
        openNotificationForm
      )
    );

    const markAll = makeButton(
      "Mark All as Read",
      "secondary-btn",
      markAllNotificationsRead
    );

    $("notificationsHeader").appendChild(markAll);

    setLoading($("notificationsTable"));

    const { data, error } = await db
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      showError($("notificationsTable"), error.message);
      return;
    }

    renderTable(
      $("notificationsTable"),
      ["Title", "Message", "Type", "Module", "Date", "Read", "Action"],
      (data || []).map((item) => {
        const actions = actionRow();

        if (!item.is_read) {
          actions.appendChild(
            makeButton(
              "Mark Read",
              "secondary-btn",
              () => markNotificationRead(item.id)
            )
          );
        }

        actions.appendChild(
          makeButton(
            "Delete",
            "secondary-btn",
            () => deleteNotification(item.id)
          )
        );
                 return [
          item.title,
          item.message,
          item.notification_type,
          item.related_module,
          DATETIME(item.created_at),
          item.is_read ? "Read" : "Unread",
          actions
        ];
      }),
      "No notifications."
    );
  }

  function openNotificationForm() {
    const form = document.createElement("form");
    form.className = "velora-form";

    const grid = formGrid();

    grid.append(
      field("Title", "title", "", "text", { required: true }),
      field("Type", "notification_type", "info", "select", {
        choices: [
          { value: "info", label: "Information" },
          { value: "success", label: "Success" },
          { value: "warning", label: "Warning" },
          { value: "error", label: "Error" }
        ]
      }),
      field("Related Module", "related_module", ""),
      field("Message", "message", "", "textarea", {
        wide: true
      })
    );

    form.appendChild(grid);
    const save = addSubmit(form, "Create Notification");

    openModal("New Notification", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      save.disabled = true;

      const { error } = await db
        .from("notifications")
        .insert({
          title: formValue(form, "title"),
          message: nullable(formValue(form, "message")),
          notification_type: formValue(form, "notification_type"),
          related_module: nullable(formValue(form, "related_module")),
          is_read: false
        });

      save.disabled = false;

      if (error) {
        notify(error.message, "error");
        return;
      }

      closeModal();
      notify("Notification created.", "success");

      await loadNotifications();
    });
  }

  async function markNotificationRead(id) {
    const { error } = await db
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) {
      notify(error.message, "error");
      return;
    }

    await loadNotifications();
  }

  async function markAllNotificationsRead() {
    const { error } = await db
      .from("notifications")
      .update({ is_read: true })
      .eq("is_read", false);

    if (error) {
      notify(error.message, "error");
      return;
    }

    notify("All notifications marked as read.", "success");
    await loadNotifications();
  }

  async function deleteNotification(id) {
    if (!confirm("Delete this notification?")) return;

    const { error } = await db
      .from("notifications")
      .delete()
      .eq("id", id);

    if (error) {
      notify(error.message, "error");
      return;
    }

    await loadNotifications();
  }

  /* ==========================================================
     20. PRIVATE DOCUMENTS
  ========================================================== */

  function ensureDocumentInterface() {
    if ($("documentsView")) return;

    const main = document.querySelector(".main-area");

    const view = document.createElement("section");
    view.id = "documentsView";
    view.className = "view-section";
    view.hidden = true;

    view.innerHTML = `
      <div class="section-card">
        <p class="eyebrow">FILE MANAGEMENT</p>
        <h3>Business Documents</h3>

        <p class="muted">
          Upload and access private business documents.
        </p>

        <div id="documentsHeader"></div>
        <div id="documentsTable" class="table-wrap"></div>
      </div>
    `;

    main.insertBefore(view, document.querySelector(".app-footer"));

    const nav = makeButton(
      "Documents",
      "nav-item",
      () => activateExtraView("documents")
    );

    nav.dataset.extraView = "documents";

    document.querySelector(".sidebar").insertBefore(
      nav,
      document.querySelector(".sidebar-bottom")
    );
  }

  async function loadDocuments() {
    if (!requireOwner()) return;

    ensureDocumentInterface();

    $("documentsHeader").replaceChildren(
      makeModuleHeader(
        "Private Documents",
        "Upload files to your private Supabase storage bucket.",
        "+ Upload Document",
        openDocumentUpload
      )
    );

    const { data, error } = await db.storage
      .from(STORAGE_BUCKET)
      .list("", {
        limit: 200,
        sortBy: { column: "created_at", order: "desc" }
      });

    if (error) {
      showError(
        $("documentsTable"),
        "Storage error: " + error.message
      );
      return;
    }

    renderTable(
      $("documentsTable"),
      ["File", "Size", "Uploaded", "Action"],
      (data || []).filter((item) => item.name).map((item) => {
        const actions = actionRow();

        actions.append(
          makeButton(
            "Open",
            "secondary-btn",
            () => openStoredDocument(item.name)
          ),
          makeButton(
            "Delete",
            "secondary-btn",
            () => deleteStoredDocument(item.name)
          )
        );

        return [
          item.name,
          item.metadata?.size
            ? (item.metadata.size / 1024).toFixed(1) + " KB"
            : "—",
          DATE(item.created_at),
          actions
        ];
      }),
      "No documents uploaded."
    );
  }

  function openDocumentUpload() {
    const form = document.createElement("form");
    form.className = "velora-form";

    const file = document.createElement("input");
    file.type = "file";
    file.required = true;

    file.accept =
      ".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.csv,.txt";

    const label = createElement("label");
    label.textContent = "Select document";
    label.appendChild(file);

    const note = createElement(
      "p",
      "velora-inline-note",
      "Maximum file size: 20 MB. Your private storage bucket controls access."
    );

    form.append(label, note);

    const save = addSubmit(form, "Upload File");

    openModal("Upload Business Document", form);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const selected = file.files?.[0];

      if (!selected) return;

      if (selected.size > 20 * 1024 * 1024) {
        notify("File exceeds the 20 MB limit.", "error");
        return;
      }

      save.disabled = true;
      save.textContent = "Uploading...";

      const path =
        Date.now() + "_" + safeFilename(selected.name);

      const { error } = await db.storage
        .from(STORAGE_BUCKET)
        .upload(path, selected, {
          upsert: false,
          contentType: selected.type || undefined
        });

      save.disabled = false;
      save.textContent = "Upload File";

      if (error) {
        notify(error.message, "error");
        return;
      }

      await logActivity(
        "uploaded",
        "documents",
        null,
        selected.name,
        { storage_path: path }
      );

      closeModal();
      notify("Document uploaded successfully.", "success");

      await loadDocuments();
    });
  }

  async function openStoredDocument(path) {
    const { data, error } = await db.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 60);

    if (error) {
      notify(error.message, "error");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener");
  }

  async function deleteStoredDocument(path) {
    if (!confirm("Permanently delete this document?")) return;

    const { error } = await db.storage
      .from(STORAGE_BUCKET)
      .remove([path]);

    if (error) {
      notify(error.message, "error");
      return;
    }

    await logActivity(
      "deleted",
      "documents",
      null,
      path
    );

    notify("Document deleted.", "success");
    await loadDocuments();
  }

  /* ==========================================================
     21. ACTIVITY LOGS
  ========================================================== */

  function ensureActivityInterface() {
    if ($("activityView")) return;

    const main = document.querySelector(".main-area");

    const view = document.createElement("section");
    view.id = "activityView";
    view.className = "view-section";
    view.hidden = true;

    view.innerHTML = `
      <div class="section-card">
        <p class="eyebrow">AUDIT TRAIL</p>
        <h3>Activity Logs</h3>
        <p class="muted">
          Review recorded changes made in the owner dashboard.
        </p>

        <div id="activityTable" class="table-wrap"></div>
      </div>
    `;

    main.insertBefore(view, document.querySelector(".app-footer"));

    const nav = makeButton(
      "Activity Logs",
      "nav-item",
      () => activateExtraView("activity")
    );

    nav.dataset.extraView = "activity";

    document.querySelector(".sidebar").insertBefore(
      nav,
      document.querySelector(".sidebar-bottom")
    );
  }

  async function loadActivityLogs() {
    if (!requireOwner()) return;

    ensureActivityInterface();

    setLoading($("activityTable"));

    const { data, error } = await db
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      showError($("activityTable"), error.message);
      return;
    }

    renderTable(
      $("activityTable"),
      ["Date", "Action", "Module", "Description", "Record ID"],
      (data || []).map((item) => [
        DATETIME(item.created_at),
        item.action,
        item.module,
        item.description,
        item.record_id
      ]),
      "No activity logs found."
    );
  }

  /* ==========================================================
     22. DASHBOARD COUNTS AND OVERVIEW
  ========================================================== */

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

    setText("statEnquiries", enquiries);
    setText("statCustomers", customers);
    setText("statProjects", projects);
    setText("statInvoices", invoices);

    setText("enquiryNavCount", enquiries);
  }

  async function loadDashboard() {
    if (!requireOwner()) return;

    await loadDashboardCounts();
    await loadEnquiries();

    await loadOverviewFinancialStats();
    await loadUpcomingReminders();
  }

  async function loadOverviewFinancialStats() {
    const { data: invoices, error } = await db
      .from("invoices")
      .select("total, amount_paid, balance");

    if (error) {
      console.warn("Overview financial stats:", error.message);
      return;
    }

    const total = (invoices || []).reduce(
      (sum, item) => sum + number(item.total),
      0
    );

    const paid = (invoices || []).reduce(
      (sum, item) => sum + number(item.amount_paid),
      0
    );

    const balance = (invoices || []).reduce(
      (sum, item) => sum + number(item.balance),
      0
    );

    let container = $("overviewFinancialStats");

    if (!container) {
      container = createElement("div", "section-card");
      container.id = "overviewFinancialStats";

      const overview = $("overviewView");

      if (overview) overview.appendChild(container);
    }

    container.innerHTML = `
      <p class="eyebrow">FINANCIAL OVERVIEW</p>
      <h3>Business Revenue</h3>

      <div class="velora-summary-grid">
        <div class="velora-summary">
          <small>Invoice Value</small>
          <strong>${escapeHTML(money(total))}</strong>
        </div>

        <div class="velora-summary">
          <small>Payments Received</small>
          <strong>${escapeHTML(money(paid))}</strong>
        </div>

        <div class="velora-summary">
          <small>Outstanding</small>
          <strong>${escapeHTML(money(balance))}</strong>
        </div>
      </div>
    `;
  }
     async function loadUpcomingReminders() {
    const { data, error } = await db
      .from("business_reminders")
      .select("*")
      .eq("status", "pending")
      .order("reminder_at", { ascending: true })
      .limit(5);

    if (error) {
      console.warn("Reminder overview:", error.message);
      return;
    }

    let container = $("overviewReminders");

    if (!container) {
      container = createElement("div", "section-card");
      container.id = "overviewReminders";

      $("overviewView")?.appendChild(container);
    }

    container.replaceChildren(
      createElement("p", "eyebrow", "UPCOMING"),
      createElement("h3", "", "Upcoming Reminders")
    );

    if (!data?.length) {
      container.appendChild(
        createElement("p", "muted", "No pending reminders.")
      );
      return;
    }

    data.forEach((reminder) => {
      const item = createElement("div", "customer-profile-section");

      item.append(
        createElement("strong", "", reminder.title),
        createElement("p", "muted", DATETIME(reminder.reminder_at)),
        createElement("small", "muted", "Priority: " + reminder.priority)
      );

      container.appendChild(item);
    });
  }

  /* ==========================================================
     23. REFRESH ALL MODULES
  ========================================================== */

  async function refreshWorkspace() {
    if (!requireOwner()) return;

    notify("Refreshing workspace...");

    await Promise.all([
      loadDashboardCounts(),
      loadEnquiries(),
      loadCustomers(),
      loadProjects(),
      loadFinance(),
      loadExpenses(),
      loadReminders()
    ]);

    notify("Workspace refreshed.", "success");
  }

  /* ==========================================================
     24. OPTIONAL GLOBAL SEARCH
  ========================================================== */

  function ensureGlobalSearch() {
    const topbar = document.querySelector(".topbar");

    if (!topbar || $("veloraGlobalSearch")) return;

    const search = document.createElement("input");

    search.id = "veloraGlobalSearch";
    search.type = "search";
    search.placeholder = "Search customers or projects...";
    search.setAttribute("aria-label", "Search workspace");

    Object.assign(search.style, {
      maxWidth: "260px",
      padding: "10px 12px",
      borderRadius: "9px",
      background: "#0c0b15",
      color: "#fff",
      border: "1px solid rgba(255,255,255,.14)"
    });

    search.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;

      const value = search.value.trim().toLowerCase();

      if (!value) return;

      const customerMatch = customersCache.find((customer) =>
        [
          customer.full_name,
          customer.phone,
          customer.email,
          customer.customer_number
        ].join(" ").toLowerCase().includes(value)
      );

      if (customerMatch) {
        activateView("customers");
        openCustomerProfile(customerMatch.id);
        return;
      }

      const projectMatch = projectsCache.find((project) =>
        project.project_name.toLowerCase().includes(value)
      );

      if (projectMatch) {
        activateView("projects");
        openProjectDetails(projectMatch.id);
        return;
      }

      notify("No matching customer or project found.");
    });

    topbar.appendChild(search);
  }

  /* ==========================================================
     25. SIDEBAR EXTRA MODULES
  ========================================================== */

  function setupExtraNavigation() {
    ensureCommunicationInterface();
    ensureTemplateInterface();
    ensureNotificationInterface();
    ensureDocumentInterface();
    ensureActivityInterface();
  }

  /* ==========================================================
     26. INITIALIZE WORKSPACE
  ========================================================== */

  async function initializeWorkspace() {
    installStyles();

    setupCustomerInterface();
    ensureProjectInterface();
    ensureFinanceInterface();
    ensureExpenseInterface();
    ensureReminderInterface();

    setupExtraNavigation();
    ensureGlobalSearch();

    await Promise.all([
      loadCustomers(),
      loadProjects()
    ]);

    await loadDashboard();

    activateView("overview");
  }

  /* ==========================================================
     27. AUTH SESSION RESTORE
  ========================================================== */

  db.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      currentUser = null;
      currentProfile = null;
      showLogin();
    }

    if (event === "TOKEN_REFRESHED" && session?.user) {
      currentUser = session.user;
    }
  });

  async function initializeDashboard() {
    try {
      const { data, error } = await db.auth.getSession();

      if (error) {
        showLogin(error.message);
        return;
      }

      if (data.session?.user) {
        await verifyOwner(data.session.user);
      } else {
        showLogin();
      }

    } catch (error) {
      console.error("Dashboard initialization failed:", error);
      showLogin("Unable to initialize the dashboard.");
    }
  }

  initializeDashboard();

  /* ==========================================================
     28. GLOBAL REFRESH SHORTCUT
  ========================================================== */

  document.addEventListener("keydown", (event) => {
    if (
      event.ctrlKey &&
      event.shiftKey &&
      event.key.toLowerCase() === "r"
    ) {
      event.preventDefault();
      refreshWorkspace();
    }
  });

});
