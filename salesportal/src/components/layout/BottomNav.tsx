import React from 'react';
import { Calendar, Search, ClipboardList } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface BottomNavProps {
    activeTab: 'calendar' | 'search' | 'records';
    onTabChange: (tab: 'calendar' | 'search' | 'records') => void;
}

/**
 * 하단 네비게이션 바 컴포넌트
 */
const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
    const tabs = [
        { id: 'calendar', label: '활동 캘린더', icon: Calendar },
        { id: 'search', label: '고객 검색', icon: Search },
        { id: 'records', label: '활동 기록', icon: ClipboardList },
    ] as const;

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 glass-morphism pt-2 pb-6 px-6">
            <div className="max-w-md mx-auto flex justify-between items-center">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => onTabChange(id)}
                        className={cn(
                            "flex flex-col items-center gap-1 min-w-[64px] transition-colors apple-button",
                            activeTab === id ? "text-primary" : "text-gray-400"
                        )}
                    >
                        <Icon className={cn("w-6 h-6", activeTab === id ? "fill-primary/10" : "")} />
                        <span className="text-[10px] font-medium">{label}</span>
                    </button>
                ))}
            </div>
        </nav>
    );
};

export default BottomNav;
