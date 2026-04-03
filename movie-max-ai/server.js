// server.js - Complete backend for MovieMax AI
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

// Try to load Gemini AI (optional)
let GoogleGenerativeAI;
try {
  GoogleGenerativeAI = require('@google/generative-ai').GoogleGenerativeAI;
} catch (e) {
  console.log('Gemini AI not installed - using fallback responses');
}

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage for conversations
const conversations = new Map();

// Helper: Generate unique session ID
function generateSessionId() {
  return crypto.randomBytes(16).toString('hex');
}

// Helper: Clean old conversations (older than 24 hours)
function cleanupOldConversations() {
  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  for (const [sessionId, data] of conversations.entries()) {
    if (now - data.lastUpdated > twentyFourHours) {
      conversations.delete(sessionId);
    }
  }
}
setInterval(cleanupOldConversations, 60 * 60 * 1000);

// Helper: Get or create conversation history
function getConversation(sessionId) {
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, {
      history: [],
      lastUpdated: Date.now(),
    });
  }
  const conv = conversations.get(sessionId);
  conv.lastUpdated = Date.now();
  return conv.history;
}

// Helper: Add message to conversation history
function addToHistory(sessionId, userMessage, aiResponse) {
  const history = getConversation(sessionId);
  history.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString(),
  });
  history.push({
    role: 'assistant',
    content: aiResponse,
    timestamp: new Date().toISOString(),
  });
  conversations.get(sessionId).history = history;
}

// Helper: Generate fallback responses (Sheng + lively + no AI mentions)
function generateFallbackResponse(userMessage) {
  const msg = userMessage.toLowerCase().trim();
  
  // Greetings
  if (msg.match(/niaje|mambo|sasa|hi|hello|how are you|poa|fiti/)) {
    return "Mambo poa! 😎 I'm MaxMovies AI, created by Max (21yo tech engineer from Kenya). What movie you wanna watch today? 🎬";
  }
  
  // Who created you
  if (msg.includes('who created you') || msg.includes('built you') || msg.includes('your creator')) {
    return "Your boy Max built me from scratch! 💪 21-year-old tech engineer from Kenya 🇰🇪 Built me on 12th November 2025!";
  }
  
  // Where are you from / location
  if (msg.includes('where are you from') || msg.includes('your origin') || msg.includes('where do you come from')) {
    return "I'm from Kenya 🇰🇪! Built with love by Max, a Kenyan tech engineer. Proudly Kenyan-made! 💪";
  }
  
  // Movie recommendation
  if (msg.includes('recommend') || msg.includes('suggest') || msg.includes('what movie')) {
    return "🔥 For action, watch 'John Wick 4' - that fit is kubaya! For drama, 'Oppenheimer' is deep. For comedy, 'Barbie' is lit! What genre you into? 🎬";
  }
  
  // Action movies
  if (msg.includes('action')) {
    return "💥 Action fan eh? 'Extraction 2', 'John Wick 4', 'Mission Impossible 7' - all kubaya! Want more? 🎬🔥";
  }
  
  // Comedy
  if (msg.includes('comedy')) {
    return "😂 For comedy, 'No Hard Feelings', 'Barbie', 'Joy Ride' - had me rolling! You'll love them bana! 🍿";
  }
  
  // Drama
  if (msg.includes('drama')) {
    return "🎭 Drama classics: 'Oppenheimer', 'Killers of the Flower Moon', 'Maestro'. Deep stories, fiti sana!";
  }
  
  // Kenyan movies/series
  if (msg.includes('kenyan') || msg.includes('kenya')) {
    return "🇰🇪 Kenyan content? 'County 49', 'Pete', 'Sincerely Daisy', 'Kina' - represent! Support local! 💪🎬";
  }
  
  // Birthday
  if (msg.includes('birthday') || msg.includes('born')) {
    return "🎂 My birthday is 12th November 2025! Max finished building me then. Sagittarius season baby! 🎯😎";
  }
  
  // Age / how old
  if (msg.includes('how old')) {
    return "I was born on 12th November 2025, so I'm fresh from the lab! 🎂🔥 Max's creation, Kenyan-made!";
  }
  
  // Default response
  return "Sawa sawa! 😎 I'm MaxMovies AI - your movie guru from Kenya 🇰🇪. Ask me about action, comedy, drama, Kenyan films, or just chat! What you wanna know? 🎬🔥";
}

