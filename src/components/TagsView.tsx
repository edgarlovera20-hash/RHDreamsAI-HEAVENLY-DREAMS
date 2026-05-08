import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';
import { Button } from './UI';

interface TagCategory {
  id: string;
  categoryName: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export const TagsView: React.FC = () => {
  const [categories, setCategories] = useState<TagCategory[]>([
    {
      id: '1',
      categoryName: 'Source',
      tags: ['Facebook', 'WhatsApp Group', 'LinkedIn', 'Instagram', 'Google', 'YouTube'],
      createdAt: '2026-12-10',
      updatedAt: '2026-12-10'
    },
    {
      id: '2',
      categoryName: 'Acquisition Channel',
      tags: ['Organic Search', 'Paid Search', 'Direct Mail', 'Affiliate Marketing', 'Content Marketing'],
      createdAt: '2026-12-10',
      updatedAt: '2026-12-10'
    }
  ]);

  return (
    <div className="flex-1 h-full bg-brand-bg flex flex-col items-center">
      <div className="w-full max-w-7xl px-8 py-6">
        
        {/* Filters */}
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-brand-surface/60 border border-border-color rounded-lg px-4 py-2 min-w-[200px] flex items-center">
            <select className="bg-transparent border-none text-gray-400 text-sm focus:outline-none w-full appearance-none pr-4">
              <option value="">Por favor seleccione</option>
              <option value="category">Categoría</option>
              <option value="tag">Etiqueta</option>
            </select>
          </div>
          <div className="flex-1 bg-brand-surface/60 border border-border-color rounded-lg px-4 py-2 flex items-center">
            <input 
              type="text" 
              placeholder="Por favor ingrese" 
              className="bg-transparent border-none text-text-main text-sm focus:outline-none w-full"
            />
          </div>
          <button className="bg-[#10b981] hover:bg-[#059669] text-text-main px-6 py-2 rounded-lg text-sm font-medium transition-colors">
            Buscar
          </button>
        </div>

        {/* Add Tag */}
        <div className="mb-6">
          <button className="border border-border-color text-gray-300 hover:text-text-main hover:bg-brand-surface px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
            Agregar Etiqueta
          </button>
        </div>

        {/* Table */}
        <div className="bg-brand-surface/40 border border-border-color rounded-xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-color bg-brand-surface/80 text-gray-400 text-sm">
                <th className="py-4 px-6 font-medium">N.º</th>
                <th className="py-4 px-6 font-medium">Categoría de Etiqueta</th>
                <th className="py-4 px-6 font-medium">Nombre de Etiqueta</th>
                <th className="py-4 px-6 font-medium text-center">Fecha de Creación</th>
                <th className="py-4 px-6 font-medium text-center">Fecha de Modificación</th>
                <th className="py-4 px-6 font-medium text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat, index) => (
                <tr key={cat.id} className="border-b border-border-color last:border-0 hover:bg-brand-surface/40 transition-colors">
                  <td className="py-4 px-6 text-text-main text-sm">{index + 1}</td>
                  <td className="py-4 px-6 text-text-main text-sm">{cat.categoryName}</td>
                  <td className="py-4 px-6">
                    <div className="flex flex-wrap gap-2">
                      {cat.tags.map(tag => (
                        <span key={tag} className="bg-[#10b981] text-text-main text-xs px-3 py-1 rounded-full font-medium">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-gray-400 text-sm text-center">{cat.createdAt}</td>
                  <td className="py-4 px-6 text-gray-400 text-sm text-center">{cat.updatedAt}</td>
                  <td className="py-4 px-6 text-center">
                    <div className="flex items-center justify-center gap-4">
                       <button className="text-gray-400 hover:text-text-main transition-colors">
                         <Edit2 size={16} />
                       </button>
                       <button className="text-red-400 hover:text-red-300 transition-colors">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {categories.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center opacity-50">
               <div className="w-16 h-16 bg-[#1a2235] rounded-xl flex items-center justify-center mb-4">
                  <div className="w-8 h-8 rounded border-2 border-gray-500" />
               </div>
               <p className="text-gray-400 text-sm">No hay datos</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
