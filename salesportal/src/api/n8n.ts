import type { SearchParams, CustomerInfo } from '../types';
import { storage } from '../utils/storage';

// n8n Webhook URL (Replace with actual URL from your n8n instance)
//운영(배포소스)
const N8N_WEBHOOK_URL = 'https://genai100.app.n8n.cloud/webhook/8f180191-3c96-43a1-8a9d-22c3894342ee';

//테스트(n8n 로컬 서버)
//const N8N_WEBHOOK_URL = 'https://genai100.app.n8n.cloud/webhook/8f180191-3c96-43a1-8a9d-22c3894342ee';

/**
 * n8n API 클라이언트
 */
export const n8nApi = {
    /**
     * 고객사 정보를 검색합니다 (목록 조회)
     */
    searchCustomer: async (customerName: string): Promise<CustomerInfo[]> => {
        const payload: SearchParams = {
            type: 'customerSearch',
            customerName
        };
        return n8nApi._fetch(payload);
    },

    /**
     * 로그인 웹훅 호출 (type: login)
     */
    login: async (userId: string, userPw: string): Promise<any> => {
        const payload: any = {
            type: 'login',
            userId,
            userPw
        };
        return await n8nApi._fetch(payload);
    },

    /**
     * 고객사 검색 (선택용 - type: custselect)
     */
    searchCustomerSelect: async (customerName: string): Promise<CustomerInfo[]> => {
        const payload: SearchParams = {
            type: 'custselect',
            customerName
        };
        return await n8nApi._fetch(payload);
    },

    /**
     * 특정 고객사의 상세 정보(DART, 뉴스 등)를 가져옵니다.
     */
    getCustomerDetail: async (companyCode: string, companyName: string): Promise<CustomerInfo> => {
        const payload: SearchParams = {
            type: 'custinfo',
            companyCode,
            query: companyName
        };
        const results = await n8nApi._fetch(payload);
        return results[0] || { 기업코드: companyCode, 회사명: companyName };
    },

    /**
     * 영업 활동 일정 조회 (type: findact)
     */
    findActivities: async (selectedDate: string, selectedMonth: string): Promise<any[]> => {
        const payload: SearchParams = {
            type: 'findact',
            selectedDate,
            selectedMonth
        };
        const results = await n8nApi._fetch(payload);
        return Array.isArray(results) ? results : [];
    },

    saveActivity: async (activity: {
        id?: string | number | null;
        사업자등록번호: string;
        고객명: string;
        일자: string;
        시간: string;
        활동구분: string;
        활동내용: string;
        rawData?: any;
    }): Promise<any> => {
        // 1. 원본 데이터 복사 (기타 시스템 필드 보존용)
        const payload: any = activity.rawData ? { ...activity.rawData } : {};

        // 2. 요청 타입 설정
        payload.type = 'actibity';

        // 3. 활동 데이터 매핑 (모든 변종 키에 사용자가 입력한 값 강제 적용)
        // 고객명 관련
        payload.고객명 = activity.고객명;
        payload.CORP_NM = activity.고객명;
        payload.corp_nm = activity.고객명;
        payload.회사명 = activity.고객명;
        payload.customerName = activity.고객명;

        // 일자 관련
        payload.일자 = activity.일자;
        payload.DATE = activity.일자;
        payload.date = activity.일자;

        // 시간 관련
        payload.시간 = activity.시간;
        payload.TIME = activity.시간;
        payload.time = activity.시간;

        // 활동구분 관련
        payload.활동구분 = activity.활동구분;
        payload.act_sctn_cd = activity.활동구분;
        payload.type_cd = activity.활동구분;

        // 활동내용 관련
        payload.활동내용 = activity.활동내용;
        payload.ACT_REPORT = activity.활동내용;
        payload.act_report = activity.활동내용;
        payload.content = activity.활동내용;

        // 사업자번호 관련
        payload.사업자등록번호 = activity.사업자등록번호;
        payload.BIZ_NUM = activity.사업자등록번호;
        payload.biz_num = activity.사업자등록번호;

        // 4. ID 결정 로직 강화
        // UUID 판별 함수
        const isUuid = (val: any) =>
            typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

        // 우선순위: 원본 DB ID -> UI 전달 ID
        let determinedId = activity.rawData?.id ?? activity.rawData?.pk_num ?? activity.rawData?.ID;

        if (determinedId === undefined || determinedId === null) {
            determinedId = activity.id;
        }

        // 만약 결정된 ID가 UUID라면, 신규 등록으로 간주하여 id를 null로 전송
        if (determinedId && isUuid(determinedId)) {
            determinedId = null;
        }

        payload.id = determinedId ?? null;

        // 5. 불필요한 필드 정리
        delete payload.rawData;

        return await n8nApi._fetch(payload);
    },

    /**
     * 영업 활동 삭제 (type: actdelete)
     * ACT_REPORT를 제외한 모든 값을 query parameter로 전달
     */
    deleteActivity: async (rawItem: any): Promise<any> => {
        const payload: SearchParams = {
            type: 'actdelete'
        };

        // ACT_REPORT를 제외한 나머지 데이터 복사 (id 등 모든 필드 포함)
        const queryParams: Record<string, any> = {};
        if (rawItem) {
            Object.entries(rawItem).forEach(([key, value]) => {
                if (key.toUpperCase() !== 'ACT_REPORT') {
                    queryParams[key] = value;
                }
            });
        }

        return await n8nApi._fetch(payload, queryParams);
    },

    /**
     * 공통 fetch 로직
     */
    _fetch: async (payload: SearchParams, params?: Record<string, any>): Promise<CustomerInfo[]> => {
        try {
            let url = N8N_WEBHOOK_URL;
            if (params) {
                const searchParams = new URLSearchParams();
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        searchParams.append(key, String(value));
                    }
                });
                const queryString = searchParams.toString();
                if (queryString) {
                    url += (url.includes('?') ? '&' : '?') + queryString;
                }
            }

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...payload,
                    USERID: storage.getUserInfo()?.USERID || (payload as any).userId || (payload as any).USERID
                }),
            });

            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            return Array.isArray(data) ? data : [data];
        } catch (error) {
            console.error('n8n API Error:', error);
            // 데모를 위한 목업 데이터 반환 (실제 환경에서는 에러 처리)
            return [
                {
                    기업코드: '1028141359',
                    회사명: '한솔로지스틱스(주)',
                    대표명: '고정한',
                    주소: '서울특별시 중구 을지로 100 파인애비뉴 B동 22층',
                    사업자등록번호: '1028141359',
                    대표전화번호: '02-3287-7400',
                    홈페이지: 'www.hansollogistics.com',
                    회사개요: "1. 회사 개요\n- 법적·상업적 명칭: 한솔로지스틱스 주식회사 (영문: Hansol Logistics Co., Ltd.)\n- 설립일·존속기간: 1994년 6월(당초 한솔유통(주)로 설립). \n- 상장현황: 유가증권시장 상장(상장일 표기: 1989년 11월 13일)\n- 본사 주소·연락처·웹사이트: 서울특별시 중구 을지로 100 파인애비뉴 B동 22층 / 전화 02-3287-7400 / http://www.hansollogistics.com",
                    'DART공시 재무요약': '[{"2022":"645,266,959,611","2023":"392,370,328,553","2024":"400,219,712,040","category":"매출액","unit":"KRW"},{"2022":"10,863,969,108","2023":"4,855,477,514","2024":"11,873,495,644","category":"영업이익","unit":"KRW"}]',
                    뉴스동향: '최근 한솔로지스틱스(주) 의 동향 정보 (네이버뉴스참조)\n1. 한솔로지스틱스 자회사 한솔로지스유가 화물정보망 서비스 원콜과 플랫폼 연동 MOU 체결(카고링크-화물정보망 연동).\n- 관련 링크: https://n.news.naver.com/mnews/article/015/0005239718?sid=101\n2. **FCF 기반 주주환원 정책(2026~2028년): FCF의 10~40% 활용**\n- 관련 링크: https://n.news.naver.com/mnews/article/293/0000079694?sid=101'
                }
            ];
        }
    }
};
