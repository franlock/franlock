import React from 'react';
import { Region } from '../types';

interface SettingsProps {
  region: Region;
  setRegion: (region: Region) => void;
}

const Settings: React.FC<SettingsProps> = ({ region, setRegion }) => {
  
  // Helper to convert internal X/Y to "Bottom Right" logic for the UI
  const widthVal = region.width;
  const heightVal = region.height;

  const handleWidthChange = (val: number) => {
    // If we are simulating "Bottom Right" mode, when width grows, X gets smaller
    // x = 100 - width
    setRegion({
      ...region,
      width: val,
      x: 100 - val
    });
  };

  const handleHeightChange = (val: number) => {
    // y = 100 - height
    setRegion({
      ...region,
      height: val,
      y: 100 - val
    });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200 mb-6">
      <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        Default Watermark Zone
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Zone Width ({Math.round(widthVal)}%)
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={widthVal}
            onChange={(e) => handleWidthChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
          <p className="text-xs text-slate-400 mt-1">Width from right edge</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">
            Zone Height ({Math.round(heightVal)}%)
          </label>
          <input
            type="range"
            min="5"
            max="50"
            value={heightVal}
            onChange={(e) => handleHeightChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />
           <p className="text-xs text-slate-400 mt-1">Height from bottom edge</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
