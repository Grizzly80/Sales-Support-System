import React from 'react';

interface LandingPageProps {
    onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-between p-8 pt-24 pb-16 animate-in fade-in duration-700">
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full">
                {/* CI Logo */}
                <div className="w-64 h-auto animate-in slide-in-from-bottom-8 duration-1000">
                    <img
                        src="/hansol_logo.jpg"
                        alt="Hansol Logistics"
                        className="w-full h-auto object-contain"
                    />
                </div>

                {/* System Title */}
                <div className="text-center space-y-2 animate-in slide-in-from-bottom-12 duration-1000 delay-200">
                    <h1 className="text-2xl font-bold text-gray-800 tracking-tight">
                        한솔로지스틱스<br />
                        <span className="text-primary">영업지원 시스템</span>
                    </h1>
                    <p className="text-sm text-gray-400 font-medium tracking-widest uppercase">
                        Sales Support System
                    </p>
                </div>
            </div>

            {/* Start Button */}
            <div className="w-full max-w-xs animate-in slide-in-from-bottom-16 duration-1000 delay-500">
                <button
                    onClick={onStart}
                    className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    시작하기
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
                    </svg>
                </button>
                <p className="text-center text-[10px] text-gray-300 mt-6">
                    © 2026 Hansol Logistics. All Rights Reserved.
                </p>
            </div>
        </div>
    );
};

export default LandingPage;
