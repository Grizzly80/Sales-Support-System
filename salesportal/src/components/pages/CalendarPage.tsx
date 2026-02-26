import React, { useState, useEffect } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    addDays,
    subDays
} from 'date-fns';
import { ko } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Plus, Clock, Search, Loader2, ClipboardList, Calendar, Pencil } from 'lucide-react';
import { n8nApi } from '../../api/n8n';
import type { CustomerInfo } from '../../types';
import { clsx } from 'clsx';
import { storage } from '../../utils/storage';
import type { SalesActivity } from '../../types';

/**
 * 메인 캘린더 페이지 컴포넌트
 */
const CalendarPage: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newActivity, setNewActivity] = useState<Partial<SalesActivity>>({
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        type: 'Meeting',
    });

    // 고객사 검색 관련 상태
    const [isSearchModalOpenInternal, setIsSearchModalOpenInternal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<CustomerInfo[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [webhookActivities, setWebhookActivities] = useState<SalesActivity[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<SalesActivity | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const localActivities = storage.getActivities();
    // 로컬 데이터와 웹훅 데이터를 병합 (내용 기반 중복 제거 로직 강화)
    const activitiesMap = new Map<string | number, SalesActivity>();

    // 1. 웹훅에서 가져온 정식 데이터를 우선 등록 (Source of Truth)
    webhookActivities.forEach(item => {
        activitiesMap.set(item.id, item);
    });

    // 2. 로컬 스토리지 데이터 중 중복되지 않은 것만 추가
    localActivities.forEach(item => {
        if (!activitiesMap.has(item.id)) {
            // ID가 다르더라도 내용(일자, 시간, 고객명, 활동내용)이 100% 일치하면 중복으로 간주
            const isDuplicate = Array.from(activitiesMap.values()).some(existing =>
                existing.date === item.date &&
                existing.time === item.time &&
                existing.customerName === item.customerName &&
                existing.content === item.content
            );

            if (!isDuplicate) {
                activitiesMap.set(item.id, item);
            }
        }
    });
    const activities = Array.from(activitiesMap.values());

    // 캘린더 데이터 생성
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    useEffect(() => {
        const fetchRemoteActivities = async () => {
            try {
                const dateStr = format(selectedDate, 'yyyy-MM-dd');
                const monthStr = format(monthStart, 'yyyy-MM');
                const remoteData = await n8nApi.findActivities(dateStr, monthStr);

                // API 응답 데이터를 SalesActivity 형식으로 변환/확인
                const mappedData: SalesActivity[] = remoteData.map((item: any) => {
                    // n8n 데이터는 때로 [{ json: { ... } }] 형식으로 옵니다.
                    const d = item.json || item.row || item;

                    // DATE가 ISO string인 경우 날짜만 추출 (YYYY-MM-DD)
                    let itemDate = d.DATE || d.date || d.일자 || dateStr;
                    if (itemDate && typeof itemDate === 'string' && itemDate.includes('T')) {
                        try {
                            itemDate = format(new Date(itemDate), 'yyyy-MM-dd');
                        } catch (e) {
                            itemDate = itemDate.split('T')[0];
                        }
                    }

                    return {
                        id: d.id ?? d.pk_num ?? d.ID ?? crypto.randomUUID(),
                        date: itemDate,
                        time: d.time || d.TIME || d.시간 || '09:00',
                        customerName: d.CORP_NM || d.corp_nm || d.고객명 || d.회사명 || d.customerName || 'Unknown',
                        type: d.act_sctn_cd || d.type || d.활동구분 || 'Meeting',
                        status: (itemDate > format(new Date(), 'yyyy-MM-dd')) ? 'Scheduled' : 'Completed',
                        content: d.ACT_REPORT || d.act_report || d.활동내용 || d.content || '',
                        businessNumber: String(d.BIZ_NUM || d.biz_num || d.사업자등록번호 || ''),
                        createdAt: d.createdAt ? new Date(d.createdAt).getTime() : Date.now()
                    };
                });

                setWebhookActivities(mappedData);

                // 서버 데이터와 일치하거나 유사한(중복된) 로컬 데이터 로컬스토리지에서 정리
                const currentLocal = storage.getActivities();
                const updatedLocal = currentLocal.filter(local => {
                    // ID가 정확히 일치하거나, [날짜+고객명+내용]이 일치하면 서버 데이터로 간주
                    const isSynced = mappedData.some(remote =>
                        remote.id === local.id ||
                        (remote.date === local.date &&
                            remote.customerName === local.customerName &&
                            remote.content === local.content)
                    );
                    return !isSynced;
                });

                if (currentLocal.length !== updatedLocal.length) {
                    localStorage.setItem('sales_activities', JSON.stringify(updatedLocal));
                }
            } catch (error) {
                console.error('Failed to fetch remote activities:', error);
            }
        };

        fetchRemoteActivities();
    }, [currentMonth, selectedDate]);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handlePrevDay = () => setSelectedDate(subDays(selectedDate, 1));
    const handleNextDay = () => setSelectedDate(addDays(selectedDate, 1));

    const handleSave = async () => {
        if (!newActivity.customerName || !newActivity.content) {
            alert('고객명과 활동 내용을 입력해주세요.');
            return;
        }

        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const activityDate = newActivity.date || format(selectedDate, 'yyyy-MM-dd');
        const activityTime = newActivity.time || '09:00';
        const activityType = newActivity.type as any;
        const activityContent = newActivity.content;

        try {
            // n8n Webhook 호출 (활동 저장/수정)
            const response = await n8nApi.saveActivity({
                ... (isEditing ? { id: newActivity.id } : {}), // 수정 시 ID 포함
                사업자등록번호: newActivity.businessNumber || '',
                고객명: newActivity.customerName,
                일자: activityDate,
                시간: activityTime,
                활동구분: activityType,
                활동내용: activityContent,
                rawData: isEditing ? newActivity.rawData : undefined // 원본 데이터 전달
            });

            // n8n에서 생선된 실제 데이터 추출
            const savedData = Array.isArray(response) ? response[0] : response;
            const d = savedData?.json || savedData?.row || savedData || {};

            const activity: SalesActivity = {
                id: d.id ?? d.pk_num ?? d.ID ?? crypto.randomUUID(),
                date: activityDate,
                time: activityTime,
                customerName: newActivity.customerName,
                businessNumber: newActivity.businessNumber,
                type: activityType,
                status: activityDate > todayStr ? 'Scheduled' : 'Completed',
                content: activityContent,
                createdAt: isEditing ? (newActivity.createdAt || Date.now()) : Date.now(),
                rawData: d // 원본 데이터 저장 (삭제 시 필요)
            };

            if (isEditing) {
                storage.updateActivity(activity);
            } else {
                storage.saveActivity(activity);
            }

            // 데이터 재조회
            const monthStr = format(monthStart, 'yyyy-MM');
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            const remoteData = await n8nApi.findActivities(dateStr, monthStr);

            const mappedData: SalesActivity[] = remoteData.map((item: any) => {
                const rd = item.json || item.row || item;
                let rdDate = rd.DATE || rd.date || rd.일자 || dateStr;
                if (rdDate && typeof rdDate === 'string' && rdDate.includes('T')) {
                    try {
                        rdDate = format(new Date(rdDate), 'yyyy-MM-dd');
                    } catch (e) {
                        rdDate = rdDate.split('T')[0];
                    }
                }
                return {
                    id: rd.id ?? rd.pk_num ?? rd.ID ?? crypto.randomUUID(),
                    date: rdDate,
                    time: rd.time || rd.TIME || rd.시간 || '09:00',
                    customerName: rd.CORP_NM || rd.corp_nm || rd.고객명 || rd.회사명 || rd.customerName || 'Unknown',
                    type: rd.act_sctn_cd || rd.type || rd.활동구분 || 'Meeting',
                    status: (rdDate > todayStr) ? 'Scheduled' : 'Completed',
                    content: rd.ACT_REPORT || rd.act_report || rd.활동내용 || rd.content || '',
                    businessNumber: String(rd.BIZ_NUM || rd.biz_num || rd.사업자등록번호 || ''),
                    createdAt: rd.createdAt ? new Date(rd.createdAt).getTime() : Date.now(),
                    rawData: rd
                };
            });
            setWebhookActivities(mappedData);

            setIsModalOpen(false);
            setIsEditing(false);
            setNewActivity({
                date: format(selectedDate, 'yyyy-MM-dd'),
                time: format(new Date(), 'HH:mm'),
                type: 'Meeting',
            });
        } catch (err) {
            console.error('n8n save failed:', err);
            alert('일정 저장 중 오류가 발생했습니다.');
        }
    };

    const selectedDayActivities = activities.filter((a: SalesActivity) => a.date === format(selectedDate, 'yyyy-MM-dd'));

    const handleSearchClick = () => {
        setSearchQuery('');
        setSearchResults([]);
        setIsSearchModalOpenInternal(true);
    };

    const performSearch = async () => {
        if (!searchQuery.trim()) return;
        setIsSearching(true);
        try {
            const results = await n8nApi.searchCustomerSelect(searchQuery);
            setSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectCustomer = (customer: CustomerInfo) => {
        setNewActivity({
            ...newActivity,
            customerName: customer.회사명,
            businessNumber: customer.사업자등록번호
        });
        setIsSearchModalOpenInternal(false);
    };

    return (
        <div className="p-4 pt-4 space-y-4 pb-24">
            {/* 캘린더 위젯 */}
            <div className="apple-card p-4">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">
                        {format(currentMonth, 'yyyy년 M월', { locale: ko })}
                    </h2>
                    <div className="flex gap-1">
                        <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-5 h-5" /></button>
                        <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="grid grid-cols-7 gap-1 mb-2">
                    {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
                    ))}
                </div>

                <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, i) => {
                        const isSelected = isSameDay(day, selectedDate);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        const dayStr = format(day, 'yyyy-MM-dd');
                        const todayStr = format(new Date(), 'yyyy-MM-dd');

                        const dayActivities = activities.filter((a: SalesActivity) => a.date === dayStr);
                        const hasActivity = dayActivities.length > 0;
                        const hasScheduledFuture = dayActivities.some((a: SalesActivity) => a.status === 'Scheduled' && dayStr > todayStr);

                        return (
                            <button
                                key={i}
                                onClick={() => setSelectedDate(day)}
                                className={clsx(
                                    "relative h-12 flex flex-col items-center justify-center rounded-xl transition-all",
                                    !isCurrentMonth && "opacity-20",
                                    isSelected ? "bg-primary text-white scale-105 z-10" : "hover:bg-gray-50 text-gray-700",
                                    hasScheduledFuture && !isSelected && "text-red-500 font-bold"
                                )}
                            >
                                <span className="text-sm font-semibold">{format(day, 'd')}</span>
                                {hasActivity && (
                                    <div className={clsx(
                                        "absolute bottom-2 w-1 h-1 rounded-full",
                                        isSelected ? "bg-white" : "bg-primary"
                                    )} />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* 타임테이블 위젯 */}
            <div className="apple-card p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
                            <Clock className="w-4 h-4" />
                        </div>
                        <h3 className="font-bold text-gray-900">
                            {format(selectedDate, 'M월 d일 (E)', { locale: ko })}
                        </h3>
                    </div>
                    <div className="flex gap-1">
                        <button onClick={handlePrevDay} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
                        <button onClick={handleNextDay} className="p-2 hover:bg-gray-100 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                </div>

                <div className="space-y-3 min-h-[120px]">
                    {selectedDayActivities.length > 0 ? (
                        selectedDayActivities.sort((a: SalesActivity, b: SalesActivity) => a.time.localeCompare(b.time)).map((activity: SalesActivity) => (
                            <button
                                key={activity.id}
                                onClick={() => setSelectedActivity(activity)}
                                className="w-full flex items-start gap-3 p-3 bg-gray-50 rounded-xl apple-button text-left"
                            >
                                <div className="text-xs font-bold text-primary whitespace-nowrap pt-0.5">{activity.time}</div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900">{activity.customerName}</div>
                                    <div className="text-xs text-gray-500 line-clamp-1">{activity.content}</div>
                                </div>
                            </button>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center h-24 text-gray-300">
                            <p className="text-sm">일정이 없습니다.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* 새 일정 등록 버튼 (하단 이동) */}
            <button
                onClick={() => {
                    setNewActivity({
                        ...newActivity,
                        date: format(selectedDate, 'yyyy-MM-dd'),
                        time: format(new Date(), 'HH:mm'),
                    });
                    setIsModalOpen(true);
                }}
                className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 apple-button shadow-lg shadow-primary/20"
            >
                <Plus className="w-5 h-5" />
                새 일정 등록
            </button>

            {/* 일정 등록 모달 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white rounded-t-[32px] p-6 space-y-4 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold">영업 활동 기록</h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">닫기</button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">일자</label>
                                    <input
                                        type="date"
                                        className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                        value={newActivity.date}
                                        onChange={e => setNewActivity({ ...newActivity, date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">고객사 명</label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        type="text"
                                        placeholder="돋보기 버튼을 눌러 검색하세요"
                                        className="flex-1 p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none cursor-pointer"
                                        value={newActivity.customerName || ''}
                                        onClick={handleSearchClick}
                                    />
                                    <button
                                        onClick={handleSearchClick}
                                        className="bg-gray-100 p-4 rounded-2xl text-gray-500 hover:bg-gray-200 transition-colors"
                                    >
                                        <Search className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">시간</label>
                                    <input
                                        type="time"
                                        className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                                        value={newActivity.time}
                                        onChange={e => setNewActivity({ ...newActivity, time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">활동 구분</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                        value={newActivity.type}
                                        onChange={e => setNewActivity({ ...newActivity, type: e.target.value as any })}
                                    >
                                        <option value="Meeting">미팅</option>
                                        <option value="Call">전화</option>
                                        <option value="Email">이메일</option>
                                        <option value="Other">기타</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">활동 내용</label>
                                <textarea
                                    placeholder="활동 내용을 상세히 기록하세요"
                                    rows={4}
                                    className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                    value={newActivity.content || ''}
                                    onChange={e => setNewActivity({ ...newActivity, content: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full bg-primary text-white py-4 rounded-2xl font-bold apple-button"
                            >
                                활동 저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* 고객 검색 모달 (별도 창 느낌의 전체 화면) */}
            {isSearchModalOpenInternal && (
                <div className="fixed inset-0 z-[200] bg-white animate-in slide-in-from-right duration-300">
                    <div className="h-full flex flex-col p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">고객사 검색</h2>
                            <button
                                onClick={() => setIsSearchModalOpenInternal(false)}
                                className="text-gray-400 font-medium"
                            >
                                취소
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                autoFocus
                                type="text"
                                placeholder="고객사를 검색하세요"
                                className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 pr-12"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && performSearch()}
                            />
                            <button
                                onClick={performSearch}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-primary"
                            >
                                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6">
                            {searchResults.length > 0 ? (
                                searchResults.map((customer, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => handleSelectCustomer(customer)}
                                        className="p-4 bg-gray-50 rounded-2xl apple-button border border-transparent hover:border-primary/20"
                                    >
                                        <div className="font-bold text-gray-900">{customer.회사명}</div>
                                        {customer.대표명 && (
                                            <div className="text-xs text-gray-400 mt-1">{customer.대표명} • {customer.사업자등록번호}</div>
                                        )}
                                        {customer.주소 && (
                                            <div className="text-[10px] text-gray-400 mt-1 truncate">{customer.주소}</div>
                                        )}
                                    </div>
                                ))
                            ) : searchQuery && !isSearching ? (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                                    <Search className="w-12 h-12 mb-3 opacity-20" />
                                    <p className="text-sm">검색된 결과가 없습니다</p>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-64 text-gray-200">
                                    <p className="text-sm font-medium italic">검색어를 입력하고 Enter를 누르세요</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* 활동 상세 모달 */}
            {selectedActivity && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white rounded-[32px] p-8 space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center space-y-2 relative">
                            <button
                                onClick={() => {
                                    setNewActivity(selectedActivity);
                                    setIsEditing(true);
                                    setIsModalOpen(true);
                                    setSelectedActivity(null);
                                }}
                                className="absolute right-0 top-0 p-2 text-gray-400 hover:text-primary transition-colors"
                            >
                                <Pencil className="w-5 h-5" />
                            </button>
                            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-2">
                                <ClipboardList className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{selectedActivity.customerName}</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{selectedActivity.date} {selectedActivity.time}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-2xl">
                                <div className="text-[10px] font-bold text-gray-400 mb-1">활동 내용</div>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {selectedActivity.content}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
                                <span className={clsx(
                                    "px-2 py-1 rounded-md font-bold",
                                    selectedActivity.status === 'Scheduled' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                                )}>
                                    {selectedActivity.status === 'Scheduled' ? '예정' : '활동'}
                                </span>
                                <span className="bg-gray-100 px-2 py-1 rounded-md">{selectedActivity.type}</span>
                                <span>작성일: {format(selectedActivity.createdAt, 'yyyy.MM.dd HH:mm')}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedActivity(null)}
                            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold apple-button"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarPage;
