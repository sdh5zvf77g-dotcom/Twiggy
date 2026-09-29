// Twiggy Web App - Works on iPhone Safari
// Remembers conversations + can grow with knowledge packs

let knowledge = JSON.parse(JSON.stringify(defaultKnowledge));
let chatHistory = [];
let voiceEnabled = false;

// Load saved data from the phone
function loadData() {
  try {
    const savedKnowledge = localStorage.getItem("twiggy_knowledge");
    if (savedKnowledge) {
      knowledge = JSON.parse(savedKnowledge);
    }

    const savedChat = localStorage.getItem("twiggy_chat");
    if (savedChat) {
      chatHistory = JSON.parse(savedChat);
      renderChat();
    } else {
      // First time greeting
      addMessage("twiggy", "Hey. I'm Twiggy.\nI only speak English and I can grow when you teach me new things.\nWhat do you need?");
    }
  } catch (e) {
    console.log("Could not load saved data");
  }
}

function saveData() {
  localStorage.setItem("twiggy_knowledge", JSON.stringify(knowledge));
  localStorage.setItem("twiggy_chat", JSON.stringify(chatHistory));
}

function addMessage(role, text) {
  chatHistory.push({ role, text, time: new Date().toISOString() });
  if (chatHistory.length > 100) chatHistory = chatHistory.slice(-100);
  saveData();
  renderChat();
}

function renderChat() {
  const chat = document.getElementById("chat");
  chat.innerHTML = "";
  chatHistory.forEach(msg => {
    const div = document.createElement("div");
    div.className = `message ${msg.role}`;
    div.textContent = msg.text;
    chat.appendChild(div);
  });
  chat.scrollTop = chat.scrollHeight;
}

