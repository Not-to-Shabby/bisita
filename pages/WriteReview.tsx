import React, { useState } from 'react';
import Header from '../components/Header';
import { Star, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WriteReview: React.FC = () => {
    const navigate = useNavigate();
    const [rating, setRating] = useState(4);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header showBack title="Write a Review" />
      <div className="p-6 pt-20">
        <h2 className="text-xl font-bold text-slate-900 mb-6 leading-tight">
          How was your experience at Timoga Cold Spring?
        </h2>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center mb-8">
            <span className="text-5xl font-bold text-slate-900 mb-2">{rating}.0</span>
            <div className="flex gap-2 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} onClick={() => setRating(star)}>
                        <Star 
                            size={24} 
                            className={`${star <= rating ? 'text-sky-500 fill-sky-500' : 'text-gray-300'}`} 
                        />
                    </button>
                ))}
            </div>
            <span className="text-sm text-slate-500">Based on 120 reviews</span>
        </div>

        <h3 className="font-bold text-slate-900 mb-4">Your Rating</h3>
        <div className="flex gap-4 justify-center mb-8">
             {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => setRating(star)}>
                    <Star 
                        size={32} 
                        className={`${star <= rating ? 'text-gray-300 fill-gray-300' : 'text-gray-200'}`} 
                    />
                </button>
            ))}
        </div>

        <h3 className="font-bold text-slate-900 mb-4">Share your experience</h3>
        <textarea
            className="w-full h-32 bg-white border border-gray-200 rounded-xl p-4 outline-none focus:ring-2 focus:ring-sky-500 resize-none mb-8"
            placeholder="Tell us more about your visit..."
        ></textarea>

        <h3 className="font-bold text-slate-900 mb-4">Add Photos or Videos</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 bg-gray-50 mb-8 cursor-pointer hover:bg-gray-100 transition-colors">
            <Camera size={48} className="mb-2" />
            <span className="text-sm">Tap to upload</span>
        </div>
        
        <p className="text-xs text-gray-500 mb-6 text-center">
            By submitting, you agree to our review guidelines. Be respectful and constructive.
        </p>

        <button 
            onClick={() => navigate(-1)}
            className="w-full bg-sky-500 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-sky-600 transition-colors"
        >
            Submit Review
        </button>
      </div>
    </div>
  );
};

export default WriteReview;