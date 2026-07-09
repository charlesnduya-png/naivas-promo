(() => {
  const { rewards, whatsappGroupUrl } = window.NAIVAS_PROMO;

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
