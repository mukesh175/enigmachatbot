/**
 * LeadBot embeddable widget — flow engine.
 * Usage: <script src="https://yourdomain.com/widget.js" data-embed-key="XXXX" async></script>
 *
 * Two modes, decided by whether the campaign has botConfig.flow configured:
 *
 * 1. FLOW MODE (guided): botConfig.flow is an array of steps:
 *    { id, type: "message"|"choice"|"contact", message, image?, options?: [{label,value,next?}], next? }
 *    - "message": shows text (+ optional image), auto-advances after a short delay
 *    - "choice": shows buttons for each option; clicking advances to that option's `next`
 *      (or the step's own `next`, or index+1)
 *    - "contact": shows email + WhatsApp inputs, submits as a lead, then a thank-you message
 *    A back button lets the visitor revisit their previous step.
 *
 * 2. FREEFORM MODE (fallback): no flow configured — falls back to open text chat
 *    powered by the LLM, same as the earlier version.
 */
(function () {
  var scriptTag = document.currentScript;
  var embedKey = scriptTag.getAttribute("data-embed-key");
  var API_BASE = new URL(scriptTag.src).origin;

  if (!embedKey) {
    console.error("[LeadBot] Missing data-embed-key attribute on script tag.");
    return;
  }

  var state = {
    conversationId: null,
    open: false,
    started: false,
    heartbeatInterval: null,
    flow: null,
    stepHistory: [], // stack of step indices visited, for the back button
    currentIndex: 0,
  };

  // ---- Host + Shadow root ----
  var host = document.createElement("div");
  host.id = "leadbot-widget-host";
  host.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:999999;";
  document.body.appendChild(host);
  var shadow = host.attachShadow({ mode: "open" });

  var style = document.createElement("style");
  style.textContent = [
    "*{box-sizing:border-box;font-family:system-ui,-apple-system,sans-serif;}",
    ".bubble{width:56px;height:56px;border-radius:50%;background:var(--lb-theme,#ed5e4e);color:#fff;",
    "display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.25);",
    "font-size:24px;border:none;transition:transform .15s;}",
    ".bubble:hover{transform:scale(1.05);}",
    ".panel{display:none;flex-direction:column;width:340px;height:480px;background:#fff;border-radius:16px;",
    "box-shadow:0 12px 40px rgba(0,0,0,.28);position:absolute;bottom:68px;right:0;overflow:hidden;}",
    ".panel.open{display:flex;}",
    ".header{background:var(--lb-theme,#ed5e4e);color:#fff;padding:14px 12px;font-size:14px;font-weight:600;",
    "display:flex;align-items:center;gap:8px;}",
    ".backBtn{background:rgba(255,255,255,.18);border:none;color:#fff;width:26px;height:26px;border-radius:8px;",
    "cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;}",
    ".backBtn:disabled{opacity:0;pointer-events:none;}",
    ".messages{flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:10px;background:#faf9ff;}",
    ".msg{max-width:82%;padding:9px 13px;border-radius:12px;font-size:13px;line-height:1.45;}",
    ".msg.bot{background:#eee7ff;color:#2c1670;align-self:flex-start;}",
    ".msg.visitor{background:var(--lb-theme,#ed5e4e);color:#fff;align-self:flex-end;}",
    ".stepImage{width:100%;border-radius:12px;margin-bottom:4px;max-height:160px;object-fit:cover;}",
    ".optionsWrap{display:flex;flex-direction:column;gap:8px;margin-top:4px;}",
    ".optionBtn{background:#fff;border:1.5px solid var(--lb-theme,#ed5e4e);color:var(--lb-theme,#ed5e4e);",
    "padding:9px 14px;border-radius:10px;font-size:13px;cursor:pointer;text-align:left;font-weight:500;",
    "transition:background .15s;}",
    ".optionBtn:hover{background:#f2f0ff;}",
    ".contactForm{display:flex;flex-direction:column;gap:8px;margin-top:6px;}",
    ".contactForm input{padding:10px 12px;border:1.5px solid #ddd;border-radius:10px;font-size:13px;outline:none;}",
    ".contactForm input:focus{border-color:var(--lb-theme,#ed5e4e);}",
    ".contactForm button{background:var(--lb-theme,#ed5e4e);color:#fff;border:none;padding:10px;border-radius:10px;",
    "font-size:13px;font-weight:600;cursor:pointer;}",
    ".inputRow{display:flex;border-top:1px solid #eee;}",
    ".inputRow input{flex:1;border:none;padding:12px;font-size:13px;outline:none;}",
    ".inputRow button{border:none;background:var(--lb-theme,#ed5e4e);color:#fff;padding:0 16px;cursor:pointer;font-size:13px;}",
  ].join("");
  shadow.appendChild(style);

  var wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  shadow.appendChild(wrapper);

  var bubble = document.createElement("button");
  bubble.className = "bubble";
  bubble.innerHTML = "💬";
  wrapper.appendChild(bubble);

  var panel = document.createElement("div");
  panel.className = "panel";
  panel.innerHTML =
    '<div class="header"><button class="backBtn" id="lb-back" disabled>&#8592;</button><span id="lb-header-text">Chat with us</span></div>' +
    '<div class="messages" id="lb-messages"></div>' +
    '<div class="inputRow" id="lb-inputRow">' +
    '<input id="lb-input" type="text" placeholder="Type a message..." />' +
    '<button id="lb-send">Send</button>' +
    "</div>";
  wrapper.appendChild(panel);

  var messagesEl = panel.querySelector("#lb-messages");
  var inputRow = panel.querySelector("#lb-inputRow");
  var inputEl = panel.querySelector("#lb-input");
  var sendBtn = panel.querySelector("#lb-send");
  var backBtn = panel.querySelector("#lb-back");

  function clearMessages() {
    messagesEl.innerHTML = "";
  }

  function addBotBubble(text, imageUrl) {
    if (imageUrl) {
      var img = document.createElement("img");
      img.className = "stepImage";
      img.src = imageUrl;
      messagesEl.appendChild(img);
    }
    var div = document.createElement("div");
    div.className = "msg bot";
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addVisitorBubble(text) {
    var div = document.createElement("div");
    div.className = "msg visitor";
    div.textContent = text;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function logAnswer(payload) {
    fetch(API_BASE + "/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ conversationId: state.conversationId }, payload)),
    }).catch(function () {});
  }

  function findStepIndexById(id) {
    for (var i = 0; i < state.flow.length; i++) {
      if (state.flow[i].id === id) return i;
    }
    return -1;
  }

  function renderStep(index, addToHistory) {
    if (addToHistory !== false) state.stepHistory.push(state.currentIndex);
    state.currentIndex = index;
    backBtn.disabled = state.stepHistory.length === 0;

    var step = state.flow[index];
    if (!step) return;

    if (step.type === "choice") {
      inputRow.style.display = "none";
      addBotBubble(step.message, step.image);

      var wrap = document.createElement("div");
      wrap.className = "optionsWrap";
      step.options.forEach(function (opt) {
        var btn = document.createElement("button");
        btn.className = "optionBtn";
        btn.textContent = opt.label;
        btn.addEventListener("click", function () {
          addVisitorBubble(opt.label);
          logAnswer({ stepId: step.id, answerLabel: opt.label, answerValue: opt.value });
          wrap.querySelectorAll("button").forEach(function (b) { b.disabled = true; b.style.opacity = 0.5; });

          var nextId = opt.next || step.next;
          var nextIndex = nextId ? findStepIndexById(nextId) : index + 1;
          if (nextIndex === -1 || nextIndex >= state.flow.length) {
            addBotBubble("Thanks for your answers!");
          } else {
            setTimeout(function () { renderStep(nextIndex); }, 300);
          }
        });
        wrap.appendChild(btn);
      });
      messagesEl.appendChild(wrap);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    } else if (step.type === "contact") {
      inputRow.style.display = "none";
      addBotBubble(step.message, step.image);

      var form = document.createElement("div");
      form.className = "contactForm";
      form.innerHTML =
        '<input type="email" placeholder="Your email" id="lb-email" />' +
        '<input type="tel" placeholder="WhatsApp number" id="lb-whatsapp" />' +
        '<button id="lb-contact-submit">Submit</button>';
      messagesEl.appendChild(form);
      messagesEl.scrollTop = messagesEl.scrollHeight;

      form.querySelector("#lb-contact-submit").addEventListener("click", function () {
        var email = form.querySelector("#lb-email").value.trim();
        var whatsapp = form.querySelector("#lb-whatsapp").value.trim();
        if (!email && !whatsapp) return;

        addVisitorBubble([email, whatsapp].filter(Boolean).join(" · "));
        form.querySelectorAll("input,button").forEach(function (el) { el.disabled = true; });
        logAnswer({ stepId: step.id, contact: { email: email, whatsapp: whatsapp } });

        var nextIndex = step.next ? findStepIndexById(step.next) : index + 1;
        if (nextIndex === -1 || nextIndex >= state.flow.length) {
          setTimeout(function () {
            addBotBubble("Thank you! Our team will reach out to you shortly.");
          }, 300);
        } else {
          setTimeout(function () { renderStep(nextIndex); }, 300);
        }
      });
    } else {
      // plain "message" step — auto-advance
      inputRow.style.display = "none";
      addBotBubble(step.message, step.image);
      var nextIndex = step.next ? findStepIndexById(step.next) : index + 1;
      if (nextIndex !== -1 && nextIndex < state.flow.length) {
        setTimeout(function () { renderStep(nextIndex); }, 900);
      }
    }
  }

  backBtn.addEventListener("click", function () {
    if (state.stepHistory.length === 0) return;
    var prevIndex = state.stepHistory.pop();
    clearMessages();
    renderStep(prevIndex, false);
    backBtn.disabled = state.stepHistory.length === 0;
  });

  async function startConversation() {
    if (state.started) return;
    state.started = true;

    try {
      var res = await fetch(API_BASE + "/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embedKey: embedKey,
          pageUrl: window.location.href,
          referrerUrl: document.referrer || null,
        }),
      });
      var data = await res.json();

      if (!res.ok) {
        addBotBubble("Sorry, this chat is currently unavailable.");
        return;
      }

      state.conversationId = data.conversationId;

      if (data.botConfig && data.botConfig.theme) {
        wrapper.style.setProperty("--lb-theme", data.botConfig.theme);
      }

      // Branding: custom bubble icon, header logo, and header text
      if (data.botConfig && data.botConfig.bubbleIcon) {
        bubble.innerHTML = "";
        var bubbleImg = document.createElement("img");
        bubbleImg.src = data.botConfig.bubbleIcon;
        bubbleImg.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:50%;";
        bubble.appendChild(bubbleImg);
      }

      var headerTextEl = panel.querySelector("#lb-header-text");
      if (data.botConfig && data.botConfig.headerText) {
        headerTextEl.textContent = data.botConfig.headerText;
      }
      if (data.botConfig && data.botConfig.logo) {
        var logoImg = document.createElement("img");
        logoImg.src = data.botConfig.logo;
        logoImg.style.cssText = "width:20px;height:20px;border-radius:4px;object-fit:cover;margin-right:2px;";
        headerTextEl.parentElement.insertBefore(logoImg, headerTextEl);
      }

      if (data.botConfig && Array.isArray(data.botConfig.flow) && data.botConfig.flow.length > 0) {
        state.flow = data.botConfig.flow;
        renderStep(0, false);
      } else {
        // Freeform fallback mode
        inputRow.style.display = "flex";
        addBotBubble(data.greeting);
      }

      startHeartbeat();
    } catch (e) {
      addBotBubble("Connection error. Please try again later.");
    }
  }

  function startHeartbeat() {
    if (state.heartbeatInterval) return;
    state.heartbeatInterval = setInterval(function () {
      if (!state.conversationId) return;
      fetch(API_BASE + "/api/chat/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: state.conversationId }),
      }).catch(function () {});
    }, 25000);
  }

  window.addEventListener("pagehide", function () {
    if (state.conversationId && navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify({ conversationId: state.conversationId })], { type: "application/json" });
      navigator.sendBeacon(API_BASE + "/api/chat/heartbeat", blob);
    }
  });

  async function sendFreeformMessage() {
    var text = inputEl.value.trim();
    if (!text || !state.conversationId) return;

    addVisitorBubble(text);
    inputEl.value = "";

    try {
      var res = await fetch(API_BASE + "/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: state.conversationId, text: text }),
      });
      var data = await res.json();
      if (data.reply) addBotBubble(data.reply);
    } catch (e) {
      addBotBubble("Something went wrong sending that. Please try again.");
    }
  }

  bubble.addEventListener("click", function () {
    state.open = !state.open;
    panel.classList.toggle("open", state.open);
    if (state.open) startConversation();
  });

  sendBtn.addEventListener("click", sendFreeformMessage);
  inputEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter") sendFreeformMessage();
  });
})();
