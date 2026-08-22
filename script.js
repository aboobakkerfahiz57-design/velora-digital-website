// ==========================================
// VELORA DIGITAL
// Main JavaScript
// ==========================================


// ==========================================
// SMOOTH SCROLL
// ==========================================

document.querySelectorAll('a[href^="#"]').forEach(function (link) {

    link.addEventListener("click", function (event) {

        const targetId = this.getAttribute("href");

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



// ==========================================
// SCROLL REVEAL ANIMATION
// ==========================================

const revealElements =
    document.querySelectorAll(
        ".service-card, .project-card, .price-card, .process-card, .intro-card"
    );


const revealObserver =
    new IntersectionObserver(

        function (entries) {

            entries.forEach(function (entry) {

                if (entry.isIntersecting) {

                    entry.target.classList.add("visible");

                    revealObserver.unobserve(entry.target);

                }

            });

        },

        {
            threshold: 0.12
        }

    );


revealElements.forEach(function (element) {

    element.classList.add("reveal");

    revealObserver.observe(element);

});



// ==========================================
// NAVBAR SCROLL EFFECT
// ==========================================

const navbar =
    document.querySelector(".navbar");


window.addEventListener("scroll", function () {

    if (window.scrollY > 40) {

        navbar.classList.add("scrolled");

    } else {

        navbar.classList.remove("scrolled");

    }

});



// ==========================================
// CONTACT FORM
// ==========================================

const projectForm =
    document.getElementById("projectForm");


const formMessage =
    document.getElementById("formMessage");


if (projectForm) {

    projectForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const formData =
                new FormData(projectForm);


            const name =
                formData.get("name");

            const company =
                formData.get("company");

            const email =
                formData.get("email");

            const phone =
                formData.get("phone");

            const service =
                formData.get("service");

            const budget =
                formData.get("budget");

            const message =
                formData.get("message");


            const subject =
                "New VELORA DIGITAL Project Enquiry";


            const emailBody =

                "VELORA DIGITAL — PROJECT ENQUIRY\n\n" +

                "Name: " + name + "\n" +

                "Company: " + company + "\n" +

                "Email: " + email + "\n" +

                "Phone / WhatsApp: " + phone + "\n\n" +

                "Service: " + service + "\n" +

                "Budget: " + budget + "\n\n" +

                "Project Details:\n" +

                message;


            const mailtoLink =

                "mailto:hello@veloradigital.com" +

                "?subject=" +

                encodeURIComponent(subject) +

                "&body=" +

                encodeURIComponent(emailBody);


            formMessage.textContent =
                "Opening your email application...";


            formMessage.classList.add("show");


            window.location.href =
                mailtoLink;

        }
    );

}



// ==========================================
// ACTIVE NAVIGATION
// ==========================================

const sections =
    document.querySelectorAll("section[id]");


const navLinks =
    document.querySelectorAll(
        ".nav-links a"
    );


window.addEventListener(
    "scroll",
    function () {

        let currentSection = "";


        sections.forEach(function (section) {

            const sectionTop =
                section.offsetTop - 150;


            const sectionHeight =
                section.offsetHeight;


            if (
                window.scrollY >= sectionTop &&
                window.scrollY < sectionTop + sectionHeight
            ) {

                currentSection =
                    section.getAttribute("id");

            }

        });


        navLinks.forEach(function (link) {

            link.classList.remove("active");


            if (
                link.getAttribute("href") ===
                "#" + currentSection
            ) {

                link.classList.add("active");

            }

        });

    }
);



// ==========================================
// PAGE LOAD
// ==========================================

window.addEventListener(
    "load",
    function () {

        document.body.classList.add(
            "page-loaded"
        );

    }
);



// ==========================================
// CONSOLE MESSAGE
// ==========================================

console.log(
    "VELORA DIGITAL — Digital Presence. Elevated."
);
