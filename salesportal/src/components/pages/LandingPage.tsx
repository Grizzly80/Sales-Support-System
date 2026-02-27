import React, { useState } from 'react';
import { User, Lock, Loader2 } from 'lucide-react';
import { n8nApi } from '../../api/n8n';
import { storage } from '../../utils/storage';

interface LandingPageProps {
    onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
    const [userId, setUserId] = useState('');
    const [userPw, setUserPw] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!userId.trim() || !userPw.trim()) {
            alert('아이디와 비밀번호를 모두 입력해주세요.');
            return;
        }

        setIsLoading(true);
        try {
            // n8n 로그인 웹훅 호출 (배열로 응답이 옵니다)
            const response = await n8nApi.login(userId, userPw);
            console.log('Login response:', response);

            const result = Array.isArray(response) ? response[0] : response;
            // n8n 데이터는 보통 json 필드 안에 들어있을 수 있으므로 유연하게 체크
            const data = result?.json || result;

            if (data && data.STATUS === 'SUCCESS') {
                // 세션 정보 저장
                storage.setUserInfo({
                    USERID: data.USERID,
                    USER_NM: data.USER_NM,
                    DEPT_CD: data.DEPT_CD,
                    DEPT_NM: data.DEPT_NM
                });

                onStart();
            } else if (data && data.STATUS === 'FAIL') {
                alert('아이디와 패스워드가 일치하지 않습니다.');
            } else {
                alert('로그인 처리 중 알 수 없는 응답이 발생했습니다.');
            }
        } catch (error) {
            console.error('Login failed:', error);
            alert('로그인 처리 중 서버 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-between p-8 pt-16 pb-16 animate-in fade-in duration-700">
            <div className="flex-1 flex flex-col items-center justify-center space-y-8 w-full max-w-sm">
                {/* CI Logo */}
                <div className="w-48 h-auto animate-in slide-in-from-bottom-8 duration-1000">
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

                {/* Login Form */}
                <form onSubmit={handleLogin} className="w-full space-y-4 pt-4 animate-in slide-in-from-bottom-16 duration-1000 delay-400">
                    <div className="space-y-3">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                <User className="w-5 h-5" />
                            </div>
                            <input
                                type="text"
                                placeholder="아이디"
                                className="block w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                <Lock className="w-5 h-5" />
                            </div>
                            <input
                                type="password"
                                placeholder="비밀번호"
                                className="block w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-base focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                                value={userPw}
                                onChange={(e) => setUserPw(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-primary hover:bg-primary/90 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                로그인
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="9 5l7 7-7 7" />
                                </svg>
                            </>
                        )}
                    </button>
                </form>
            </div>

            <div className="w-full max-w-xs">
                <p className="text-center text-[10px] text-gray-300">
                    © 2026 Hansol Logistics. All Rights Reserved.
                </p>
            </div>
        </div>
    );
};

export default LandingPage;
