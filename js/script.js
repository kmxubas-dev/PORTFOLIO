    window.refreshKmxIcons = () => window.lucide?.createIcons?.();

    const elements = {
      themeBtn: document.getElementById("themeBtn"),
      panelToggle: document.getElementById("panelToggle"),
      startMenuPanel: document.getElementById("startMenuPanel"),
      showDesktopBtn: document.getElementById("showDesktopBtn"),
      taskbarApps: document.getElementById("taskbarApps"),
      clockTime: document.getElementById("clockTime"),
      clockDate: document.getElementById("clockDate"),
      bootOverlay: document.getElementById("bootOverlay"),
      desktopRoot: document.getElementById("desktopRoot"),
      desktopWindows: document.getElementById("desktopWindows"),
      desktopSelectionBox: document.getElementById("desktopSelectionBox"),
      bootSequence: document.getElementById("bootSequence"),
      bootPrompt: document.getElementById("bootPrompt"),
      terminalInput: document.getElementById("terminalInput"),
      profileTabs: Array.from(document.querySelectorAll("[data-profile-tab]")),
      profilePanels: Array.from(document.querySelectorAll("[data-profile-panel]")),
      windows: Array.from(document.querySelectorAll("[data-app-window]")),
      launchers: Array.from(document.querySelectorAll("[data-app-target]")),
      quickCommandButtons: Array.from(document.querySelectorAll(".quick-commands button"))
    };

    const {
      themeBtn,
      panelToggle,
      startMenuPanel,
      showDesktopBtn,
      taskbarApps,
      clockTime,
      clockDate,
      bootOverlay,
      desktopRoot,
      desktopWindows,
      desktopSelectionBox,
      bootSequence,
      bootPrompt,
      terminalInput,
      profileTabs,
      profilePanels,
      windows,
      launchers,
      quickCommandButtons
    } = elements;

    const windowMap = new Map(windows.map(win => [win.dataset.appId, win]));
    const desktopWindowLayout = {
      profile: { left: "calc(50% - ((clamp(620px, 58vw, 960px) + clamp(340px, 28vw, 500px) + 24px) / 2))", top: 24, width: "clamp(620px, 58vw, 960px)", z: 80 },
      terminal: { left: "calc(50% - ((clamp(620px, 58vw, 960px) + clamp(340px, 28vw, 500px) + 24px) / 2) + clamp(620px, 58vw, 960px) + 24px)", top: 62, width: "clamp(340px, 28vw, 500px)", z: 74 }
    };
    const desktopStartupOrder = ["terminal", "profile"];
    const taskbarIcons = {
      profile: "file-user",
      terminal: "terminal"
    };

    let zCounter = 100;
    let dragState = null;
    let selectionState = null;
    let bootCompleted = false;
    let taskbarButtons = [];
    const motionDuration = 280;

    const refreshIcons = () => window.refreshKmxIcons();

    const animateWindow = (win, keyframes, options = {}) => {
      if (typeof win.animate !== "function") return null;
      return win.animate(keyframes, {
        duration: motionDuration,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
        fill: "both",
        ...options
      });
    };

    const placeDesktopWindow = appId => {
      const win = windowMap.get(appId);
      const layout = desktopWindowLayout[appId];
      if (!win || !layout || window.innerWidth < 768) return;
      if (win.dataset.maximized === "true") return;

      win.style.left = typeof layout.left === "number" ? layout.left + "px" : layout.left;
      win.style.top = typeof layout.top === "number" ? layout.top + "px" : layout.top;
      if (layout.width) win.style.width = layout.width;
      if (layout.height) win.style.height = layout.height;
      if (layout.z) win.style.zIndex = String(layout.z);
    };

    const syncPanelState = () => {
      const isOpen = startMenuPanel.dataset.open !== "false";
      panelToggle.setAttribute("aria-expanded", String(isOpen));
    };

    const togglePanel = force => {
      const nextState = typeof force === "boolean" ? force : startMenuPanel.dataset.open === "false";
      startMenuPanel.dataset.open = String(nextState);
      syncPanelState();
    };

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const bootLines = [
      { text: "[init] KmxOS bootstrap sequence initiated", className: "text-[color:var(--green)]" },
      { text: "[scan] loading profile tabs... OK", className: "text-[color:var(--cyan)]" },
      { text: "[scan] loading terminal command console... OK", className: "text-[#86a0ba]" },
      { text: "[tty0] interactive console ready", className: "text-[color:var(--cyan)]" },
      { text: "[launch] mounting desktop shell for Kent Mark Xavier Ubas", className: "text-[color:var(--amber)]" }
    ];

    const bootLineColors = {
      "text-[color:var(--green)]": "var(--green)",
      "text-[color:var(--cyan)]": "var(--cyan)",
      "text-[color:var(--amber)]": "var(--amber)",
      "text-[#86a0ba]": "#86a0ba"
    };

    const appendBootLine = (text, className = "") => {
      const line = document.createElement("div");
      line.className = "boot-sequence-line whitespace-pre-wrap";
      if (className) line.classList.add(className);
      if (bootLineColors[className]) line.style.color = bootLineColors[className];
      line.textContent = text;
      bootSequence.appendChild(line);
    };

    const finishBoot = () => {
      if (bootCompleted) return;
      bootCompleted = true;
      bootPrompt.textContent = "session ready";
      desktopRoot.dataset.booted = "true";
      setTimeout(() => {
        bootOverlay.dataset.hidden = "true";
      }, 220);
    };

    const runBootSequence = () => {
      bootLines.forEach((line, index) => {
        setTimeout(() => appendBootLine(line.text, line.className), 220 + index * 300);
      });

      setTimeout(finishBoot, 220 + bootLines.length * 300 + 520);
    };

    const updateClock = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
      const [timePart, meridiem] = timeString.split(" ");
      const [hours, minutes] = timePart.split(":");
      clockTime.innerHTML = `${hours}<span class="clock-separator">:</span>${minutes} ${meridiem}`;
      clockDate.textContent = now.toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric",
        year: "numeric"
      });
    };

    const focusWindow = appId => {
      const target = windowMap.get(appId);
      if (!target || target.dataset.state === "closed") return;

      zCounter += 1;
      target.style.zIndex = zCounter;

      windows.forEach(win => {
        win.dataset.focused = String(win === target);
      });

      syncWindowUI();
    };

    const focusTerminalInput = appId => {
      if (appId === "terminal") {
        terminalInput?.focus();
      }
    };

    const openWindow = (appId, options = {}) => {
      const win = windowMap.get(appId);
      if (!win) return;

      const { minimizeOnly = false, skipAnimation = false, preserveLayout = false } = options;
      const wasClosed = win.dataset.state === "closed";
      const wasMinimized = win.dataset.state === "minimized";
      const shouldAnimate = !skipAnimation && (wasClosed || wasMinimized);

      if (window.innerWidth >= 768 && wasClosed && !preserveLayout) {
        placeDesktopWindow(appId);
      }

      if (!minimizeOnly && !wasClosed && !wasMinimized) {
        focusWindow(appId);
        focusTerminalInput(appId);
        return;
      }

      win.dataset.state = minimizeOnly ? "minimized" : "open";
      win.dataset.focused = "false";

      if (shouldAnimate) {
        const fromFrames = wasMinimized
          ? [
              { opacity: 0, transform: "translateY(18px) scale(0.94)", filter: "blur(8px)" },
              { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" }
            ]
          : [
              { opacity: 0, transform: "translateY(22px) scale(0.94)", filter: "blur(10px)" },
              { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" }
            ];
        animateWindow(win, fromFrames);
      }

      focusWindow(appId);
      focusTerminalInput(appId);
    };

    const closeWindow = appId => {
      const win = windowMap.get(appId);
      if (!win) return;

      win.dataset.focused = "false";

      const finalizeClose = () => {
        win.dataset.state = "closed";
        const nextOpen = [...windowMap.values()]
          .filter(item => item.dataset.state === "open")
          .sort((a, b) => Number(b.style.zIndex || 0) - Number(a.style.zIndex || 0))[0];

        if (nextOpen) {
          focusWindow(nextOpen.dataset.appId);
        } else {
          syncWindowUI();
        }
      };

      if (window.innerWidth >= 768) {
        const animation = animateWindow(win, [
          { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
          { opacity: 0, transform: "translateY(18px) scale(0.94)", filter: "blur(10px)" }
        ]);
        if (animation) {
          animation.finished.then(finalizeClose).catch(finalizeClose);
          return;
        }
      }

      finalizeClose();
    };

    const minimizeWindow = appId => {
      const win = windowMap.get(appId);
      if (!win) return;
      if (win.dataset.state === "minimized" || win.dataset.state === "closed") return;
      win.dataset.focused = "false";

      const finalizeMinimize = () => {
        win.dataset.state = "minimized";
        syncWindowUI();
      };

      if (window.innerWidth >= 768) {
        const animation = animateWindow(win, [
          { opacity: 1, transform: "translateY(0) scale(1)", filter: "blur(0)" },
          { opacity: 0, transform: "translateY(20px) scale(0.92)", filter: "blur(8px)" }
        ]);
        if (animation) {
          animation.finished.then(finalizeMinimize).catch(finalizeMinimize);
          return;
        }
      }

      finalizeMinimize();
    };

    const toggleMaximizeWindow = appId => {
      const win = windowMap.get(appId);
      if (!win || !desktopWindows || window.innerWidth < 768) return;

      const desktopRect = desktopWindows.getBoundingClientRect();
      const isMaximized = win.dataset.maximized === "true";

      if (isMaximized) {
        win.dataset.maximized = "false";
        win.style.left = win.dataset.restoreLeft || "";
        win.style.top = win.dataset.restoreTop || "";
        win.style.width = win.dataset.restoreWidth || "";
        win.style.height = win.dataset.restoreHeight || "";
      } else {
        win.dataset.restoreLeft = win.style.left || "";
        win.dataset.restoreTop = win.style.top || "";
        win.dataset.restoreWidth = win.style.width || "";
        win.dataset.restoreHeight = win.style.height || "";
        win.dataset.maximized = "true";
        win.style.left = "12px";
        win.style.top = "12px";
        win.style.width = Math.max(320, desktopRect.width - 24) + "px";
        win.style.height = Math.max(320, desktopRect.height - 24) + "px";
      }

      win.dataset.state = "open";
      animateWindow(win, [
        { opacity: 0.94, transform: isMaximized ? "scale(0.985)" : "scale(0.97)" },
        { opacity: 1, transform: "scale(1)" }
      ], { duration: 240 });
      focusWindow(appId);
    };

    const restoreWindow = appId => {
      const win = windowMap.get(appId);
      if (!win) return;
      openWindow(appId, { preserveLayout: true });
    };

    const activateProfileTab = tabId => {
      const targetTab = profileTabs.find(tab => tab.dataset.profileTab === tabId);
      if (!targetTab) return;

      profileTabs.forEach(tab => {
        const isActive = tab === targetTab;
        tab.setAttribute("aria-selected", String(isActive));
        tab.tabIndex = isActive ? 0 : -1;
      });

      profilePanels.forEach(panel => {
        panel.hidden = panel.dataset.profilePanel !== tabId;
      });
    };

    const moveProfileTabFocus = (currentTab, direction) => {
      const currentIndex = profileTabs.indexOf(currentTab);
      if (currentIndex === -1) return;

      const nextIndex = (currentIndex + direction + profileTabs.length) % profileTabs.length;
      const nextTab = profileTabs[nextIndex];
      activateProfileTab(nextTab.dataset.profileTab);
      nextTab.focus();
    };

    const toggleTaskWindow = appId => {
      const win = windowMap.get(appId);
      if (!win) return;

      if (win.dataset.state === "closed") {
        openWindow(appId);
      } else if (win.dataset.state === "minimized") {
        restoreWindow(appId);
      } else if (win.dataset.focused === "true") {
        minimizeWindow(appId);
      } else {
        restoreWindow(appId);
      }
    };

    const syncWindowUI = () => {
      launchers.forEach(launcher => {
        const targetId = launcher.dataset.appTarget;
        const win = windowMap.get(targetId);
        const active = win && win.dataset.state !== "closed";
        launcher.dataset.active = String(active);
      });

      taskbarButtons.forEach(button => {
        const targetId = button.dataset.taskbarApp;
        const win = windowMap.get(targetId);
        if (!win) return;
        button.dataset.open = String(win.dataset.state !== "closed");
        button.dataset.minimized = String(win.dataset.state === "minimized");
        button.dataset.active = String(win.dataset.focused === "true" && win.dataset.state === "open");
      });
    };

    const buildTaskbar = () => {
      const taskMarkup = windows.map(win => {
        const title = win.dataset.appTitle;
        const id = win.dataset.appId;
        return `
          <button
            data-taskbar-app="${id}"
            data-open="${win.dataset.state !== "closed"}"
            data-active="${win.dataset.focused === "true"}"
            data-minimized="${win.dataset.state === "minimized"}"
            class="topbar-control taskbar-app relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-[0.88rem]"
            aria-label="${title}"
            title="${title}"
          >
            <i data-lucide="${taskbarIcons[id] || "app-window"}" class="h-4.5 w-4.5"></i>
            <span class="taskbar-label">${title}</span>
            <span class="taskbar-indicator absolute bottom-0.5 left-1/2 h-1 w-4 -translate-x-1/2 rounded-full bg-[linear-gradient(90deg,var(--green),var(--cyan))] transition duration-200"></span>
          </button>
        `;
      }).join("");

      taskbarApps.innerHTML = taskMarkup;
      taskbarButtons = Array.from(taskbarApps.querySelectorAll("[data-taskbar-app]"));
      refreshIcons();

      taskbarButtons.forEach(button => {
        button.addEventListener("click", () => toggleTaskWindow(button.dataset.taskbarApp));
      });
    };

    const showDesktop = () => {
      windows.forEach(win => {
        if (win.dataset.state !== "closed") {
          minimizeWindow(win.dataset.appId);
        }
      });
    };

    const updateDesktopSelection = event => {
      if (!selectionState || !desktopSelectionBox) return;

      const { originX, originY, desktopRect } = selectionState;
      const currentX = clamp(event.clientX - desktopRect.left, 0, desktopRect.width);
      const currentY = clamp(event.clientY - desktopRect.top, 0, desktopRect.height);
      const left = Math.min(originX, currentX);
      const top = Math.min(originY, currentY);
      const width = Math.abs(currentX - originX);
      const height = Math.abs(currentY - originY);

      desktopSelectionBox.style.transform = `translate(${left}px, ${top}px)`;
      desktopSelectionBox.style.width = width + "px";
      desktopSelectionBox.style.height = height + "px";
    };

    const startDesktopSelection = event => {
      if (window.innerWidth < 768) return;
      if (event.button !== 0 || dragState) return;
      if (event.target.closest(".window-shell, .desktop-shortcut, .topbar-control, .start-menu-panel")) return;
      if (!desktopWindows || !desktopSelectionBox) return;

      event.preventDefault();
      const desktopRect = desktopWindows.getBoundingClientRect();
      selectionState = {
        originX: clamp(event.clientX - desktopRect.left, 0, desktopRect.width),
        originY: clamp(event.clientY - desktopRect.top, 0, desktopRect.height),
        desktopRect
      };

      desktopSelectionBox.style.width = "0px";
      desktopSelectionBox.style.height = "0px";
      desktopSelectionBox.dataset.active = "true";
      document.body.classList.add("selecting-desktop");
      desktopWindows.setPointerCapture?.(event.pointerId);
      updateDesktopSelection(event);
    };

    const moveDesktopSelection = event => {
      updateDesktopSelection(event);
    };

    const endDesktopSelection = event => {
      if (!selectionState) return;

      selectionState = null;
      document.body.classList.remove("selecting-desktop");
      desktopWindows?.releasePointerCapture?.(event.pointerId);

      window.setTimeout(() => {
        if (!selectionState && desktopSelectionBox) {
          desktopSelectionBox.dataset.active = "false";
          desktopSelectionBox.style.width = "0px";
          desktopSelectionBox.style.height = "0px";
        }
      }, 90);
    };

    const startDrag = (event, win) => {
      if (window.innerWidth < 768) return;
      const handle = event.target.closest(".window-drag-handle");
      if (!handle) return;
      if (event.target.closest(".window-control")) return;
      if (win.dataset.maximized === "true") return;
      if (!desktopWindows) return;

      const desktopRect = desktopWindows.getBoundingClientRect();
      const winRect = win.getBoundingClientRect();

      dragState = {
        win,
        offsetX: event.clientX - winRect.left,
        offsetY: event.clientY - winRect.top,
        desktopRect
      };

      win.dataset.dragging = "true";
      document.body.classList.add("dragging");
      focusWindow(win.dataset.appId);
    };

    const moveDrag = event => {
      if (!dragState) return;

      const { win, offsetX, offsetY, desktopRect } = dragState;
      const winRect = win.getBoundingClientRect();
      const nextLeft = clamp(event.clientX - desktopRect.left - offsetX, 0, Math.max(0, desktopRect.width - winRect.width));
      const nextTop = clamp(event.clientY - desktopRect.top - offsetY, 0, Math.max(0, desktopRect.height - 80));

      win.style.left = nextLeft + "px";
      win.style.top = nextTop + "px";
    };

    const endDrag = () => {
      if (dragState?.win) {
        dragState.win.dataset.dragging = "false";
      }
      dragState = null;
      document.body.classList.remove("dragging");
    };

    const openDesktopStartupLayout = () => {
      if (window.innerWidth < 768) return;
      desktopStartupOrder.forEach((appId, index) => {
        const win = windowMap.get(appId);
        if (!win) return;
        placeDesktopWindow(appId);
        setTimeout(() => {
          openWindow(appId, { skipAnimation: false });
        }, index === 0 ? 0 : index * 85);
      });
      setTimeout(() => focusWindow("profile"), desktopStartupOrder.length * 85 + 40);
    };

    buildTaskbar();
    if (window.innerWidth >= 768) {
      openDesktopStartupLayout();
    } else {
      syncWindowUI();
    }
    syncPanelState();
    updateClock();
    setInterval(updateClock, 1000 * 30);

    panelToggle.addEventListener("click", () => togglePanel());
    showDesktopBtn.addEventListener("click", showDesktop);
    themeBtn.addEventListener("click", () => {
      document.documentElement.classList.toggle("theme-alt");
    });

    launchers.forEach(launcher => {
      launcher.addEventListener("click", () => {
        openWindow(launcher.dataset.appTarget);
        if (window.innerWidth < 1024) togglePanel(false);
      });
    });

    profileTabs.forEach(tab => {
      tab.addEventListener("click", () => activateProfileTab(tab.dataset.profileTab));
      tab.addEventListener("keydown", event => {
        if (event.key === "ArrowRight") {
          event.preventDefault();
          moveProfileTabFocus(tab, 1);
        } else if (event.key === "ArrowLeft") {
          event.preventDefault();
          moveProfileTabFocus(tab, -1);
        } else if (event.key === "Home") {
          event.preventDefault();
          activateProfileTab(profileTabs[0].dataset.profileTab);
          profileTabs[0].focus();
        } else if (event.key === "End") {
          event.preventDefault();
          const lastTab = profileTabs[profileTabs.length - 1];
          activateProfileTab(lastTab.dataset.profileTab);
          lastTab.focus();
        }
      });
    });

    windows.forEach(win => {
      win.addEventListener("pointerdown", event => startDrag(event, win));
      win.addEventListener("mousedown", () => focusWindow(win.dataset.appId));

      win.querySelectorAll("[data-window-close]").forEach(button => {
        button.addEventListener("click", event => {
          event.stopPropagation();
          closeWindow(win.dataset.appId);
        });
      });

      win.querySelectorAll("[data-window-minimize]").forEach(button => {
        button.addEventListener("click", event => {
          event.stopPropagation();
          minimizeWindow(win.dataset.appId);
        });
      });

      win.querySelectorAll("[data-window-maximize]").forEach(button => {
        button.addEventListener("click", event => {
          event.stopPropagation();
          toggleMaximizeWindow(win.dataset.appId);
        });
      });
    });

    window.addEventListener("pointermove", moveDrag);
    window.addEventListener("pointerup", endDrag);
    window.addEventListener("pointercancel", endDrag);
    desktopWindows?.addEventListener("pointerdown", startDesktopSelection);
    desktopWindows?.addEventListener("pointermove", moveDesktopSelection);
    desktopWindows?.addEventListener("pointerup", endDesktopSelection);
    desktopWindows?.addEventListener("pointercancel", endDesktopSelection);
    window.addEventListener("keydown", event => {
      if (!bootCompleted && event.key === "Enter") {
        finishBoot();
      }
    });

    const terminalOutput = document.getElementById("terminalOutput");

    const terminalLineClasses = {
      dim: "text-[#86a0ba]",
      green: "text-[color:var(--green)]",
      cyan: "text-[color:var(--cyan)]",
      amber: "text-[color:var(--amber)]",
      red: "text-[color:var(--red)]"
    };

    const printLine = (text = "", cls = "") => {
      const line = document.createElement("div");
      line.className = "mb-2 whitespace-pre-wrap";
      if (cls && terminalLineClasses[cls]) {
        line.classList.add(terminalLineClasses[cls]);
      }
      line.textContent = text;
      terminalOutput.appendChild(line);
      terminalOutput.scrollTop = terminalOutput.scrollHeight;
    };

    const printLines = lines => {
      lines.forEach(item => {
        if (typeof item === "string") printLine(item);
        else printLine(item.text, item.className || "");
      });
    };

    const commands = {
      help: () => [
        { text: "Available commands:", className: "cyan" },
        "  help        Show command list",
        "  about       Show profile summary",
        "  skills      Show tech stack",
        "  experience  Show mission log",
        "  projects    Show work modules",
        "  clear       Clear terminal output"
      ],
      about: () => [
        { text: "Kent Mark Xavier Ubas // Software Engineer", className: "green" },
        "6+ years building backend systems, APIs, desktop applications, interactive games, and Rust-based systems software.",
        "Core strengths: PHP, Laravel, JavaScript, Electron-Vue, Phaser, Rust."
      ],
      skills: () => [
        { text: "stack_inventory", className: "cyan" },
        "Languages: PHP, JavaScript, Rust, Python, C, C++",
        "Frameworks: Laravel, CodeIgniter, Electron-Vue, Phaser, Node.js, Socket.IO",
        "Databases: MySQL, SQLite",
        "Tools: Git, Docker, Postman"
      ],
      experience: () => [
        { text: "mission_log", className: "cyan" },
        "2018  WLCLIFE  OJT/Web Developer",
        "2018-2019  WLCLIFE  Backend Web Developer",
        "2020-2021  Jogxpress  Backend Web Developer",
        "2021-2025  AGuyIKnow  Game Developer / Software Developer",
        "2025-2026  Tekkio  Systems Software Engineer"
      ],
      projects: () => [
        { text: "work_modules", className: "cyan" },
        "CRM systems and e-commerce platform development",
        "Delivery and logistics backend platform work",
        "Custom eLearning games with Phaser",
        "Desktop workflow tools and automated time tracking",
        "Rust systems software for cluster coordination"
      ]
    };

    const runCommand = raw => {
      const cmd = raw.trim().toLowerCase();
      if (!cmd) return;

      printLine("kmx@os:~$ " + raw, "amber");

      if (cmd === "clear") {
        terminalOutput.innerHTML = "";
        bootTerminal();
        return;
      }

      if (commands[cmd]) {
        printLines(commands[cmd]());
      } else {
        printLine("command not found: " + cmd, "red");
        printLine('type "help" to view available commands', "dim");
      }
    };

    const bootTerminal = () => {
      printLines([
        { text: "KmxOS portfolio console initialized.", className: "green" },
        { text: "Type a command to inspect the system.", className: "dim" },
        { text: 'Suggested: about, skills, experience, projects', className: "dim" },
        ""
      ]);
    };

    terminalInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        runCommand(terminalInput.value);
        terminalInput.value = "";
      }
    });

    quickCommandButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        openWindow("terminal");
        runCommand(btn.dataset.cmd);
        terminalInput.focus();
      });
    });

    bootTerminal();
    runBootSequence();
