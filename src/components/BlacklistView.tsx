import React, { useState } from 'react';
import { Search, RotateCcw, Download, LayoutGrid, Trash2, Calendar } from 'lucide-react';
import { motion } from 'motion/react';

interface BlacklistItem {
  id: string;
  phone: string;
  createdAt: string;
}

export const BlacklistView: React.FC = () => {
  const [items, setItems] = useState<BlacklistItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex-1 h-full bg-brand-bg flex flex-col items-center">
      <div className="w-full max-w-7xl px-8 py-6">
        
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-brand-surface/60 border border-border-color rounded-lg px-4 py-2 w-[300px] flex items-center">
            <input 
              type="text" 
              placeholder="Por favor, ingrese el número de teléf..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-text-main text-sm focus:outline-none w-full"
            />
          </div>
          
          <div className="bg-brand-surface/60 border border-border-color rounded-lg px-4 py-2 w-[300px] flex items-center justify-between text-gray-400 text-sm">
            <span>Fecha de inicio <span className="mx-2">→</span> Fecha de fin</span>
            <Calendar size={16} />
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
        <div className="flex justify-between items-center mb-6">
          <button className="border border-border-color text-gray-500 hover:text-gray-300 hover:bg-brand-surface px-4 py-2 rounded-lg text-sm transition-colors">
            Eliminar de la lista negra
          </button>
          
          <div className="flex items-center gap-2">
            <button className="p-2 border border-border-color text-gray-400 rounded-lg hover:text-text-main hover:bg-brand-surface transition-colors">
               <Download size={16} />
            </button>
            <button className="p-2 border border-border-color text-gray-400 rounded-lg hover:text-text-main hover:bg-brand-surface transition-colors">
               <LayoutGrid size={16} />
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-brand-surface/40 border border-border-color rounded-xl overflow-hidden min-h-[400px] flex flex-col">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-color bg-brand-surface/80 text-gray-400 text-sm">
                <th className="py-4 px-6 w-12">
                   <div className="w-4 h-4 rounded border border-gray-600 bg-transparent flex items-center justify-center">
                   </div>
                </th>
                <th className="py-4 px-6 font-medium text-center">Teléfono</th>
                <th className="py-4 px-6 font-medium text-center">Fecha de creación</th>
                <th className="py-4 px-6 font-medium text-center">Operaciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border-color hover:bg-brand-surface/40 transition-colors">
                  <td className="py-4 px-6">
                     <div className="w-4 h-4 rounded border border-gray-600 bg-transparent" />
                  </td>
                  <td className="py-4 px-6 text-text-main text-sm text-center">{item.phone}</td>
                  <td className="py-4 px-6 text-gray-400 text-sm text-center">{item.createdAt}</td>
                  <td className="py-4 px-6 text-center">
                    <button className="text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 mx-auto text-sm">
                      <Trash2 size={16} /> Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {items.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center opacity-50 py-20">
               <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-gray-500">
                 <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                 <polyline points="17 8 12 3 7 8"></polyline>
                 <line x1="12" y1="3" x2="12" y2="15"></line>
               </svg>
               <p className="text-gray-400 text-sm font-medium">No hay datos</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
