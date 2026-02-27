import React, { useState } from 'react';
import { Search, Building2, User, Phone, Globe, MapPin, FileSearch, TrendingUp } from 'lucide-react';
import { n8nApi } from '../../api/n8n';
import type { CustomerInfo } from '../../types';

/**
 * 고객 정보 조회 페이지 컴포넌트
 */
const SearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<CustomerInfo[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [selectedCustomer, setSelectedCustomer] = useState<CustomerInfo | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        try {
            const data = await n8nApi.searchCustomer(query);
            setResults(data);
            setSelectedCustomer(null);
        } catch (error) {
            alert('검색 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSelectCustomer = async (item: CustomerInfo) => {
        setIsAnalyzing(true);
        try {
            // 상세 정보 조회를 위해 n8n 웹훅 재호출 (type: custinfo)
            const detailData = await n8nApi.getCustomerDetail(item.기업코드, item.회사명);
            setSelectedCustomer({ ...item, ...detailData });
        } catch (error) {
            console.error('Detail fetch failed', error);
            setSelectedCustomer(item); // 실패해도 기존 데이터는 보여줌
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-4 pt-4 space-y-4 pb-24 relative min-h-screen">
            {/* AI 분석 로딩 오버레이 */}
            {isAnalyzing && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="relative">
                        {/* 외부 회전 링 */}
                        <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        {/* 내부 로고 또는 아이콘 */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <TrendingUp className="w-8 h-8 text-primary animate-pulse" />
                        </div>
                    </div>

                    <div className="mt-8 text-center space-y-2">
                        <h3 className="text-xl font-bold text-gray-900 animate-pulse">
                            AI가 정보를 분석 조회중입니다
                        </h3>
                        <p className="text-sm text-gray-400 font-medium">
                            DART 공시 및 최근 뉴스 동향을 수집하고 있습니다.
                        </p>
                    </div>

                    {/* 진행 상태 바 애니메이션 */}
                    <div className="mt-8 w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary to-secondary animate-progress shadow-sm" style={{ width: '40%' }}></div>
                    </div>
                </div>
            )}

            {/* 검색 바 */}
            <div className="apple-card p-2 flex items-center gap-2">
                <form onSubmit={handleSearch} className="flex-1 flex items-center">
                    <Search className="w-5 h-5 text-gray-400 ml-4" />
                    <input
                        type="text"
                        placeholder="고객사 명을 입력하세요"
                        className="flex-1 p-4 bg-transparent text-base focus:outline-none"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="bg-primary text-white px-6 py-2 rounded-xl text-sm font-bold mr-2 apple-button disabled:opacity-50"
                    >
                        {isLoading ? '검색 중...' : '검색'}
                    </button>
                </form>
            </div>

            {/* 결과 리스트 */}
            {!selectedCustomer && (
                <div className="space-y-3">
                    {results.length > 0 ? (
                        results.map((item, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleSelectCustomer(item)}
                                className="w-full text-left apple-card p-4 flex items-center justify-between hover:bg-gray-50 transition-colors apple-button"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                        <Building2 className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-0.5">
                                        <div className="font-bold text-gray-900 leading-tight">{item.회사명}</div>
                                        <div className="flex flex-wrap gap-x-2 text-[11px] text-gray-500">
                                            <span>코드: {item.기업코드}</span>
                                            {item.대표명 && <span>• 대표: {item.대표명}</span>}
                                            {item.사업자등록번호 && <span>• 사업자: {item.사업자등록번호}</span>}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-primary font-bold text-xs whitespace-nowrap ml-2">상세보기</div>
                            </button>
                        ))
                    ) : !isLoading && (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400">
                            <Search className="w-8 h-8 mb-2 opacity-20" />
                            <p className="text-sm">검색 결과가 없습니다.</p>
                        </div>
                    )}
                </div>
            )}

            {/* 상세 정보 뷰 */}
            {selectedCustomer && (
                <div className="animate-in slide-in-from-right duration-300">
                    <button
                        onClick={() => setSelectedCustomer(null)}
                        className="text-primary text-xs font-bold mb-4 flex items-center gap-1"
                    >
                        ← 결과 리스트로 돌아가기
                    </button>

                    <div className="space-y-4">
                        {/* 기본 정보 */}
                        <div className="apple-card p-6 space-y-6">
                            <div className="flex items-center gap-4 border-b border-gray-50 pb-4">
                                <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white">
                                    <Building2 className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedCustomer.회사명}</h2>
                                    <p className="text-sm text-gray-500">{selectedCustomer.기업코드}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <InfoItem icon={User} label="대표자" value={selectedCustomer.대표명} />
                                <InfoItem icon={FileSearch} label="사업자등록번호" value={selectedCustomer.사업자등록번호} />
                                <InfoItem icon={Phone} label="전화번호" value={selectedCustomer.대표전화번호} />
                                <InfoItem icon={Globe} label="홈페이지" value={selectedCustomer.홈페이지} isLink />
                                <InfoItem icon={MapPin} label="주소" value={selectedCustomer.주소} />
                            </div>
                        </div>

                        {/* DART 공시 정보 (있는 경우) */}
                        {(selectedCustomer['DART 공시정보'] || selectedCustomer.DART공시정보) && (
                            <div className="apple-card p-6 space-y-4 animate-in fade-in slide-in-from-bottom duration-500 delay-100">
                                <div className="flex items-center gap-2 text-primary">
                                    <FileSearch className="w-5 h-5" />
                                    <h3 className="font-bold">DART 공시정보</h3>
                                </div>
                                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/30">
                                    <DartTable text={selectedCustomer['DART 공시정보'] || selectedCustomer.DART공시정보} />
                                </div>
                            </div>
                        )}

                        {/* AI 분석 정보 (뉴스동향 있는 경우) */}
                        {selectedCustomer.뉴스동향 && (
                            <div className="apple-card p-6 space-y-4 bg-secondary/5 border-secondary/10 animate-in fade-in slide-in-from-bottom duration-500 delay-200">
                                <div className="flex items-center gap-2 text-secondary">
                                    <TrendingUp className="w-5 h-5" />
                                    <h3 className="font-bold">AI 분석 리포트 (뉴스 동향)</h3>
                                </div>

                                <div className="text-sm text-gray-700 bg-white/50 p-4 rounded-xl whitespace-pre-wrap leading-relaxed">
                                    {selectedCustomer.뉴스동향}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// 정보 아이템 보조 컴포넌트
const InfoItem = ({ icon: Icon, label, value, isLink }: any) => {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400 mt-1">
                <Icon className="w-4 h-4" />
            </div>
            <div>
                <div className="text-[10px] font-bold text-gray-400">{label}</div>
                {isLink ? (
                    <a href={value.startsWith('http') ? value : `https://${value}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline">
                        {value}
                    </a>
                ) : (
                    <div className="text-sm font-medium text-gray-700">{value}</div>
                )}
            </div>
        </div>
    );
};

// DART 정보를 표 형태로 파싱하여 렌더링하는 컴포넌트
const DartTable = ({ text }: { text: any }) => {
    if (!text) return null;

    let data: any = null;
    let isJson = false;

    // 1. 데이터 타입 정리 및 JSON 여부 확인
    if (typeof text === 'object' && text !== null) {
        data = text;
        isJson = true;
    } else {
        try {
            data = JSON.parse(String(text));
            isJson = typeof data === 'object' && data !== null;
        } catch (e) {
            isJson = false;
        }
    }

    // 2. JSON 객체인 경우 (구조화된 데이터 또는 단순 키-값 쌍)
    if (isJson && data && !Array.isArray(data)) {
        const sections: any[] = [];

        // 2-1. 고도로 구조화된 데이터 ({ 매출액: { 연도: [], 실적: [] } }) 확인
        const structuredKeys = ['매출액', '영업이익', '당기순이익'].filter(key =>
            data[key] && typeof data[key] === 'object' && Array.isArray(data[key].연도) && (Array.isArray(data[key].실적) || Array.isArray(data[key].금액))
        );

        if (structuredKeys.length > 0) {
            structuredKeys.forEach(key => {
                const item = data[key];
                const values = item.실적 || item.금액;
                const yearData = item.연도.map((y: any, i: number) => ({
                    year: String(y).replace(/[^0-9]/g, ''),
                    val: values[i] || 'N/A'
                }));
                if (yearData.length > 0) {
                    sections.push({
                        title: key,
                        yearData,
                        trendLine: item[`${key} 추이`] || item.추이 || item.trend || item[`${key}추이`]
                    });
                }
            });
        }

        // 2-2. 남은 필드들 중 일반적인 키-값 쌍 처리 (매출액: "2023년 100억" 등)
        Object.entries(data).forEach(([key, value]) => {
            // 이미 처리된 구조화된 키는 스킵
            if (structuredKeys.includes(key)) return;

            if (typeof value === 'object' && value !== null) {
                // 단순 하위 객체 (예: { 연도: "2023", 금액: "100억" })
                const yearData: { year: string; val: string }[] = [];
                const valStr = JSON.stringify(value);
                const amountMatch = valStr.match(/([\d,.]+\s*(?:억|원|만원|백만원))/);
                if (amountMatch) {
                    const yearMatch = valStr.match(/(\d{4})\s*년/);
                    yearData.push({
                        year: yearMatch ? yearMatch[1] : (String((value as any).연도 || 'N/A').replace(/[^0-9]/g, '') || 'N/A'),
                        val: amountMatch[1]
                    });
                    sections.push({ title: key, yearData });
                }
            } else if (typeof value === 'string' || typeof value === 'number') {
                // 문자열 또는 숫자 값
                const str = String(value);
                const yearData: { year: string; val: string }[] = [];
                // 연도와 금액 추출 시도
                const yearMatch = str.match(/(\d{4})\s*년/);
                const amountMatch = str.match(/([\d,.]+\s*(?:억|원|만원|백만원))/);

                if (yearMatch && amountMatch) {
                    yearData.push({ year: yearMatch[1], val: amountMatch[1] });
                    sections.push({ title: key, yearData, trendLine: str.includes('추이') ? str : '' });
                }
            }
        });

        if (sections.length > 0) {
            return (
                <div className="divide-y divide-gray-100">
                    {sections.map((s, idx) => (
                        <div key={idx} className="p-4 space-y-3">
                            <div className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                {s.title}
                            </div>
                            {s.yearData.length > 0 && <FinancialGrid yearData={s.yearData} />}
                            {s.trendLine && <TrendInfo text={s.trendLine} />}
                        </div>
                    ))}
                </div>
            );
        }
    }

    // 3. 텍스트 파싱 시도 (JSON이 아니거나 위에서 파싱 실패한 경우)
    const rawStr = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    // JSON 흔적 제거
    const cleanStr = rawStr.replace(/[{}"]/g, '').replace(/^[ ,]+|[ ,]+$/g, '');

    // 섹션 나누기 (주요 키워드 기준)
    const sectionsSplitted = cleanStr.split(/\n(?=(?:매출액|영업이익|당기순이익|직전년도|\[매출액\]|\[영업이익\]))/i)
        .map(s => s.trim())
        .filter(Boolean);

    const parsedSections: any[] = [];

    sectionsSplitted.forEach((section) => {
        const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;

        const title = lines[0].replace(/[\[\]:]/g, '').trim();
        const yearData: { year: string; val: string }[] = [];
        let trendLine = '';

        lines.forEach(line => {
            const yearMatch = line.match(/(\d{4})\s*년/);
            const amountMatch = line.match(/([\d,.]+\s*(?:억|원|만원|백만원))/);

            if (yearMatch && amountMatch) {
                yearData.push({ year: yearMatch[1], val: amountMatch[1] });
            } else if (line.includes('추이')) {
                trendLine = line;
            }
        });

        if (yearData.length > 0 || trendLine) {
            parsedSections.push({ title, yearData, trendLine });
        }
    });

    if (parsedSections.length > 0) {
        return (
            <div className="divide-y divide-gray-100">
                {parsedSections.map((s, idx) => (
                    <div key={idx} className="p-4 space-y-3">
                        <div className="text-[13px] font-bold text-gray-900 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                            {s.title}
                        </div>
                        {s.yearData.length > 0 && <FinancialGrid yearData={s.yearData} />}
                        {s.trendLine && <TrendInfo text={s.trendLine} />}
                    </div>
                ))}
            </div>
        );
    }

    // 4. 모든 파싱 실패 시 원본 텍스트 그대로 표시
    return (
        <div className="p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {cleanStr || String(text)}
        </div>
    );
};

// 표 렌더링 공통 컴포넌트
const FinancialGrid = ({ yearData }: { yearData: { year: string; val: string }[] }) => (
    <div className="apple-card bg-white p-0 border border-gray-50 overflow-hidden shadow-sm">
        <table className="w-full text-center text-xs">
            <thead className="bg-gray-50/80 border-b border-gray-50">
                <tr>
                    {yearData.map((d, i) => (
                        <th key={i} className="py-2.5 font-semibold text-gray-400">{d.year}년</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                <tr>
                    {yearData.map((d, i) => (
                        <td key={i} className="py-3 font-bold text-gray-900 border-r last:border-0 border-gray-50/50 tracking-tight">
                            {d.val}
                        </td>
                    ))}
                </tr>
            </tbody>
        </table>
    </div>
);

// 추이 정보 공통 컴포넌트
const TrendInfo = ({ text }: { text: string }) => {
    if (!text) return null;
    return (
        <div className="text-[11px] text-gray-500 leading-relaxed pl-1 flex gap-1.5 bg-white/50 p-2 rounded-lg border border-gray-50/50">
            <span className="text-primary font-bold whitespace-nowrap">분석</span>
            <span className="text-gray-600">{String(text).replace(/.*추이\s*/, '').replace(/^[ :]+/, '')}</span>
        </div>
    );
};

export default SearchPage;
