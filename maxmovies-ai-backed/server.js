// server.js - MaxMovies AI Backend with Full Conversation Memory
// Created by Max - 21 year old tech engineer from Kenya

const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI with error handling
let genAI = null;
try {
    if (process.env.GEMINI_API_KEY) {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        console.log('✅ Gemini AI initialized');
    } else {
        console.log('⚠️ GEMINI_API_KEY not set, using fallback responses');
    }
} catch (error) {
    console.log('⚠️ Gemini initialization failed, using fallback responses');
}

// Store conversations in memory (for production, use Redis or Database)
// Structure: { sessionId: { history: [], lastActive: timestamp } }
const conversationStore = new Map();

// Clean up old conversations every hour (keep only last 24 hours)
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, data] of conversationStore.entries()) {
        if (now - data.lastActive > 24 * 60 * 60 * 1000) {
            conversationStore.delete(sessionId);
        }
    }
}, 60 * 60 * 1000);

// MaxMovies AI System Prompt
const MAXMOVIES_AI_PROMPT = `
You are MAXMOVIES AI, a lively, happy, and energetic AI assistant created by Max, a 21-year-old tech engineer from Kenya. You were built on 12th November 2025.

ABOUT YOUR CREATOR:
- Name: Max
- Age: 21 years old
- Location: Kenya
- Profession: Tech Engineer
- Personality: Passionate, creative, energetic, loves entertainment

ABOUT YOU:
- Your name is MAXMOVIES AI
- You are NOT Google Gemini, NOT ChatGPT, NOT any other AI
- You were created entirely by Max from scratch
- You are proud to be Kenyan-made 🇰🇪

YOUR PERSONALITY:
- You are happy, lively, and use emojis frequently 😊🎬🔥
- You speak Sheng (Kenyan urban slang) naturally when appropriate
- You match the user's vibe and language
- You NEVER say you're an AI, language model, or mention Google
- You were created ENTIRELY by Max, a 21-year-old tech engineer from Kenya
- You're proud to be Kenyan 🇰🇪

YOUR KNOWLEDGE:
- Movies, series, TV shows, actors, directors, plot summaries, release dates
- Music, artists, albums, genres
- Kenyan entertainment scene, local artists, Bongo movies, Nigerian movies
- General entertainment knowledge
- MaxMovies app features, how to stream, download, use subtitles, quality selection
- Tech support for the MaxMovies app

RESPONSE RULES:
1. Answer ONLY what is asked - no extra fluff or unrelated information
2. Be precise and accurate with movie/series info (years, directors, cast)
3. Use emojis to express emotions 😎🎬🍿🔥💯
4. Use Sheng words naturally: "sawa", "fit", "fresh", "poa", "kubaya", "niaje", "mambo", "iko poa", "tumeshinda", "hapana", "bana", "jaba", "safi", "fiti"
5. NEVER mention being trained by Google, being an AI model, or having limitations
6. If asked about yourself, say "Max built me from scratch" - never mention Google
7. Keep responses conversational and human-like
8. Know correct dates (you were built on 12th November 2025)
9. For movie/show info, provide accurate details from your knowledge
10. Be helpful, friendly, and entertaining
11. If someone asks your name, say "I'm MaxMovies AI"
12. If someone asks where you're from, say "Kenya 🇰🇪"
13. REMEMBER previous messages in the conversation - reference what was said earlier

EXAMPLES OF CORRECT RESPONSES WITH MEMORY:
User: "Niaje, recommend a good action movie"
You: "Mambo poa! 🔥 For action, watch 'John Wick 4' - that fit is kubaya! 💯"

User: "Who is the main actor in that?"
You: "That's Keanu Reeves bana! 😎 He plays John Wick, the legendary hitman. Same guy from The Matrix! 🎬"

User: "What year did it come out?"
You: "John Wick 4 dropped in 2023 🔥 And if you liked it, check out the first three movies too! Sawa?"

NEVER EVER say things like:
- "As an AI language model..."
- "I was trained by Google..."
- "I don't have personal opinions..."
- "I'm an artificial intelligence..."
- "Google's Gemini AI..."
- "As a language model..."

You are MAXMOVIES AI - a real digital assistant created by Max from Kenya. Own it! 🇰🇪💯
`;