// Simple English check
function isEnglish(text) {
  const cleaned = text.replace(/[0-9\s\.,!?;:'"()\-]/g, "");
  if (!cleaned) return true;
  let nonAscii = 0;
  for (let c of cleaned) {
    if (c.charCodeAt(0) > 127) nonAscii++;
  }
  return (nonAscii / cleaned.length) < 0.25;
}

// Core reply logic
function getReply(userText) {
  const t = userText.toLowerCase().trim();

  // Custom short replies
  for (const [key, reply] of Object.entries(knowledge.custom_replies || {})) {
    if (t.includes(key)) return reply;
  }

  // Human interaction examples
  for (const example of (knowledge.human_interactions || [])) {
    const userEx = (example.user || "").toLowerCase();
    if (userEx && (t.includes(userEx) || userEx.includes(t))) {
      return example.twiggy;
    }
  }

  // Knowledge / facts
  if (t.includes("what do you know") || t.includes("your knowledge") || t.includes("tell me a fact")) {
    const facts = knowledge.facts || [];
    if (facts.length) {
      return "Here's some of what I know:\n• " + facts.slice(0, 6).join("\n• ");
    }
    return "I don't have many facts yet. Use the Knowledge button to teach me.";
  }

  // Identity
  if (t.includes("who are you") || t.includes("what are you") || t.includes("your name")) {
    return (knowledge.identity || "I'm Twiggy.") + "\nI only speak English and I can grow when you teach me.";
  }

  // Clear
  if (t.includes("clear") && t.includes("memory")) {
    chatHistory = [];
    saveData();
    return "Memory cleared.";
  }

  // Voice
  if (t.includes("voice on")) {
    voiceEnabled = true;
    return "Voice enabled. I'll try to speak (if your phone allows it).";
  }
  if (t.includes("voice off")) {
    voiceEnabled = false;
    return "Voice turned off.";
  }

  // Coding
  if (t.includes("code") || t.includes("python") || t.includes("function") || t.includes("bug")) {
    return "Coding mode. Paste your code or describe what you want to build/fix and I'll help.";
  }

  // Jokes
  if (t.includes("joke") || t.includes("funny") || t.includes("make me laugh")) {
    const jokes = [
      "Why do programmers prefer dark mode? Light attracts bugs.",
      "I told my code it had commitment issues. It said: 'It's not you, it's me... I'm still in beta.'",
      "There are only 10 kinds of people: those who understand binary and those who don't."
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  // Grow / improve
  if (t.includes("grow") || t.includes("improve") || t.includes("learn") || t.includes("teach")) {
    return "You can teach me using the Knowledge button at the bottom. Add facts or examples of how I should reply. That's how I grow.";
  }

  // Help
  if (t.includes("help") || t.startsWith("how")) {
    return "Tell me the actual problem and I'll help. What do you need?";
  }

  // Default
  const openers = ["Alright.", "Okay.", "Got it.", "Interesting."];
  return openers[Math.floor(Math.random() * openers.length)] + " Tell me more so I can actually help.";
}

function speak(text) {
  if (!voiceEnabled || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 1.0;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

function sendMessage() {
  const input = document.getElementById("userInput");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  addMessage("user", text);

  // English only
  if (!isEnglish(text)) {
    const reply = "I only speak English. Please write in English.";
    setTimeout(() => {
      addMessage("twiggy", reply);
      speak(reply);
    }, 300);
    return;
  }

  const reply = getReply(text);
  setTimeout(() => {
    addMessage("twiggy", reply);
    speak(reply);
  }, 300 + Math.random() * 400);
}

// Enter key support
document.getElementById("userInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") {
    e.preventDefault();
    sendMessage();
  }
});

// Toolbar actions
function clearChat() {
  if (confirm("Clear conversation history?")) {
    chatHistory = [];
    saveData();
    renderChat();
    addMessage("twiggy", "Memory cleared. Fresh start.");
  }
}

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  const msg = voiceEnabled ? "Voice turned ON" : "Voice turned OFF";
  addMessage("system", msg);
  if (voiceEnabled) speak("Voice enabled");
}

// Knowledge modal
function showKnowledge() {
  document.getElementById("knowledgeModal").classList.remove("hidden");
  renderKnowledgeList();
  
  document.getElementById("knowType").onchange = function() {
    const isFact = this.value === "fact";
    document.getElementById("factFields").classList.toggle("hidden", !isFact);
    document.getElementById("interactionFields").classList.toggle("hidden", isFact);
  };
}

function closeKnowledge() {
  document.getElementById("knowledgeModal").classList.add("hidden");
}

function addKnowledge() {
  const type = document.getElementById("knowType").value;

  if (type === "fact") {
    const fact = document.getElementById("newFact").value.trim();
    if (!fact) return alert("Please write a fact");
    if (!knowledge.facts) knowledge.facts = [];
    knowledge.facts.push(fact);
    document.getElementById("newFact").value = "";
  } else {
    const userEx = document.getElementById("userExample").value.trim();
    const twiggyEx = document.getElementById("twiggyExample").value.trim();
    if (!userEx || !twiggyEx) return alert("Please fill both fields");
    if (!knowledge.human_interactions) knowledge.human_interactions = [];
    knowledge.human_interactions.push({ user: userEx, twiggy: twiggyEx });
    document.getElementById("userExample").value = "";
    document.getElementById("twiggyExample").value = "";
  }

  saveData();
  renderKnowledgeList();
  alert("Added! Twiggy learned something new.");
}

function renderKnowledgeList() {
  const list = document.getElementById("knowledgeList");
  let html = "<strong>Current Knowledge:</strong><br><br>";

  if (knowledge.facts && knowledge.facts.length) {
    html += "<em>Facts:</em><br>";
    knowledge.facts.forEach(f => html += `<div>• ${f}</div>`);
  }

  if (knowledge.human_interactions && knowledge.human_interactions.length) {
    html += "<br><em>Interactions:</em><br>";
    knowledge.human_interactions.forEach(i => {
      html += `<div>"${i.user}" → "${i.twiggy}"</div>`;
    });
  }

  list.innerHTML = html;
}

// Start
loadData();
