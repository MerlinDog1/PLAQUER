import React, { useState, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Header } from './components/Header';
import PlaquePreview from './components/PlaquePreview';
import { Controls } from './components/Controls';
import { RealisticPreviewModal } from './components/RealisticPreviewModal';
import { INITIAL_STATE, PlaqueState } from './types';
import { generateLayout, generateRealisticView } from './services/geminiService';
import { downloadCorelSvg, svgToPngBase64 } from './services/exportService';

const App: React.FC = () => {
  const [state, setState] = useState<PlaqueState>(INITIAL_STATE);
  const [isGeneratingLayout, setIsGeneratingLayout] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);

  // Price Calculation (Mock)
  const price = React.useMemo(() => {
    const area = (state.width * state.height) / 100; // cm2
    const base = 40;
    const materialFactor = state.material.includes('brass') ? 1.5 : 1.2;
    const woodCost = state.wood ? 25 : 0;
    return Math.round((base + (area * 0.2) * materialFactor + woodCost));
  }, [state.width, state.height, state.material, state.wood]);

  const handleStateChange = (changes: Partial<PlaqueState>) => {
    setState(prev => ({ ...prev, ...changes }));
  };

  const handleGenerateLayout = async (prompt: string) => {
    setIsGeneratingLayout(true);
    const result = await generateLayout(prompt, state.width, state.height, state.shape);
    if (result) {
      setState(prev => ({
        ...prev,
        generatedSvgContent: result.svgContent,
        aiReasoning: result.reasoning
      }));
    } else {
      alert("AI failed to generate layout. Check console/API key.");
    }
    setIsGeneratingLayout(false);
  };

  const handleRealPreview = async () => {
    if (!svgRef.current) return;
    setModalOpen(true);
    setGeneratedImage(null);
    setIsGeneratingImage(true);

    try {
      // 1. Convert current SVG to base64 PNG
      const base64Png = await svgToPngBase64(svgRef.current);
      // 2. Send to Gemini Vision
      const result = await generateRealisticView(base64Png, state);
      setGeneratedImage(result);
    } catch (e) {
      console.error(e);
      alert("Failed to render realistic view");
      setModalOpen(false);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleExport = async () => {
    if (!svgRef.current) return;
    await downloadCorelSvg(svgRef.current, state);
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Preview (Sticky on Desktop) */}
        <section className="flex-1 lg:flex-[1.5] relative">
          <div className="lg:sticky lg:top-24 space-y-6">
            
            <div className="flex items-center justify-between">
               <h2 className="text-2xl font-serif text-white">Design Studio</h2>
               <div className="flex gap-2">
                 <button 
                   onClick={handleRealPreview}
                   className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-900/50 transition-all flex items-center gap-2"
                 >
                   <span>📷</span> Realistic View
                 </button>
                 <button 
                   onClick={handleExport}
                   className="px-4 py-2 bg-[#2a2d3a] hover:bg-[#333644] text-gray-200 text-sm font-medium rounded-lg border border-gray-700 transition-all"
                 >
                   Download SVG
                 </button>
               </div>
            </div>

            <PlaquePreview ref={svgRef} state={state} />
            
            <div className="flex justify-center gap-8 text-sm text-gray-500 font-mono">
              <span>{state.width}mm × {state.height}mm</span>
              <span className="text-gray-700">|</span>
              <span className="capitalize">{state.material.replace('-', ' ')}</span>
            </div>

            {/* Price Card Mobile/Desktop */}
            <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm mb-1">Estimated Total</p>
                <div className="text-3xl font-bold text-white">${price}.00</div>
              </div>
              <button className="px-8 py-3 bg-brand-accent hover:bg-yellow-400 text-black font-bold rounded-xl shadow-lg shadow-yellow-500/20 transition-all transform hover:scale-105">
                Add to Cart
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Controls */}
        <aside className="flex-1 lg:max-w-md">
           <Controls 
             state={state} 
             onChange={handleStateChange} 
             onGenerate={handleGenerateLayout}
             isGenerating={isGeneratingLayout}
           />
        </aside>
      </main>

      <RealisticPreviewModal 
        isOpen={modalOpen} 
        onClose={() => setModalOpen(false)}
        isLoading={isGeneratingImage}
        imageUrl={generatedImage}
      />
    </div>
  );
};

export default App;