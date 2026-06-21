"use client";
import { useState } from 'react';

interface LogoUploadProps {
    logo: string | undefined;
    onLogoChange: (logoDataUrl: string) => void;
    label?: string;
    containerSize?: "small" | "medium" | "large";
}

export default function LogoUpload({ 
    logo, 
    onLogoChange, 
    label = "Logo",
    containerSize = "medium"
}: LogoUploadProps) {
    const [error, setError] = useState('');
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    const MAX_DATA_URL_SIZE = 500 * 1024; // 500KB for the final base64 string

    const sizeClasses = {
        small: "w-16 h-16",
        medium: "w-24 h-24",
        large: "w-32 h-32"
    };

    const compressImage = (file: File, callback: (dataUrl: string) => void) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Resize to max 300x300px
                if (width > 300 || height > 300) {
                    if (width > height) {
                        height = (height * 300) / width;
                        width = 300;
                    } else {
                        width = (width * 300) / height;
                        height = 300;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Convert to compressed DataURL with aggressive quality
                let dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                
                // If still too large, reduce quality further
                let quality = 0.6;
                while (dataUrl.length > MAX_DATA_URL_SIZE && quality > 0.1) {
                    quality -= 0.1;
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                }

                if (dataUrl.length > MAX_DATA_URL_SIZE) {
                    setError('❌ Image still too large after compression. Try a smaller image.');
                    return;
                }

                console.log('Compressed image size:', (dataUrl.length / 1024).toFixed(2), 'KB');
                callback(dataUrl);
            };
            img.src = e.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setError('');

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setError('❌ Please upload an image file');
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            setError('❌ File size must be under 2MB');
            return;
        }

        compressImage(file, (dataUrl) => {
            onLogoChange(dataUrl);
            setError('✅ Logo uploaded successfully');
            setTimeout(() => setError(''), 2000);
        });
    };

    return (
        <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                {label}
            </label>
            {error && (
                <div className={`px-4 py-2 rounded-lg text-xs font-semibold ${
                    error.includes('✅') 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                }`}>
                    {error}
                </div>
            )}
            <div className="flex items-center gap-6">
                {/* Logo Preview Container */}
                <div className={`${sizeClasses[containerSize]} bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-2 border-dashed border-indigo-400/30 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden`}>
                    {logo ? (
                        <img 
                            src={logo} 
                            alt="Logo Preview" 
                            className="w-full h-full object-contain p-2"
                        />
                    ) : (
                        <div className="text-center">
                            <div className="text-3xl mb-1">🖼️</div>
                            <p className="text-[10px] text-slate-500 font-semibold">No logo</p>
                        </div>
                    )}
                </div>

                {/* Upload Input */}
                <div className="flex-1">
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full px-5 py-4 bg-slate-950 border border-white/10 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/30 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white file:cursor-pointer hover:file:bg-indigo-500 transition"
                    />
                    <p className="text-xs text-slate-500 mt-2">PNG, JPG under 2MB (will be heavily compressed)</p>
                </div>

                {/* Clear Button */}
                {logo && (
                    <button
                        type="button"
                        onClick={() => onLogoChange("")}
                        className="p-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl border border-red-500/20 transition flex-shrink-0"
                        title="Remove logo"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );
}
