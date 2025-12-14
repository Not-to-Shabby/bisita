import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { mediaApi } from '../services/api';

// ======================
// TYPES
// ======================

interface ImageUploaderProps {
  folder: string;
  maxFiles?: number;
  maxSizeMB?: number;
  onUploadComplete: (urls: string[]) => void;
  onError?: (error: string) => void;
  existingImages?: string[];
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'compressing' | 'uploading' | 'done' | 'error';
  url?: string;
  error?: string;
}

// ======================
// IMAGE COMPRESSION
// ======================

const compressImage = async (
  file: File,
  maxWidth = 1920,
  maxHeight = 1080,
  quality = 0.8
): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      canvas.width = width;
      canvas.height = height;

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Draw and compress
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// ======================
// COMPONENT
// ======================

const ImageUploader: React.FC<ImageUploaderProps> = ({
  folder,
  maxFiles = 5,
  maxSizeMB = 10,
  onUploadComplete,
  onError,
  existingImages = [],
  className = '',
}) => {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>(existingImages);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with external changes
  React.useEffect(() => {
    setUploadedUrls(prev => {
      // Simple shallow comparison to avoid unnecessary updates
      if (prev.length === existingImages.length && prev.every((val, index) => val === existingImages[index])) {
        return prev;
      }
      return existingImages;
    });
  }, [existingImages]);

  const updateFile = useCallback((id: string, updates: Partial<UploadingFile>) => {
    setUploadingFiles((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  }, []);

  const removeFile = useCallback((id: string) => {
    setUploadingFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const removeUploadedImage = useCallback((url: string) => {
    setUploadedUrls((prev) => {
      const newUrls = prev.filter((u) => u !== url);
      // Defer callback to avoid update during render
      setTimeout(() => onUploadComplete(newUrls), 0);
      return newUrls;
    });
  }, [onUploadComplete]);

  const processFile = useCallback(
    async (file: File) => {
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const preview = URL.createObjectURL(file);

      // Add to uploading list
      const uploadingFile: UploadingFile = {
        id,
        file,
        preview,
        progress: 0,
        status: 'compressing',
      };
      setUploadingFiles((prev) => [...prev, uploadingFile]);

      try {
        // Compress image
        updateFile(id, { status: 'compressing', progress: 10 });
        
        let fileToUpload: File | Blob = file;
        
        // Only compress if it's an image and larger than 500KB
        if (file.type.startsWith('image/') && file.size > 500 * 1024) {
          const compressed = await compressImage(file);
          fileToUpload = new File([compressed], file.name, { type: 'image/jpeg' });
        }

        updateFile(id, { status: 'uploading', progress: 20 });

        // Upload to Cloudinary
        const result = await mediaApi.uploadToCloudinary(
          fileToUpload as File,
          folder,
          (progress) => {
            updateFile(id, { progress: 20 + progress * 0.8 });
          }
        );

        if (result.error || !result.data) {
          throw new Error(result.error || 'Upload failed');
        }

        // Success
        updateFile(id, {
          status: 'done',
          progress: 100,
          url: result.data.url,
        });

        // Add to uploaded URLs
        setUploadedUrls((prev) => {
          const newUrls = [...prev, result.data!.url];
          // Defer callback to avoid update during render
          setTimeout(() => onUploadComplete(newUrls), 0);
          return newUrls;
        });

        // Remove from uploading list after a short delay
        setTimeout(() => removeFile(id), 1500);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        updateFile(id, { status: 'error', error: errorMessage });
        onError?.(errorMessage);
      }
    },
    [folder, onUploadComplete, onError, updateFile, removeFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = e.target.files;
      if (!fileList) return;
      
      const files: File[] = Array.from(fileList);
      
      // Check max files limit
      const totalFiles = uploadedUrls.length + uploadingFiles.length + files.length;
      if (totalFiles > maxFiles) {
        onError?.(`Maximum ${maxFiles} images allowed`);
        return;
      }

      // Validate and process each file
      files.forEach((file: File) => {
        // Check file type
        if (!file.type.startsWith('image/')) {
          onError?.(`${file.name} is not an image`);
          return;
        }

        // Check file size
        if (file.size > maxSizeMB * 1024 * 1024) {
          onError?.(`${file.name} is larger than ${maxSizeMB}MB`);
          return;
        }

        processFile(file);
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [uploadedUrls.length, uploadingFiles.length, maxFiles, maxSizeMB, processFile, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = Array.from(e.dataTransfer.files) as File[];
      
      // Simulate file input event
      const fakeEvent = {
        target: { files: files as unknown as FileList },
      } as React.ChangeEvent<HTMLInputElement>;
      
      handleFileSelect(fakeEvent);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const canAddMore = uploadedUrls.length + uploadingFiles.length < maxFiles;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Upload Area */}
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={handleKeyDown}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-sky-400 hover:bg-sky-50/50 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
          aria-label="Click or drag to upload images"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm font-medium text-slate-700">
            Click or drag images to upload
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Max {maxFiles} images, {maxSizeMB}MB each
          </p>
        </div>
      )}

      {/* Uploading Files */}
      {uploadingFiles.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {uploadingFiles.map((file) => (
            <div
              key={file.id}
              className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
            >
              <img
                src={file.preview}
                alt="Uploading"
                className="w-full h-full object-cover"
              />
              
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {file.status === 'compressing' && (
                  <div className="text-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                    <p className="text-xs mt-1">Compressing...</p>
                  </div>
                )}
                {file.status === 'uploading' && (
                  <div className="text-center text-white w-full px-4">
                    <div className="w-full h-1.5 bg-white/30 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-white rounded-full transition-all duration-300"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                    <p className="text-xs mt-2">{Math.round(file.progress)}%</p>
                  </div>
                )}
                {file.status === 'done' && (
                  <div className="text-center text-white">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mx-auto">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                )}
                {file.status === 'error' && (
                  <div className="text-center text-white px-2">
                    <AlertCircle className="w-6 h-6 text-red-400 mx-auto" />
                    <p className="text-xs mt-1 text-red-300">{file.error}</p>
                  </div>
                )}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Uploaded Images */}
      {uploadedUrls.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {uploadedUrls.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 group"
            >
              <img
                src={url}
                alt={`Uploaded ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://picsum.photos/200/200?error';
                }}
              />
              
              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeUploadedImage(url)}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all"
                aria-label="Remove image"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Index badge */}
              {index === 0 && (
                <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-sky-600 text-white text-xs font-bold rounded">
                  Cover
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {uploadedUrls.length === 0 && uploadingFiles.length === 0 && !canAddMore && (
        <div className="text-center py-8 text-slate-400">
          <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No images uploaded yet</p>
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
