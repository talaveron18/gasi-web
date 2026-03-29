import React, { useState } from 'react';
import { Mail, Phone, Send } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const Contacto = () => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    employee_count: '',
    service_type: '',
    message: '',
    accepts_privacy: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.accepts_privacy) {
      toast.error('Debe aceptar la politica de proteccion de datos');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('/.netlify/functions/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!response.ok) throw new Error('Error en el servidor');
      toast.success('Formulario enviado! Nos pondremos en contacto pronto.');
      setFormData({ name: '', company: '', email: '', phone: '', employee_count: '', service_type: '', message: '', accepts_privacy: false });
    } catch (error) {
      toast.error('Error al enviar el formulario. Intentelo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="contacto-page">
      <section className="bg-gradient-to-br from-[#005EB8] to-[#327BBD] text-white py-20">
        <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6" data-testid="page-title">Contacto</h1>
          <p className="text-xl opacity-90">Estamos aqui para ayudarle. Contactenos y le responderemos a la mayor brevedad.</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-[#0F172A] mb-6">Informacion de Contacto</h2>
              <p className="text-lg text-[#64748B] mb-8">Nuestro equipo esta disponible para atender sus consultas.</p>
              <div className="space-y-6">
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#005EB8]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-[#005EB8]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0F172A] mb-2">Telefono</h3>
                      <a href="tel:622822101" className="text-[#005EB8] hover:underline text-lg" data-testid="phone-link">622 822 101</a>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#005EB8]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Phone className="w-6 h-6 text-[#005EB8]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0F172A] mb-2">WhatsApp</h3>
                      <a href="https://wa.me/34634029865" target="_blank" rel="noopener noreferrer" className="text-[#005EB8] hover:underline text-lg" data-testid="whatsapp-link">634 029 865</a>
                    </div>
                  </div>
                </Card>
                <Card className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#005EB8]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-[#005EB8]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-[#0F172A] mb-2">Email</h3>
                      <a href="mailto:coordinacion@gasisalud.com" className="text-[#005EB8] hover:underline text-lg" data-testid="email-link">coordinacion@gasisalud.com</a>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            <div>
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-[#0F172A] mb-6">Formulario de Contacto</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Nombre completo *</Label>
                    <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required data-testid="contact-name-input" />
                  </div>
                  <div>
                    <Label htmlFor="company">Empresa *</Label>
                    <Input id="company" value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} required data-testid="contact-company-input" />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required data-testid="contact-email-input" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Telefono *</Label>
                    <Input id="phone" type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} required data-testid="contact-phone-input" />
                  </div>
                  <div>
                    <Label htmlFor="employee_count">Numero aproximado de trabajadores</Label>
                    <Input id="employee_count" value={formData.employee_count} onChange={(e) => setFormData({...formData, employee_count: e.target.value})} placeholder="Ej: 50-100" data-testid="contact-employees-input" />
                  </div>
                  <div>
                    <Label htmlFor="service_type">Servicio de interes *</Label>
                    <select id="service_type" value={formData.service_type} onChange={(e) => setFormData({...formData, service_type: e.target.value})} required className="w-full px-3 py-2 border rounded-md" data-testid="contact-service-select">
                      <option value="">Seleccione un servicio</option>
                      <option value="cobertura">Cobertura Sanitaria en Empresas</option>
                      <option value="formacion">Formacion Sanitaria</option>
                      <option value="salud_laboral">Salud Laboral y Reconocimientos</option>
                      <option value="varios">Varios Servicios</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="message">Mensaje *</Label>
                    <Textarea id="message" value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} required rows={4} placeholder="Cuentenos que necesita..." data-testid="contact-message-input" />
                  </div>
                  <div className="flex items-start gap-2">
                    <Checkbox id="privacy" checked={formData.accepts_privacy} onCheckedChange={(checked) => setFormData({...formData, accepts_privacy: checked})} data-testid="contact-privacy-checkbox" />
                    <Label htmlFor="privacy" className="text-sm leading-relaxed">
                      Acepto la <Link to="/politica-privacidad" className="text-[#005EB8] hover:underline">politica de proteccion de datos</Link> y autorizo el tratamiento de mis datos para responder a mi consulta *
                    </Label>
                  </div>
                  <Button type="submit" className="w-full bg-[#005EB8] hover:bg-[#004a92] text-white" disabled={loading} data-testid="contact-submit-button">
                    {loading ? 'Enviando...' : (<>Enviar Mensaje <Send className="ml-2 w-4 h-4" /></>)}
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contacto;
