
document.addEventListener("DOMContentLoaded", () => {

  /* =========================================
     VELORA DIGITAL BUSINESS OS
     SUPABASE CONFIGURATION
  ========================================= */

  const OWNER_ID = "2137a1e3-f59a-4afb-bbb3-a148b7b6df60";

  const $ = (id) => document.getElementById(id);

  const loginView = $("loginView");
  const appView = $("appView");
  const loginForm = $("loginForm");
  const loginMessage = $("loginMessage");

  let client = null;
  let currentUser = null;


  /* =========================================
     CHECK SUPABASE CONFIGURATION
  ========================================= */

  if (
    !window.supabase ||
    !window.VELORA_SUPABASE_URL ||
    !window.VELORA_SUPABASE_KEY
  ) {

    loginMessage.textContent =
      "Supabase configuration is missing. Please check supabase-config.js.";

    $("loginButton").disabled = true;

    console.error("VELORA Supabase configuration is missing.");

    return;
  }


  client = window.supabase.createClient(
    window.VELORA_SUPABASE_URL,
    window.VELORA_SUPABASE_KEY
  );


  /* =========================================
     LOGIN AND DASHBOARD DISPLAY
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


  /* =========================================
     VERIFY OWNER ACCESS
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

      showLogin(
        "Owner access is required for this dashboard."
      );

      return false;
    }


    currentUser = user;

    showApp(profile.full_name || user.email);

    await loadDashboard();

    return true;

  }


  /* =========================================
     OWNER LOGIN
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
     DATABASE COUNT FUNCTION
  ========================================= */

  async function countRows(table) {

    const { count, error } = await client
      .from(table)
      .select("*", {
        count: "exact",
        head: true
      });


    if (error) {

      console.warn(
        "Could not count " + table + ":",
        error.message
      );

      return "—";
    }


    return count ?? 0;

  }


  /* =========================================
     DASHBOARD STATISTICS
  ========================================= */

  async function loadDashboard() {

    if (!currentUser) return;


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


    await loadEnquiries();

  }


  /* =========================================
     SAFE TEXT DISPLAY
  ========================================= */

  function safeCell(value) {

    const span = document.createElement("span");

    span.textContent =
      value === null || value === undefined || value === ""
        ? "—"
        : String(value);

    return span;

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
          "Received"
        ];


    const thead = document.createElement("thead");

    const headerRow = document.createElement("tr");


    headers.forEach(label => {

      const th = document.createElement("th");

      th.textContent = label;

      headerRow.appendChild(th);

    });


    thead.appendChild(headerRow);

    table.appendChild(thead);


    const tbody = document.createElement("tbody");


    rows.forEach(row => {

      const tr = document.createElement("tr");


      const values = compact
        ? [
            row.customer_name,
            row.service,
            row.created_at
              ? new Date(row.created_at).toLocaleDateString()
              : "—"
          ]
        : [
            row.customer_name,
            row.phone + (row.email ? " · " + row.email : ""),
            row.service,
            row.budget,
            "",
            row.created_at
              ? new Date(row.created_at).toLocaleString()
              : "—"
          ];


      values.forEach((value, index) => {

        const td = document.createElement("td");


        /* STATUS DROPDOWN */

        if (!compact && index === 4) {

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


          statuses.forEach(status => {

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
              .update({
                status: select.value
              })
              .eq("id", row.id);


            select.disabled = false;


            if (error) {

              console.error("Status update failed:", error);

              select.value = previousStatus;

              alert(
                "Could not update enquiry status: " + error.message
              );

              return;
            }


            row.status = select.value;

          });


          td.appendChild(select);

        } else {

          td.appendChild(safeCell(value));

        }


        tr.appendChild(td);

      });


      tbody.appendChild(tr);

    });


    table.appendChild(tbody);

    target.replaceChildren(table);

  }


  /* =========================================
     LOAD ENQUIRIES FROM SUPABASE
  ========================================= */

  async function loadEnquiries() {

    if (!currentUser) return;


    $("recentEnquiries").textContent =
      "Loading enquiries...";

    $("allEnquiries").textContent =
      "Loading enquiries...";


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
        created_at
      `)
      .order("created_at", {
        ascending: false
      })
      .limit(100);


    if (error) {

      console.error("Could not load enquiries:", error);

      $("recentEnquiries").textContent =
        "Unable to load enquiries: " + error.message;

      $("allEnquiries").textContent =
        "Unable to load enquiries: " + error.message;

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
     SIDEBAR NAVIGATION
  ========================================= */

  function activateView(view) {

    document.querySelectorAll(".view-section").forEach(section => {

      section.hidden =
        section.id !== view + "View";

    });


    document.querySelectorAll(".nav-item").forEach(button => {

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


    $("pageTitle").textContent =
      labels[view] || "Overview";


    if (view === "enquiries") {

      loadEnquiries();

    }

  }


  document.querySelectorAll(".nav-item[data-view]").forEach(button => {

    button.addEventListener("click", () => {

      activateView(button.dataset.view);

    });

  });


  document.querySelectorAll("[data-open-view]").forEach(button => {

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
     CHECK EXISTING LOGIN SESSION
  ========================================= */

  async function initializeDashboard() {

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


  /* =========================================
     AUTHENTICATION STATE
  ========================================= */

  client.auth.onAuthStateChange((event) => {

    if (event === "SIGNED_OUT") {

      currentUser = null;

      showLogin();

    }

  });


  /* =========================================
     START APPLICATION
  ========================================= */

  initializeDashboard();

});
