import { useState } from 'react';
import TopBar from './components/layout/TopBar';
import BottomNav from './components/layout/BottomNav';
import { CalendarPage, SearchPage, RecordsPage, LandingPage } from './components/pages';
import { storage } from './utils/storage';

type Tab = 'calendar' | 'search' | 'records';

/**
 * 메인 애플리케이션 컴포넌트
 */
function App() {
  // 새로고침 시 세션 정보가 있으면 바로 시작페이지 건너뜀
  const [isStarted, setIsStarted] = useState(() => !!storage.getUserInfo());
  const [activeTab, setActiveTab] = useState<Tab>('calendar');

  const getTitle = () => {
    switch (activeTab) {
      case 'calendar': return '영업 활동 캘린더';
      case 'search': return '고객 정보 조회';
      case 'records': return '영업 활동 기록';
    }
  };

  const handleBack = () => {
    if (activeTab !== 'calendar') {
      setActiveTab('calendar');
    }
  };

  const handleHome = () => {
    setActiveTab('calendar');
  };

  const handleLogout = () => {
    if (window.confirm('로그아웃 하시겠습니까?')) {
      storage.clearUserInfo();
      setIsStarted(false);
      setActiveTab('calendar');
    }
  };

  if (!isStarted) {
    return <LandingPage onStart={() => setIsStarted(true)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans select-none animate-in fade-in duration-500">
      {/* Top Bar */}
      <TopBar
        title={getTitle()}
        onBack={handleBack}
        onHome={handleHome}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto max-w-md mx-auto w-full">
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'search' && <SearchPage />}
        {activeTab === 'records' && <RecordsPage />}
      </main>

      {/* Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  );
}

export default App;
