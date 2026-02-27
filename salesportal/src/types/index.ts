/**
 * 영업활동 정보 인터페이스
 */
export interface SalesActivity {
    id: string | number;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm
    customerName: string;
    type: 'Meeting' | 'Call' | 'Email' | 'Other';
    status: 'Scheduled' | 'Completed'; // 예정 | 활동
    businessNumber?: string;
    content: string;
    createdAt: number;
    rawData?: any; // n8n에서 넘어온 원본 데이터 저장용
}

/**
 * 고객 정보 인터페이스 (n8n API 응답 기반)
 */
export interface CustomerInfo {
    기업코드: string;
    회사명: string;
    대표명?: string;
    주소?: string;
    사업자등록번호?: string;
    대표전화번호?: string;
    홈페이지?: string;
    DART공시정보?: string;
    'DART 공시정보'?: string;
    뉴스동향?: string;
}

/**
 * n8n API 요청 정보
 */
export interface SearchParams {
    type: 'customerSearch' | 'custinfo' | 'custselect' | 'actibity' | 'findact' | 'actdelete' | 'login';
    customerName?: string;
    companyCode?: string;
    query?: string;
    id?: string | number | null;
    // 활동 저장 및 조회용
    사업자등록번호?: string;
    고객명?: string;
    일자?: string;
    시간?: string;
    활동구분?: string;
    활동내용?: string;
    selectedDate?: string;
    selectedMonth?: string;
}
