import {
  Tenant,
  User,
  Service,
  PrintJob,
  Subscription,
  AuditLog,
  DashboardData,
  JobStatus,
  PaymentStatus,
} from '../types';

const API_BASE = '/api';

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('printflow_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMsg = 'An unexpected error occurred';
    try {
      const data = await res.json();
      errorMsg = data.error || errorMsg;
    } catch {
      errorMsg = res.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }
  return res.json();
}

export const api = {
  // Auth
  async login(email: string, password: string): Promise<{ token: string; user: User; tenant: Tenant | null }> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  async registerPress(data: {
    business_name: string;
    owner_name: string;
    email: string;
    password: string;
    phone: string;
    location: string;
    address?: string;
    description?: string;
    operating_hours?: string;
  }): Promise<{
    message: string;
    token?: string;
    user?: User;
    tenant: Tenant;
    dashboard_url?: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/register-press`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getMe(): Promise<{ user: User; tenant: Tenant | null }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async adminImpersonate(tenantSlugOrId: string): Promise<{ token: string; user: User; tenant: Tenant }> {
    const res = await fetch(`${API_BASE}/admin/impersonate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ tenantSlug: tenantSlugOrId, tenantId: tenantSlugOrId }),
    });
    return handleResponse(res);
  },

  // Public Endpoints
  async getPublicPresses(): Promise<Array<Partial<Tenant>>> {
    const res = await fetch(`${API_BASE}/public/presses`);
    return handleResponse(res);
  },

  async getPublicPress(slug: string): Promise<Tenant & { services: Service[] }> {
    const res = await fetch(`${API_BASE}/public/press/${slug}`);
    return handleResponse(res);
  },

  async getPressQR(slug: string): Promise<{ publicUrl: string; dataUrl: string; tenant: any }> {
    const res = await fetch(`${API_BASE}/public/press/${slug}/qr`);
    return handleResponse(res);
  },

  async calculatePriceEstimate(slug: string, options: any): Promise<{ total: number; breakdown: Array<{ item: string; amount: number }> }> {
    const res = await fetch(`${API_BASE}/public/press/${slug}/price-estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });
    return handleResponse(res);
  },

  async uploadPrintJob(slug: string, formData: FormData): Promise<{ message: string; job: any }> {
    const res = await fetch(`${API_BASE}/public/press/${slug}/upload`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  async trackJob(jobNumber: string, token: string): Promise<{ job: PrintJob; press: any }> {
    const res = await fetch(`${API_BASE}/public/track/${encodeURIComponent(jobNumber)}?token=${encodeURIComponent(token)}`);
    return handleResponse(res);
  },

  async simulatePaystackPayment(job_id: string, tracking_token: string, email?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/public/payments/paystack-simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id, tracking_token, email }),
    });
    return handleResponse(res);
  },

  // Tenant Portal (Owner & Staff)
  async getTenantDashboard(): Promise<DashboardData> {
    const res = await fetch(`${API_BASE}/tenant/dashboard`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getTenantJobs(params?: { search?: string; status?: string; payment_status?: string; date_range?: string }): Promise<PrintJob[]> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.payment_status) query.set('payment_status', params.payment_status);
    if (params?.date_range) query.set('date_range', params.date_range);

    const res = await fetch(`${API_BASE}/tenant/jobs?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getTenantJobById(id: string): Promise<{ job: PrintJob; document: any }> {
    const res = await fetch(`${API_BASE}/tenant/jobs/${id}`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateJobStatus(id: string, data: { status?: JobStatus; notes?: string; payment_status?: PaymentStatus }): Promise<PrintJob> {
    const res = await fetch(`${API_BASE}/tenant/jobs/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getServices(): Promise<Service[]> {
    const res = await fetch(`${API_BASE}/tenant/services`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createService(data: Partial<Service>): Promise<Service> {
    const res = await fetch(`${API_BASE}/tenant/services`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async updateService(id: string, data: Partial<Service>): Promise<Service> {
    const res = await fetch(`${API_BASE}/tenant/services/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async quickUpdateService(id: string, data: Partial<Service>): Promise<Service> {
    const res = await fetch(`${API_BASE}/tenant/services/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async deleteService(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/tenant/services/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getStaff(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/tenant/staff`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async createStaff(data: { name: string; email: string; phone?: string; password: string }): Promise<User> {
    const res = await fetch(`${API_BASE}/tenant/staff`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getTenantSettings(): Promise<Tenant> {
    const res = await fetch(`${API_BASE}/tenant/settings`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateTenantSettings(data: Partial<Tenant>): Promise<Tenant> {
    const res = await fetch(`${API_BASE}/tenant/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getTenantAnalytics(): Promise<any> {
    const res = await fetch(`${API_BASE}/tenant/analytics`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getTenantAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE}/tenant/audit-logs`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Super Admin Endpoints
  async getAdminStats(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/stats`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getAdminPresses(status?: string): Promise<Tenant[]> {
    const url = status ? `${API_BASE}/admin/presses?status=${status}` : `${API_BASE}/admin/presses`;
    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updatePressStatus(id: string, status: 'active' | 'pending_approval' | 'suspended', rejection_reason?: string): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/presses/${id}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status, rejection_reason }),
    });
    return handleResponse(res);
  },

  async deletePress(id: string): Promise<{ message: string; id: string }> {
    const res = await fetch(`${API_BASE}/admin/presses/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getAdminSubscriptions(): Promise<Subscription[]> {
    const res = await fetch(`${API_BASE}/admin/subscriptions`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async updateSubscription(tenantId: string, data: Partial<Subscription>): Promise<Subscription> {
    const res = await fetch(`${API_BASE}/admin/subscriptions/${tenantId}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getAdminAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE}/admin/audit-logs`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  async getAdminJobs(): Promise<any[]> {
    const res = await fetch(`${API_BASE}/admin/jobs`, {
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // Database Health & Sync
  async getDatabaseStatus(): Promise<any> {
    const res = await fetch(`${API_BASE}/public/db-status`);
    return handleResponse(res);
  },

  async syncDatabase(): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/database/sync`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    return handleResponse(res);
  },

  // User Profile & Password Management
  async updateProfile(data: {
    name?: string;
    email?: string;
    phone?: string;
    current_password?: string;
    new_password?: string;
  }): Promise<{ message: string; token: string; user: any }> {
    const res = await fetch(`${API_BASE}/auth/profile`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },
};
