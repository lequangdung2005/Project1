import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Bot, User, Loader2, Trash2 } from 'lucide-react';
import { ChatMessage } from '../types';
import { sendMessageToGemini } from '../services/geminiService';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: 'model', text: 'Hi! I\'m Melody. Ask me about your favorite artists, song meanings, or for recommendations!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearChat = () => {
    setMessages([
      { id: 1, role: 'model', text: 'Hi! I\'m Melody. Ask me about your favorite artists, song meanings, or for recommendations!' }
    ]);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now(),
      role: 'user',
      text: input
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const responseText = await sendMessageToGemini(messages, userMsg.text);
      
      const aiMsg: ChatMessage = {
        id: Date.now() + 1,
        role: 'model',
        text: responseText
      };
      
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 rounded-lg overflow-hidden m-4 border border-zinc-800">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-3 bg-zinc-950">
        <div className="bg-emerald-500/10 p-2 rounded-lg">
          <Sparkles className="text-emerald-500" size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-white">Melody AI</h3>
          <p className="text-xs text-zinc-400">Powered by AI</p>
        </div>
        <div className="flex-1" />
        <button 
          onClick={clearChat}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-full transition-colors"
          title="Clear Chat"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`min-w-8 w-8 h-8 rounded-full flex items-center justify-center ${
              msg.role === 'model' ? 'bg-indigo-600' : 'bg-emerald-600'
            }`}>
              {msg.role === 'model' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user' 
                ? 'bg-zinc-800 text-white rounded-tr-none' 
                : 'bg-zinc-950 border border-zinc-800 text-zinc-200 rounded-tl-none'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-zinc-500 text-sm ml-12">
            <Loader2 className="animate-spin" size={14} />
            <span>Melody is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-zinc-950 border-t border-zinc-800">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask for a chill playlist..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-full px-4 py-3 pr-12 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-emerald-500 rounded-full text-black hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;