
import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Wand2, 
  Download, 
  Trash2, 
  AlertCircle, 
  Sparkles,
  Zap,
  Layers,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Settings,
  User,
  Map as MapIcon,
  Type as TypeIcon,
  History,
  Smile,
  Edit3,
  XCircle,
  RefreshCw,
  Globe,
  Maximize2,
  CreditCard,
  ZapOff,
  MousePointer2,
  Square,
  Mountain,
  MessageSquare,
  Send,
  X,
  Bot,
  Eye
} from 'lucide-react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { ThumbnailConfig, GeneratedThumbnail, PRESETS, TextStyle, SUGGESTED_BACKGROUNDS, SUGGESTED_ACTIONS, SUGGESTED_EXPRESSIONS, ImageSize, SelectionArea } from './types';
import { generateThumbnail } from './services/geminiService';
import { saveThumbnail, getUserThumbnails, deleteThumbnail as deleteFromFirebase, Thumbnail as FirebaseThumbnail } from './services/firebase';
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from '@clerk/clerk-react';

const LOADING_MESSAGES = [
  "Analyzing facial expressions...",
  "Applying cinematic rim lighting...",
  "Crafting high-impact typography...",
  "Optimizing for maximum click-through rate...",
  "Polishing the background gradients...",
  "Adding the secret 'viral' sauce..."
];

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export default function App() {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<{message: string, isPermission?: boolean} | null>(null);
  
  const [config, setConfig] = useState<ThumbnailConfig>({
    style: PRESETS[0].prompt,
    overlayText: 'I TRIED THIS!',
    characterAction: SUGGESTED_ACTIONS[0],
    backgroundDetails: SUGGESTED_BACKGROUNDS[0],
    facialExpression: SUGGESTED_EXPRESSIONS[0],
    textStyle: 'impact-3d',
    aspectRatio: '16:9',
    quality: 'pro',
    imageSize: '1K',
    useSearch: false,
    presetId: PRESETS[0].id,
    isEditMode: false,
    editInstruction: '',
    selectionArea: null
  });

  const [generatedThumbnails, setGeneratedThumbnails] = useState<GeneratedThumbnail[]>([]);
  const [editingThumbnailId, setEditingThumbnailId] = useState<string | null>(null);
  const [hasKey, setHasKey] = useState<boolean>(true);

  // Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: "Hello! I'm your Creative Studio Assistant. I've analyzed your current settings. Want me to suggest a more viral headline or a more dramatic background environment?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Selection logic state
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Examples modal state
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);

  // Firebase data state
  const [firebaseThumbnails, setFirebaseThumbnails] = useState<FirebaseThumbnail[]>([]);
  
  // Get current user from Clerk
  const { user, isLoaded: isUserLoaded } = useUser();

  // Subscribe to Firebase thumbnails when user is loaded and signed in
  useEffect(() => {
    if (isUserLoaded && user) {
      const unsubscribe = getUserThumbnails(user.id, (thumbnails) => {
        setFirebaseThumbnails(thumbnails);
      });
      return () => unsubscribe();
    } else {
      setFirebaseThumbnails([]);
    }
  }, [isUserLoaded, user]);

  // Example thumbnails data
  const exampleThumbnails = [
    { id: 1, title: "Gaming React", thumbnail: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=225&fit=crop", views: "2.4M" },
    { id: 2, title: "Tech Review", thumbnail: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=225&fit=crop", views: "1.8M" },
    { id: 3, title: "Viral Challenge", thumbnail: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=400&h=225&fit=crop", views: "5.1M" },
    { id: 4, title: "Coding Tutorial", thumbnail: "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400&h=225&fit=crop", views: "890K" },
    { id: 5, title: "Life Hacks", thumbnail: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=225&fit=crop", views: "3.2M" },
    { id: 6, title: "Food Review", thumbnail: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=225&fit=crop", views: "1.2M" },
  ];

  useEffect(() => {
    const checkKey = async () => {
      if ((window as any).aistudio) {
        const selected = await (window as any).aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setEditingThumbnailId(null);
        setConfig(prev => ({ ...prev, isEditMode: false, selectionArea: null }));
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSelectKey = async () => {
    if ((window as any).aistudio) {
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
      setError(null);
    }
  };

  const startEditing = (thumb: GeneratedThumbnail) => {
    setEditingThumbnailId(thumb.id);
    setSourceImage(null);
    setConfig({
      ...thumb.config,
      isEditMode: true,
      editInstruction: '',
      selectionArea: null
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingThumbnailId(null);
    setConfig(prev => ({ ...prev, isEditMode: false, editInstruction: '', selectionArea: null }));
  };

  const switchToFlash = () => {
    setConfig(prev => ({ ...prev, quality: 'flash' }));
    setError(null);
  };

  // Chat logic
  const handleSendMessage = async () => {
    if (!chatInput.trim() || isTyping) return;

    const userText = chatInput;
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const currentContext = `
        CURRENT THUMBNAIL STATE:
        - Headline: "${config.overlayText}"
        - Background: "${config.backgroundDetails}"
        - Action/Pose: "${config.characterAction}"
        - Facial Expression: "${config.facialExpression}"
      `;

      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: `You are a world-class YouTube Thumbnail Consultant. 
          Respond with EXTREME CONCISENESS. Do not use "Hello", "How can I help", or polite fillers.
          
          ${currentContext}

          STRICT RULES:
          1. NO LONG CONTENT: Responses must be short, punchy, and bulleted. Maximum 3-4 bullets total.
          2. IF ASKED "HOW CAN YOU HELP?": List exactly 3 specific things you can optimize (e.g., Headlines, Backgrounds, Drama).
          3. FORMATTING: Use **Bold** for emphasis. 
          4. NO INTRODUCTIONS: Get straight to the advice.
          5. COPY-PASTE FORMAT: Format suggestions like this:
             - **Headline:** [Punchy text]
             - **BG:** [Short visual desc]
             - **Action:** [Dramatic pose]`,
        }
      });

      const responseStream = await chat.sendMessageStream({ message: userText });
      let fullText = '';
      
      setChatMessages(prev => [...prev, { role: 'model', text: '' }]);

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text;
        if (textChunk) {
          fullText += textChunk;
          setChatMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1] = { role: 'model', text: fullText };
            return newMessages;
          });
        }
      }
    } catch (err) {
      console.error("Chat error:", err);
      setChatMessages(prev => [...prev, { role: 'model', text: "Error. Try again." }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Selection event handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!config.isEditMode || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setStartPos({ x, y });
    setIsDrawing(true);
    setConfig(prev => ({ ...prev, selectionArea: { x, y, width: 0, height: 0 } }));
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const width = Math.abs(x - startPos.x);
    const height = Math.abs(y - startPos.y);
    const finalX = Math.min(x, startPos.x);
    const finalY = Math.min(y, startPos.y);

    setConfig(prev => ({
      ...prev,
      selectionArea: { x: finalX, y: finalY, width, height }
    }));
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleGenerate = async () => {
    const currentBaseImage = editingThumbnailId 
      ? generatedThumbnails.find(t => t.id === editingThumbnailId)?.url 
      : sourceImage;

    if (!currentBaseImage) {
      setError({ message: "Please upload a photo or select a thumbnail to edit." });
      return;
    }

    setError(null);
    setIsGenerating(true);
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsgIdx(idx);
    }, 2500);

    try {
      const resultUrl = await generateThumbnail(currentBaseImage, config);
      const currentPreset = PRESETS.find(p => p.id === config.presetId);
      
      const newThumbnail: GeneratedThumbnail = {
        id: Math.random().toString(36).substring(7),
        url: resultUrl,
        config: { ...config, selectionArea: null },
        styleName: config.isEditMode ? 'Refined' : (currentPreset?.name || 'Custom'),
        timestamp: Date.now()
      };
      
      setGeneratedThumbnails(prev => [newThumbnail, ...prev]);
      setEditingThumbnailId(newThumbnail.id);
      setConfig(prev => ({ ...prev, selectionArea: null, editInstruction: '' }));

      // Save to Firebase if user is signed in
      if (user) {
        try {
          await saveThumbnail({
            userId: user.id,
            url: resultUrl,
            config: { ...config, selectionArea: null },
            styleName: config.isEditMode ? 'Refined' : (currentPreset?.name || 'Custom'),
            timestamp: Date.now()
          });
        } catch (fbError) {
          console.error('Error saving to Firebase:', fbError);
        }
      }
    } catch (err: any) {
      console.error("Generation Error:", err);
      const msg = err.message || "";
      if (msg.includes("403") || msg.toLowerCase().includes("permission") || msg.includes("Requested entity was not found")) {
        setHasKey(false);
        setError({ 
          message: "Pro Engine Denied: This model requires a Google Cloud project with Billing Enabled.",
          isPermission: true 
        });
      } else {
        setError({ message: msg || "An unexpected error occurred during generation." });
      }
    } finally {
      setIsGenerating(false);
      clearInterval(interval);
    }
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `viral-thumbnail-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async (id: string) => {
    // Remove from local state
    setGeneratedThumbnails(prev => prev.filter(t => t.id !== id));
    
    // Also remove from Firebase if user is signed in
    if (user) {
      try {
        await deleteFromFirebase(id);
      } catch (fbError) {
        console.error('Error deleting from Firebase:', fbError);
      }
    }
  
    // Clear edit mode if deleting the currently edited thumbnail
    if (editingThumbnailId === id) {
      setEditingThumbnailId(null);
      setConfig(prev => ({ ...prev, isEditMode: false, editInstruction: '', selectionArea: null }));
    }
  };

  const currentPreviewImage = editingThumbnailId 
    ? generatedThumbnails.find(t => t.id === editingThumbnailId)?.url 
    : sourceImage;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-indigo-500/30">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#020617]/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 blur-md opacity-40 animate-pulse" />
              <div className="relative bg-gradient-to-br from-indigo-500 to-violet-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white uppercase">
                Thumbnail<span className="text-indigo-400">AI</span>
              </h1>
              <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase -mt-1">Interactive Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500 text-white hover:bg-indigo-400 transition-all text-xs font-bold uppercase tracking-tight">
                  <Sparkles className="w-3.5 h-3.5" />
                  Sign In
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton />
            </SignedIn>
              <button 
              onClick={() => setIsChatOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all text-xs font-bold uppercase tracking-tight"
             >
                <MessageSquare className="w-3.5 h-3.5" />
                Assistant
             </button>
              <SignedIn>
                <button 
                  onClick={handleSelectKey}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-xs font-bold uppercase tracking-tight ${
                    hasKey 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                    : 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-white'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5" />
                  {hasKey ? 'Pro Active' : 'Setup Paid Key'}
                </button>
              </SignedIn>
          </div>
        </div>
      </header>

      <SignedOut>
        {/* Landing Page for Unsigned Users */}
        <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
          {/* Animated Background */}
          <div className="fixed inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
            <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-violet-600/20 blur-[120px] rounded-full animate-pulse [animation-delay:1s]" />
            <div className="absolute -bottom-[10%] left-[20%] w-[35%] h-[35%] bg-fuchsia-600/15 blur-[120px] rounded-full animate-pulse [animation-delay:2s]" />
            <div className="absolute top-[40%] left-[10%] w-[20%] h-[20%] bg-cyan-500/10 blur-[100px] rounded-full animate-pulse [animation-delay:3s]" />
            {/* Floating particles */}
            <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-indigo-400/30 rounded-full animate-ping" style={{ animationDuration: '3s' }} />
            <div className="absolute top-1/3 right-1/4 w-3 h-3 bg-violet-400/30 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-1/4 left-1/3 w-2 h-2 bg-fuchsia-400/30 rounded-full animate-ping" style={{ animationDuration: '5s' }} />
          </div>
          
          <div className="relative text-center max-w-4xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 mb-8 animate-fade-in-up">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">AI-Powered Creator Studio</span>
            </div>
            
            {/* Main Icon with animation */}
            <div className="mb-10 relative inline-block animate-fade-in">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 blur-2xl opacity-40 animate-pulse" />
              <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-8 rounded-3xl shadow-2xl shadow-indigo-500/20 border border-white/10">
                <div className="absolute -top-3 -right-3 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full text-xs font-bold text-black uppercase tracking-wider shadow-lg">
                  New
                </div>
                <Zap className="w-20 h-20 text-white fill-white animate-bounce" style={{ animationDuration: '2s' }} />
              </div>
            </div>
            
            {/* Animated Headline */}
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-6 animate-fade-in-up [animation-delay:0.2s]">
              <span className="bg-gradient-to-r from-white via-indigo-200 to-violet-200 bg-clip-text text-transparent">
                Create Thumbnails
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                That Go Viral
              </span>
            </h1>
            
            {/* Animated Subtitle */}
            <p className="text-xl md:text-2xl text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in-up [animation-delay:0.4s]">
              Transform your photos into scroll-stopping YouTube thumbnails with 
              <span className="text-indigo-400 font-semibold"> AI-powered editing</span>, 
              <span className="text-violet-400 font-semibold"> viral expressions</span>, and 
              <span className="text-fuchsia-400 font-semibold"> stunning effects</span>.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-16 animate-fade-in-up [animation-delay:0.6s]">
              <SignInButton mode="modal">
                <button className="group relative flex items-center gap-3 px-10 py-5 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white font-bold uppercase tracking-wide text-lg shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all duration-300 hover:scale-105 hover:-translate-y-1">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md" />
                  <Sparkles className="w-5 h-5 relative z-10" />
                  <span className="relative z-10">Start Creating Free</span>
                  <ChevronRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                </button>
              </SignInButton>
              <button 
                onClick={() => setIsExamplesOpen(true)}
                className="flex items-center gap-2 px-6 py-4 rounded-full border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white hover:border-white/20 transition-all duration-300 font-medium"
              >
                <Download className="w-4 h-4" />
                View Examples
              </button>
            </div>
            
            {/* Trust indicators */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-500 animate-fade-in-up [animation-delay:0.8s]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Free tier available</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Export in 4K</span>
              </div>
            </div>
            
            {/* Feature Cards */}
            <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up [animation-delay:1s]">
              <div className="group relative bg-gradient-to-br from-slate-900/80 to-[#0f0f1a]/80 border border-white/10 rounded-3xl p-8 hover:border-indigo-500/30 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="bg-gradient-to-br from-indigo-500 to-violet-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                    <Wand2 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">AI Expression Editor</h3>
                  <p className="text-slate-400 leading-relaxed">Automatically detect and enhance facial expressions for maximum emotional impact and click-through rates.</p>
                </div>
              </div>
              
              <div className="group relative bg-gradient-to-br from-slate-900/80 to-[#0f0f1a]/80 border border-white/10 rounded-3xl p-8 hover:border-violet-500/30 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="bg-gradient-to-br from-violet-500 to-fuchsia-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/20 group-hover:scale-110 transition-transform">
                    <TypeIcon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">Viral Typography</h3>
                  <p className="text-slate-400 leading-relaxed">Choose from 3D impact, neon glow, glitch effects, and premium styles that grab attention instantly.</p>
                </div>
              </div>
              
              <div className="group relative bg-gradient-to-br from-slate-900/80 to-[#0f0f1a]/80 border border-white/10 rounded-3xl p-8 hover:border-fuchsia-500/30 transition-all duration-300 hover:scale-105 hover:-translate-y-2">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-fuchsia-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative">
                  <div className="bg-gradient-to-br from-fuchsia-500 to-pink-600 w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-500/20 group-hover:scale-110 transition-transform">
                    <Download className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3">4K Ultra Export</h3>
                  <p className="text-slate-400 leading-relaxed">Download crystal-clear thumbnails optimized for YouTube's recommended resolutions and aspect ratios.</p>
                </div>
              </div>
            </div>
            
            {/* Stats Section */}
            <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 py-10 border-t border-white/5 animate-fade-in-up [animation-delay:1.2s]">
              <div className="text-center">
                <div className="text-4xl font-black bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">10K+</div>
                <div className="text-sm text-slate-500 mt-1">Thumbnails Created</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">5M+</div>
                <div className="text-sm text-slate-500 mt-1">Views Generated</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">98%</div>
                <div className="text-sm text-slate-500 mt-1">Satisfaction Rate</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">24/7</div>
                <div className="text-sm text-slate-500 mt-1">AI Assistant</div>
              </div>
            </div>
          </div>
        </div>
      </SignedOut>

      {/* Examples Modal */}
      {isExamplesOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setIsExamplesOpen(false)}
          />
          <div className="relative bg-[#0f172a] rounded-3xl max-w-5xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-[#0f172a]/95 backdrop-blur-lg border-b border-white/5 p-6 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white">Thumbnail Examples</h2>
                <p className="text-slate-400 mt-1">See what you can create with ThumbnailAI</p>
              </div>
              <button 
                onClick={() => setIsExamplesOpen(false)}
                className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Examples Grid */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {exampleThumbnails.map((item) => (
                  <div 
                    key={item.id}
                    className="group relative bg-[#1e293b] rounded-2xl overflow-hidden border border-white/5 hover:border-indigo-500/30 transition-all duration-300 hover:scale-105 cursor-pointer"
                  >
                    <div className="aspect-video relative overflow-hidden">
                      <img 
                        src={item.thumbnail} 
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-3 left-3 right-3 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500 text-white text-xs font-bold">
                          <Eye className="w-3.5 h-3.5" />
                          {item.views}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">{item.title}</h3>
                      <p className="text-sm text-slate-500 mt-1">AI-Enhanced Thumbnail</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Call to Action */}
              <div className="mt-12 text-center p-8 rounded-3xl bg-gradient-to-br from-indigo-500/10 via-violet-500/10 to-fuchsia-500/10 border border-white/10">
                <h3 className="text-2xl font-bold text-white mb-3">Ready to Create Your Own?</h3>
                <p className="text-slate-400 mb-6 max-w-md mx-auto">
                  Join thousands of creators who are already using ThumbnailAI to boost their views.
                </p>
                <SignInButton mode="modal">
                  <button className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 text-white font-bold uppercase tracking-wide hover:scale-105 transition-transform shadow-lg">
                    <Sparkles className="w-5 h-5" />
                    Get Started Free
                  </button>
                </SignInButton>
              </div>
            </div>
          </div>
        </div>
      )}

      <SignedIn>
        {/* Floating Chat Panel */}
        <div className={`fixed inset-y-0 right-0 w-full sm:w-96 bg-[#0f172a] border-l border-white/5 shadow-2xl z-[60] transform transition-transform duration-500 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex flex-col h-full">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-indigo-600/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-white">Viral Expert</h3>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Punchy Mode</span>
                  </div>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-hide no-scrollbar">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed font-medium shadow-lg ${
                    msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 border border-white/5 rounded-tl-none'
                  }`}>
                    {msg.role === 'model' && !msg.text && isTyping ? (
                      <span className="flex gap-1 py-1">
                        <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:-.3s]" />
                        <div className="w-1 h-1 bg-slate-500 rounded-full animate-bounce [animation-delay:-.5s]" />
                      </span>
                    ) : (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="p-6 border-t border-white/5 bg-slate-900/50">
              <div className="relative">
                <input 
                  type="text"
                  placeholder="Ask for title ideas..."
                  className="w-full bg-slate-800 border border-white/5 rounded-2xl pl-5 pr-12 py-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-white shadow-inner"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!chatInput.trim() || isTyping}
                  className="absolute right-2 top-2 bottom-2 px-3 rounded-xl bg-indigo-500 text-white disabled:opacity-50 disabled:bg-slate-700 transition-all hover:bg-indigo-400 flex items-center justify-center"
                >
                  {isTyping ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => setChatInput("how you help me")}
                  className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors text-slate-400"
                >
                  Capabilities?
                </button>
                <button 
                  onClick={() => setChatInput("Suggest 3 better headlines")}
                  className="text-[9px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors text-slate-400"
                >
                  Headlines
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 xl:grid-cols-12 gap-10">
        <div className="xl:col-span-6 space-y-8">
          
          <div className="relative group">
            <div className={`absolute -inset-0.5 bg-gradient-to-r ${config.isEditMode ? 'from-amber-500 to-orange-600' : 'from-indigo-500 to-purple-600'} rounded-[2rem] blur opacity-10 group-hover:opacity-20 transition duration-1000`}></div>
            <div className="relative bg-[#0f172a] rounded-[2rem] border border-white/5 p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold flex items-center gap-3">
                  <span className={`flex items-center justify-center w-8 h-8 rounded-full ${config.isEditMode ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'} text-sm`}>1</span>
                  {config.isEditMode ? 'Interactive Draft' : 'Base Image'}
                </h2>
                {currentPreviewImage && (
                  <button 
                    onClick={config.isEditMode ? cancelEdit : () => setSourceImage(null)} 
                    className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" /> {config.isEditMode ? 'Cancel Edit' : 'Clear'}
                  </button>
                )}
              </div>

              {!currentPreviewImage ? (
                <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-slate-800 rounded-3xl cursor-pointer hover:bg-slate-900/50 transition-all hover:border-indigo-500/40 group">
                  <div className="flex flex-col items-center justify-center">
                    <Camera className="w-8 h-8 text-indigo-400 mb-2" />
                    <p className="text-xs text-slate-300 font-medium tracking-wide uppercase">Select Subject Photo</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
                </label>
              ) : (
                <div 
                  ref={containerRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className={`relative rounded-2xl overflow-hidden aspect-video bg-black/40 ring-1 ring-white/10 shadow-inner overflow-hidden ${config.isEditMode ? 'cursor-crosshair' : 'cursor-default'}`}
                >
                  <img 
                    src={currentPreviewImage} 
                    alt="Preview" 
                    className="w-full h-full object-contain pointer-events-none select-none" 
                  />
                  
                  {config.isEditMode && (
                    <div className="absolute inset-0 bg-black/10 pointer-events-none flex items-center justify-center">
                       {!config.selectionArea && (
                          <div className="bg-amber-500/80 text-black px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse">
                            Drag to Select Area to Modify
                          </div>
                       )}
                    </div>
                  )}

                  {config.selectionArea && (
                    <div 
                      className="absolute border-2 border-amber-500 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.5)] pointer-events-none"
                      style={{
                        left: `${config.selectionArea.x}%`,
                        top: `${config.selectionArea.y}%`,
                        width: `${config.selectionArea.width}%`,
                        height: `${config.selectionArea.height}%`
                      }}
                    >
                      <div className="absolute -top-6 left-0 bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 uppercase">
                        Target Area
                      </div>
                    </div>
                  )}

                  <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t ${config.isEditMode ? 'from-amber-500/60' : 'from-black/60'} to-transparent p-4 flex justify-between items-center`}>
                    <div className="flex items-center gap-2">
                      {config.isEditMode ? <Edit3 className="w-4 h-4 text-amber-400" /> : <CheckCircle2 className="w-4 h-4 text-green-400" />}
                      <span className="text-[10px] font-black uppercase tracking-widest">{config.isEditMode ? 'Selection Mode Active' : 'Base Reference Ready'}</span>
                    </div>
                    {config.selectionArea && (
                       <button 
                        onClick={() => setConfig(prev => ({ ...prev, selectionArea: null }))}
                        className="bg-black/60 hover:bg-black p-1.5 rounded-lg text-white"
                       >
                          <Trash2 className="w-3.5 h-3.5" />
                       </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#0f172a] rounded-[2rem] border border-white/5 p-8 shadow-2xl space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-400 text-sm">2</span>
              Controls {config.selectionArea ? ' - Selective Editing' : ''}
            </h2>

            <div className="space-y-6">
              {config.isEditMode ? (
                <div className="space-y-4 animate-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] ml-1">
                      <Edit3 className="w-3 h-3" /> Modification Request
                    </label>
                    {config.selectionArea && (
                      <span className="text-[9px] font-black bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
                        Focused on selected area
                      </span>
                    )}
                  </div>
                  <textarea 
                    className="w-full bg-slate-900 border border-amber-500/20 rounded-2xl px-5 py-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/40 min-h-[120px] text-white placeholder:text-slate-600"
                    placeholder={config.selectionArea ? "What should happen inside the box? e.g. 'Add a glowing artifact', 'Change the eye color', 'Make this area catch fire'..." : "Describe a general change for the whole image..."}
                    value={config.editInstruction}
                    onChange={(e) => setConfig({...config, editInstruction: e.target.value})}
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                      <Smile className="w-3 h-3 text-indigo-400" /> Expression
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide no-scrollbar">
                      {SUGGESTED_EXPRESSIONS.map(expr => (
                        <button
                          key={expr}
                          onClick={() => setConfig({...config, facialExpression: expr})}
                          className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${config.facialExpression === expr ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/10'}`}
                        >
                          {expr}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                      <Mountain className="w-3 h-3 text-emerald-400" /> Background Environment
                    </label>
                    <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide no-scrollbar mb-3">
                      {SUGGESTED_BACKGROUNDS.map(bg => (
                        <button
                          key={bg}
                          onClick={() => setConfig({...config, backgroundDetails: bg})}
                          className={`whitespace-nowrap px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${config.backgroundDetails === bg ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' : 'bg-slate-900 border-white/5 text-slate-500 hover:border-white/10'}`}
                        >
                          {bg}
                        </button>
                      ))}
                    </div>
                    <input 
                      type="text"
                      className="w-full bg-slate-900 border border-white/5 rounded-2xl px-5 py-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/40 placeholder:text-slate-600"
                      placeholder="Or describe custom environment..."
                      value={config.backgroundDetails}
                      onChange={(e) => setConfig({...config, backgroundDetails: e.target.value})}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">
                    <TypeIcon className="w-3 h-3 text-indigo-400" /> Headline Text
                  </label>
                  <input 
                    type="text"
                    className="w-full bg-slate-900 border border-white/5 rounded-2xl px-5 py-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    placeholder="ENTER TEXT"
                    value={config.overlayText}
                    onChange={(e) => setConfig({...config, overlayText: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 ml-1">Typo Style</label>
                  <select 
                    className="w-full bg-slate-900 border border-white/5 rounded-2xl px-4 py-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                    value={config.textStyle}
                    onChange={(e) => setConfig({...config, textStyle: e.target.value as TextStyle})}
                  >
                    <option value="impact-3d">3D Impact</option>
                    <option value="neon-glow">Neon Glow</option>
                    <option value="comic-distressed">Comic Rough</option>
                    <option value="minimal-modern">Clean Modern</option>
                    <option value="luxury-gold">24K Gold</option>
                  </select>
                </div>
              </div>

              <div className="p-5 bg-slate-900/50 border border-white/5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                    <Zap className="w-3 h-3 fill-slate-500" /> AI Engine
                  </span>
                  <div className="flex bg-slate-900 border border-white/5 p-1 rounded-xl">
                    <button 
                      onClick={() => setConfig({...config, quality: 'flash'})}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${config.quality === 'flash' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}
                    >
                      Flash
                    </button>
                    <button 
                      onClick={() => setConfig({...config, quality: 'pro'})}
                      className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${config.quality === 'pro' ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-500'}`}
                    >
                      Pro (4K)
                    </button>
                  </div>
                </div>

                {config.quality === 'pro' && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95">
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                        <Maximize2 className="w-3 h-3" /> Res
                      </label>
                      <select 
                        className="w-full bg-slate-900 border border-white/5 rounded-xl px-3 py-2 text-[10px] font-bold focus:outline-none"
                        value={config.imageSize}
                        onChange={(e) => setConfig({...config, imageSize: e.target.value as ImageSize})}
                      >
                        <option value="1K">1K</option>
                        <option value="2K">2K</option>
                        <option value="4K">4K</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                        <Globe className="w-3 h-3" /> Grounding
                      </label>
                      <button 
                        onClick={() => setConfig({...config, useSearch: !config.useSearch})}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all font-bold text-[10px] ${config.useSearch ? 'bg-indigo-500/20 border-indigo-500/50 text-white' : 'bg-slate-900 border-white/5 text-slate-500'}`}
                      >
                        {config.useSearch ? 'On' : 'Off'}
                        <div className={`w-2 h-2 rounded-full ${config.useSearch ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2">
              <button 
                onClick={handleGenerate}
                disabled={isGenerating || !currentPreviewImage}
                className={`w-full py-5 rounded-[1.25rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl ${
                  isGenerating || !currentPreviewImage 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5' 
                  : config.isEditMode 
                    ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20' 
                    : 'bg-white text-black hover:bg-indigo-50 shadow-indigo-500/20 shadow-lg'
                }`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    Baking...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    {config.isEditMode ? (config.selectionArea ? 'Update Selection' : 'Update Draft') : 'Render'}
                  </>
                )}
              </button>
            </div>

            {error && (
              <div className={`p-5 rounded-3xl flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 border ${error.isPermission ? 'bg-amber-500/10 border-amber-500/30 shadow-2xl shadow-amber-500/10' : 'bg-red-500/5 border-red-500/20'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl shrink-0 ${error.isPermission ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'}`}>
                    {error.isPermission ? <CreditCard className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                  </div>
                  <div className="space-y-1">
                    <h4 className={`text-xs font-black uppercase tracking-wider ${error.isPermission ? 'text-amber-400' : 'text-red-400'}`}>
                      {error.isPermission ? 'Permission Required' : 'Generation Failed'}
                    </h4>
                    <p className={`text-[11px] font-medium leading-relaxed ${error.isPermission ? 'text-amber-500/80' : 'text-red-400/80'}`}>
                      {error.message}
                    </p>
                  </div>
                </div>
                
                {error.isPermission && (
                  <div className="grid grid-cols-1 gap-2 pt-2 border-t border-amber-500/20">
                    <button 
                      onClick={switchToFlash}
                      className="bg-white/10 text-white text-[10px] font-black uppercase py-3 rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                    >
                      <ZapOff className="w-3.5 h-3.5" />
                      Switch to Flash Engine (Free)
                    </button>
                    <button 
                      onClick={handleSelectKey}
                      className="bg-amber-500 text-black text-[10px] font-black uppercase py-3 rounded-2xl hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
                    >
                      Link Paid Project Key
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="xl:col-span-6 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-white flex items-center gap-3">
                Live Studio
                <Sparkles className="w-6 h-6 text-yellow-500 fill-yellow-500" />
              </h2>
              <p className="text-sm text-slate-500 font-medium tracking-tight">Iterative history</p>
            </div>
            {generatedThumbnails.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-900 border border-white/5 px-4 py-2 rounded-full">
                <History className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-slate-400">{generatedThumbnails.length} Versions</span>
              </div>
            )}
          </div>

          <div className="space-y-12">
            {isGenerating && (
              <div className="relative aspect-video rounded-[2.5rem] bg-slate-900 border border-white/5 flex flex-col items-center justify-center p-12 overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 animate-pulse" />
                <div className="w-24 h-24 relative mb-8">
                  <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Wand2 className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 text-center animate-bounce">{LOADING_MESSAGES[loadingMsgIdx]}</h3>
                <p className="text-slate-500 text-xs uppercase tracking-widest font-black">{config.imageSize} rendering via {config.quality.toUpperCase()}...</p>
              </div>
            )}

            {generatedThumbnails.length === 0 && !isGenerating ? (
              <div className="aspect-video rounded-[2.5rem] bg-slate-900/30 border border-dashed border-slate-800 flex flex-col items-center justify-center p-12 group hover:border-indigo-500/30 transition-colors">
                <Layers className="w-12 h-12 text-slate-700 mb-6 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-slate-500 uppercase tracking-widest">Workspace Empty</h3>
                <p className="text-slate-600 text-xs mt-2 font-medium">Upload a photo to begin</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-12">
                {generatedThumbnails.map((thumb) => (
                  <div 
                    key={thumb.id} 
                    className={`group relative bg-[#0f172a] rounded-[2.5rem] border ${editingThumbnailId === thumb.id ? 'border-amber-500/40 ring-2 ring-amber-500/10' : 'border-white/5'} p-6 shadow-2xl transition-all hover:scale-[1.01]`}
                  >
                    <div className="relative rounded-[1.75rem] overflow-hidden aspect-video bg-black/40 ring-1 ring-white/10 shadow-2xl">
                      <img src={thumb.url} alt="Generated result" className="w-full h-full object-contain" />
                      
                      <div className="absolute top-4 right-4 flex flex-col gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                        <button 
                          onClick={() => handleDownload(thumb.url)}
                          className="bg-white text-black p-4 rounded-2xl shadow-2xl hover:bg-indigo-50 flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-transform hover:-translate-y-1"
                        >
                          <Download className="w-4 h-4" /> Save
                        </button>
                        <button 
                          onClick={() => startEditing(thumb)}
                          className="bg-amber-500 text-black p-4 rounded-2xl shadow-2xl hover:bg-amber-400 flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-transform hover:-translate-y-1"
                        >
                          <Square className="w-4 h-4" /> Select Area
                        </button>
                        <button 
                          onClick={() => handleDelete(thumb.id)}
                          className="bg-red-500 text-white p-4 rounded-2xl shadow-2xl hover:bg-red-400 flex items-center gap-2 font-black text-xs uppercase tracking-widest transition-transform hover:-translate-y-1"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center justify-between px-2">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${editingThumbnailId === thumb.id ? 'bg-amber-500/10 shadow-inner' : 'bg-indigo-500/10 shadow-lg shadow-indigo-500/5'}`}>
                          {editingThumbnailId === thumb.id ? <MousePointer2 className="w-7 h-7 text-amber-500" /> : <Sparkles className="w-7 h-7 text-indigo-400" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-base font-black text-white uppercase tracking-wider">
                              {thumb.styleName} Version
                            </h4>
                            <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-white/5 text-[9px] font-black text-indigo-400 uppercase">
                              {thumb.config.quality.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => startEditing(thumb)}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all font-bold text-xs"
                      >
                        Select & Refine
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="py-20 text-center border-t border-white/5 mt-20 opacity-50">
        <p className="text-slate-600 text-[10px] font-black tracking-[0.4em] uppercase">
          Build for the next generation of creators
        </p>
      </footer>
      </SignedIn>
    </div>
  );
}
