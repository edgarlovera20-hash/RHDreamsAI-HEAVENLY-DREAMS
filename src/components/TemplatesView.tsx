import React, { useState } from 'react';
import { motion } from 'motion/react';

export const TemplatesView: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex-1 h-full bg-brand-bg flex flex-col items-center">
      <div className="w-full max-w-7xl px-8 py-6">
        
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 bg-brand-surface/60 border border-border-color rounded-lg px-4 py-2 w-[400px] flex items-center max-w-lg">
            <input 
              type="text" 
              placeholder="Ingrese el nombre de la pestaña para b..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-text-main text-sm focus:outline-none w-full"
            />
          </div>
          
          <div className="flex-1" />

          <button className="border border-border-color text-gray-300 hover:text-text-main hover:bg-brand-surface px-6 py-2 rounded-lg text-sm transition-colors group">
            Reiniciar
          </button>
          <button className="bg-[#10b981] hover:bg-[#059669] text-text-main px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Buscar
          </button>
        </div>

        {/* Actions */}
        <div className="mb-6">
          <button className="border border-border-color text-gray-300 hover:text-text-main hover:bg-brand-surface px-4 py-2 rounded-lg text-sm transition-colors">
            Agregar Pestaña
          </button>
        </div>

        {/* Empty state (Sin datos) */}
        <div className="flex-1 flex flex-col items-center justify-center opacity-50 py-32 mt-10 rounded-xl bg-brand-surface/20 border border-border-color/50">
           <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-6 text-gray-500">
             <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
             <polyline points="17 8 12 3 7 8"></polyline>
             <line x1="12" y1="3" x2="12" y2="15"></line>
           </svg>
           <p className="text-gray-400 text-sm font-medium">Sin datos de pestañas</p>
        </div>

      </div>
    </div>
  );
};
