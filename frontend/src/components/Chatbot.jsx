import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [showButtons, setShowButtons] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      initChat();
    }
  }, [isOpen]);

  const initChat = () => {
    setTimeout(() => {
      setMessages([
        { role: 'assistant', content: 'Hola 👋' }
      ]);
      setTimeout(() => {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: '¿En qué podemos ayudarte?' }
        ]);
        setShowButtons(true);
      }, 800);
    }, 300);
  };

  const handleButtonClick = async (option) => {
    setShowButtons(false);
    setMessages(prev => [...prev, { role: 'user', content: option }]);
    await sendMessage(option);
  };

  const sendMessage = async (text) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    if (!text) {
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    }

    setLoading(true);
    setShowButtons(false);

    try {
      const response = await axios.post(`${API}/chatbot/message`, {
        message: messageText,
        session_id: sessionId
      });

      if (!sessionId) {
        setSessionId(response.data.session_id);
      }

      const botResponse = response.data.response;
      const buttons = response.data.buttons;
      
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: botResponse, buttons: buttons }
      ]);

    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Disculpa, hubo un error. Puedes llamarnos al 622 822 101 o escribir a coordinacion@gasisalud.com' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 bg-[#005EB8] hover:bg-[#004a92] text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
          data-testid="chatbot-open-button"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div 
          className="fixed bottom-6 right-6 z-50 w-[400px] h-[600px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in"
          data-testid="chatbot-window"
        >
          <div className="bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">Asistente GASI</h3>
                <p className="text-xs opacity-90">Aquí para ayudarte</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="hover:bg-white/20 rounded-full p-1 transition-colors"
              data-testid="chatbot-close-button"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" data-testid="chatbot-messages">
            {messages.map((msg, index) => (
              <div key={index}>
                <div
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-[#005EB8] text-white'
                        : 'bg-white text-gray-900 shadow-sm'
                    }`}
                    data-testid={`chatbot-message-${msg.role}`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
                
                {/* Botones dinámicos */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="flex flex-col gap-2 mt-3">
                    {msg.buttons.map((btn, btnIndex) => (
                      <button
                        key={btnIndex}
                        onClick={() => handleButtonClick(btn.text)}
                        className="w-full bg-white hover:bg-[#005EB8] hover:text-white text-[#005EB8] border-2 border-[#005EB8] font-semibold py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md text-sm"
                      >
                        {btn.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {showButtons && (
              <div className="flex flex-col gap-3 animate-fade-in">
                <button
                  onClick={() => handleButtonClick('Cobertura sanitaria para empresas')}
                  className="w-full bg-white hover:bg-[#005EB8] hover:text-white text-[#005EB8] border-2 border-[#005EB8] font-semibold py-4 px-6 rounded-xl transition-all shadow-sm hover:shadow-md"
                  data-testid="chatbot-option-cobertura"
                >
                  🏥 Cobertura sanitaria para empresas
                </button>
                <button
                  onClick={() => handleButtonClick('Formación sanitaria')}
                  className="w-full bg-white hover:bg-[#005EB8] hover:text-white text-[#005EB8] border-2 border-[#005EB8] font-semibold py-4 px-6 rounded-xl transition-all shadow-sm hover:shadow-md"
                  data-testid="chatbot-option-formacion"
                >
                  🎓 Formación sanitaria
                </button>
                <button
                  onClick={() => handleButtonClick('Salud laboral')}
                  className="w-full bg-white hover:bg-[#005EB8] hover:text-white text-[#005EB8] border-2 border-[#005EB8] font-semibold py-4 px-6 rounded-xl transition-all shadow-sm hover:shadow-md"
                  data-testid="chatbot-option-salud"
                >
                  ⚕️ Salud laboral
                </button>
              </div>
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-[#005EB8] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#005EB8] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-[#005EB8] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t bg-white">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu mensaje..."
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#005EB8] transition-colors"
                disabled={loading}
                data-testid="chatbot-input"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className="rounded-xl bg-[#005EB8] hover:bg-[#004a92] text-white px-5"
                data-testid="chatbot-send-button"
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Chatbot;