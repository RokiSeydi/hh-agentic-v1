import React, { useState, useRef, useEffect } from "react";
import { Send, ChevronLeft, Heart, X, Check, Loader2 } from "lucide-react";

// For testing in Claude.ai, we'll use mock mode
// Use Vite env var in production or fall back to relative paths when hosted on same domain
const API_URL = import.meta.env?.VITE_API_URL || ""; // set VITE_API_URL in Vercel to your backend URL if separate
const MOCK_MODE = false; // Set to false when backend is running

// Mock providers for testing
const MOCK_PROVIDERS = [
  {
    id: "dr-emma-therapist",
    name: "Dr. Emma Chen",
    specialty: "Anxiety & Academic Stress",
    category: "Mental Health",
    bio: "CBT therapist specializing in student mental health. I help with exam anxiety, imposter syndrome, and stress management.",
    color: "bg-blue-100",
    accentColor: "bg-blue-600",
  },
  {
    id: "tom-osteopath",
    name: "Tom Richardson",
    specialty: "Back Pain & Posture",
    category: "Musculoskeletal",
    bio: "Osteopath with 10 years experience. I help with back pain, poor posture from desk work, and sports injuries.",
    color: "bg-green-100",
    accentColor: "bg-green-600",
  },
  {
    id: "maya-yoga",
    name: "Maya Patel",
    specialty: "Gentle Yoga & Mobility",
    category: "Movement & Fitness",
    bio: "Yoga instructor specializing in mobility for people with chronic conditions. Not your typical gym bro - I work WITH your body.",
    color: "bg-orange-100",
    accentColor: "bg-orange-600",
  },
];

