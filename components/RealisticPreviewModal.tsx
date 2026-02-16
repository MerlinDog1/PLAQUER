import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  isLoading: boolean;
}

export const RealisticPreviewModal: React.FC<Props> = ({ isOpen, onClose, imageUrl, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#1a1c24] border border-gray-700 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-[#15161c]">
          <div className="flex items-center gap-2">
            <h3 className="text-white font-bold text-lg">Realistic Preview</h3>
            <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded border border-blue-700">Gemini Vision</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 flex-1 flex items-center justify-center bg-[#0b0c11] min-h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-brand-accent border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400 animate-pulse">Rendering photorealistic metal physics...</p>
            </div>
          ) : imageUrl ? (
            <img src={`data:image/png;base64,${imageUrl}`} alt="Realistic Plaque" className="max-w-full max-h-full rounded-lg shadow-lg object-contain" />
          ) : (
            <p className="text-red-400">Failed to generate image. Please try again.</p>
          )}
        </div>
        
        <div className="p-4 bg-[#15161c] border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            AI generated visualization. Actual product finish may vary slightly due to lighting conditions.
          </p>
        </div>
      </div>
    </div>
  );
};