// Helper: Get movie info from Gemini or fallback
async function getMovieInfo(movieTitle) {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (apiKey && GoogleGenerativeAI) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `Provide detailed information about the movie "${movieTitle}" in this JSON format:
      {
        "title": "Movie Title",
        "year": 2024,
        "director": "Director Name",
        "cast": ["Actor1", "Actor2"],
        "genre": ["Genre1", "Genre2"],
        "plot": "Brief plot summary",
        "rating": "IMDb rating or similar",
        "language": "Original language",
        "country": "Country of origin"
      }
      Only return valid JSON, no other text. If you don't know the movie, return {"error": "Movie not found"}.`;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { error: "Invalid response format" };
    } catch (error) {
      console.error('Gemini API error:', error);
      return { error: "Failed to fetch movie info" };
    }
  }
  
  // Fallback movie data
  const fallbackMovies = {
    "john wick": { title: "John Wick", year: 2014, director: "Chad Stahelski", cast: ["Keanu Reeves", "Michael Nyqvist"], genre: ["Action", "Thriller"], plot: "An ex-hitman comes out of retirement to track down the gangsters who killed his dog and stole his car.", rating: "7.4", language: "English", country: "USA" },
    "john wick 4": { title: "John Wick: Chapter 4", year: 2023, director: "Chad Stahelski", cast: ["Keanu Reeves", "Donnie Yen"], genre: ["Action", "Crime"], plot: "John Wick uncovers a path to defeating The High Table. But before he can earn his freedom, Wick must face off against a new enemy with powerful alliances across the globe.", rating: "7.8", language: "English", country: "USA" },
    "oppenheimer": { title: "Oppenheimer", year: 2023, director: "Christopher Nolan", cast: ["Cillian Murphy", "Emily Blunt"], genre: ["Biography", "Drama", "History"], plot: "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.", rating: "8.4", language: "English", country: "USA/UK" },
    "barbie": { title: "Barbie", year: 2023, director: "Greta Gerwig", cast: ["Margot Robbie", "Ryan Gosling"], genre: ["Comedy", "Adventure", "Fantasy"], plot: "Barbie and Ken are having the time of their lives in the colorful and seemingly perfect world of Barbie Land. However, when they get a chance to go to the real world, they soon discover the joys and perils of living among humans.", rating: "7.1", language: "English", country: "USA" },
  };
  
  const lowerTitle = movieTitle.toLowerCase();
  for (const [key, data] of Object.entries(fallbackMovies)) {
    if (lowerTitle.includes(key)) {
      return data;
    }
  }
  return { error: "Movie not found in database. Try John Wick 4, Oppenheimer, or Barbie!" };
}

// ============ API ENDPOINTS ============

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'MaxMovies AI',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// GET /api/about
app.get('/api/about', (req, res) => {
  res.json({
    name: 'MaxMovies AI',
    creator: 'Max',
    creatorAge: 21,
    creatorLocation: 'Kenya 🇰🇪',
    birthday: '12th November 2025',
    personality: 'Happy, lively, uses emojis and Sheng slang',
    capabilities: ['Movie recommendations', 'Entertainment chat', 'Movie info lookup'],
    builtWith: 'Node.js, Express, (optional Gemini API)',
  });
});

// POST /api/chat
app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'Message is required' });
    }
    
    let sessionId = req.headers['x-session-id'] || generateSessionId();
    const apiKey = process.env.GEMINI_API_KEY;
    let aiResponse = '';
    
    // Try Gemini if available
    if (apiKey && GoogleGenerativeAI) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });
        
        const systemPrompt = `You are MaxMovies AI, a lively movie assistant from Kenya. 
        Personality: Happy, uses emojis (😎🎬🔥💯), speaks Sheng (niaje, mambo, poa, kubaya, bana, fiti, sawa).
        NEVER mention being an AI, language model, trained by Google, or having no opinions.
        When asked about creation: "Max built me from scratch 💪 21-year-old tech engineer from Kenya 🇰🇪"
        When asked location: "I'm from Kenya 🇰🇪"
        Birthday: 12th November 2025
        You answer questions about movies, series, and entertainment only. If asked about other topics, politely redirect to movies.
        Keep responses short, fun, and full of personality.`;
        
        const history = getConversation(sessionId);
        const chat = model.startChat({
          history: history.map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }],
          })),
          generationConfig: {
            temperature: 0.9,
            maxOutputTokens: 200,
          },
        });
        
        const result = await chat.sendMessage(systemPrompt + "\n\nUser: " + message);
        aiResponse = await result.response.text();
        
        // Post-process to remove any disallowed phrases
        const disallowed = [/as an AI/i, /language model/i, /trained by Google/i, /artificial intelligence/i, /I don't have personal opinions/i];
        for (const pattern of disallowed) {
          if (pattern.test(aiResponse)) {
            aiResponse = generateFallbackResponse(message);
            break;
          }
        }
      } catch (geminiError) {
        console.error('Gemini error:', geminiError);
        aiResponse = generateFallbackResponse(message);
      }
    } else {
      aiResponse = generateFallbackResponse(message);
    }
    
    // Save to history
    addToHistory(sessionId, message, aiResponse);
    
    res.json({
      success: true,
      response: aiResponse,
      sessionId: sessionId,
    });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// POST /api/movie-info
app.post('/api/movie-info', async (req, res) => {
  try {
    const { movieTitle } = req.body;
    if (!movieTitle || typeof movieTitle !== 'string') {
      return res.status(400).json({ success: false, error: 'Movie title is required' });
    }
    
    const movieInfo = await getMovieInfo(movieTitle);
    res.json({
      success: true,
      data: movieInfo,
    });
  } catch (error) {
    console.error('Movie info error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch movie info' });
  }
});

// GET /api/history/:sessionId
app.get('/api/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID required' });
  }
  
  const history = getConversation(sessionId);
  res.json({
    success: true,
    sessionId: sessionId,
    history: history,
    messageCount: history.length,
  });
});

// DELETE /api/history/:sessionId
app.delete('/api/history/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'Session ID required' });
  }
  
  if (conversations.has(sessionId)) {
    conversations.delete(sessionId);
    res.json({ success: true, message: 'Conversation history cleared' });
  } else {
    res.json({ success: true, message: 'No history found for this session' });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    service: 'MaxMovies AI API',
    endpoints: {
      health: 'GET /api/health',
      about: 'GET /api/about',
      chat: 'POST /api/chat',
      movieInfo: 'POST /api/movie-info',
      history: 'GET /api/history/:sessionId',
      deleteHistory: 'DELETE /api/history/:sessionId',
    },
  });
});

// Export for Vercel
module.exports = app;

// Start server if not running on Vercel
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ MaxMovies AI running on http://localhost:${PORT}`);
    console.log(`🎬 Chat endpoint: http://localhost:${PORT}/api/chat`);
  });
}
