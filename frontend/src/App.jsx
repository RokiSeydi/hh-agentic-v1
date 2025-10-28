import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  ChevronLeft,
  Heart,
  X,
  Check,
  Loader2,
  Leaf,
} from "lucide-react";

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
    id: "sarah-disability-navigator",
    name: "Dr. Sarah Bennett",
    specialty: "Disability Rights & University Accommodations",
    category: "Disability Support",
    bio: "Disability rights advocate who helps students navigate university support systems, DSA applications, and reasonable adjustments.",
    color: "bg-purple-100",
    accentColor: "bg-purple-600",
  },
];

function App() {
  const [viewMode, setViewMode] = useState("chat-only"); // 'chat-only', 'split-screen', 'provider-chat', 'swipe', 'team'
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

  // NEW: Provider chat states
  const [activeProvider, setActiveProvider] = useState(null);
  const [providerConversations, setProviderConversations] = useState({});

  // Typing indicator state with delay
  const [showTyping, setShowTyping] = useState(false);

  // Mobile split-screen toggle (show chat or providers on mobile)
  const [mobileShowProviders, setMobileShowProviders] = useState(false);

  const messagesEndRef = useRef(null);

  // Helper function to split message into paragraphs
  const splitIntoParagraphs = (text) => {
    const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
    return paragraphs.length > 0 ? paragraphs : [text];
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, providerConversations]);

  // Add randomized delay before showing typing indicator (1-2 seconds)
  useEffect(() => {
    let timer;
    if (isLoading) {
      // Random delay between 1000ms (1s) and 2000ms (2s)
      const randomDelay = Math.floor(Math.random() * 1000) + 1000;
      timer = setTimeout(() => {
        setShowTyping(true);
      }, randomDelay);
    } else {
      setShowTyping(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  const handleAddProvider = (provider) => {
    if (!activeTeam.find((p) => p.id === provider.id)) {
      setActiveTeam((prev) => [...prev, provider]);

      // Show success message from Pea
      setMessages((prev) => [
        ...prev,
        {
          sender: "pea",
          text: `Great! I've added ${provider.name} to your care team. You can chat with them anytime 💙`,
        },
      ]);
    }

    // Move to next provider or go back to chat
    if (currentSwipeIndex < recommendedProviders.length - 1) {
      setCurrentSwipeIndex((prev) => prev + 1);
    } else {
      if (viewMode === "swipe") {
        setViewMode("chat-only");
      }
    }
  };

  const handleSkipProvider = () => {
    if (currentSwipeIndex < recommendedProviders.length - 1) {
      setCurrentSwipeIndex((prev) => prev + 1);
    } else {
      if (viewMode === "swipe") {
        setViewMode("chat-only");
      }
    }
  };

  // NEW: Start chat with a provider
  const handleStartProviderChat = (provider) => {
    setActiveProvider(provider);
    setViewMode("provider-chat");

    // Initialize conversation with provider if first time
    if (!providerConversations[provider.id]) {
      setProviderConversations((prev) => ({
        ...prev,
        [provider.id]: [
          {
            sender: "provider",
            text: `Hey! I'm ${
              provider.name
            }. Pea gave me a heads up about what you've been dealing with, so I have some context. I'm here to help with ${provider.specialty.toLowerCase()}. What would you like to focus on?`,
          },
        ],
      }));
    }
  };

  // NEW: Send message to provider
  const handleSendToProvider = async (message) => {
    if (!activeProvider || !message.trim() || isLoading) return;

    const providerId = activeProvider.id;

    // Add user message
    setProviderConversations((prev) => ({
      ...prev,
      [providerId]: [
        ...(prev[providerId] || []),
        { sender: "user", text: message },
      ],
    }));

    setInput("");
    setIsLoading(true);

    try {
      // Call backend with provider-specific system prompt
      const response = await fetch(`${API_URL}/api/provider-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: providerId,
          conversationId: `${conversationId}-${providerId}`,
          message: message,
        }),
      });

      const data = await response.json();

      // Add provider response
      setProviderConversations((prev) => ({
        ...prev,
        [providerId]: [
          ...(prev[providerId] || []),
          { sender: "provider", text: data.message },
        ],
      }));
    } catch (error) {
      console.error("Provider chat error:", error);
    } finally {
      setIsLoading(false);
    }
  };

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
              setRecommendedProviders(MOCK_PROVIDERS);
              setViewMode("split-screen"); // CHANGED: Show split-screen instead of swipe
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

      // Check if we're in serverless mode (prod) where backend returns JSON
      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("application/json")) {
        // ----- NON-STREAMING MODE (Vercel serverless) -----
        const data = await response.json();

        // Add Pea's reply
        setMessages((prev) => [...prev, { sender: "pea", text: data.message }]);

        // Provider recommendation flow - CHANGED: Show split-screen
        if (data.shouldShowProviders && data.recommendedProviders?.length > 0) {
          setRecommendedProviders(data.recommendedProviders);
          setViewMode("split-screen"); // Show split-screen instead of system message
        }
      } else {
        // ----- STREAMING MODE (local development) -----
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Add empty message that we'll update
        setMessages((prev) => [...prev, { sender: "pea", text: "" }]);

        let buffer = "";
        let fullResponse = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.text) {
                  fullResponse += data.text;
                  setMessages((prev) => {
                    const newMessages = [...prev];
                    newMessages[newMessages.length - 1].text = fullResponse;
                    return newMessages;
                  });
                }

                // CHANGED: Show split-screen when providers recommended
                if (data.done && data.shouldShowProviders) {
                  setRecommendedProviders(data.recommendedProviders || []);
                  if (data.recommendedProviders?.length > 0) {
                    setViewMode("split-screen");
                  }
                }
              } catch (e) {
                console.error("Error parsing SSE data:", e);
              }
            }
          }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => [
        ...prev,
        {
          sender: "pea",
          text: "Sorry, I'm having trouble connecting right now. Please try again in a moment.",
        },
      ]);
      setIsLoading(false);
    }
  };

  // SPLIT-SCREEN VIEW (NEW)
  if (viewMode === "split-screen") {
    return (
      <div className="flex flex-col md:flex-row h-screen bg-white">
        {/* LEFT SIDE - PEA CHAT */}
        <div
          className={`w-full md:w-1/2 border-r border-gray-200 flex flex-col ${
            mobileShowProviders ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <Leaf className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-semibold text-base">Pea</h1>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setMobileShowProviders(true)}
                className="md:hidden text-sm bg-green-700 text-white px-4 py-2 rounded-lg font-semibold shadow-lg animate-pulse-glow hover:bg-green-800 transition"
              >
                View Team 👉
              </button>
              <button
                onClick={() => setViewMode("team")}
                className="hidden md:flex text-sm text-gray-600 hover:text-gray-900 items-center gap-1"
              >
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Team</span> (
                {activeTeam.length})
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`mb-4 ${
                  msg.sender === "user" ? "flex justify-end" : ""
                }`}
              >
                {msg.sender === "pea" &&
                  splitIntoParagraphs(msg.text).map((para, pIdx) => (
                    <div
                      key={pIdx}
                      className="bg-gray-100 rounded-2xl px-4 py-2.5 mb-2 text-[15px] leading-relaxed max-w-[85%]"
                    >
                      {para}
                    </div>
                  ))}
                {msg.sender === "user" && (
                  <div className="bg-green-600 text-white rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed max-w-[85%]">
                    {msg.text}
                  </div>
                )}
                {msg.sender === "system" && msg.action === "show_providers" && (
                  <button
                    onClick={() => setViewMode("swipe")}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition"
                  >
                    Meet Your Care Team →
                  </button>
                )}
              </div>
            ))}
            {showTyping && (
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Pea is typing...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="put it into words..."
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:border-green-500 text-[15px] placeholder:text-gray-500 placeholder:opacity-90"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-green-600 text-white p-2.5 rounded-full hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE - PROVIDER CARDS */}
        <div
          className={`w-full md:w-1/2 flex flex-col bg-gray-50 max-h-screen md:max-h-none ${
            !mobileShowProviders ? "hidden md:flex" : "flex"
          }`}
        >
          <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-base">
                Your Recommended Care Team
              </h2>
              <p className="text-sm text-gray-600 mt-0.5">
                Tap a specialist to start chatting
              </p>
            </div>
            <button
              onClick={() => setMobileShowProviders(false)}
              className="md:hidden text-gray-600 hover:text-gray-900"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {recommendedProviders.map((provider, idx) => (
              <div
                key={idx}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                {/* Header with avatar and name */}
                <div className="flex items-start gap-3 mb-3">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(
                      provider.name
                    )}&background=${
                      provider.accentColor
                        ?.replace("bg-", "")
                        .replace("-600", "") || "green"
                    }&color=fff&size=128&bold=true`}
                    alt={provider.name}
                    className="w-12 h-12 rounded-full shrink-0 object-cover"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-base">
                      {provider.name}
                    </h3>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {provider.specialty}
                    </p>
                  </div>
                </div>

                {/* Credentials */}
                {provider.credentials && (
                  <div className="mb-3 pb-3 border-b border-gray-100">
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {provider.credentials}
                    </p>
                  </div>
                )}

                {/* Category badge */}
                <div className="mb-3">
                  <span className="inline-block text-xs bg-gray-100 text-gray-700 px-2.5 py-1 rounded-full font-medium">
                    {provider.category}
                  </span>
                </div>

                {/* Bio */}
                <p className="text-sm text-gray-700 leading-relaxed mb-3">
                  {provider.bio}
                </p>

                {/* AI Twin badge */}
                <div className="mb-4 pb-4 border-b border-gray-100">
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <p className="text-xs text-green-800 leading-relaxed">
                      Start by speaking to{" "}
                      <span className="font-semibold">
                        {provider.name.split(" ")[0]}'s AI
                      </span>{" "}
                      — their digital extension trained on their expertise
                    </p>
                  </div>
                </div>

                {/* Status badge */}
                {activeTeam.some((p) => p.id === provider.id) && (
                  <div className="mb-3">
                    <span className="flex items-center gap-1 text-green-600 text-xs font-semibold">
                      <Check className="w-4 h-4" />
                      In Your Team
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {!activeTeam.some((p) => p.id === provider.id) && (
                    <button
                      onClick={() => handleAddProvider(provider)}
                      className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                    >
                      Add to Team
                    </button>
                  )}
                  <button
                    onClick={() => handleStartProviderChat(provider)}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                  >
                    Chat Now
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 p-4 bg-white">
            <button
              onClick={() => setViewMode("chat-only")}
              className="w-full text-sm text-gray-600 hover:text-gray-900"
            >
              ← Back to Pea only
            </button>
          </div>
        </div>
      </div>
    );
  }

  // PROVIDER CHAT VIEW (NEW)
  if (viewMode === "provider-chat" && activeProvider) {
    const providerMessages = providerConversations[activeProvider.id] || [];

    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => setViewMode("split-screen")}
            className="text-green-600 hover:opacity-70 transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div
            className={`w-10 h-10 ${
              activeProvider.accentColor || "bg-green-600"
            } rounded-full flex items-center justify-center text-white font-semibold`}
          >
            {activeProvider.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-semibold text-base">{activeProvider.name}</h1>
            <p className="text-xs text-gray-600">{activeProvider.specialty}</p>
          </div>
          <div className="ml-auto">
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
              AI Twin
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {providerMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 ${
                msg.sender === "user" ? "flex justify-end" : ""
              }`}
            >
              {msg.sender === "provider" &&
                splitIntoParagraphs(msg.text).map((para, pIdx) => (
                  <div
                    key={pIdx}
                    className={`${
                      activeProvider.color || "bg-gray-100"
                    } rounded-2xl px-4 py-2.5 mb-2 text-[15px] leading-relaxed max-w-[85%]`}
                  >
                    {para}
                  </div>
                ))}
              {msg.sender === "user" && (
                <div className="bg-green-600 text-white rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed max-w-[85%]">
                  {msg.text}
                </div>
              )}
            </div>
          ))}
          {showTyping && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">
                {activeProvider.name} is typing...
              </span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) =>
                e.key === "Enter" && !isLoading && handleSendToProvider(input)
              }
              placeholder={`Message ${activeProvider.name}...`}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:border-green-500 text-[15px] placeholder:text-gray-500 placeholder:opacity-90"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSendToProvider(input)}
              disabled={isLoading || !input.trim()}
              className="bg-green-600 text-white p-2.5 rounded-full hover:bg-green-700 transition disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // CHAT ONLY VIEW
  if (viewMode === "chat-only") {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
            <Leaf className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-semibold text-base">Pea</h1>
          <div className="ml-auto flex gap-2">
            {activeTeam.length > 0 && (
              <button
                onClick={() => setViewMode("team")}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <Heart className="w-4 h-4" />
                Team ({activeTeam.length})
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 ${
                msg.sender === "user" ? "flex justify-end" : ""
              }`}
            >
              {msg.sender === "pea" &&
                splitIntoParagraphs(msg.text).map((para, pIdx) => (
                  <div
                    key={pIdx}
                    className="bg-gray-100 rounded-2xl px-4 py-2.5 mb-2 text-[15px] leading-relaxed max-w-[85%] animate-fade-in"
                  >
                    {para}
                  </div>
                ))}
              {msg.sender === "user" && (
                <div className="bg-green-600 text-white rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed max-w-[85%] animate-fade-in">
                  {msg.text}
                </div>
              )}
              {msg.sender === "system" && msg.action === "show_providers" && (
                <button
                  onClick={() => setViewMode("swipe")}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition animate-fade-in"
                >
                  Meet Your Care Team →
                </button>
              )}
            </div>
          ))}
          {showTyping && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Pea is typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSend()}
              placeholder="put it into words..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:outline-none focus:border-green-500 text-[15px] placeholder:text-gray-500 placeholder:opacity-90"
              disabled={isLoading}
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-green-600 text-white p-2.5 rounded-full hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SWIPE VIEW (keeping your original)
  if (viewMode === "swipe" && recommendedProviders.length > 0) {
    const currentProvider = recommendedProviders[currentSwipeIndex];

    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
          <button
            onClick={() => setViewMode("chat-only")}
            className="text-green-600 hover:opacity-70 transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            {recommendedProviders.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  idx === currentSwipeIndex
                    ? "w-6 bg-green-600"
                    : idx < currentSwipeIndex
                    ? "w-1.5 bg-green-300"
                    : "w-1.5 bg-gray-300"
                }`}
              />
            ))}
          </div>
          <div className="w-6" />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-lg max-w-md w-full overflow-hidden border border-gray-200 animate-fade-in">
            <div
              className={`${
                currentProvider.color || "bg-gray-50"
              } p-8 text-center`}
            >
              <div
                className={`w-24 h-24 ${
                  currentProvider.accentColor || "bg-green-600"
                } rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-semibold shadow-md`}
              >
                {currentProvider.name.charAt(0)}
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-1">
                {currentProvider.name}
              </h2>
              <p className="text-sm text-gray-600 font-medium mt-2">
                {currentProvider.specialty}
              </p>
              <span className="inline-block mt-3 text-xs bg-white/80 px-3 py-1 rounded-full text-gray-700 font-medium">
                {currentProvider.category}
              </span>
            </div>

            <div className="p-6">
              <p className="text-gray-700 leading-relaxed mb-6 text-[15px]">
                {currentProvider.bio}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={handleSkipProvider}
                  className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  <X className="w-4 h-4" />
                  Maybe Later
                </button>
                <button
                  onClick={() => handleAddProvider(currentProvider)}
                  className="flex-1 bg-green-600 text-white py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors font-medium text-sm"
                >
                  <Check className="w-4 h-4" />
                  Add to Team
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TEAM VIEW (keeping your original)
  if (viewMode === "team") {
    return (
      <div className="flex flex-col h-screen bg-white">
        <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
          <button
            onClick={() => setViewMode("chat-only")}
            className="text-green-600 hover:opacity-70 transition"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-semibold text-base">Your Care Team</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTeam.length === 0 ? (
            <div className="text-center text-gray-500 mt-16 animate-fade-in">
              <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <Heart className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-base font-medium text-gray-700">
                No specialists yet
              </p>
              <p className="text-sm mt-1 text-gray-500">
                Chat with Pea to build your team
              </p>
            </div>
          ) : (
            activeTeam.map((provider, idx) => (
              <div
                key={idx}
                onClick={() => handleStartProviderChat(provider)}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors cursor-pointer animate-fade-in-up"
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div
                  className={`w-12 h-12 ${
                    provider.accentColor || "bg-green-600"
                  } rounded-full flex items-center justify-center text-white font-semibold text-lg`}
                >
                  {provider.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 text-[15px]">
                    {provider.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {provider.specialty}
                  </p>
                  <span className="inline-block mt-1.5 text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                    {provider.category}
                  </span>
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
