# Twiggy AI

**Sharp • Helpful • English only • Can grow**

Twiggy is a lightweight custom AI written in pure Python.

### Features
- **English only** – refuses non-English input
- **Optional voice** – tries to speak replies (system voice)
- **Knowledge file** – teach Twiggy new facts and better replies so it can grow
- Conversation memory
- Zero required dependencies

## Quick Start

```bash
git clone https://github.com/YOUR_USERNAME/twiggy-ai.git
cd twiggy-ai
python twiggy.py
```

## Voice
Twiggy will try to speak using your system voice:
- macOS → uses `say`
- Linux → tries `espeak`, `espeak-ng`, or `spd-say`

Say `voice off` to disable speaking.  
Say `voice on` to enable it again.

## How to make Twiggy grow
Edit `knowledge.json` and add:

- New facts
- Better examples of human interactions
- Custom short replies

Then restart Twiggy. It will load the new knowledge automatically.

## Useful commands
- `who are you`
- `what do you know`
- `voice on` / `voice off`
- `clear memory`
- `quit`

## Project structure
```
twiggy-ai/
├── twiggy.py         # Main program
├── knowledge.json    # Teach Twiggy here (this is how it grows)
├── README.md
└── .gitignore
```

## License
MIT
