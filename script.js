document.addEventListener("DOMContentLoaded", () => {

    // Smooth scrolling for internal links
    document.querySelectorAll('a[href^="#"]').forEach(link => {

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


    // Enquiry form
    const enquiryForm = document.getElementById("enquiryForm");

    if (enquiryForm) {

        enquiryForm.addEventListener("submit", function (event) {

            event.preventDefault();

            const name = this.querySelector('[name="name"]').value.trim();
            const phone = this.querySelector('[name="phone"]').value.trim();
            const business = this.querySelector('[name="business"]').value.trim();
            const service = this.querySelector('[name="service"]').value;
            const message = this.querySelector('[name="message"]').value.trim();

            const whatsappNumber = "916360695474";

            const text =
                `Hello VELORA DIGITAL,%0A%0A` +
                `New Project Enquiry%0A%0A` +
                `Name: ${name}%0A` +
                `WhatsApp: ${phone}%0A` +
                `Business: ${business}%0A` +
                `Service: ${service}%0A%0A` +
                `Project Details:%0A${message}`;

            const whatsappURL =
                `https://wa.me/${whatsappNumber}?text=${text}`;

            window.open(whatsappURL, "_blank");

        });

    }

});
