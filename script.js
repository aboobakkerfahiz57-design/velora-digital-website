
document.addEventListener("DOMContentLoaded", () => {

  /* =========================================
     SUPABASE INITIALIZATION
  ========================================= */

  let supabaseClient = null;

  if (
    window.supabase &&
    window.VELORA_SUPABASE_URL &&
    window.VELORA_SUPABASE_KEY
  ) {
    supabaseClient = window.supabase.createClient(
      window.VELORA_SUPABASE_URL,
      window.VELORA_SUPABASE_KEY
    );
  } else {
    console.error("VELORA Supabase configuration is missing.");
  }


  /* =========================================
     SMOOTH NAVIGATION
  ========================================= */

  document.querySelectorAll('a[href^="#"]').forEach(link => {

    link.addEventListener("click", function (e) {

      const targetId = this.getAttribute("href");

      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);

      if (target) {
        e.preventDefault();

        target.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }

    });

  });


  /* =========================================
     MOBILE MENU
  ========================================= */

  const menuButton = document.querySelector(".menu-toggle");
  const navLinks = document.querySelector(".nav-links");

  if (menuButton && navLinks) {

    menuButton.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });

    navLinks.querySelectorAll("a").forEach(link => {

      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
      });

    });

  }


  /* =========================================
     PROJECT DATA
  ========================================= */

  const projects = {

    jewels: {
      title: "THE JEWELS",
      category: "JEWELLERY WEBSITE",
      description:
        "A premium jewellery website concept designed to showcase collections, build trust and create a luxury online shopping experience.",
      image: "jewels-demo.jpg"
    },

    tbd: {
      title: "TBD GROUP",
      category: "CORPORATE WEBSITE",
      description:
        "A premium corporate digital presence for a modern business group covering construction, interiors, real estate and business solutions.",
      image: "tbd-demo.jpg"
    },

    business: {
      title: "BUSINESS LAUNCH",
      category: "BUSINESS WEBSITE",
      description:
        "A modern premium website concept created to help ambitious businesses launch, present their services and grow online.",
      image: "business-demo.jpg"
    }

  };


  /* =========================================
     DEMO MODAL
  ========================================= */

  const modal = document.getElementById("demoModal");
  const closeButton = document.getElementById("closeDemo");

  const demoImage = document.getElementById("demoImage");
  const demoCategory = document.getElementById("demoCategory");
  const demoTitle = document.getElementById("demoTitle");
  const demoDescription = document.getElementById("demoDescription");


  function openDemo(projectName) {

    const project = projects[projectName];

    if (!project || !modal) return;

    if (demoImage) {
      demoImage.src = project.image;
      demoImage.alt = project.title;
    }

    if (demoCategory) {
      demoCategory.textContent = project.category;
    }

    if (demoTitle) {
      demoTitle.textContent = project.title;
    }

    if (demoDescription) {
      demoDescription.textContent = project.description;
    }

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");

    document.body.classList.add("modal-open");

  }


  function closeDemo() {

    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");

    document.body.classList.remove("modal-open");

  }


  /* =========================================
     VIEW PROJECT BUTTONS
  ========================================= */

  document.querySelectorAll("[data-demo]").forEach(button => {

    button.addEventListener("click", event => {

      event.preventDefault();

      const projectName = button.getAttribute("data-demo");

      openDemo(projectName);

    });

  });


  /* =========================================
     CLOSE BUTTON
  ========================================= */

  if (closeButton) {

    closeButton.addEventListener("click", event => {

      event.preventDefault();

      closeDemo();

    });

  }


  /* =========================================
     CLICK OUTSIDE MODAL TO CLOSE
  ========================================= */

  if (modal) {

    modal.addEventListener("click", event => {

      if (event.target === modal) {
        closeDemo();
      }

    });

  }


  /* =========================================
     ESC KEY TO CLOSE
  ========================================= */

  document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
      closeDemo();
    }

  });


  /* =========================================
     BUILD SOMETHING SIMILAR
  ========================================= */

  document.querySelectorAll('a[href="#contact"]').forEach(link => {

    link.addEventListener("click", () => {

      closeDemo();

    });

  });


  /* =========================================
     ENQUIRY FORM → SUPABASE + WHATSAPP
  ========================================= */

  const enquiryForm = document.getElementById("enquiryForm");

  if (enquiryForm) {

    enquiryForm.addEventListener("submit", async event => {

      event.preventDefault();

      if (enquiryForm.dataset.submitting === "true") return;

      if (!supabaseClient) {
        alert(
          "Our enquiry system is temporarily unavailable. Please contact us directly on WhatsApp."
        );
        return;
      }

      const formData = new FormData(enquiryForm);

      const name = String(formData.get("name") || "").trim();
      const phone = String(formData.get("phone") || "").trim();
      const email = String(formData.get("email") || "").trim();
      const service = String(formData.get("service") || "").trim();
      const budget = String(formData.get("budget") || "").trim();
      const message = String(formData.get("message") || "").trim();

      const submitButton = enquiryForm.querySelector(
        'button[type="submit"]'
      );

      const originalButtonText = submitButton
        ? submitButton.textContent
        : "Send Enquiry →";

      // Open WhatsApp tab during the user interaction
      // to reduce popup-blocking problems.
      const whatsappWindow = window.open("about:blank", "_blank");

      enquiryForm.dataset.submitting = "true";

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving Enquiry...";
      }

      try {

        const { error } = await supabaseClient
          .from("enquiries")
          .insert({
            customer_name: name,
            phone: phone,
            email: email || null,
            service: service,
            budget: budget || null,
            message: message,
            source: "website"
          });

        if (error) {
          throw error;
        }

        const whatsappMessage =
`Hello VELORA DIGITAL,

I would like to make an enquiry.

Name: ${name}
Phone / WhatsApp: ${phone}
Email: ${email || "Not provided"}
Service: ${service}
Budget: ${budget || "Not specified"}

Project Details:
${message}

Please contact me regarding my enquiry.

Thank you.`;

        const whatsappURL =
          "https://wa.me/918088590273?text=" +
          encodeURIComponent(whatsappMessage);

        if (whatsappWindow && !whatsappWindow.closed) {
          whatsappWindow.location.href = whatsappURL;
        } else {
          window.location.href = whatsappURL;
        }

        enquiryForm.reset();

      } catch (error) {

        console.error("VELORA enquiry error:", error);

        if (whatsappWindow && !whatsappWindow.closed) {
          whatsappWindow.close();
        }

        alert(
          "We couldn't save your enquiry. Please try again or contact us directly on WhatsApp."
        );

      } finally {

        enquiryForm.dataset.submitting = "false";

        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = originalButtonText;
        }

      }

    });

  }

});