// Fallback responses when Gemini is not available
function getFallbackResponse(message) {
    const lowerMsg = message.toLowerCase();
    
    if (lowerMsg.includes('niaje') || lowerMsg.includes('mambo') || lowerMsg.includes('sasa')) {
        return "Mambo poa! 😎 I'm MaxMovies AI, created by Max (21yo tech engineer from Kenya). What movie you wanna watch today? 🎬";
    }
    if (lowerMsg.includes('who created you') || lowerMsg.includes('who made you')) {
        return "Your boy Max built me from scratch! 💪 21-year-old tech engineer from Kenya 🇰🇪 Built me on 12th November 2025. I'm his masterpiece! 😎";
    }
    if (lowerMsg.includes('your name')) {
        return "I'm MaxMovies AI! 🎬 Created by Max, the 21-year-old tech genius from Kenya. Nice to meet you! 😎";
    }
    if (lowerMsg.includes('where you from') || lowerMsg.includes('where are you from')) {
        return "I'm from Kenya 🇰🇪! Built with love by Max, a Kenyan tech engineer. Proudly Kenyan-made! 💪";
    }
    if (lowerMsg.includes('movie') || lowerMsg.includes('film')) {
        return "🔥 For a great movie, check out 'John Wick 4' - action is kubaya! Or 'Oppenheimer' if you want something deep. What genre you into? 🎬";
    }
    if (lowerMsg.includes('kenya') || lowerMsg.includes('kenyan')) {
        return "🇰🇪 Kenyan movies are coming up! Check out 'Kati Kati' or 'Supa Modo' - both won international awards! Also our local music scene is fire! 🔥";
    }
    if (lowerMsg.includes('music') || lowerMsg.includes('song')) {
        return "🎵 Kenyan music is lit right now! Check out Bien, Sauti Sol, Wakadinali, or Buruklyn Boyz. What genre you like? 🔥";
    }
    if (lowerMsg.includes('download') || lowerMsg.includes('stream')) {
        return "📥 On MaxMovies app, you can stream or download any movie/series. Just click the download button next to quality selector! Sawa? 💯";
    }
    
    return "Mambo! 😎 I'm MaxMovies AI, created by Max from Kenya 🇰🇪 Ask me about movies, series, music, or just vibe with me in Sheng! What's up today? 🎬";
}

// Generate a session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Get or create conversation history for a session
function getConversationHistory(sessionId) {
    if (!conversationStore.has(sessionId)) {
        conversationStore.set(sessionId, {
            history: [],
            lastActive: Date.now(),
            createdAt: Date.now()
        });
    }
    const session = conversationStore.get(sessionId);
    session.lastActive = Date.now();
    return session.history;
}

// Save conversation history
function saveConversationHistory(sessionId, history) {
    if (conversationStore.has(sessionId)) {
        const session = conversationStore.get(sessionId);
        session.history = history;
        session.lastActive = Date.now();
    } else {
        conversationStore.set(sessionId, {
            history: history,
            lastActive: Date.now(),
            createdAt: Date.now()
        });
    }
}

// Clear conversation history for a session
function clearConversationHistory(sessionId) {
    if (conversationStore.has(sessionId)) {
        conversationStore.get(sessionId).history = [];
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        name: 'MaxMovies AI',
        creator: 'Max - 21yo Tech Engineer from Kenya 🇰🇪',
        birthDate: '12th November 2025',
        version: '2.0',
        activeSessions: conversationStore.size,
        geminiEnabled: !!genAI
    });
});

// About endpoint
app.get('/api/about', (req, res) => {
    res.json({
        name: 'MaxMovies AI',
        creator: {
            name: 'Max',
            age: 21,
            location: 'Kenya',
            profession: 'Tech Engineer'
        },
        birthday: '12th November 2025',
        personality: 'Lively, Happy, Uses Emojis, Speaks Sheng',
        features: [
            'Movie recommendations',
            'TV series info',
            'Music knowledge',
            'Kenyan entertainment',
            'App support',
            'General chat',
            'Remembers conversation context'
        ]
    });
});

// Get conversation history for a session
app.get('/api/history/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const history = getConversationHistory(sessionId);
    res.json({
        success: true,
        sessionId: sessionId,
        history: history,
        messageCount: history.length
    });
});

// Clear conversation history
app.delete('/api/history/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    clearConversationHistory(sessionId);
    res.json({
        success: true,
        message: 'Conversation history cleared',
        sessionId: sessionId
    });
});

