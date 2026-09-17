/**
 * Ry Ranuth - Portfolio Scripts
 * Handles mobile navigation, typing animation, scroll reveal, active navigation, and UI interactions.
 */

document.addEventListener("DOMContentLoaded", () => {
  const navLinks = document.querySelectorAll(".nav-link");
  const menuToggle = document.querySelector(".menu-toggle");
  const navMenu = document.querySelector(".nav-links");
  const scrollTopButton = document.getElementById("scrollTop");
  const revealItems = document.querySelectorAll(".reveal");
  const sections = document.querySelectorAll("main section[id]");
  const typingText = document.getElementById("typingText");

  // Footer dynamic year
  const yearElement = document.getElementById("year");
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Mobile navigation drawer toggle
  if (menuToggle && navMenu) {
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
  }

  // Typing animation for hero section role
  if (typingText) {
    const roles = [
      "IT Support & Network Engineer",
      "Network Infrastructure Specialist",
      "Windows & Linux Administrator",
      "IT Networking Instructor"
    ];
    let roleIndex = 0;
    let charIndex = 0;
    let isDeleting = false;

    function typeRole() {
      const currentRole = roles[roleIndex];
      const nextText = currentRole.slice(0, charIndex);
      typingText.textContent = nextText;

      if (!isDeleting && charIndex < currentRole.length) {
        charIndex += 1;
        setTimeout(typeRole, 70);
        return;
      }

      if (!isDeleting && charIndex === currentRole.length) {
        isDeleting = true;
        setTimeout(typeRole, 1500);
        return;
      }

      if (isDeleting && charIndex > 0) {
        charIndex -= 1;
        setTimeout(typeRole, 40);
        return;
      }

      isDeleting = false;
      roleIndex = (roleIndex + 1) % roles.length;
      setTimeout(typeRole, 200);
    }

    typeRole();
  }

  // Scroll reveal effect using IntersectionObserver
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealItems.forEach((item) => revealObserver.observe(item));

    // Active navigation link tracking on scroll
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
        rootMargin: "-30% 0px -60% 0px",
        threshold: 0,
      }
    );

    sections.forEach((section) => sectionObserver.observe(section));
  } else {
    // Fallback if IntersectionObserver is not supported
    revealItems.forEach((item) => item.classList.add("visible"));
  }

  // Scroll to top behavior
  if (scrollTopButton) {
    window.addEventListener("scroll", () => {
      scrollTopButton.classList.toggle("visible", window.scrollY > 500);
    });

    scrollTopButton.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Certificate Lightbox Modal Handling
  const certModal = document.getElementById("certModal");
  const certModalBackdrop = document.getElementById("certModalBackdrop");
  const certModalClose = document.getElementById("certModalClose");
  const modalCertTitle = document.getElementById("modalCertTitle");
  const modalCertIssuer = document.getElementById("modalCertIssuer");
  const modalCertImg = document.getElementById("modalCertImg");
  const modalCertDate = document.getElementById("modalCertDate");
  const modalCertPdfLink = document.getElementById("modalCertPdfLink");
  const modalCertDownloadLink = document.getElementById("modalCertDownloadLink");
  const certButtons = document.querySelectorAll(".btn-view-cert");

  function openCertModal(target) {
    if (!certModal) return;
    const title = target.getAttribute("data-cert-title") || "Certificate Preview";
    const issuer = target.getAttribute("data-cert-issuer") || "Dragon ICT Academy • Cisco Networking Academy";
    const date = target.getAttribute("data-cert-date") || "23 Oct 2025";
    const img = target.getAttribute("data-cert-img") || "";
    const pdf = target.getAttribute("data-cert-pdf") || "";

    if (modalCertTitle) modalCertTitle.textContent = title;
    if (modalCertIssuer) modalCertIssuer.textContent = issuer;
    if (modalCertDate) modalCertDate.textContent = `Issued: ${date}`;
    if (modalCertImg) {
      modalCertImg.src = img;
      modalCertImg.alt = title;
    }
    if (modalCertPdfLink) modalCertPdfLink.href = pdf;
    if (modalCertDownloadLink) {
      modalCertDownloadLink.href = pdf;
      modalCertDownloadLink.setAttribute("download", `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`);
    }

    certModal.classList.add("active");
    certModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
  }

  function closeCertModal() {
    if (!certModal) return;
    certModal.classList.remove("active");
    certModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  certButtons.forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      openCertModal(btn);
    });

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openCertModal(btn);
      }
    });
  });

  if (certModalClose) {
    certModalClose.addEventListener("click", closeCertModal);
  }

  if (certModalBackdrop) {
    certModalBackdrop.addEventListener("click", closeCertModal);
  }

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && certModal && certModal.classList.contains("active")) {
      closeCertModal();
    }
  });

  // Certificate Filter Functionality (for certificates.html)
  const filterButtons = document.querySelectorAll(".filter-btn");
  const certCards = document.querySelectorAll(".cert-item-card");

  if (filterButtons.length > 0 && certCards.length > 0) {
    filterButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        filterButtons.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        const filterValue = btn.getAttribute("data-filter");

        certCards.forEach((card) => {
          const category = card.getAttribute("data-category") || "";
          if (filterValue === "all") {
            card.style.display = "flex";
          } else if (category.includes(filterValue)) {
            card.style.display = "flex";
          } else {
            card.style.display = "none";
          }
        });
      });
    });
  }
});
