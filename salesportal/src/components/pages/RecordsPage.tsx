import React, { useState, useEffect } from 'react';
import { ClipboardList, Calendar, Clock, User, FileText, Trash2, ChevronLeft, ChevronRight, Pencil, Search, Loader2 } from 'lucide-react';
import { storage } from '../../utils/storage';
import { n8nApi } from '../../api/n8n';
import type { SalesActivity } from '../../types';
import { format, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ko } from 'date-fns/locale';
import { clsx } from 'clsx';

/**
 * 영업 활동 기록 리스트 페이지 컴포넌트
 */
const RecordsPage: React.FC = () => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [localActivities, setLocalActivities] = useState<SalesActivity[]>(storage.getActivities());
    const [webhookActivities, setWebhookActivities] = useState<SalesActivity[]>([]);
    const [filter, setFilter] = useState<'All' | 'Meeting' | 'Call' | 'Email'>('All');
    const [selectedItem, setSelectedItem] = useState<SalesActivity | null>(null);
    const [itemToDelete, setItemToDelete] = useState<string | number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // 수정 관련 상태
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState<Partial<SalesActivity>>({});
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // 모든 데이터 병합 (내용 기반 중복 제거 로직 강화)
    const activitiesMap = new Map<string | number, SalesActivity>();

    // 1. 웹훅 정식 데이터 우선 등록 (Source of Truth)
    webhookActivities.forEach(item => {
        activitiesMap.set(item.id, item);
    });

    // 2. 로컬 데이터 중 중복되지 않은 것만 추가 (UUID vs DB ID 방지)
    localActivities.forEach(item => {
        if (!activitiesMap.has(item.id)) {
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
    const allActivities = Array.from(activitiesMap.values());

    // 필터링 및 정렬 (현재 보려는 월의 데이터만 표시)
    const filteredActivities = allActivities
        .filter((a: SalesActivity) => {
            const isTypeMatch = filter === 'All' || a.type === filter;
            const isMonthMatch = isSameMonth(new Date(a.date), currentMonth);
            return isTypeMatch && isMonthMatch;
        })
        .sort((a: SalesActivity, b: SalesActivity) => {
            // 날짜 오름차순 (과거순)
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            // 시간 오름차순
            return a.time.localeCompare(b.time);
        });

    // 날짜별로 그룹화
    const groupedActivities = filteredActivities.reduce((groups: { [key: string]: SalesActivity[] }, activity) => {
        const date = activity.date;
        if (!groups[date]) {
            groups[date] = [];
        }
        groups[date].push(activity);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedActivities).sort((a, b) => a.localeCompare(b));

    const fetchData = async () => {
        try {
            const monthStr = format(currentMonth, 'yyyy-MM');
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const remoteData = await n8nApi.findActivities(todayStr, monthStr);

            const mappedData: SalesActivity[] = remoteData.map((item: any) => {
                const d = item.json || item.row || item;
                let itemDate = d.DATE || d.date || d.일자 || todayStr;
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
                    status: (itemDate > todayStr) ? 'Scheduled' : 'Completed',
                    content: d.ACT_REPORT || d.act_report || d.활동내용 || d.content || '',
                    businessNumber: String(d.BIZ_NUM || d.biz_num || d.사업자등록번호 || ''),
                    createdAt: d.createdAt ? new Date(d.createdAt).getTime() : Date.now(),
                    rawData: d
                };
            });

            setWebhookActivities(mappedData);

            // 로컬 스토리지 데이터 정리 (서버에 있는 데이터는 로컬에서 제거)
            const currentLocal = storage.getActivities();
            const updatedLocal = currentLocal.filter(local => {
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
                setLocalActivities(updatedLocal);
            }
        } catch (error) {
            console.error('Failed to fetch remote activities:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentMonth]);

    const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

    const handleDeleteClick = (id: string | number, e: React.MouseEvent) => {
        e.stopPropagation();
        setItemToDelete(id);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;

        setIsDeleting(true);
        try {
            // 삭제할 아이템 찾기 (rawData 추출을 위해)
            const targetItem = allActivities.find(a => a.id === itemToDelete);

            // Local storage 삭제 (있는 경우)
            storage.deleteActivity(itemToDelete);
            setLocalActivities(storage.getActivities());

            // n8n Webhook 삭제 요청 (type: actdelete + query params)
            await n8nApi.deleteActivity(targetItem?.rawData || { id: itemToDelete });

            // 데이터 재조회
            await fetchData();
            setItemToDelete(null);
        } catch (error) {
            alert('삭제 중 오류가 발생했습니다.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleEditSave = async () => {
        if (!editData.customerName || !editData.content) {
            alert('고객명과 활동 내용을 입력해주세요.');
            return;
        }

        try {
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            const activityDate = editData.date || todayStr;
            const activityTime = editData.time || '09:00';

            // n8n Webhook 호출 (type: actibity)
            const response = await n8nApi.saveActivity({
                id: editData.id,
                사업자등록번호: editData.businessNumber || '',
                고객명: editData.customerName,
                일자: activityDate,
                시간: activityTime,
                활동구분: editData.type || 'Meeting',
                활동내용: editData.content,
                rawData: editData.rawData // 원본 데이터 전달
            });

            const savedData = Array.isArray(response) ? response[0] : response;
            const d = savedData?.json || savedData?.row || savedData || {};

            const updatedActivity: SalesActivity = {
                ... (editData as SalesActivity),
                date: activityDate,
                time: activityTime,
                status: activityDate > todayStr ? 'Scheduled' : 'Completed',
                rawData: d
            };

            storage.updateActivity(updatedActivity);
            await fetchData();
            setIsEditModalOpen(false);
            setSelectedItem(null);
        } catch (err) {
            console.error('Edit save failed:', err);
            alert('수정 중 오류가 발생했습니다.');
        }
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

    return (
        <div className="p-4 pt-4 space-y-4 pb-24 relative">
            {/* 월 선택 헤더 */}
            <div className="apple-card p-4 flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-gray-900">
                    {format(currentMonth, 'yyyy년 M월', { locale: ko })} 활동
                </h2>
                <div className="flex gap-1">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft className="w-5 h-5" /></button>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight className="w-5 h-5" /></button>
                </div>
            </div>

            {/* 필터 칩 */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 no-scrollbar">
                {['All', 'Meeting', 'Call', 'Email'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilter(type as any)}
                        className={`px-5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all apple-button ${filter === type
                            ? 'bg-primary text-white shadow-md shadow-primary/20'
                            : 'bg-white text-gray-400 border border-gray-100'
                            }`}
                    >
                        {type === 'All' ? '전체' : type === 'Meeting' ? '미팅' : type === 'Call' ? '전화' : '이메일'}
                    </button>
                ))}
            </div>

            {/* 활동 리스트 (일자별 그룹화) */}
            <div className="space-y-6">
                {sortedDates.length > 0 ? (
                    sortedDates.map((date) => (
                        <div key={date} className="space-y-3">
                            {/* 일자 헤더 */}
                            <div className="flex items-center gap-2 px-1">
                                <div className="h-px flex-1 bg-gray-100"></div>
                                <span className="text-[11px] font-bold text-gray-400 bg-gray-50/50 px-2 py-0.5 rounded-full border border-gray-100/50">
                                    {format(new Date(date), 'M월 d일 (eee)', { locale: ko })}
                                </span>
                                <div className="h-px flex-1 bg-gray-100"></div>
                            </div>

                            {/* 해당 일자의 활동들 */}
                            <div className="space-y-3">
                                {groupedActivities[date].map((activity) => (
                                    <div
                                        key={activity.id}
                                        onClick={() => setSelectedItem(activity)}
                                        className="apple-card p-4 flex items-center justify-between group apple-button"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${activity.type === 'Meeting' ? 'bg-blue-50 text-blue-500' :
                                                activity.type === 'Call' ? 'bg-green-50 text-green-500' :
                                                    'bg-purple-50 text-purple-500'
                                                }`}>
                                                {activity.type === 'Meeting' ? <User className="w-6 h-6" /> :
                                                    activity.type === 'Call' ? <Clock className="w-6 h-6" /> :
                                                        <FileText className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <div className="font-bold text-gray-900">{activity.customerName}</div>
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <span className="font-medium text-gray-500">{activity.time}</span>
                                                    <span>•</span>
                                                    <span className={clsx(
                                                        "px-1.5 py-0.5 rounded text-[10px] font-bold",
                                                        activity.status === 'Scheduled' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                                                    )}>
                                                        {activity.status === 'Scheduled' ? '예정' : '활동'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={(e) => handleDeleteClick(activity.id, e)}
                                            className="p-2 opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-300">
                        <ClipboardList className="w-12 h-12 mb-3 opacity-20" />
                        <p className="text-sm font-medium">활동 기록이 없습니다.</p>
                    </div>
                )}
            </div>

            {/* 활동 상세 모달 */}
            {selectedItem && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-sm bg-white rounded-[32px] p-8 space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center text-center space-y-2 relative">
                            <button
                                onClick={() => {
                                    setEditData(selectedItem);
                                    setIsEditModalOpen(true);
                                }}
                                className="absolute right-0 top-0 p-2 text-gray-400 hover:text-primary transition-colors"
                            >
                                <Pencil className="w-5 h-5" />
                            </button>
                            <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary mb-2">
                                <ClipboardList className="w-8 h-8" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900">{selectedItem.customerName}</h2>
                            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{selectedItem.date} {selectedItem.time}</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-2xl">
                                <div className="text-[10px] font-bold text-gray-400 mb-1">활동 내용</div>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {selectedItem.content}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-400 justify-center">
                                <span className={clsx(
                                    "px-2 py-1 rounded-md font-bold",
                                    selectedItem.status === 'Scheduled' ? "bg-red-50 text-red-500" : "bg-blue-50 text-blue-500"
                                )}>
                                    {selectedItem.status === 'Scheduled' ? '예정' : '활동'}
                                </span>
                                <span className="bg-gray-100 px-2 py-1 rounded-md">{selectedItem.type}</span>
                                <span>작성일: {format(selectedItem.createdAt, 'yyyy.MM.dd HH:mm')}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedItem(null)}
                            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold apple-button"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* 삭제 확인 팝업 (Custom Modal) */}
            {itemToDelete && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-xs bg-white rounded-[28px] p-6 space-y-6 animate-in zoom-in-95 duration-300 text-center">
                        <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                            <Trash2 className="w-6 h-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-lg font-bold text-gray-900">일정 삭제</h3>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                해당 일정을 삭제하시겠습니까?
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setItemToDelete(null)}
                                disabled={isDeleting}
                                className="flex-1 bg-gray-50 text-gray-500 py-3.5 rounded-xl font-bold text-sm apple-button"
                            >
                                취소
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={isDeleting}
                                className="flex-1 bg-red-500 text-white py-3.5 rounded-xl font-bold text-sm apple-button shadow-lg shadow-red-500/20 disabled:opacity-50"
                            >
                                {isDeleting ? '삭제 중...' : '확인'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 일정 수정 모달 */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-[150] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-white rounded-t-[32px] p-6 space-y-4 animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-xl font-bold">영업 활동 수정</h2>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">닫기</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">일자</label>
                                <input
                                    type="date"
                                    className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                    value={editData.date}
                                    onChange={e => setEditData({ ...editData, date: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">고객사 명</label>
                                <div className="flex gap-2">
                                    <input
                                        readOnly
                                        type="text"
                                        className="flex-1 p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none cursor-pointer"
                                        value={editData.customerName || ''}
                                        onClick={() => setIsSearchModalOpen(true)}
                                    />
                                    <button
                                        onClick={() => setIsSearchModalOpen(true)}
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
                                        value={editData.time}
                                        onChange={e => setEditData({ ...editData, time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 mb-1 ml-1">활동 구분</label>
                                    <select
                                        className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                                        value={editData.type}
                                        onChange={e => setEditData({ ...editData, type: e.target.value as any })}
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
                                    rows={4}
                                    className="w-full p-4 bg-gray-50 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                                    value={editData.content || ''}
                                    onChange={e => setEditData({ ...editData, content: e.target.value })}
                                />
                            </div>

                            <button
                                onClick={handleEditSave}
                                className="w-full bg-primary text-white py-4 rounded-2xl font-bold apple-button"
                            >
                                수정사항 저장하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 고객 검색 모달 */}
            {isSearchModalOpen && (
                <div className="fixed inset-0 z-[200] bg-white animate-in slide-in-from-right duration-300">
                    <div className="h-full flex flex-col p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-xl font-bold">고객사 검색</h2>
                            <button onClick={() => setIsSearchModalOpen(false)} className="text-gray-400 font-medium">취소</button>
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
                            <button onClick={performSearch} className="absolute right-4 top-1/2 -translate-y-1/2 text-primary">
                                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pb-6">
                            {searchResults.map((customer, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        setEditData({ ...editData, customerName: customer.회사명, businessNumber: customer.사업자등록번호 });
                                        setIsSearchModalOpen(false);
                                    }}
                                    className="p-4 bg-gray-50 rounded-2xl apple-button border border-transparent hover:border-primary/20"
                                >
                                    <div className="font-bold text-gray-900">{customer.회사명}</div>
                                    <div className="text-xs text-gray-400 mt-1">{customer.대표명} • {customer.사업자등록번호}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecordsPage;
