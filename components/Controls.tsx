import React, { useState } from 'react';
import { PlaqueState, Shape, Material, Fixing } from '../types';

interface Props {
  state: PlaqueState;
  onChange: (newState: Partial<PlaqueState>) => void;
  onGenerate: (text: string) => void;
  onClear: () => void;
  isGenerating: boolean;
}

export const Controls: React.FC<Props> = ({ state, onChange, onGenerate, onClear, isGenerating }) => {
  const [prompt, setPrompt] = useState("");
  const isIterating = !!state.generatedSvgContent;

  const handleGenerateClick = () => {
    if (!prompt.trim()) return;
    onGenerate(prompt);
    setPrompt(""); // Clear the box to encourage next turn of conversation
  };

  const handleChange = (key: keyof PlaqueState, value: any) => {
    // Logic for circle locking dimensions
    if (key === 'width' && state.shape === Shape.Circle) {
      onChange({ width: value, height: value });
    } else if (key === 'shape' && value === Shape.Circle) {
      onChange({ shape: value, height: state.width });
    } else {
      onChange({ [key]: value });
    }
  };

  // Toggle for corner radius to make it harder to accidentally set
  const hasRoundedCorners = state.cornerRadius > 0;
  const toggleRoundedCorners = () => {
      if (hasRoundedCorners) {
          handleChange('cornerRadius', 0);
      } else {
          handleChange('cornerRadius', 2);
      }
  };

  return (
    <div className="space-y-6">
      
      {/* AI Designer Section */}
      <div className={`glass-panel p-5 rounded-2xl border-brand-accent/20 bg-gradient-to-br ${isIterating ? 'from-emerald-900/10' : 'from-purple-900/10'} to-transparent transition-colors duration-500`}>
        <div className="flex justify-between items-center mb-3">
          <label className={`text-xs font-bold tracking-widest uppercase flex items-center gap-2 ${isIterating ? 'text-emerald-400' : 'text-purple-400'}`}>
            <span>{isIterating ? '✦ AI Design Assistant' : '✦ AI Designer'}</span>
          </label>
          {isIterating && (
            <button 
              onClick={onClear}
              className="text-[10px] text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              Start Over
            </button>
          )}
        </div>
        
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={isIterating ? "Refine the design... e.g. 'Make the date larger' or 'Change the font to something more modern'" : "Describe your plaque... e.g. 'Opening of the new Science Wing, 2024. Clean modern serif font.'"}
          className="w-full bg-brand-dark border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none h-24 mb-3 transition-all"
        />
        
        <button
          onClick={handleGenerateClick}
          disabled={isGenerating || !prompt}
          className={`w-full py-3 rounded-lg text-white font-bold text-sm shadow-lg hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2
            ${isIterating 
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-500/20 hover:shadow-emerald-500/40' 
              : 'bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 shadow-purple-500/20 hover:shadow-purple-500/40'
            }`}
        >
          {isGenerating ? (
            <span className="animate-pulse flex items-center gap-2">
              <span className="w-2 h-2 bg-white rounded-full animate-bounce"></span>
              Thinking...
            </span>
          ) : (
            <>
              <span>{isIterating ? '✎' : '✦'}</span> 
              {isIterating ? 'Update Design' : 'Generate Design'}
            </>
          )}
        </button>
        
        {state.aiReasoning && (
           <div className="mt-3 text-xs text-gray-400 italic border-l-2 border-gray-600 pl-3 animate-fade-in">
             <span className="font-semibold text-gray-500 not-italic mr-1">AI:</span>
             "{state.aiReasoning}"
           </div>
        )}
      </div>

      {/* Dimensions */}
      <div className="glass-panel p-5 rounded-2xl">
        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4 block">Dimensions & Shape</label>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] text-gray-400 font-medium mb-1 block">Shape</label>
            <select
              value={state.shape}
              onChange={(e) => handleChange('shape', e.target.value)}
              className="w-full bg-brand-dark border border-gray-700 rounded-md py-2 px-2 text-sm focus:border-brand-accent outline-none"
            >
              <option value={Shape.Rect}>Rectangle</option>
              <option value={Shape.Oval}>Oval</option>
              <option value={Shape.Circle}>Circle</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-medium mb-1 block">Width (mm)</label>
            <input
              type="number"
              value={state.width}
              onChange={(e) => handleChange('width', Number(e.target.value))}
              className="w-full bg-brand-dark border border-gray-700 rounded-md py-2 px-3 text-sm focus:border-brand-accent outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-medium mb-1 block">Height (mm)</label>
            <input
              type="number"
              value={state.height}
              disabled={state.shape === Shape.Circle}
              onChange={(e) => handleChange('height', Number(e.target.value))}
              className={`w-full bg-brand-dark border border-gray-700 rounded-md py-2 px-3 text-sm focus:border-brand-accent outline-none ${state.shape === Shape.Circle ? 'opacity-50' : ''}`}
            />
          </div>
        </div>
        {state.shape === Shape.Rect && (
          <div className="mt-4 pt-2 border-t border-white/5">
             <div className="flex items-center justify-between mb-2">
                 <span className="text-[10px] text-gray-400 font-medium">Rounded Corners</span>
                 <button 
                    onClick={toggleRoundedCorners}
                    className={`w-9 h-5 rounded-full relative transition-colors ${hasRoundedCorners ? 'bg-brand-accent' : 'bg-gray-700'}`}
                 >
                     <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform ${hasRoundedCorners ? 'translate-x-4' : 'translate-x-0'}`} />
                 </button>
             </div>
             
             {hasRoundedCorners && (
                 <div className="animate-fade-in">
                    <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                    <span>Radius</span>
                    <span>{state.cornerRadius}mm</span>
                    </div>
                    <input
                    type="range" min="1" max="12"
                    value={state.cornerRadius}
                    onChange={(e) => handleChange('cornerRadius', Number(e.target.value))}
                    className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-accent"
                    />
                </div>
             )}
          </div>
        )}
      </div>

      {/* Material */}
      <div className="glass-panel p-5 rounded-2xl">
        <label className="text-xs font-bold tracking-widest text-gray-500 uppercase mb-4 block">Material & Finish</label>
        <div className="grid grid-cols-2 gap-3 mb-4">
           <div>
            <label className="text-[10px] text-gray-400 font-medium mb-1 block">Material</label>
            <select
              value={state.material}
              onChange={(e) => handleChange('material', e.target.value)}
              className="w-full bg-brand-dark border border-gray-700 rounded-md py-2 px-2 text-sm focus:border-brand-accent outline-none"
            >
              <option value={Material.BrushedBrass}>Brushed Brass</option>
              <option value={Material.PolishedBrass}>Polished Brass</option>
              <option value={Material.AgedBrass}>Aged Brass</option>
              <option value={Material.BrushedSteel}>Brushed Steel</option>
              <option value={Material.PolishedSteel}>Polished Steel</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-medium mb-1 block">Fixing</label>
            <select
              value={state.fixing}
              onChange={(e) => handleChange('fixing', e.target.value)}
              className="w-full bg-brand-dark border border-gray-700 rounded-md py-2 px-2 text-sm focus:border-brand-accent outline-none"
            >
              <option value={Fixing.Caps}>Caps</option>
              <option value={Fixing.Screws}>Screws</option>
              <option value={Fixing.VHB}>Adhesive (No Holes)</option>
            </select>
          </div>
        </div>

        {state.fixing === Fixing.Caps && (
          <div className="mt-2 mb-4 pt-2 border-t border-white/5">
             <label className="text-[10px] text-gray-400 font-medium mb-2 block">Cap Size</label>
             <div className="flex gap-2">
                <button
                 onClick={() => handleChange('capSize', 10)}
                 className={`flex-1 py-1.5 text-xs rounded border transition-colors ${state.capSize === 10 ? 'border-brand-accent text-brand-accent bg-brand-accent/10' : 'border-gray-700 text-gray-400 bg-gray-800'}`}
                >10mm</button>
                <button
                 onClick={() => handleChange('capSize', 15)}
                 className={`flex-1 py-1.5 text-xs rounded border transition-colors ${state.capSize === 15 ? 'border-brand-accent text-brand-accent bg-brand-accent/10' : 'border-gray-700 text-gray-400 bg-gray-800'}`}
                >15mm</button>
             </div>
          </div>
        )}
        
        {state.material === Material.AgedBrass && (
           <div className="mt-2 pt-2 border-t border-white/5">
            <div className="flex justify-between text-[10px] text-brand-accent mb-1">
               <span>Patina Intensity</span>
               <span>{Math.round(state.ageIntensity * 100)}%</span>
            </div>
            <input
              type="range" min="0" max="100"
              value={state.ageIntensity * 100}
              onChange={(e) => handleChange('ageIntensity', Number(e.target.value) / 100)}
              className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-brand-accent"
            />
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
           <span className="text-sm text-gray-300">Engraved Border</span>
           <button 
             onClick={() => handleChange('border', !state.border)}
             className={`w-11 h-6 rounded-full relative transition-colors ${state.border ? 'bg-brand-accent' : 'bg-gray-700'}`}
           >
             <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${state.border ? 'translate-x-5' : 'translate-x-0'}`} />
           </button>
        </div>
      </div>

       {/* Wood Backing */}
       <div className="glass-panel p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-2">
           <label className="text-xs font-bold tracking-widest text-gray-500 uppercase block">Wood Backing</label>
           <button 
             onClick={() => handleChange('wood', !state.wood)}
             className={`w-11 h-6 rounded-full relative transition-colors ${state.wood ? 'bg-brand-accent' : 'bg-gray-700'}`}
           >
             <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${state.wood ? 'translate-x-5' : 'translate-x-0'}`} />
           </button>
        </div>
        
        {state.wood && (
          <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
             <div>
                <label className="text-[10px] text-gray-400 font-medium mb-1 block">Tone</label>
                <div className="grid grid-cols-2 gap-3">
                   <button
                     onClick={() => handleChange('woodTone', 'light')}
                     className={`py-2 text-xs rounded border transition-colors ${state.woodTone === 'light' ? 'border-brand-accent text-brand-accent bg-brand-accent/10' : 'border-gray-700 text-gray-400'}`}
                   >Light Oak</button>
                   <button
                     onClick={() => handleChange('woodTone', 'dark')}
                     className={`py-2 text-xs rounded border transition-colors ${state.woodTone === 'dark' ? 'border-brand-accent text-brand-accent bg-brand-accent/10' : 'border-gray-700 text-gray-400'}`}
                   >Dark Mahogany</button>
                </div>
             </div>
             
             <div>
                <label className="text-[10px] text-gray-400 font-medium mb-1 block">Edge Profile</label>
                <div className="grid grid-cols-2 gap-3">
                   <button
                     onClick={() => handleChange('woodEdge', 'square')}
                     className={`py-2 text-xs rounded border transition-colors ${state.woodEdge === 'square' ? 'border-brand-accent text-brand-accent bg-brand-accent/10' : 'border-gray-700 text-gray-400'}`}
                   >Square</button>
                   <button
                     onClick={() => handleChange('woodEdge', 'bevel')}
                     className={`py-2 text-xs rounded border transition-colors ${state.woodEdge === 'bevel' ? 'border-brand-accent text-brand-accent bg-brand-accent/10' : 'border-gray-700 text-gray-400'}`}
                   >Bevel</button>
                </div>
             </div>
          </div>
        )}
      </div>

    </div>
  );
};