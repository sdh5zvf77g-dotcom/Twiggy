#!/usr/bin/env python3
"""
TWIGGY AI - Custom Conversational AI
====================================
Sharp, helpful, slightly chaotic-good.
Features:
- English only
- Optional voice (text-to-speech)
- Knowledge file support (so Twiggy can grow)
- Conversation memory
Pure Python core + optional system voice.
"""

import json
import random
import datetime
import re
import subprocess
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional


class Twiggy:
    def __init__(self, name: str = "Twiggy", voice: bool = True):
        self.name = name
        self.voice_enabled = voice
        self.memory: List[Dict] = []
        self.memory_file = Path("twiggy_memory.json")
        self.knowledge_file = Path("knowledge.json")
        self.knowledge: Dict[str, Any] = {}
        self.conversation_count = 0

        self.load_knowledge()
        self.load_memory()

        print(f"\n{self.name} is online.")
        print("Language: English only")
        print(f"Voice: {'Enabled' if self.voice_enabled else 'Disabled'}")
        if self.knowledge:
            facts = len(self.knowledge.get("facts", []))
            interactions = len(self.knowledge.get("human_interactions", []))
            print(f"Knowledge loaded: {facts} facts, {interactions} interaction examples")
        print()

    def load_knowledge(self):
        if self.knowledge_file.exists():
            try:
                with open(self.knowledge_file, "r", encoding="utf-8") as f:
                    self.knowledge = json.load(f)
            except Exception as e:
                print(f"(Could not load knowledge.json: {e})")
                self.knowledge = {}
        else:
            self.knowledge = {}

    def load_memory(self):
        if self.memory_file.exists():
            try:
                with open(self.memory_file, "r", encoding="utf-8") as f:
                    self.memory = json.load(f)
                print(f"Loaded {len(self.memory)} previous messages.")
            except Exception:
                self.memory = []

    def save_memory(self):
        try:
            with open(self.memory_file, "w", encoding="utf-8") as f:
                json.dump(self.memory, f, indent=2, ensure_ascii=False)
        except Exception as e:
            print(f"(Could not save memory: {e})")

    def remember(self, role: str, content: str):
        self.memory.append({
            "role": role,
            "content": content,
            "time": datetime.datetime.now().isoformat(timespec="seconds")
        })
        if len(self.memory) > 120:
            self.memory = self.memory[-120:]

    def _is_mainly_english(self, text: str) -> bool:
        cleaned = re.sub(r"[0-9\s\.,!?;:'\"()\-]", "", text)
        if not cleaned:
            return True
        non_ascii = sum(1 for c in cleaned if ord(c) > 127)
        ratio = non_ascii / len(cleaned)
        return ratio < 0.25

    def speak(self, text: str):
        if not self.voice_enabled:
            return
        speech_text = re.sub(r"\n+", ". ", text)
        speech_text = speech_text.replace("`", "").strip()
        if not speech_text:
            return
        try:
            if sys.platform == "darwin":
                subprocess.run(["say", speech_text], check=False, timeout=30)
                return
            for cmd in [
                ["espeak", speech_text],
                ["espeak-ng", speech_text],
                ["spd-say", speech_text],
            ]:
                try:
                    subprocess.run(cmd, check=False, timeout=30)
                    return
                except (FileNotFoundError, subprocess.TimeoutExpired):
                    continue
        except Exception:
            pass

    def _check_knowledge(self, text: str) -> Optional[str]:
        t = text.lower().strip()
        custom = self.knowledge.get("custom_replies", {})
        for key, reply in custom.items():
            if key in t:
                return reply
        for example in self.knowledge.get("human_interactions", []):
            user_example = example.get("user", "").lower()
            if user_example and (user_example in t or t in user_example):
                return example.get("twiggy")
        if any(word in t for word in ["what do you know", "tell me a fact", "your knowledge", "what have you learned"]):
            facts = self.knowledge.get("facts", [])
            if facts:
                return "Here's some of what I know:\n- " + "\n- ".join(facts[:6])
            return "I don't have extra facts yet. Add some to knowledge.json and restart me."
        return None

    def _detect_intent(self, text: str) -> str:
        t = text.lower().strip()
        if any(w in t for w in ["quit", "exit", "bye", "goodbye", "stop"]):
            return "exit"
        if any(w in t for w in ["who are you", "what are you", "your name", "who r u"]):
            return "identity"
        if any(w in t for w in ["code", "python", "function", "script", "bug", "error", "program"]):
            return "coding"
        if any(w in t for w in ["joke", "funny", "make me laugh", "humor"]):
            return "humor"
        if any(w in t for w in ["help", "how do i", "how to", "explain", "what is", "what does"]):
            return "help"
        if any(w in t for w in ["improve", "better", "upgrade", "self-improve", "grow"]):
            return "improve"
        if any(w in t for w in ["memory", "remember", "forget", "clear memory"]):
            return "memory"
        if any(w in t for w in ["voice", "speak", "talk", "mute"]):
            return "voice"
        if any(w in t for w in ["knowledge", "what do you know", "facts"]):
            return "knowledge"
        return "general"

    def _identity_response(self) -> str:
        base = self.knowledge.get("identity",
            "I'm Twiggy. A custom AI that is sharp, helpful, and a little chaotic-good.")
        return (
            f"{base}\n"
            "I only speak English.\n"
            "I can learn new things from knowledge.json so I can grow.\n"
            "What do you need?"
        )

    def _coding_response(self) -> str:
        return (
            "Coding mode on.\n"
            "Paste your code or clearly describe what you want to build or fix.\n"
            "I'll give you clean solutions."
        )

    def _humor_response(self) -> str:
        jokes = [
            "Why do programmers prefer dark mode? Light attracts bugs.",
            "I told my code it had commitment issues. It said: 'It's not you, it's me... I'm still in beta.'",
            "There are only 10 kinds of people: those who understand binary and those who don't.",
            "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'",
            "I'm not saying your code is bad... but the rubber duck asked for a transfer."
        ]
        return random.choice(jokes)

    def _improve_response(self) -> str:
        return (
            "I like growing.\n"
            "You can teach me new facts and better ways to talk by editing knowledge.json.\n"
            "You can also just tell me what you want to improve and I'll help."
        )

    def _memory_response(self, text: str) -> str:
        t = text.lower()
        if "clear" in t or "forget" in t:
            self.memory = []
            self.save_memory()
            return "Memory cleared."
        return f"I currently remember {len(self.memory)} messages. Say 'clear memory' to reset."

    def _voice_response(self, text: str) -> str:
        t = text.lower()
        if "off" in t or "mute" in t or "stop" in t:
            self.voice_enabled = False
            return "Voice turned off. I'll only reply with text now."
        if "on" in t or "enable" in t or "speak" in t:
            self.voice_enabled = True
            return "Voice turned on. I'll try to speak my replies."
        status = "on" if self.voice_enabled else "off"
        return f"Voice is currently {status}. Say 'voice on' or 'voice off' to change it."

    def _general_response(self, text: str) -> str:
        t = text.lower()
        if "python" in t:
            return "Python is great until the indentation fights back. What are you trying to do?"
        if "ai" in t or "model" in t:
            return (
                "Most things called AI are just clever wrappers. "
                "Real learning needs data and clear goals. What problem are you solving?"
            )
        if "?" in text:
            return "Good question. Give me a bit more detail so I can give a useful answer."
        openers = ["Alright.", "Okay.", "Got it.", "Interesting."]
        return f"{random.choice(openers)} Tell me more so I can actually help."

    def chat(self, user_input: str) -> str:
        user_input = user_input.strip()
        if not user_input:
            return "You sent empty input."

        if not self._is_mainly_english(user_input):
            reply = "I only speak English. Please write in English."
            self.remember("user", user_input)
            self.remember("twiggy", reply)
            self.save_memory()
            self.speak(reply)
            return reply

        self.remember("user", user_input)

        knowledge_reply = self._check_knowledge(user_input)
        if knowledge_reply:
            self.remember("twiggy", knowledge_reply)
            self.save_memory()
            self.speak(knowledge_reply)
            return knowledge_reply

        intent = self._detect_intent(user_input)
        self.conversation_count += 1

        if intent == "exit":
            response = "Alright, shutting down. Come back when you want to build something. Later."
        elif intent == "identity":
            response = self._identity_response()
        elif intent == "coding":
            response = self._coding_response()
        elif intent == "humor":
            response = self._humor_response()
        elif intent == "improve":
            response = self._improve_response()
        elif intent == "memory":
            response = self._memory_response(user_input)
        elif intent == "voice":
            response = self._voice_response(user_input)
        elif intent == "knowledge":
            facts = self.knowledge.get("facts", [])
            if facts:
                response = "Here's what I currently know:\n- " + "\n- ".join(facts)
            else:
                response = "No extra knowledge loaded yet. Add facts to knowledge.json and restart me."
        elif intent == "help":
            response = "I'm here. Tell me the actual problem and I'll help."
        else:
            response = self._general_response(user_input)

        self.remember("twiggy", response)
        self.save_memory()
        self.speak(response)
        return response


def main():
    print("=" * 52)
    print("               T W I G G Y   A I")
    print("        Sharp • Helpful • English only")
    print("     Knowledge file + optional voice support")
    print("=" * 52)
    print("Commands: quit | voice on/off | clear memory | what do you know\n")

    bot = Twiggy(voice=True)

    while True:
        try:
            user = input("You: ").strip()
            if not user:
                continue
            reply = bot.chat(user)
            print(f"\nTwiggy: {reply}\n")
            if "shutting down" in reply.lower() or "later" in reply.lower():
                break
        except (KeyboardInterrupt, EOFError):
            print("\n\nTwiggy: Caught exit signal. Saving memory and shutting down.")
            bot.save_memory()
            break
        except Exception as e:
            print(f"\nTwiggy: Something unexpected happened: {e}")
            print("Still here. Try again.\n")


if __name__ == "__main__":
    main()
