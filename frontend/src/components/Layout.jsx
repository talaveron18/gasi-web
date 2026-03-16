import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import Chatbot from './Chatbot';
import { MessageCircle } from 'lucide-react';

const Layout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
      <Chatbot />
      
      <a
        href="https://wa.me/34634029865"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-40 bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all hover:scale-110"
        data-testid="whatsapp-button"
        title="Contactar por WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
};

export default Layout;