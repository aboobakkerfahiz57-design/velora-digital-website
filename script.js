/* =========================================================
   VELORA DIGITAL — MAIN JAVASCRIPT
   ========================================================= */

document.addEventListener("DOMContentLoaded", function () {

  /* =======================================================
     PROJECT DEMO MODAL
     ======================================================= */

  const modal = document.getElementById("demoModal");
  const closeModal = document.getElementById("closeModal");
  const demoTitle = document.getElementById("demoTitle");
  const demoDescription = document.getElementById("demoDescription");

  const demoButtons = document.querySelectorAll(".demo-button");


  const projects = {

    jewels: {
      title: "THE JEWELS",
      description:
        "A premium jewellery digital experience concept designed to showcase collections, build trust and create a luxury online shopping experience."
    },

    tbd: {
      title: "TBD GROUP",
      description:
        "A modern business and real-estate digital experience concept designed to present the company, services, properties and business enquiries professionally."
    },

    business: {
      title: "BUSINESS LAUNCH",
      description:
        "A modern business website concept created to give a growing business a professional digital presence and help customers discover its services."
    }

  };


  demoButtons.forEach(function (button) {

    button.addEventListener("click", function () {

      const projectName = button.dataset.demo;
      const project = projects[projectName];

      if (!project) {
        return;
      }

      demoTitle.textContent = project.title;
      demoDescription.textContent = project.description;

      modal.classList.add("active");

      document.body.style.overflow = "hidden";

    });

  });


  /* =======================================================
     CLOSE DEMO
     ======================================================= */

  function closeProjectDemo() {

    modal.classList.remove("active");

    document.body.style.overflow = "";

  }


  if (closeModal) {

    closeModal.addEventListener("click", closeProjectDemo);

  }


  /* Close when clicking outside the modal */

  if (modal) {

    modal.addEventListener("click", function (event) {

      if (event.target === modal) {
        closeProjectDemo();
      }

    });

  }


  /* Close with ESC */

  document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {
      closeProjectDemo();
    }

  });


  /* =======================================================
     ENQUIRY FORM
     ======================================================= */

  const enquiryForm = document.getElementById("enquiryForm");
  const formMessage = document.getElementById("formMessage");


  if (enquiryForm) {

    enquiryForm.addEventListener("submit", function (event) {

      event.preventDefault();


      const formData = new FormData(enquiryForm);

      const name = formData.get("name");
      const phone = formData.get("phone");
      const email = formData.get("email");
      const service = formData.get("service");
      const message = formData.get("message");


      /*
        For now the enquiry is handled on the website.

        Later, after the domain/email setup,
        we will connect this form directly to
        your WhatsApp and/or business email.
      */


      formMessage.textContent =
        "Thank you, " +
        name +
        ". Your enquiry details are ready. We will connect this form to your direct WhatsApp/email system next.";


      formMessage.style.display = "block";


      console.log("VELORA DIGITAL ENQUIRY");

      console.log({
        name: name,
        phone: phone,
        email: email,
        service: service,
        message: message
      });


      enquiryForm.reset();

    });

  }


  /* =======================================================
     SMOOTH INTERNAL NAVIGATION
     ======================================================= */

  const internalLinks = document.querySelectorAll('a[href^="#"]');


  internalLinks.forEach(function (link) {

    link.addEventListener("click", function (event) {

      const targetId = link.getAttribute("href");

      if (!targetId || targetId === "#") {
        return;
      }


      const target = document.querySelector(targetId);

      if (!target) {
        return;
      }


      event.preventDefault();


      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });

    });

  });


  /* =======================================================
     NAVBAR SCROLL EFFECT
     ======================================================= */

  const navbar = document.querySelector(".navbar");


  window.addEventListener("scroll", function () {

    if (!navbar) {
      return;
    }


    if (window.scrollY > 40) {

      navbar.style.background =
        "rgba(5, 7, 18, 0.92)";

    } else {

      navbar.style.background =
        "rgba(5, 7, 18, 0.72)";

    }

  });


});
