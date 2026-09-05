export type ServiceStatus = 'ok' | 'error' | 'disconnected';
export interface HealthServices {
    api: ServiceStatus;
    mongodb: ServiceStatus;
    redis: ServiceStatus;
}
export interface HealthResponse {
    success: boolean;
    services: HealthServices;
}
//# sourceMappingURL=health.d.ts.map