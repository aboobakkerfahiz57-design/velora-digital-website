/* =========================================================
   VELORA DIGITAL
   MAIN WEBSITE JAVASCRIPT
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    /* =====================================================
       SMOOTH NAVIGATION
    ===================================================== */

    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {

        link.addEventListener("click", function (event) {

            const targetId = this.getAttribute("href");

            if (!targetId || targetId === "#") {
                return;
            }

            const target = document.querySelector(targetId);

            if (target) {

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        });

    });


    /* =====================================================
       ENQUIRY FORM → WHATSAPP
    ===================================================== */

    const enquiryForm = document.getElementById("enquiryForm");

    if (enquiryForm) {

        enquiryForm.addEventListener("submit", function (event) {

            event.preventDefault();

            const name =
                document.getElementById("name").value.trim();

            const phone =
                document.getElementById("phone").value.trim();

            const business =
                document.getElementById("business").value.trim();

            const service =
                document.getElementById("service").value.trim();

            const message =
                document.getElementById("message").value.trim();


            if (!name || !phone || !message) {

                alert(
                    "Please fill in your name, WhatsApp number and project details."
                );

                return;
            }


            const whatsappMessage =
`Hello VELORA DIGITAL 👋

I would like to discuss a project.

Name: ${name}

WhatsApp Number: ${phone}

Business / Company: ${business || "Not provided"}

Service Required: ${service || "Not selected"}

Project Details:
${message}

I would like to know more about the project, pricing and next steps.`;


            /*
             * IMPORTANT:
             * Replace the number below with your
             * official VELORA DIGITAL WhatsApp number
             * before launching the website.
             */

            const whatsappNumber = "91XXXXXXXXXX";


            const whatsappURL =
                `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                    whatsappMessage
                )}`;


            window.open(
                whatsappURL,
                "_blank",
                "noopener,noreferrer"
            );

        });

    }


    /* =====================================================
       PROJECT DEMO BUTTONS
    ===================================================== */

    const projectButtons =
        document.querySelectorAll(".project-button");

    projectButtons.forEach(button => {

        button.addEventListener("click", function (event) {

            const targetId =
                this.getAttribute("href");

            const target =
                document.querySelector(targetId);

            if (target) {

                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });

            }

        });

    });


    /* =====================================================
       REVEAL ANIMATION
    ===================================================== */

    const revealElements = document.querySelectorAll(
        ".service-card, .price-card, .project-card, .process-card, .service-detail"
    );


    const revealObserver =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("visible");

                        revealObserver.unobserve(
                            entry.target
                        );

                    }

                });

            },
            {
                threshold: 0.12
            }
        );


    revealElements.forEach(element => {

        element.classList.add("reveal");

        revealObserver.observe(element);

    });


    /* =====================================================
       NAVIGATION ACTIVE STATE
    ===================================================== */

    const sections =
        document.querySelectorAll("section[id]");

    const navLinks =
        document.querySelectorAll(".nav-links a");


    const sectionObserver =
        new IntersectionObserver(
            entries => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        const currentId =
                            entry.target.getAttribute("id");


                        navLinks.forEach(link => {

                            link.classList.remove("active");

                            if (
                                link.getAttribute("href") ===
                                `#${currentId}`
                            ) {

                                link.classList.add("active");

                            }

                        });

                    }

                });

            },
            {
                rootMargin: "-35% 0px -55% 0px"
            }
        );


    sections.forEach(section => {

        sectionObserver.observe(section);

    });


    /* =====================================================
       YEAR
    ===================================================== */

    const yearElement =
        document.querySelector(".copyright");

    if (yearElement) {

        yearElement.innerHTML =
            `© ${new Date().getFullYear()} VELORA DIGITAL. All rights reserved.`;

    }


    /* =====================================================
       PAGE LOADED
    ===================================================== */

    document.body.classList.add("page-loaded");

});
