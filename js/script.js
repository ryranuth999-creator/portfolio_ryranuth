// Keep all page behavior in one place so beginners can follow the flow.
document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link");
  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".nav-links");
  const scrollTopButton = document.getElementById("scrollTop");
  const revealItems = document.querySelectorAll(".reveal");
  const sections = document.querySelectorAll("main section[id]");
  const typingText = document.getElementById("typingText");
  const contactForm = document.getElementById("contactForm");
  const formStatus = document.getElementById("formStatus");
  const deliveryOptions = document.querySelector(".delivery-options");
  const deliveryInputs = document.querySelectorAll('input[name="delivery[]"]');
  const deliveryError = document.getElementById("deliveryError");
  const downloadCv = document.getElementById("downloadCv");
  const themeToggle = document.getElementById("themeToggle");

  // Light/Night mode switcher.
  function setTheme(theme) {
    const isNight = theme === "night";
    const activeTheme = isNight ? "night" : "light";
    document.body.classList.toggle("theme-night", isNight);
    document.body.classList.toggle("theme-light", !isNight);
    localStorage.setItem("portfolioTheme", activeTheme);
    themeToggle.setAttribute("aria-label", isNight ? "Switch to light mode" : "Switch to night mode");
    themeToggle.innerHTML = isNight
      ? '<i class="fa-solid fa-sun"></i><span>Light</span>'
      : '<i class="fa-solid fa-moon"></i><span>Night</span>';
  }

  const savedTheme = localStorage.getItem("portfolioTheme") === "light" ? "light" : "night";
  setTheme(savedTheme);

  themeToggle.addEventListener("click", () => {
    const nextTheme = document.body.classList.contains("theme-night") ? "light" : "night";
    setTheme(nextTheme);
  });

  // Footer year.
  document.getElementById("year").textContent = new Date().getFullYear();

  // Show small text fallbacks if Font Awesome cannot load.
  const fontAwesomeProbe = document.createElement("i");
  fontAwesomeProbe.className = "fa-solid fa-envelope";
  fontAwesomeProbe.style.position = "absolute";
  fontAwesomeProbe.style.opacity = "0";
  document.body.appendChild(fontAwesomeProbe);

  requestAnimationFrame(() => {
    const iconContent = window.getComputedStyle(fontAwesomeProbe, "::before").content;
    if (!iconContent || iconContent === "none") {
      document.body.classList.add("fa-missing");
    }
    fontAwesomeProbe.remove();
  });

  // Mobile navigation toggle.
  menuToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");
    document.body.classList.toggle("menu-open", isOpen);
    menuToggle.classList.toggle("is-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("open");
      document.body.classList.remove("menu-open");
      menuToggle.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });

  // Typing animation for hero role text.
  const roles = ["IT Support", "Network Engineer", "System Administrator"];
  let roleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function typeRole() {
    const currentRole = roles[roleIndex];
    const nextText = currentRole.slice(0, charIndex);
    typingText.textContent = nextText;

    if (!isDeleting && charIndex < currentRole.length) {
      charIndex += 1;
      setTimeout(typeRole, 80);
      return;
    }

    if (!isDeleting && charIndex === currentRole.length) {
      isDeleting = true;
      setTimeout(typeRole, 1250);
      return;
    }

    if (isDeleting && charIndex > 0) {
      charIndex -= 1;
      setTimeout(typeRole, 45);
      return;
    }

    isDeleting = false;
    roleIndex = (roleIndex + 1) % roles.length;
    setTimeout(typeRole, 180);
  }

  typeRole();

  // Reveal-on-scroll animation.
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealItems.forEach((item) => revealObserver.observe(item));

  // Active navigation highlighting.
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        navLinks.forEach((link) => {
          link.classList.toggle(
            "active",
            link.getAttribute("href") === `#${entry.target.id}`
          );
        });
      });
    },
    {
      rootMargin: "-35% 0px -55% 0px",
      threshold: 0,
    }
  );

  sections.forEach((section) => sectionObserver.observe(section));

  // Scroll-to-top visibility and action.
  window.addEventListener("scroll", () => {
    scrollTopButton.classList.toggle("visible", window.scrollY > 600);
  });

  scrollTopButton.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  // CV placeholder behavior until a real PDF is added.
  downloadCv.addEventListener("click", (event) => {
    event.preventDefault();
    alert("Add your CV PDF to the assets folder and update this button link.");
  });

  // Simple frontend contact form validation.
  function setError(input, message) {
    const row = input.closest(".form-row");
    row.classList.add("invalid");
    row.querySelector(".error-message").textContent = message;
  }

  function clearError(input) {
    const row = input.closest(".form-row");
    row.classList.remove("invalid");
    row.querySelector(".error-message").textContent = "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  deliveryInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (Array.from(deliveryInputs).some((item) => item.checked)) {
        deliveryOptions.classList.remove("invalid");
        deliveryError.textContent = "";
      }
    });
  });

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    formStatus.textContent = "";

    const fields = {
      name: contactForm.name,
      email: contactForm.email,
      subject: contactForm.subject,
      message: contactForm.message,
    };

    let isValid = true;
    const selectedDelivery = Array.from(deliveryInputs)
      .filter((input) => input.checked)
      .map((input) => input.value);

    Object.values(fields).forEach(clearError);
    deliveryOptions.classList.remove("invalid");
    deliveryError.textContent = "";

    if (fields.name.value.trim().length < 2) {
      setError(fields.name, "Please enter your name.");
      isValid = false;
    }

    if (!isValidEmail(fields.email.value.trim())) {
      setError(fields.email, "Please enter a valid email address.");
      isValid = false;
    }

    if (fields.subject.value.trim().length < 3) {
      setError(fields.subject, "Please enter a subject.");
      isValid = false;
    }

    if (fields.message.value.trim().length < 10) {
      setError(fields.message, "Please write a message with at least 10 characters.");
      isValid = false;
    }

    if (selectedDelivery.length === 0) {
      deliveryOptions.classList.add("invalid");
      deliveryError.textContent = "Please choose Telegram, Email, or both.";
      isValid = false;
    }

    if (!isValid) return;

    const submitButton = contactForm.querySelector(".submit-btn");
    const originalButtonText = submitButton.innerHTML;
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
    formStatus.textContent = "Sending your message...";

    try {
      const response = await fetch("api/contact.php", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: fields.name.value.trim(),
          email: fields.email.value.trim(),
          subject: fields.subject.value.trim(),
          message: fields.message.value.trim(),
          delivery: selectedDelivery,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Message could not be sent.");
      }

      formStatus.textContent = result.message || "Message sent successfully. Thank you for contacting me.";
      contactForm.reset();
    } catch (error) {
      formStatus.textContent =
        error.message || "Something went wrong. Please try Telegram or email instead.";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalButtonText;
    }
  });
});
