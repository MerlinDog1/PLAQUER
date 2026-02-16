import React from 'react';

interface Props {
  currentView: 'plaque' | 'vector';
  onNavigate: (view: 'plaque' | 'vector') => void;
}

export const Header: React.FC<Props> = ({ currentView, onNavigate }) => {
  return (
    <header className="w-full border-b border-gray-800 bg-brand-dark/90 backdrop-blur-md sticky top-0 z-50 print:hidden">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('plaque')}>
            <div className="w-8 h-8 bg-gradient-to-br from-brand-accent to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
              P
            </div>
            <span className="text-xl font-bold tracking-tight text-white">
              plaques<span className="text-brand-accent">.ai</span>
            </span>
          </div>

          <nav className="hidden md:flex gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
            <button 
              onClick={() => onNavigate('plaque')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'plaque' ? 'bg-brand-accent text-brand-dark shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Plaque Designer
            </button>
            <button 
              onClick={() => onNavigate('vector')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${currentView === 'vector' ? 'bg-brand-accent text-brand-dark shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              Vector Studio
            </button>
          </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </button>
          <button className="relative p-2 text-gray-400 hover:text-white group">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
            <span className="absolute top-1 right-0 w-2 h-2 bg-brand-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></span>
          </button>
        </div>
      </div>
    </header>
  );
};