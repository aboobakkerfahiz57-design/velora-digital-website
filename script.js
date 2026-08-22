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

modal.addEventListener("click", (event) => {
    if (
        event.target.closest(".demo-close") ||
        event.target.classList.contains("demo-modal-overlay")
    ) {
        closeDemo();
    }
});

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
/* ==========================================
   PROJECT DEMO SYSTEM
   ========================================== */

const projectData = {
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

const projectButtons = document.querySelectorAll("[data-demo]");

projectButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const projectName = button.getAttribute("data-demo");
    const project = projectData[projectName];

    if (!project) return;

    const modal = document.querySelector(".demo-modal");
    const image = document.querySelector(".demo-image img");
    const category = document.querySelector(".demo-content span");
    const title = document.querySelector(".demo-content h2");
    const description = document.querySelector(".demo-content p");

    if (!modal) return;

    if (image) {
      image.src = project.image;
      image.alt = project.title;
    }

    if (category) category.textContent = project.category;
    if (title) title.textContent = project.title;
    if (description) description.textContent = project.description;

    modal.classList.add("active");
    document.body.classList.add("modal-open");
  });
});

const closeDemo = document.querySelector(".demo-close");

if (closeDemo) {
  closeDemo.addEventListener("click", () => {
    const modal = document.querySelector(".demo-modal");

    if (modal) {
      modal.classList.remove("active");
    }

    document.body.classList.remove("modal-open");
  });
}
