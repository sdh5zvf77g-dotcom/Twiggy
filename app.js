// Twiggy Web App - MAX version
// Remembers conversations + grows with knowledge + voice selection

let knowledge = JSON.parse(JSON.stringify(defaultKnowledge));
let chatHistory = [];
let voiceEnabled = false;
let selectedVoice = null;
let availableVoices = [];

function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith("en"));
  if (availableVoices.length && !selectedVoice) {
    // Prefer a natural English voice
    selectedVoice = availableVoices.find(v => v.name.includes("Samantha") || v.name.includes("Daniel") || v.name.includes("Google") || v.name.includes("Enhanced")) || availableVoices[0];
  }
}

if (window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function loadData() {
  try {
    const savedKnowledge = localStorage.getItem("twiggy_knowledge");
    if (savedKnowledge) knowledge = JSON.parse(savedKnowledge);

    const savedChat = localStorage.getItem("twiggy_chat");
    if (savedChat) {
      chatHistory = JSON.parse(savedChat);
      renderChat();
    } else {
      addMessage("twiggy", "Hey. I'm Twiggy.\nI only speak English and I can grow when you teach me new things.\nYou can also change my voice.\nWhat do you need?");
    }

    const savedVoice = localStorage.getItem("twiggy_voice_enabled");
    if (savedVoice === "true") voiceEnabled = true;

    const savedVoiceName = localStorage.getItem("twiggy_voice_name");
    if (savedVoiceName && availableVoices.length) {
      const found = availableVoices.find(v => v.name === savedVoiceName);
      if (found) selectedVoice = found;
    }
  } catch (e) {}
}

function saveData() {
  localStorage.setItem("twiggy_knowledge", JSON.stringify(knowledge));
  localStorage.setItem("twiggy_chat", JSON.stringify(chatHistory));
  localStorage.setItem("twiggy_voice_enabled", voiceEnabled ? "true" : "false");
  if (selectedVoice) localStorage.setItem("twiggy_voice_name", selectedVoice.name);
}

function addMessage(role, text) {
  chatHistory.push({ role, text, time: new Date().toISOString() });
  if (chatHistory.length > 120) chatHistory = chatHistory.slice(-120);
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

function isEnglish(text) {
  const cleaned = text.replace(/[0-9\s\.,!?;:'"()\-]/g, "");
  if (!cleaned) return true;
  let nonAscii = 0;
  for (let c of cleaned) if (c.charCodeAt(0) > 127) nonAscii++;
  return (nonAscii / cleaned.length) < 0.25;
}

function getReply(userText) {
  const t = userText.toLowerCase().trim();

  for (const [key, reply] of Object.entries(knowledge.custom_replies || {})) {
    if (t.includes(key)) return reply;
  }

  for (const example of (knowledge.human_interactions || [])) {
    const userEx = (example.user || "").toLowerCase();
    if (userEx && (t.includes(userEx) || userEx.includes(t))) return example.twiggy;
  }

  if (t.includes("what do you know") || t.includes("your knowledge") || t.includes("tell me a fact") || t.includes("another fact") || t.includes("more facts")) {
    const facts = knowledge.facts || [];
    if (facts.length) {
      const shuffled = [...facts].sort(() => 0.5 - Math.random());
      return "Here's some of what I know:\n• " + shuffled.slice(0, 5).join("\n• ");
    }
    return "I don't have many facts yet. Use the Knowledge button to teach me.";
  }

  if (t.includes("who are you") || t.includes("what are you") || t.includes("your name")) {
    return (knowledge.identity || "I'm Twiggy.") + "\nI only speak English and I can grow when you teach me.";
  }

  if (t.includes("clear") && t.includes("memory")) {
    chatHistory = [];
    saveData();
    return "Memory cleared.";
  }

  if (t.includes("voice on") || t.includes("enable voice") || t.includes("speak")) {
    voiceEnabled = true;
    saveData();
    return "Voice enabled. Say 'change voice' to pick a different one.";
  }
  if (t.includes("voice off") || t.includes("mute") || t.includes("stop speaking")) {
    voiceEnabled = false;
    saveData();
    return "Voice turned off.";
  }
  if (t.includes("change voice") || t.includes("different voice") || t.includes("select voice")) {
    return showVoicePicker();
  }

  if (t.includes("code") || t.includes("python") || t.includes("function") || t.includes("bug")) {
    return "Coding mode. Paste your code or describe what you want to build/fix and I'll help.";
  }

  if (t.includes("joke") || t.includes("funny") || t.includes("make me laugh")) {
    const jokes = [
      "Why do programmers prefer dark mode? Light attracts bugs.",
      "I told my code it had commitment issues. It said: 'It's not you, it's me... I'm still in beta.'",
      "There are only 10 kinds of people: those who understand binary and those who don't.",
      "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'"
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  if (t.includes("grow") || t.includes("improve") || t.includes("learn") || t.includes("teach")) {
    return "You can teach me using the Knowledge button at the bottom. Add facts or examples of how I should reply. That's how I grow.";
  }

  if (t.includes("help") || t.startsWith("how")) {
    return "Tell me the actual problem and I'll help. What do you need?";
  }

  const openers = ["Alright.", "Okay.", "Got it.", "Interesting."];
  return openers[Math.floor(Math.random() * openers.length)] + " Tell me more so I can actually help.";
}

function showVoicePicker() {
  loadVoices();
  if (!availableVoices.length) {
    return "No English voices found on this device.";
  }
  let msg = "Available English voices:\n";
  availableVoices.slice(0, 8).forEach((v, i) => {
    msg += `${i + 1}. ${v.name}${selectedVoice && selectedVoice.name === v.name ? " (current)" : ""}\n`;
  });
  msg += "\nSay a number (like 'voice 2') to select one, or just try speaking and I'll use the current voice.";
  return msg;
}

function trySelectVoice(text) {
  const match = text.match(/voice\s*(\d+)/i);
  if (match) {
    const idx = parseInt(match[1], 10) - 1;
    if (availableVoices[idx]) {
      selectedVoice = availableVoices[idx];
      saveData();
      return `Voice changed to: ${selectedVoice.name}`;
    }
  }
  return null;
}

function speak(text) {
  if (!voiceEnabled || !window.speechSynthesis) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  if (selectedVoice) utterance.voice = selectedVoice;
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

  if (!isEnglish(text)) {
    const reply = "I only speak English. Please write in English.";
    setTimeout(() => { addMessage("twiggy", reply); speak(reply); }, 300);
    return;
  }

  // Voice selection by number
  const voiceChange = trySelectVoice(text);
  if (voiceChange) {
    setTimeout(() => { addMessage("twiggy", voiceChange); speak(voiceChange); }, 300);
    return;
  }

  const reply = getReply(text);
  setTimeout(() => { addMessage("twiggy", reply); speak(reply); }, 300 + Math.random() * 400);
}

// Event listeners
document.getElementById("userInput").addEventListener("keydown", function(e) {
  if (e.key === "Enter") { e.preventDefault(); sendMessage(); }
});

document.getElementById("sendBtn").onclick = sendMessage;

document.getElementById("clearBtn").onclick = function() {
  if (confirm("Clear conversation history?")) {
    chatHistory = [];
    saveData();
    renderChat();
    addMessage("twiggy", "Memory cleared. Fresh start.");
  }
};

document.getElementById("voiceBtn").onclick = function() {
  voiceEnabled = !voiceEnabled;
  saveData();
  const msg = voiceEnabled ? "Voice turned ON. Say 'change voice' to pick a different one." : "Voice turned OFF.";
  addMessage("system", msg);
  if (voiceEnabled) speak("Voice enabled");
};

document.getElementById("knowBtn").onclick = function() {
  document.getElementById("knowledgeModal").classList.remove("hidden");
  renderKnowledgeList();
};

document.getElementById("closeKnowBtn").onclick = function() {
  document.getElementById("knowledgeModal").classList.add("hidden");
};

document.getElementById("knowType").onchange = function() {
  const isFact = this.value === "fact";
  document.getElementById("factFields").classList.toggle("hidden", !isFact);
  document.getElementById("interactionFields").classList.toggle("hidden", isFact);
};

document.getElementById("addKnowBtn").onclick = function() {
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
};

function renderKnowledgeList() {
  const list = document.getElementById("knowledgeList");
  let html = "<strong>Current Knowledge:</strong><br><br>";
  if (knowledge.facts && knowledge.facts.length) {
    html += "<em>Facts (" + knowledge.facts.length + "):</em><br>";
    knowledge.facts.slice(0, 12).forEach(f => html += "<div>• " + f + "</div>");
    if (knowledge.facts.length > 12) html += "<div>...and " + (knowledge.facts.length - 12) + " more</div>";
  }
  if (knowledge.human_interactions && knowledge.human_interactions.length) {
    html += "<br><em>Interactions (" + knowledge.human_interactions.length + "):</em><br>";
    knowledge.human_interactions.slice(0, 8).forEach(i => {
      html += "<div>\"" + i.user + "\" → \"" + i.twiggy + "\"</div>";
    });
    if (knowledge.human_interactions.length > 8) html += "<div>...and more</div>";
  }
  list.innerHTML = html;
}

// Make sure buttons exist (for compatibility with different HTML)
window.addEventListener("DOMContentLoaded", function() {
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) sendBtn.onclick = sendMessage;
});

loadData();