function App() {
  const [view, setView] = useState("chat");
  const [conversationId] = useState(() => `conv-${Date.now()}`);
  const [messages, setMessages] = useState([
    { sender: "pea", text: "Hey there! 👋" },
    {
      sender: "pea",
      text: "I'm Pea - think of me as your supportive friend who's here to listen and help you navigate whatever's going on with your health and wellbeing. Whether you're dealing with stress, physical symptoms, mental health stuff, or just need someone to talk through what's happening, I'm here for you.",
    },
    {
      sender: "pea",
      text: "I'm all about meeting you where you're at - no judgment, just genuine support and practical help when you need it.",
    },
    {
      sender: "pea",
      text: "So what's bringing you here today? What's on your mind? 💙",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [recommendedProviders, setRecommendedProviders] = useState([]);
  const [activeTeam, setActiveTeam] = useState([]);
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input;
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      if (MOCK_MODE) {
        // Mock mode for testing
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const lowerMsg = userMessage.toLowerCase();
        const userMessageCount = messages.filter(
          (m) => m.sender === "user"
        ).length;
        let response = "";

        if (
          lowerMsg.includes("hey") ||
          lowerMsg.includes("hi") ||
          lowerMsg.includes("hello")
        ) {
          response = "Hey! 💙 Nice to meet you. What brings you here today?";
        } else if (
          lowerMsg.includes("overwhelm") ||
          lowerMsg.includes("stressed") ||
          lowerMsg.includes("anxious")
        ) {
          response =
            "Oh wow, that sounds like a lot to carry right now. 💙\n\nWhen everything's piling up like that, it's genuinely exhausting. What's feeling the heaviest right now - is it more the physical stuff, or the mental load?";
        } else if (
          lowerMsg.includes("pain") ||
          lowerMsg.includes("back") ||
          lowerMsg.includes("body")
        ) {
          response =
            "Ugh, pain is so draining. 💙 Tell me more - where's the pain and how bad is it right now, like on a scale of 1-10?";
        } else if (lowerMsg.length > 30) {
          response =
            "I hear you. That sounds like a lot. 💙\n\nIt sounds like everything's kind of feeding into each other. Tell me more about what's been going on?";
        } else {
          response =
            "I'm listening. Keep going if you want - I'm here for you. 💙";
        }

        setMessages((prev) => [...prev, { sender: "pea", text: response }]);

        if (userMessageCount >= 3) {
          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              {
                sender: "pea",
                text: "You know what... I'm thinking you might benefit from having a proper support team around you. Not just me, but specialists who can help with different parts of what you're juggling.\n\nWould you be open to meeting them? I can introduce you to some providers who could really help.",
              },
            ]);
            setTimeout(() => {
              setMessages((prev) => [
                ...prev,
                { sender: "system", action: "show_providers" },
              ]);
            }, 1000);
          }, 2000);
        }

        setIsLoading(false);
        return;
      }

      // Real API mode - STREAMING
      const response = await fetch(`${API_URL}/api/stream-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          message: userMessage,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Add empty message that we'll update
      setMessages((prev) => [...prev, { sender: "pea", text: "" }]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let isDone = false;
      let metadata = null;

      while (!isDone) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          // Skip empty lines and comments
          if (!line.trim() || line.trim().startsWith(":")) continue;
          if (!line.trim().startsWith("data:")) continue;

          try {
            const dataStr = line.replace("data:", "").trim();
            if (!dataStr) continue;

            const data = JSON.parse(dataStr);

            if (data.done) {
              isDone = true;
              metadata = data;
              break;
            }
            if (data.error) throw new Error(data.error);
            if (data.text) {
              accumulated += data.text;

              // Update the last message
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  sender: "pea",
                  text: accumulated,
                };
                return updated;
              });
            }
          } catch (e) {
            console.error("Parse error:", e.message);
          }
        }
      }

      // Check for provider recommendations
      if (
        metadata?.shouldShowProviders &&
        metadata?.recommendedProviders?.length > 0
      ) {
        setRecommendedProviders(metadata.recommendedProviders);

        setTimeout(() => {
          setMessages((prev) => [
            ...prev,
            {
              sender: "pea",
              text: "You know what... I've been thinking about everything you're juggling. Would you be open to meeting some specialists who could help? I can introduce you to a few people who might really lighten the load. 💚",
            },
          ]);

          setTimeout(() => {
            setMessages((prev) => [
              ...prev,
              { sender: "system", action: "show_providers" },
            ]);
          }, 1000);
        }, 2000);
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.text !== "");
        return [
          ...filtered,
          {
            sender: "pea",
            text: "Sorry, I'm having trouble connecting. Make sure the backend is running! 🙏",
          },
        ];
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleShowProviders = () => {
    // Use recommended providers if available, otherwise use mock
    const providers = MOCK_MODE ? MOCK_PROVIDERS : recommendedProviders;
    setRecommendedProviders(providers);
    setCurrentSwipeIndex(0);
    setView("swipe");
  };

  const handleAddProvider = (provider) => {
    setActiveTeam((prev) => [...prev, provider]);
    if (currentSwipeIndex < recommendedProviders.length - 1) {
      setCurrentSwipeIndex((prev) => prev + 1);
    } else {
      finishSwipe();
    }
  };

  const handleSkipProvider = () => {
    if (currentSwipeIndex < recommendedProviders.length - 1) {
      setCurrentSwipeIndex((prev) => prev + 1);
    } else {
      finishSwipe();
    }
  };

  const finishSwipe = () => {
    setTimeout(() => {
      setView("chat");
      const teamCount = activeTeam.length;
      if (teamCount > 0) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "pea",
            text: `Perfect! I've added ${teamCount + 1} specialist${
              teamCount > 0 ? "s" : ""
            } to your team. 💜\n\nThey're all coordinating in the background now - I'll keep you updated on what they're handling and what needs your attention. You're not alone in this anymore.`,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "pea",
            text: "No worries! You can meet the team anytime you're ready. For now, I'm here - how can I support you today?",
          },
        ]);
      }
    }, 500);
  };

  // CHAT VIEW
  if (view === "chat") {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        {/* Header */}
        <div className="bg-white shadow-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
              <Heart className="w-5 h-5 text-white" fill="white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Pea</h1>
              <p className="text-xs text-gray-500">Your care coordinator</p>
            </div>
          </div>
          {activeTeam.length > 0 && (
            <button
              onClick={() => setView("team")}
              className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full hover:bg-purple-200 transition"
            >
              Team ({activeTeam.length})
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => {
            if (msg.action === "show_providers") {
              return (
                <div key={idx} className="flex justify-center">
                  <button
                    onClick={handleShowProviders}
                    className="bg-purple-600 text-white px-6 py-3 rounded-full hover:bg-purple-700 transition shadow-lg font-medium"
                  >
                    Meet Your Care Team ✨
                  </button>
                </div>
              );
            }

            return (
              <div
                key={idx}
                className={`flex ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${
                    msg.sender === "user"
                      ? "bg-purple-600 text-white"
                      : "bg-white text-gray-800 shadow-sm"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl shadow-sm">
                <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="bg-white border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="Message Pea..."
              disabled={isLoading}
              className="flex-1 px-4 py-3 border rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 disabled:bg-gray-100"
            />
            <button
              onClick={handleSend}
              disabled={isLoading}
              className="bg-purple-600 text-white p-3 rounded-full hover:bg-purple-700 transition disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SWIPE VIEW
  if (view === "swipe" && recommendedProviders.length > 0) {
    const currentProvider = recommendedProviders[currentSwipeIndex];

    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="bg-white shadow-sm p-4 flex items-center justify-between">
          <button
            onClick={() => setView("chat")}
            className="text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <p className="text-sm text-gray-600">
            {currentSwipeIndex + 1} of {recommendedProviders.length}
          </p>
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl shadow-xl max-w-md w-full overflow-hidden">
            <div
              className={`${
                currentProvider.color || "bg-purple-100"
              } p-8 text-center`}
            >
              <div
                className={`w-24 h-24 ${
                  currentProvider.accentColor || "bg-purple-600"
                } rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold`}
              >
                {currentProvider.name.charAt(0)}
              </div>
              <h2 className="text-2xl font-bold text-gray-800">
                {currentProvider.name}
              </h2>
              <p className="text-sm text-gray-600 mt-2">
                {currentProvider.specialty}
              </p>
              <span className="inline-block mt-2 text-xs bg-white/50 px-3 py-1 rounded-full text-gray-700">
                {currentProvider.category}
              </span>
            </div>

            <div className="p-6">
              <p className="text-gray-700 leading-relaxed mb-6">
                {currentProvider.bio}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleSkipProvider}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-gray-50 transition"
                >
                  <X className="w-5 h-5" />
                  Maybe Later
                </button>
                <button
                  onClick={() => handleAddProvider(currentProvider)}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-full flex items-center justify-center gap-2 hover:bg-purple-700 transition"
                >
                  <Check className="w-5 h-5" />
                  Add to Team
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TEAM VIEW
  if (view === "team") {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="bg-white shadow-sm p-4 flex items-center gap-3">
          <button
            onClick={() => setView("chat")}
            className="text-gray-600 hover:text-gray-800"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg">Your Care Team</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTeam.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>No specialists added yet.</p>
              <p className="text-sm mt-2">Chat with Pea to build your team!</p>
            </div>
          ) : (
            activeTeam.map((provider, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4"
              >
                <div
                  className={`w-12 h-12 ${
                    provider.accentColor || "bg-purple-600"
                  } rounded-full flex items-center justify-center text-white font-bold`}
                >
                  {provider.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">
                    {provider.name}
                  </h3>
                  <p className="text-sm text-gray-600">{provider.specialty}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }
}

export default App;
