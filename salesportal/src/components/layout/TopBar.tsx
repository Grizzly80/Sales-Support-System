import React from 'react';
import { ChevronLeft, Home, LogOut } from 'lucide-react';

interface TopBarProps {
    onBack?: () => void;
    onHome?: () => void;
    onLogout?: () => void;
    title: string;
}

/**
 * 상단 바 컴포넌트: 뒤로가기 및 홈 버튼 포함
 */
const TopBar: React.FC<TopBarProps> = ({ onBack, onHome, onLogout, title }) => {
    return (
        <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors apple-button"
                    aria-label="Back"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
                <button
                    onClick={onHome}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors apple-button"
                    aria-label="Home"
                >
                    <Home className="w-5 h-5 text-gray-700" />
                </button>
            </div>

            <h1 className="text-lg font-semibold text-gray-900 absolute left-1/2 -translate-x-1/2 whitespace-nowrap">
                {title}
            </h1>

            <div className="flex items-center">
                <button
                    onClick={onLogout}
                    className="p-2 hover:bg-red-50 rounded-full transition-colors apple-button text-gray-400 hover:text-red-500"
                    aria-label="Logout"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
};

export default TopBar;
