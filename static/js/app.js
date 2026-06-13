/**
 * =====================================================================
 *  ImageProc Studio — Frontend Application
 *  Features: Animated particle canvas, 3D card tilt, drag-and-drop,
 *            dynamic parameter forms, image processing API, toasts
 * =====================================================================
 */

document.addEventListener("DOMContentLoaded", () => {

    // ----------------------------------------------------------------
    // DOM References
    // ----------------------------------------------------------------
    const sidebar = document.getElementById("sidebar");
    const sidebarClose = document.getElementById("sidebarCloseBtn");
    const overlay = document.getElementById("sidebarOverlay");
    const hamburger = document.getElementById("hamburgerBtn");
    const themeBtn = document.getElementById("themeToggleBtn");
    const themeLabel = document.getElementById("themeLabel");

    const dropzone = document.getElementById("dropzone");
    const fileInput = document.getElementById("fileInput");
    const uploadResult = document.getElementById("uploadResult");
    const uploadThumb = document.getElementById("uploadThumb");
    const uploadMeta = document.getElementById("uploadMeta");
    const removeBtn = document.getElementById("removeBtn");

    const toolsGrid = document.getElementById("toolsGrid");
    const toolCards = toolsGrid.querySelectorAll(".tool-card");
    const paramsPanel = document.getElementById("paramsPanel");
    const paramsTitle = document.getElementById("paramsTitle");
    const processBtn = document.getElementById("processBtn");

    const originalImg = document.getElementById("originalImg");
    const originalEmpty = document.getElementById("originalEmpty");
    const originalMeta = document.getElementById("originalMeta");
    const processedImg = document.getElementById("processedImg");
    const processedEmpty = document.getElementById("processedEmpty");
    const processedMeta = document.getElementById("processedMeta");

    const downloadEmpty = document.getElementById("downloadEmpty");
    const downloadReady = document.getElementById("downloadReady");
    const downloadThumb = document.getElementById("downloadThumb");
    const downloadInfo = document.getElementById("downloadInfo");
    const downloadBtn = document.getElementById("downloadBtn");

    const statusChip = document.getElementById("statusChip");
    const statusLabel = document.getElementById("statusLabel");
    const loader = document.getElementById("loader");
    const toastStack = document.getElementById("toastStack");
    const navLinks = document.querySelectorAll(".nav-link");

    // ----------------------------------------------------------------
    // State
    // ----------------------------------------------------------------
    let currentFile = null;       // Server filename
    let selectedOp = null;       // Current operation
    let imageDetails = null;      // Uploaded image metadata

    // ----------------------------------------------------------------
    // Animated Particle Background (Canvas)
    // ----------------------------------------------------------------
    const canvas = document.getElementById("bgCanvas");
    const ctx = canvas.getContext("2d");
    let particles = [];
    let animFrameId;
    let mouseX = 0, mouseY = 0;

    function initCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        particles = [];

        const count = Math.min(80, Math.floor((canvas.width * canvas.height) / 18000));
        for (let i = 0; i < count; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 0.5,
                alpha: Math.random() * 0.3 + 0.05,
            });
        }
    }

    function drawParticles() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const isDark = document.documentElement.getAttribute("data-theme") === "dark";
        const dotColor = isDark ? "130, 140, 220" : "80, 70, 200";
        const lineColor = isDark ? "100, 110, 200" : "80, 70, 200";

        // Draw connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 150) {
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${lineColor}, ${0.06 * (1 - dist / 150)})`;
                    ctx.lineWidth = 0.5;
                    ctx.stroke();
                }
            }
        }

        // Draw and update particles
        for (const p of particles) {
            // Mouse interaction — gentle push
            const mdx = p.x - mouseX;
            const mdy = p.y - mouseY;
            const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
            if (mDist < 120 && mDist > 0) {
                const force = (120 - mDist) / 120 * 0.015;
                p.vx += (mdx / mDist) * force;
                p.vy += (mdy / mDist) * force;
            }

            p.x += p.vx;
            p.y += p.vy;

            // Dampen velocity
            p.vx *= 0.998;
            p.vy *= 0.998;

            // Wrap around edges
            if (p.x < -10) p.x = canvas.width + 10;
            if (p.x > canvas.width + 10) p.x = -10;
            if (p.y < -10) p.y = canvas.height + 10;
            if (p.y > canvas.height + 10) p.y = -10;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${dotColor}, ${p.alpha})`;
            ctx.fill();
        }

        animFrameId = requestAnimationFrame(drawParticles);
    }

    initCanvas();
    drawParticles();

    window.addEventListener("resize", () => {
        cancelAnimationFrame(animFrameId);
        initCanvas();
        drawParticles();
    });

    document.addEventListener("mousemove", (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    // ----------------------------------------------------------------
    // 3D Card Tilt Effect
    // ----------------------------------------------------------------
    document.querySelectorAll(".card-3d").forEach(card => {
        card.addEventListener("mousemove", (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const tiltX = (y - centerY) / centerY * 2;    // max ±2 degrees
            const tiltY = -(x - centerX) / centerX * 2;

            card.style.transform = `perspective(1000px) rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;

            // Move glow with cursor
            const glow = card.querySelector(".card-glow");
            if (glow) {
                glow.style.background = `radial-gradient(600px circle at ${x}px ${y}px, var(--accent-glow), transparent 60%)`;
                glow.style.opacity = "1";
            }
        });

        card.addEventListener("mouseleave", () => {
            card.style.transform = "perspective(1000px) rotateX(0) rotateY(0)";
            const glow = card.querySelector(".card-glow");
            if (glow) glow.style.opacity = "0";
        });
    });

    // ----------------------------------------------------------------
    // Theme Toggle
    // ----------------------------------------------------------------
    const savedTheme = localStorage.getItem("ip-theme") || "dark";
    applyTheme(savedTheme);

    themeBtn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme");
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        localStorage.setItem("ip-theme", next);
    });

    function applyTheme(theme) {
        document.documentElement.setAttribute("data-theme", theme);
        themeLabel.textContent = theme === "dark" ? "Dark Mode" : "Light Mode";
    }

    // ----------------------------------------------------------------
    // Sidebar (Mobile)
    // ----------------------------------------------------------------
    hamburger.addEventListener("click", () => {
        sidebar.classList.add("open");
        overlay.classList.add("active");
    });
    function closeSidebar() {
        sidebar.classList.remove("open");
        overlay.classList.remove("active");
    }
    sidebarClose.addEventListener("click", closeSidebar);
    overlay.addEventListener("click", closeSidebar);

    // ----------------------------------------------------------------
    // Navigation
    // ----------------------------------------------------------------
    navLinks.forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove("active"));
            link.classList.add("active");
            const section = document.getElementById(link.dataset.section);
            if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
            closeSidebar();
        });
    });

    // ----------------------------------------------------------------
    // Drag & Drop Upload
    // ----------------------------------------------------------------
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropzone.classList.add("dragover");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));
    dropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropzone.classList.remove("dragover");
        if (e.dataTransfer.files.length) uploadFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener("change", () => {
        if (fileInput.files.length) uploadFile(fileInput.files[0]);
    });

    // ----------------------------------------------------------------
    // Upload Handler
    // ----------------------------------------------------------------
    async function uploadFile(file) {
        const validTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!validTypes.includes(file.type)) {
            showToast("Invalid file type. Use JPG, JPEG, or PNG.", "error");
            return;
        }
        if (file.size > 16 * 1024 * 1024) {
            showToast("File exceeds 16 MB limit.", "error");
            return;
        }

        setStatus("processing", "Uploading…");
        showLoader();

        const form = new FormData();
        form.append("image", file);

        try {
            const res = await fetch("/upload", { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || "Upload failed.");

            currentFile = data.filename;
            imageDetails = data.details;

            // Show uploaded info
            uploadThumb.src = data.url;
            renderMeta(uploadMeta, data.details);
            uploadResult.classList.remove("hidden");
            dropzone.classList.add("hidden");

            // Show original preview
            originalImg.src = data.url;
            originalImg.classList.remove("hidden");
            originalEmpty.classList.add("hidden");
            renderMeta(originalMeta, data.details);
            originalMeta.classList.remove("hidden");

            // Reset processed state
            resetProcessed();

            setStatus("ready", "Ready");
            showToast("Image uploaded successfully!", "success");
        } catch (err) {
            setStatus("error", "Error");
            showToast(err.message, "error");
        } finally {
            hideLoader();
        }
    }

    // ----------------------------------------------------------------
    // Remove Image
    // ----------------------------------------------------------------
    removeBtn.addEventListener("click", () => {
        currentFile = null;
        imageDetails = null;
        selectedOp = null;
        fileInput.value = "";

        uploadResult.classList.add("hidden");
        dropzone.classList.remove("hidden");

        // Reset original preview
        originalImg.src = "";
        originalImg.classList.add("hidden");
        originalEmpty.classList.remove("hidden");
        originalMeta.classList.add("hidden");
        originalMeta.innerHTML = "";

        // Reset processed
        resetProcessed();

        // Reset tools
        toolCards.forEach(c => c.classList.remove("active"));
        paramsPanel.classList.add("hidden");
        processBtn.disabled = true;

        setStatus("ready", "Ready");
    });

    // ----------------------------------------------------------------
    // Tool Selection
    // ----------------------------------------------------------------
    toolCards.forEach(card => {
        card.addEventListener("click", () => {
            toolCards.forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            selectedOp = card.dataset.op;

            // Show correct params
            const sets = paramsPanel.querySelectorAll(".param-set");
            let hasParams = false;
            sets.forEach(s => {
                if (s.dataset.param === selectedOp) {
                    s.classList.remove("hidden");
                    hasParams = true;
                } else {
                    s.classList.add("hidden");
                }
            });

            if (hasParams) {
                paramsPanel.classList.remove("hidden");
                const opNames = {
                    resize: "Resize Parameters",
                    rotate: "Rotate Parameters",
                    blur: "Blur Parameters",
                    sharpen: "Sharpen Parameters",
                    brightness: "Brightness Parameters",
                    crop: "Crop Parameters",
                };
                paramsTitle.textContent = opNames[selectedOp] || "Parameters";
            } else {
                paramsPanel.classList.add("hidden");
            }

            // Auto-populate values from image dimensions
            if (selectedOp === "resize" && imageDetails) {
                document.getElementById("resizeWidth").value = imageDetails.width;
                document.getElementById("resizeHeight").value = imageDetails.height;
            }
            if (selectedOp === "crop" && imageDetails) {
                document.getElementById("cropLeft").value = 0;
                document.getElementById("cropTop").value = 0;
                document.getElementById("cropRight").value = imageDetails.width;
                document.getElementById("cropBottom").value = imageDetails.height;
            }

            processBtn.disabled = !currentFile;
        });
    });

    // ----------------------------------------------------------------
    // Range Slider Live Values
    // ----------------------------------------------------------------
    const sliders = [
        { id: "rotateAngle", out: "rotateVal", suffix: "°", dec: 0 },
        { id: "blurRadius", out: "blurVal", suffix: "", dec: 1 },
        { id: "sharpenFactor", out: "sharpenVal", suffix: "", dec: 1 },
        { id: "brightnessFactor", out: "brightnessVal", suffix: "", dec: 1 },
    ];
    sliders.forEach(({ id, out, suffix, dec }) => {
        const inp = document.getElementById(id);
        const outp = document.getElementById(out);
        if (inp && outp) {
            inp.addEventListener("input", () => {
                outp.textContent = parseFloat(inp.value).toFixed(dec) + suffix;
            });
        }
    });

    // ----------------------------------------------------------------
    // Process Image
    // ----------------------------------------------------------------
    processBtn.addEventListener("click", async () => {
        if (!currentFile || !selectedOp) return;

        const payload = buildPayload();
        setStatus("processing", "Processing…");
        showLoader();

        try {
            const res = await fetch("/process", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error(data.error || "Processing failed.");

            // Show processed preview
            processedImg.src = data.url;
            processedImg.classList.remove("hidden");
            processedEmpty.classList.add("hidden");
            renderMeta(processedMeta, data.details);
            processedMeta.classList.remove("hidden");

            // Show download
            downloadEmpty.classList.add("hidden");
            downloadReady.classList.remove("hidden");
            downloadThumb.src = data.url;
            renderMeta(downloadInfo, data.details);
            downloadBtn.href = `/download/${data.processed_filename}`;

            setStatus("ready", "Done");
            showToast("Image processed successfully!", "success");

            // Scroll to preview
            document.getElementById("preview-section").scrollIntoView({ behavior: "smooth" });
        } catch (err) {
            setStatus("error", "Error");
            showToast(err.message, "error");
        } finally {
            hideLoader();
        }
    });

    function buildPayload() {
        const base = { filename: currentFile, operation: selectedOp };
        switch (selectedOp) {
            case "resize":
                base.width = parseInt(document.getElementById("resizeWidth").value, 10);
                base.height = parseInt(document.getElementById("resizeHeight").value, 10);
                break;
            case "rotate":
                base.angle = parseFloat(document.getElementById("rotateAngle").value);
                break;
            case "blur":
                base.radius = parseFloat(document.getElementById("blurRadius").value);
                break;
            case "sharpen":
                base.factor = parseFloat(document.getElementById("sharpenFactor").value);
                break;
            case "brightness":
                base.factor = parseFloat(document.getElementById("brightnessFactor").value);
                break;
            case "crop":
                base.left = parseInt(document.getElementById("cropLeft").value, 10);
                base.top = parseInt(document.getElementById("cropTop").value, 10);
                base.right = parseInt(document.getElementById("cropRight").value, 10);
                base.bottom = parseInt(document.getElementById("cropBottom").value, 10);
                break;
        }
        return base;
    }

    // ----------------------------------------------------------------
    // Helper Functions
    // ----------------------------------------------------------------
    function resetProcessed() {
        processedImg.src = "";
        processedImg.classList.add("hidden");
        processedEmpty.classList.remove("hidden");
        processedMeta.classList.add("hidden");
        processedMeta.innerHTML = "";
        downloadEmpty.classList.remove("hidden");
        downloadReady.classList.add("hidden");
    }

    function renderMeta(container, details) {
        container.innerHTML = "";
        const fields = [
            { label: "Name", value: details.filename },
            { label: "Size", value: details.size },
            { label: "Resolution", value: details.resolution },
            { label: "Format", value: details.format },
        ];
        fields.forEach(f => {
            const item = document.createElement("div");
            item.className = "meta-item";
            item.innerHTML = `<span class="meta-label">${f.label}</span><span class="meta-value">${f.value}</span>`;
            container.appendChild(item);
        });
    }

    function setStatus(type, text) {
        statusChip.className = "status-chip";
        if (type !== "ready") statusChip.classList.add(type);
        statusLabel.textContent = text;
    }

    function showLoader() { loader.classList.remove("hidden"); }
    function hideLoader() { loader.classList.add("hidden"); }

    function showToast(message, type = "info") {
        const iconSVGs = {
            success: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
            error: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
            info: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
        };
        const toast = document.createElement("div");
        toast.className = `toast ${type}`;
        toast.innerHTML = `${iconSVGs[type] || iconSVGs.info}<span>${message}</span>`;
        toastStack.appendChild(toast);
        setTimeout(() => toast.remove(), 4500);
    }
});
