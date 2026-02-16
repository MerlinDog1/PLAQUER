import React, { useState, useRef } from 'react';
import { Header } from './components/Header';
import PlaquePreview from './components/PlaquePreview';
import { Controls } from './components/Controls';
import { RealisticPreviewModal } from './components/RealisticPreviewModal';
import { VectorSketch } from './components/VectorSketch';
import { INITIAL_STATE, PlaqueState } from './types';
import { generateLayout, generateRealisticView } from './services/geminiService';
import { downloadCorelSvg, downloadPdf, svgToPngBase64 } from './services/exportService';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'plaque' | 'vector'>('plaque');
  const [state, setState] = useState<PlaqueState>(INITIAL_STATE);
  const [isGeneratingLayout, setIsGeneratingLayout] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);

  const price = React.useMemo(() => {
    const area = (state.width * state.height) / 100;
    const base = 40;
    const materialFactor = state.material.includes('brass') ? 1.5 : 1.2;
    const woodCost = state.wood ? 25 : 0;
    return Math.round(base + area * 0.2 * materialFactor + woodCost);
  }, [state.width, state.height, state.material, state.wood]);

  const handleStateChange = (changes: Partial<PlaqueState>) => {
    setState((prev) => ({ ...prev, ...changes }));
  };

  const handleClearDesign = () => {
    setState((prev) => ({
      ...prev,
      generatedSvgContent: null,
      aiReasoning: null,
    }));
  };

  const handleGenerateLayout = async (prompt: string) => {
    setIsGeneratingLayout(true);
    try {
      const result = await generateLayout(
        prompt,
        state.width,
        state.height,
        state.shape,
        state.generatedSvgContent
      );

      if (result) {
        setState((prev) => ({
          ...prev,
          generatedSvgContent: result.svgContent,
          aiReasoning: result.reasoning,
        }));
      }
    } catch (error: any) {
      alert(`AI layout generation failed: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsGeneratingLayout(false);
    }
  };

  const handleRealPreview = async () => {
    if (!svgRef.current) return;
    setModalOpen(true);
    setGeneratedImage(null);
    setIsGeneratingImage(true);

    try {
      const base64Png = await svgToPngBase64(svgRef.current);
      const result = await generateRealisticView(base64Png, state);
      setGeneratedImage(result);
    } catch (error: any) {
      alert(`Realistic preview failed: ${error?.message || 'Unknown error'}`);
      setModalOpen(false);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleExportSvg = async () => {
    if (!svgRef.current) return;
    await downloadCorelSvg(svgRef.current, state);
  };

  const handleExportPdf = async () => {
    if (!svgRef.current) return;
    await downloadPdf(svgRef.current, state);
  };

  const handleNativePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col">
      <Header currentView={currentView} onNavigate={setCurrentView} />

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8 flex flex-col lg:flex-row gap-8">
        {currentView === 'vector' ? (
          <VectorSketch />
        ) : (
          <>
            <section className="flex-1 lg:flex-[1.5] relative">
              <div className="lg:sticky lg:top-24 space-y-6">
                <div className="flex items-center justify-between no-print">
                  <h2 className="text-2xl font-serif text-white">Design Studio</h2>
                  <div className="flex gap-2">
                    <button
                      onClick={handleRealPreview}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-emerald-900/50 transition-all flex items-center gap-2"
                    >
                      <span>📷</span> Realistic View
                    </button>
                    <div className="flex rounded-lg bg-[#2a2d3a] border border-gray-700 p-0.5">
                      <button
                        onClick={handleExportSvg}
                        className="px-3 py-1.5 hover:bg-[#333644] text-gray-200 text-sm font-medium rounded-md transition-all border-r border-gray-600"
                      >
                        SVG
                      </button>
                      <button
                        onClick={handleExportPdf}
                        className="px-3 py-1.5 hover:bg-[#333644] text-gray-200 text-sm font-medium rounded-md transition-all border-r border-gray-600"
                      >
                        PDF (Pro)
                      </button>
                      <button
                        onClick={handleNativePrint}
                        className="px-3 py-1.5 hover:bg-[#333644] text-gray-200 text-sm font-medium rounded-md transition-all flex items-center gap-1"
                        title="Use browser print dialog to save as PDF"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                        Print
                      </button>
                    </div>
                  </div>
                </div>

                <PlaquePreview ref={svgRef} state={state} />

                <div className="flex justify-center gap-8 text-sm text-gray-500 font-mono no-print">
                  <span>{state.width}mm × {state.height}mm</span>
                  <span className="text-gray-700">|</span>
                  <span className="capitalize">{state.material.replace('-', ' ')}</span>
                </div>

                <div className="mt-8 p-6 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800 border border-gray-700 flex items-center justify-between no-print">
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

            <aside className="flex-1 lg:max-w-md no-print">
              <Controls
                state={state}
                onChange={handleStateChange}
                onGenerate={handleGenerateLayout}
                onClear={handleClearDesign}
                isGenerating={isGeneratingLayout}
              />
            </aside>
          </>
        )}
      </main>

      <div className="no-print">
        <RealisticPreviewModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          isLoading={isGeneratingImage}
          imageUrl={generatedImage}
        />
      </div>
    </div>
  );
};

export default App;
