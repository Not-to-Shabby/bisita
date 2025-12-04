import React, { useState, useRef } from 'react';
import { Camera, Loader2, X } from 'lucide-react';
import { mediaApi } from '../services/api';

interface AvatarUploaderProps {
  currentAvatar?: string;
  username?: string;
  onUploadComplete: (url: string) => void;
  onError?: (error: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-24 h-24',
  lg: 'w-32 h-32',
};

const buttonSizeClasses = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10',
};

const compressAvatar = async (file: File): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    img.onload = () => {
      // Avatar size: 400x400 max
      const size = 400;
      canvas.width = size;
      canvas.height = size;

      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      // Calculate crop to make square
      const { width, height } = img;
      const minDim = Math.min(width, height);
      const sx = (width - minDim) / 2;
      const sy = (height - minDim) / 2;

      // Draw centered square crop
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress avatar'));
          }
        },
        'image/jpeg',
        0.85
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentAvatar,
  username = 'User',
  onUploadComplete,
  onError,
  size = 'lg',
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      onError?.('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      onError?.('Image must be smaller than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Create preview
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Compress avatar
      setUploadProgress(10);
      const compressed = await compressAvatar(file);
      const compressedFile = new File([compressed], 'avatar.jpg', { type: 'image/jpeg' });

      // Upload to Cloudinary
      setUploadProgress(30);
      const result = await mediaApi.uploadToCloudinary(
        compressedFile,
        'avatars',
        (progress) => {
          setUploadProgress(30 + progress * 0.7);
        }
      );

      if (result.error || !result.data) {
        throw new Error(result.error || 'Upload failed');
      }

      // Success
      setUploadProgress(100);
      onUploadComplete(result.data.url);

      // Cleanup preview
      URL.revokeObjectURL(preview);
      setPreviewUrl(null);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to upload avatar');
      setPreviewUrl(null);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !isUploading) {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const displayImage = previewUrl || currentAvatar;

  return (
    <div className="relative inline-block">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={isUploading}
      />

      {/* Avatar display */}
      <div
        className={`${sizeClasses[size]} rounded-full bg-orange-100 border-4 border-white shadow-lg overflow-hidden`}
      >
        {displayImage ? (
          <img
            src={displayImage}
            alt={`${username}'s avatar`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://picsum.photos/300/300?random=50';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-400 to-sky-600">
            <span className="text-4xl font-bold text-white">
              {username.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* Uploading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
            <div className="text-center text-white">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              <span className="text-xs mt-1 block">{Math.round(uploadProgress)}%</span>
            </div>
          </div>
        )}
      </div>

      {/* Upload button */}
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        disabled={isUploading}
        className={`absolute bottom-0 right-0 ${buttonSizeClasses[size]} bg-sky-500 text-white rounded-full border-4 border-white shadow-md hover:bg-sky-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
        aria-label={isUploading ? 'Uploading...' : 'Change avatar'}
        tabIndex={0}
      >
        {isUploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Camera className="w-4 h-4" />
        )}
      </button>
    </div>
  );
};

export default AvatarUploader;
