(() => {
  const {
    rewards,
    whatsappGroupUrl,
    lotteryUrl,
    banners = [],
    bannerRotateMs = 4000,
  } = window.NAIVAS_PROMO;

  const overlay = document.getElementById("overlay");
  const openClaim = document.getElementById("openClaim");
  const closeSheet = document.getElementById("closeSheet");
  const phoneForm = document.getElementById("phoneForm");
  const phoneInput = document.getElementById("phoneInput");
  const phoneError = document.getElementById("phoneError");
  const phoneDisplay = document.getElementById("phoneDisplay");
  const spinBtn = document.getElementById("spinBtn");
  const rewardName = document.getElementById("rewardName");
  const whatsappBtn = document.getElementById("whatsappBtn");
  const canvas = document.getElementById("wheel");
  const ctx = canvas.getContext("2d");

  function track(eventName, params = {}) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }
  }

  function initBannerCarousel(root) {
    if (!banners.length) return;

    const track = document.createElement("div");
    track.className = "banner-carousel__track";

    const dots = document.createElement("div");
    dots.className = "banner-carousel__dots";
    dots.setAttribute("role", "tablist");
    dots.setAttribute("aria-label", "Banner slides");

    const chevron = (dir) =>
      `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="${
        dir === "prev"
          ? "M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"
          : "M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"
      }"/></svg>`;

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "banner-carousel__arrow banner-carousel__arrow--prev";
    prevBtn.setAttribute("aria-label", "Previous banner");
    prevBtn.innerHTML = chevron("prev");

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "banner-carousel__arrow banner-carousel__arrow--next";
    nextBtn.setAttribute("aria-label", "Next banner");
    nextBtn.innerHTML = chevron("next");

    const slides = banners.map((banner, i) => {
      const slide = document.createElement("div");
      slide.className = "banner-carousel__slide" + (i === 0 ? " is-active" : "");
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      slide.setAttribute("aria-label", `${i + 1} of ${banners.length}`);
      slide.setAttribute("aria-hidden", i === 0 ? "false" : "true");

      const img = document.createElement("img");
      img.src = banner.src;
      img.alt = banner.alt || "";
      img.width = 1024;
      img.height = 576;
      img.decoding = "async";
      if (i > 0) img.loading = "lazy";
      slide.appendChild(img);
      track.appendChild(slide);

      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "banner-carousel__dot" + (i === 0 ? " is-active" : "");
      dot.setAttribute("aria-label", `Show banner ${i + 1}`);
      dots.appendChild(dot);

      return { slide, dot };
    });

    root.appendChild(track);
    root.appendChild(prevBtn);
    root.appendChild(nextBtn);
    root.appendChild(dots);

    let index = 0;
    let timer = null;
    let animating = false;
    const SLIDE_MS = 750;

    function clearMotion(slide) {
      slide.classList.remove(
        "is-active",
        "is-leaving-left",
        "is-leaving-right",
        "is-enter-left",
        "is-enter-right"
      );
    }

    function goTo(next, direction) {
      const target = (next + slides.length) % slides.length;
      if (target === index || animating) return;

      const forward =
        direction === "next" ||
        (direction !== "prev" &&
          (target === (index + 1) % slides.length ||
            (target > index && !(index === 0 && target === slides.length - 1))));

      const current = slides[index];
      const upcoming = slides[target];

      animating = true;

      clearMotion(upcoming.slide);
      upcoming.slide.classList.add(forward ? "is-enter-right" : "is-enter-left");
      void upcoming.slide.offsetWidth;

      current.slide.classList.remove("is-active");
      current.slide.classList.add(forward ? "is-leaving-left" : "is-leaving-right");
      current.slide.setAttribute("aria-hidden", "true");
      current.dot.classList.remove("is-active");

      upcoming.slide.classList.remove("is-enter-left", "is-enter-right");
      upcoming.slide.classList.add("is-active");
      upcoming.slide.setAttribute("aria-hidden", "false");
      upcoming.dot.classList.add("is-active");

      index = target;

      window.setTimeout(() => {
        clearMotion(current.slide);
        upcoming.slide.classList.add("is-active");
        animating = false;
      }, SLIDE_MS);
    }

    function start() {
      stop();
      if (slides.length < 2) return;
      timer = setInterval(() => goTo(index + 1, "next"), bannerRotateMs);
    }

    function stop() {
      if (timer) clearInterval(timer);
      timer = null;
    }

    function manual(next, direction) {
      goTo(next, direction);
      start();
    }

    prevBtn.addEventListener("click", () => manual(index - 1, "prev"));
    nextBtn.addEventListener("click", () => manual(index + 1, "next"));

    slides.forEach(({ dot }, i) => {
      dot.addEventListener("click", () => {
        const direction = i > index || (index === slides.length - 1 && i === 0) ? "next" : "prev";
        manual(i, direction);
      });
    });

    root.addEventListener("mouseenter", stop);
    root.addEventListener("mouseleave", start);
    root.addEventListener("focusin", stop);
    root.addEventListener("focusout", start);

    start();
  }

  document.querySelectorAll(".js-banner-carousel").forEach(initBannerCarousel);

  document.querySelectorAll(".js-join-whatsapp").forEach((el) => {
    if (whatsappGroupUrl) el.href = whatsappGroupUrl;
    el.addEventListener("click", () => track("join_whatsapp"));
  });
  document.querySelectorAll(".js-join-lottery").forEach((el) => {
    if (lotteryUrl) el.href = lotteryUrl;
    el.addEventListener("click", () => track("join_lottery"));
  });

  let phoneE164 = "";
  let spinning = false;
  let rotation = 0;
  let wonReward = null;

  const panels = {
    phone: document.querySelector('[data-panel="phone"]'),
    spin: document.querySelector('[data-panel="spin"]'),
    reward: document.querySelector('[data-panel="reward"]'),
  };

  function showPanel(name) {
    Object.entries(panels).forEach(([key, el]) => {
      el.classList.toggle("is-active", key === name);
    });
  }

  function openOverlay() {
    track("claim_prize_click");
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
    showPanel("phone");
    phoneInput.focus();
  }

  function closeOverlay() {
    if (spinning) return;
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  function normalizePhone(raw) {
    const digits = String(raw).replace(/\D/g, "");
    if (/^7\d{8}$/.test(digits)) return `254${digits}`;
    if (/^2547\d{8}$/.test(digits)) return digits;
    return null;
  }

  function formatDisplay(e164) {
    // 254XXXXXXXXX → +254 7XX XXX XXX
    const local = e164.slice(3);
    return `+254 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }

  function drawWheel(angle = 0) {
    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 4;
    const slice = (Math.PI * 2) / rewards.length;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    rewards.forEach((reward, i) => {
      const start = i * slice - Math.PI / 2;
      const end = start + slice;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = reward.color;
      ctx.fill();

      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.rotate(start + slice / 2);
      ctx.textAlign = "right";
      ctx.fillStyle = reward.text;
      ctx.font = "bold 15px 'DM Sans', sans-serif";
      ctx.fillText(reward.label, radius - 16, 5);
      ctx.restore();
    });

    // center hub
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fillStyle = "#12140F";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.fillStyle = "#F36C00";
    ctx.fill();

    ctx.restore();
  }

  function spinWheel() {
    if (spinning) return;
    track("spin_wheel");
    spinning = true;
    spinBtn.disabled = true;
    spinBtn.textContent = "Spinning…";

    const slice = 360 / rewards.length;
    const index = Math.floor(Math.random() * rewards.length);
    wonReward = rewards[index];

    // Pointer is at top. Segment centers are offset by half a slice.
    // Positive rotation is clockwise in our canvas draw (CSS-like via increasing angle).
    const segmentCenterFromTop = index * slice + slice / 2;
    const extraTurns = 5 + Math.floor(Math.random() * 3);
    const currentDeg = ((rotation * 180) / Math.PI) % 360;
    const targetDeg =
      extraTurns * 360 + (360 - segmentCenterFromTop) - (currentDeg % 360);
    const start = rotation;
    const end = rotation + (targetDeg * Math.PI) / 180;
    const duration = 4200;
    const t0 = performance.now();

    function easeOutCubic(t) {
      return 1 - Math.pow(1 - t, 3);
    }

    function frame(now) {
      const t = Math.min(1, (now - t0) / duration);
      rotation = start + (end - start) * easeOutCubic(t);
      drawWheel(rotation);
      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        spinning = false;
        revealReward();
      }
    }

    requestAnimationFrame(frame);
  }

  function revealReward() {
    rewardName.textContent = wonReward.label;
    const msg = encodeURIComponent(
      `Hi Naivas! I just won "${wonReward.label}" on the Spin & Win promo. My number is ${formatDisplay(phoneE164)}. I'd like to claim my reward.`
    );
    const base = whatsappGroupUrl || "https://chat.whatsapp.com/";
    // Group invites don't support prefilled text; still open the group.
    // If URL looks like wa.me (DM), append text.
    if (base.includes("wa.me") || base.includes("api.whatsapp.com")) {
      whatsappBtn.href = `${base}${base.includes("?") ? "&" : "?"}text=${msg}`;
    } else {
      whatsappBtn.href = base;
    }
    showPanel("reward");
  }

  openClaim.addEventListener("click", openOverlay);
  closeSheet.addEventListener("click", closeOverlay);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeOverlay();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !overlay.hidden) closeOverlay();
  });

  phoneInput.addEventListener("input", () => {
    phoneError.hidden = true;
    let digits = phoneInput.value.replace(/\D/g, "");
    if (digits.startsWith("254")) digits = digits.slice(3);
    if (digits.startsWith("0")) digits = digits.replace(/^0+/, "");
    if (digits.length > 0 && !digits.startsWith("7")) digits = "";
    phoneInput.value = digits.slice(0, 9);
  });

  phoneForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const normalized = normalizePhone(phoneInput.value);
    if (!normalized) {
      phoneError.textContent =
        "Enter a valid number starting with 7 (e.g. 712 345 678).";
      phoneError.hidden = false;
      phoneInput.focus();
      return;
    }

    phoneE164 = normalized;
    phoneDisplay.textContent = formatDisplay(normalized);
    try {
      localStorage.setItem(
        "naivas-promo",
        JSON.stringify({ phone: phoneE164, at: Date.now() })
      );
    } catch (_) {
      /* ignore */
    }
    showPanel("spin");
    drawWheel(rotation);
  });

  spinBtn.addEventListener("click", spinWheel);

  drawWheel(0);
})();
