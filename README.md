# aLMARi - Digital Wardrobe Manager

A React Native mobile app for managing your wardrobe digitally with AI-powered clothing analysis and outfit recommendations.

## 🌟 Features

- 📸 Camera integration for clothing capture
- 🤖 AI-powered clothing categorization using Google Gemini
- 👔 Smart outfit recommendations
- 📅 Outfit calendar with weather integration
- 🎨 Automatic color detection and analysis
- 🗄️ Local SQLite database for privacy

## 🛠️ Tech Stack

**Frontend:**

- React Native / Expo
- TypeScript
- React Navigation

**Backend:**

- Python FastAPI
- SQLite Database
- Google Gemini AI API

## 🚀 Setup

### Prerequisites

- Node.js 16+
- Python 3.8+
- Expo CLI

### Installation

1. Clone the repository

```
git clone https://github.com/Keshavaaa/aLMARi.git
cd almari
```

2. Install frontend dependencies

```
npm install
```

3. Install backend dependencies

```
cd backend
pip install -r requirements.txt
```

4. Configure environment variables

```
cp .env.template .env
```

Edit .env and add your API keys

5. Run the app

**Terminal 1 - Backend:**

```
cd backend
python -m uvicorn app.main:app --reload
```

```
npx expo start
```

## 📱 Usage

1. Launch the app on your device/emulator
2. Use the camera to capture clothing items or upload from gallery
3. AI automatically categorizes and analyzes items
4. Browse your wardrobe and create outfits
5. Add/Remove items from laundry
6. Add a sticky note on a item
7. Get weather, ocassion based outfit recommendations

## 🔐 Environment Variables

Required in `.env` file:
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
EXPO_PUBLIC_BACKEND_URL=http://localhost:8000

## 📄 License

MIT

## 👤 Author

Keshav Agarwal - Portfolio Project

---

_Built as a learning project to learn mobile app development and AI integration in mobile apps_