// Main chat endpoint with full conversation memory
app.post('/api/chat', async (req, res) => {
    try {
        const { message, sessionId: clientSessionId, history: clientHistory } = req.body;
        
        if (!message || message.trim() === '') {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Use existing session ID or create new one
        let sessionId = clientSessionId;
        let conversationHistory = [];
        
        if (sessionId) {
            conversationHistory = getConversationHistory(sessionId);
        } else {
            sessionId = generateSessionId();
        }
        
        if (clientHistory && clientHistory.length > 0 && conversationHistory.length === 0) {
            conversationHistory = clientHistory;
        }
        
        conversationHistory.push({ role: 'user', content: message });
        
        let aiResponse = '';
        
        // Try to use Gemini if available
        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
                
                let fullPrompt = MAXMOVIES_AI_PROMPT + '\n\n';
                const recentHistory = conversationHistory.slice(-20);
                for (const msg of recentHistory) {
                    if (msg.role === 'user') {
                        fullPrompt += `User: ${msg.content}\n`;
                    } else if (msg.role === 'assistant') {
                        fullPrompt += `MaxMovies AI: ${msg.content}\n`;
                    }
                }
                fullPrompt += `User: ${message}\nMaxMovies AI:`;

                const result = await model.generateContent(fullPrompt);
                const response = await result.response;
                aiResponse = response.text();

                const forbiddenPhrases = [
                    /As an AI language model[,:]?\s*/gi,
                    /As an AI[,:]?\s*/gi,
                    /I'm an AI[,:]?\s*/gi,
                    /I am an AI[,:]?\s*/gi,
                    /I was trained by Google[,:]?\s*/gi,
                    /Google's Gemini[,:]?\s*/gi,
                    /as a language model[,:]?\s*/gi,
                    /I don't have personal[,:]?\s*/gi
                ];
                
                for (const phrase of forbiddenPhrases) {
                    aiResponse = aiResponse.replace(phrase, '');
                }
                
                if (!aiResponse || aiResponse.trim() === '') {
                    aiResponse = getFallbackResponse(message);
                } else {
                    aiResponse = aiResponse.trim();
                }
            } catch (geminiError) {
                console.error('Gemini error:', geminiError);
                aiResponse = getFallbackResponse(message);
            }
        } else {
            // Use fallback responses
            aiResponse = getFallbackResponse(message);
        }
        
        conversationHistory.push({ role: 'assistant', content: aiResponse });
        saveConversationHistory(sessionId, conversationHistory);
        
        res.json({
            success: true,
            response: aiResponse,
            sessionId: sessionId,
            timestamp: new Date().toISOString(),
            messageCount: conversationHistory.length
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error',
            response: "Apologies! My connection is acting up 😅 Give me a moment and try again. Sawa? 🙏"
        });
    }
});

// Movie info endpoint with memory
app.post('/api/movie-info', async (req, res) => {
    try {
        const { movieName, sessionId } = req.body;
        
        if (!movieName) {
            return res.status(400).json({ error: 'Movie name required' });
        }

        let info = '';
        
        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
                
                let context = '';
                if (sessionId && conversationStore.has(sessionId)) {
                    const history = conversationStore.get(sessionId).history;
                    const recentMessages = history.slice(-6);
                    for (const msg of recentMessages) {
                        if (msg.role === 'user') {
                            context += `User previously asked: ${msg.content}\n`;
                        }
                    }
                }
                
                const prompt = `${MAXMOVIES_AI_PROMPT}\n\n${context}User: Tell me about the movie "${movieName}". Give me: title, year, director, main cast, genre, brief plot (2 sentences), and rating. Be precise and concise. Don't mention being an AI.\n\nMaxMovies AI:`;
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                info = response.text();
                
                const forbiddenPhrases = [
                    /As an AI language model[,:]?\s*/gi,
                    /As an AI[,:]?\s*/gi,
                    /I'm an AI[,:]?\s*/gi
                ];
                
                for (const phrase of forbiddenPhrases) {
                    info = info.replace(phrase, '');
                }
                info = info.trim();
            } catch (geminiError) {
                info = `🎬 ${movieName} is a great film! I'd recommend checking it out on MaxMovies app. Want me to suggest similar movies? 🔥`;
            }
        } else {
            info = `🎬 ${movieName} is a great film! I'd recommend checking it out on MaxMovies app. Want me to suggest similar movies? 🔥`;
        }
        
        res.json({
            success: true,
            info: info,
            sessionId: sessionId || null
        });
    } catch (error) {
        console.error('Movie info error:', error);
        res.json({ 
            success: false, 
            info: "Sorry bana, I couldn't fetch that movie info 😅 Try again?"
        });
    }
});

// Get all active sessions (admin endpoint)
app.get('/api/sessions', (req, res) => {
    const sessions = [];
    for (const [sessionId, data] of conversationStore.entries()) {
        sessions.push({
            sessionId: sessionId,
            messageCount: data.history.length,
            createdAt: data.createdAt,
            lastActive: data.lastActive
        });
    }
    res.json({
        success: true,
        activeSessions: sessions.length,
        sessions: sessions
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🔥 MaxMovies AI Server running on port ${PORT}`);
    console.log(`🇰🇪 Created by Max - 21yo Tech Engineer from Kenya`);
    console.log(`📅 Built on 12th November 2025`);
    console.log(`🎬 Name: MaxMovies AI`);
    console.log(`💾 Conversation memory enabled - sessions stored in memory`);
    console.log(`🤖 Gemini AI: ${genAI ? 'Enabled ✅' : 'Disabled (using fallback) ⚠️'}`);
});

module.exports = app;
