document.addEventListener("DOMContentLoaded", () => {

  /* ===============================
     SMOOTH NAVIGATION
  =============================== */

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


  /* ===============================
     MOBILE MENU
  =============================== */

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


  /* ===============================
     DEMO PROJECT DATA
  =============================== */

  const demos = {

    jewels: {
      title: "THE JEWELS",
      category: "Premium Jewellery Website",
      description:
        "A premium jewellery website concept designed to showcase collections, build customer trust and create a luxury online shopping experience.",
      image: "jewels-demo.jpg"
    },

    tbd: {
      title: "TBD GROUP",
      category: "Corporate Business Website",
      description:
        "A premium corporate website concept for TBD GROUP, presenting its business divisions, services, projects and professional brand identity.",
      image: "tbd-demo.jpg"
    },

    business: {
      title: "BUSINESS LAUNCH",
      category: "Business Website",
      description:
        "A modern business website concept created to help a new business establish a strong digital presence and generate enquiries.",
      image: "business-demo.jpg"
    }

  };


  /* ===============================
     CREATE DEMO MODAL
  =============================== */

  const modal = document.createElement("div");

  modal.className = "demo-modal";

  modal.innerHTML = `
    <div class="demo-modal-overlay"></div>

    <div class="demo-modal-box">

      <button class="demo-close" aria-label="Close">
        &times;
      </button>

      <div class="demo-image">
        <img id="demoImage" src="" alt="Project Demo">
      </div>

      <div class="demo-content">

        <span id="demoCategory"></span>

        <h2 id="demoTitle"></h2>

        <p id="demoDescription"></p>

        <a href="#contact" class="primary-button demo-contact">
          Build Something Similar →
        </a>

      </div>

    </div>
  `;

  document.body.appendChild(modal);


  /* ===============================
     OPEN DEMO
  =============================== */

  function openDemo(type) {

    const demo = demos[type];

    if (!demo) return;

    const image = document.getElementById("demoImage");
    const title = document.getElementById("demoTitle");
    const category = document.getElementById("demoCategory");
    const description = document.getElementById("demoDescription");

    image.src = demo.image;
    image.alt = demo.title + " project demo";

    title.textContent = demo.title;
    category.textContent = demo.category;
    description.textContent = demo.description;

    modal.classList.add("active");

    document.body.classList.add("modal-open");
  }


  /* ===============================
     CLOSE DEMO
  =============================== */

  function closeDemo() {
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
  }

  modal.querySelector(".demo-close").addEventListener("click", closeDemo);

  modal.querySelector(".demo-modal-overlay").addEventListener("click", closeDemo);


  document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
      closeDemo();
    }

  });


  /* ===============================
     VIEW PROJECT BUTTONS
  =============================== */

  document.querySelectorAll("[data-demo]").forEach(button => {

    button.addEventListener("click", event => {

      event.preventDefault();

      const demoType = button.getAttribute("data-demo");

      openDemo(demoType);

    });

  });


  /* ===============================
     FALLBACK FOR VIEW PROJECT TEXT
  =============================== */

  document.querySelectorAll("a, button").forEach(element => {

    const text = element.textContent.trim().toLowerCase();

    if (text.includes("view project")) {

      element.addEventListener("click", event => {

        if (element.hasAttribute("data-demo")) return;

        const card = element.closest("[data-project]");

        if (card) {

          const projectType =
            card.getAttribute("data-project");

          if (demos[projectType]) {

            event.preventDefault();

            openDemo(projectType);

          }

        }

      });

    }

  });


  /* ===============================
     START A PROJECT
  =============================== */

  document.querySelectorAll("a, button").forEach(element => {

    const text = element.textContent.trim().toLowerCase();

    if (
      text.includes("start a project") ||
      text.includes("let's build") ||
      text.includes("build something similar")
    ) {

      element.addEventListener("click", () => {

        setTimeout(() => {
          const contact = document.querySelector("#contact");

          if (contact) {
            contact.scrollIntoView({
              behavior: "smooth"
            });
          }
        }, 100);

      });

    }

  });

});
