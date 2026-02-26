import type { SalesActivity } from '../types';

const STORAGE_KEY = 'sales_activities';

/**
 * 로컬 스토리지에 영업활동 데이터를 저장하고 불러오는 유틸리티
 */
export const storage = {
    /**
     * 모든 영업활동 기록을 가져옵니다.
     */
    getActivities: (): SalesActivity[] => {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) return [];
        try {
            return JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse storage data', e);
            return [];
        }
    },

    /**
     * 새로운 영업활동을 저장합니다.
     */
    saveActivity: (activity: SalesActivity) => {
        const activities = storage.getActivities();
        activities.push(activity);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
    },

    /**
     * 영업활동 정보를 업데이트합니다.
     */
    updateActivity: (activity: SalesActivity) => {
        const activities = storage.getActivities();
        const index = activities.findIndex(a => a.id === activity.id);
        if (index !== -1) {
            activities[index] = activity;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
        }
    },

    /**
     * 특정 영업활동을 삭제합니다.
     */
    deleteActivity: (id: string | number) => {
        const activities = storage.getActivities();
        const filtered = activities.filter(a => a.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    }
};
