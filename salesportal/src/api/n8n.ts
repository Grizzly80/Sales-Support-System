import type { SearchParams, CustomerInfo } from '../types';

// n8n Webhook URL (Replace with actual URL from your n8n instance)
const N8N_WEBHOOK_URL = 'https://genai100.app.n8n.cloud/webhook/8f180191-3c96-43a1-8a9d-22c3894342ee';

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
                body: JSON.stringify(payload),
            });

            if (!response.ok) throw new Error('API request failed');
            const data = await response.json();
            return Array.isArray(data) ? data : [data];
        } catch (error) {
            console.error('n8n API Error:', error);
            // 데모를 위한 목업 데이터 반환 (실제 환경에서는 에러 처리)
            return [
                {
                    기업코드: '00126380',
                    회사명: '삼성전자',
                    대표명: '한종희',
                    주소: '경기도 수원시 영통구 삼성로 129 (매탄동)',
                    사업자등록번호: '124-81-00998',
                    대표전화번호: '031-200-1114',
                    홈페이지: 'www.samsung.com/sec',
                    'DART 공시정보': JSON.stringify({
                        "직전년도": {
                            "연도": "2023 년",
                            "매출액": "3,924억",
                            "영업이익": "49억"
                        },
                        "매출액": {
                            "연도": ["2022 년", "2023 년", "2024 년"],
                            "금액": ["6,453억", "3,924억", "4,002억"],
                            "매출액 추이": "매출액은 내림세이며, 2022→2024 기간 연평균 약 1,225억 원 감소 중이다"
                        },
                        "영업이익": {
                            "연도": ["2022 년", "2023 년", "2024 년"],
                            "금액": ["109억", "49억", "119억"],
                            "영업이익 추이": "영업이익은 변동성이 있으나, 2022→2024 기간 기준 연평균 약 5억 원 상승 중이다"
                        }
                    }),
                    뉴스동향: '최근 한솔로지스틱스(주) 의 동향 정보 (네이버뉴스참조)\n1. 위험성평가 우수사례 수상 및 안전정책 강화...'
                }
            ];
        }
    }
};
