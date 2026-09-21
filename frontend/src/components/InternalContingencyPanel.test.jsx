import React from'react';
import{renderToStaticMarkup}from'react-dom/server';
import InternalContingencyPanel from'./InternalContingencyPanel';

describe('InternalContingencyPanel',()=>{
 test('exposes accessible fail-closed contingency semantics and a retry control',()=>{
  const html=renderToStaticMarkup(<InternalContingencyPanel channels={[]} onRetry={()=>{}} retrying={false}/>);
  expect(html).toContain('aria-label="Contingencia del canal asistencial"');
  expect(html).toContain('Modo contingencia');
  expect(html).toContain('No se muestran ni almacenan copias locales de episodios');
  expect(html).toContain('No hay un canal alternativo configurado');
  expect(html).toContain('Reintentar conexión');
  expect(html).toContain('focus-visible:ring-2');
 });

 test('renders only configured operational channel data for phone, https url and reference',()=>{
  const html=renderToStaticMarkup(<InternalContingencyPanel channels={[
   {tenant_id:'TENANT-A',center:'HQ-A',channel_type:'PHONE',label:'Teléfono respaldo',target:'+34910000011'},
   {tenant_id:'TENANT-A',center:'HQ-B',channel_type:'URL',label:'Portal respaldo',target:'https://fallback.example.invalid'},
   {tenant_id:'TENANT-A',center:'HQ-C',channel_type:'REFERENCE',label:'Referencia respaldo',target:'DESK-C'}
  ]} onRetry={()=>{}}/>);
  expect(html).toContain('href="tel:+34910000011"');
  expect(html).toContain('href="https://fallback.example.invalid"');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noreferrer"');
  expect(html).toContain('DESK-C');
  expect(html).toContain('role="list"');
  expect(html).toContain('role="listitem"');
  expect(html).not.toMatch(/patient|diagnos|historia clínica|síntoma/i);
 });
});
