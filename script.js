document.addEventListener("DOMContentLoaded", () => {

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

      setTimeout(() => {

        const contact = document.getElementById("contact");

        if (contact) {

          contact.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }

      }, 100);

    });

  });


  /* =========================================
     ENQUIRY FORM → WHATSAPP
  ========================================= */

  const enquiryForm = document.getElementById("enquiryForm");

  if (enquiryForm) {

    enquiryForm.addEventListener("submit", event => {

      event.preventDefault();

      const formData = new FormData(enquiryForm);

      const name = formData.get("name") || "";
      const phone = formData.get("phone") || "";
      const email = formData.get("email") || "";
      const service = formData.get("service") || "";
      const budget = formData.get("budget") || "";
      const message = formData.get("message") || "";


      const whatsappMessage =
`Hello VELORA DIGITAL,

I would like to make an enquiry.

Name: ${name}
Phone / WhatsApp: ${phone}
Email: ${email}
Service: ${service}
Budget: ${budget}

Project Details:
${message}

Please contact me regarding my enquiry.

Thank you.`;


      const whatsappNumber = "918088590273";

      const whatsappURL =
        "https://wa.me/" +
        whatsappNumber +
        "?text=" +
        encodeURIComponent(whatsappMessage);


      window.open(whatsappURL, "_blank");

    });

  }


});
