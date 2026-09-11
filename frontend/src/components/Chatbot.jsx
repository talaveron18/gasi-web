import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+()\d\s.-]{7,20}$/;

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('inicio');
  const [userData, setUserData] = useState({ service: '', name: '', email: '', phone: '' });
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        addBot('Hola 👋');
        setTimeout(() => addBot('¿En qué podemos ayudarte?', true), 800);
      }, 300);
    }
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const addBot = (content, showButtons = false) => {
    setMessages(prev => [...prev, { role: 'assistant', content, showButtons }]);
  };

  const addUser = (content) => {
    setMessages(prev => [...prev, { role: 'user', content }]);
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessages([]);
    setStep('inicio');
    setUserData({ service: '', name: '', email: '', phone: '' });
  };

  const handleService = (service) => {
    setUserData(prev => ({ ...prev, service }));
    addUser(service);
    setStep('nombre');
    setTimeout(() => addBot('¿Cuál es tu nombre?'), 400);
  };

  const handleInput = async () => {
    const text = input.trim();
    if (!text || loading) return;

    if (step === 'nombre' && (text.length < 2 || text.length > 80)) {
      addBot('Indica un nombre válido, de entre 2 y 80 caracteres.');
      return;
    }
    if (step === 'email' && !EMAIL_RE.test(text)) {
      addBot('Ese correo no parece válido. Revísalo e inténtalo de nuevo.');
      return;
    }
    if (step === 'telefono' && !PHONE_RE.test(text)) {
      addBot('Ese teléfono no parece válido. Revísalo e inténtalo de nuevo.');
      return;
    }

    setInput('');
    addUser(text);

    if (step === 'nombre') {
      setUserData(prev => ({ ...prev, name: text }));
      setStep('email');
      setTimeout(() => addBot('¿Cuál es tu correo electrónico?'), 400);
    } else if (step === 'email') {
      setUserData(prev => ({ ...prev, email: text }));
      setStep('telefono');
      setTimeout(() => addBot('¿Y tu número de teléfono?'), 400);
    } else if (step === 'telefono') {
      const newData = { ...userData, phone: text };
      setUserData(newData);
      setStep('enviando');
      setLoading(true);

      try {
        const response = await fetch('/.netlify/functions/chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newData)
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setTimeout(() => {
          addBot('Perfecto. Hemos recibido tus datos y podremos ponernos en contacto contigo. Si necesitas ayuda urgente, llama al 622 822 101.');
          setStep('fin');
        }, 400);
      } catch (error) {
        setTimeout(() => {
          addBot('No hemos podido enviar tus datos. Puedes llamarnos al 622 822 101 o escribir a coordinacion@gasisalud.com.');
          setStep('fin');
        }, 400);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleInput();
    }
  };

  const showInput = step === 'nombre' || step === 'email' || step === 'telefono';

  return (
    <>
      {!isOpen && (
        <button onClick={() => setIsOpen(true)} aria-label="Abrir asistente GASI" className="fixed bottom-6 right-6 z-50 bg-[#005EB8] hover:bg-[#004a92] text-white rounded-full p-4 shadow-lg transition-all hover:scale-110" data-testid="chatbot-open-button">
          <MessageCircle className="w-6 h-6" />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[min(400px,calc(100vw-2rem))] h-[min(600px,calc(100vh-2rem))] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" data-testid="chatbot-window">
          <div className="bg-gradient-to-r from-[#005EB8] to-[#327BBD] text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><MessageCircle className="w-5 h-5" /></div><div><h3 className="font-semibold">Asistente GASI</h3><p className="text-xs opacity-90">Aquí para ayudarte</p></div></div>
            <button onClick={handleClose} aria-label="Cerrar asistente GASI" className="hover:bg-white/20 rounded-full p-1 transition-colors" data-testid="chatbot-close-button"><X className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50" data-testid="chatbot-messages" aria-live="polite">
            {messages.map((msg, index) => (
              <div key={index}><div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-[#005EB8] text-white' : 'bg-white text-gray-900 shadow-sm'}`}><p className="text-sm leading-relaxed">{msg.content}</p></div></div>
                {msg.showButtons && step === 'inicio' && <div className="flex flex-col gap-3 mt-3">{['Cobertura sanitaria para empresas', 'Formación sanitaria', 'Servicios sanitarios para empresas'].map((opt) => <button key={opt} onClick={() => handleService(opt)} className="w-full bg-white hover:bg-[#005EB8] hover:text-white text-[#005EB8] border-2 border-[#005EB8] font-semibold py-3 px-4 rounded-xl transition-all shadow-sm text-sm">{opt}</button>)}</div>}
              </div>
            ))}
            {loading && <div className="flex justify-start"><div className="bg-white rounded-2xl px-4 py-3 shadow-sm"><div className="flex gap-1"><div className="w-2 h-2 bg-[#005EB8] rounded-full animate-bounce"></div><div className="w-2 h-2 bg-[#005EB8] rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div><div className="w-2 h-2 bg-[#005EB8] rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div></div></div></div>}
            <div ref={messagesEndRef} />
          </div>

          {showInput && <div className="p-4 border-t bg-white"><div className="flex gap-2"><input ref={inputRef} type={step === 'email' ? 'email' : step === 'telefono' ? 'tel' : 'text'} value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} placeholder="Escribe tu respuesta..." maxLength={step === 'nombre' ? 80 : step === 'email' ? 254 : 20} className="flex-1 min-w-0 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-[#005EB8] transition-colors" disabled={loading} data-testid="chatbot-input" /><Button onClick={handleInput} disabled={!input.trim() || loading} className="rounded-xl bg-[#005EB8] hover:bg-[#004a92] text-white px-5" data-testid="chatbot-send-button" aria-label="Enviar respuesta"><Send className="w-5 h-5" /></Button></div></div>}
        </div>
      )}
    </>
  );
};

export default Chatbot;
