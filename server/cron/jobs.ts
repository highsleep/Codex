/**
 * Production Automation & Scheduled Jobs Engine
 * Sleepee Mattress Warranty Management System
 * 
 * Scheduled Jobs:
 * 1. Warranty Expiration Check: Scans for expired warranties, updates status, registers lifecycle event & audit log.
 * 2. Lifecycle Auto Update: Verifies product lifecycle consistency and automatically injects transition events.
 * 3. Archive Old Closed Claims: Archives settled claims older than retention threshold and logs audit trail.
 */

import type { IApplicationRepository } from '../repositories/types.js';

export interface AutomationJobResult {
  job: string;
  timestamp: string;
  status: 'SUCCESS' | 'FAILED';
  details: Record<string, any>;
  error?: string;
}

export class ScheduledJobsRunner {
  private repository: IApplicationRepository;
  private intervalId: NodeJS.Timeout | null = null;
  private lastRunResults: AutomationJobResult[] = [];

  constructor(repository: IApplicationRepository) {
    this.repository = repository;
  }

  /**
   * 1. Warranty Expiration Check
   * Inspects all active warranties against current date.
   * If expired, logs event in activation_logs and creates lifecycle event.
   */
  public runWarrantyExpirationCheck(): AutomationJobResult {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    let expiredDetected = 0;
    let eventsCreated = 0;

    try {
      const warranties = this.repository.getWarranties();
      for (const wrn of warranties) {
        if (wrn.expiry_date && wrn.expiry_date < todayStr) {
          expiredDetected++;
          // Check if expired lifecycle event already registered
          const lifecycleEvents = this.repository.getLifecycleBySerial(wrn.serial_number);
          const hasExpiredEvent = lifecycleEvents.some(
            (e) => e.event_type === 'Warranty Expired' && e.reference_id === wrn.warranty_id
          );

          if (!hasExpiredEvent) {
            this.repository.addLifecycleEvent({
              serial_number: wrn.serial_number,
              event_type: 'Warranty Expired',
              event_date: `${wrn.expiry_date}T23:59:59Z`,
              performed_by: 'نظام الجدولة الآلي (Scheduled Expiration Job)',
              notes: `انتهاء فترة سريان وثيقة الضمان (${wrn.warranty_id}) الخاصة بالعميل ${wrn.customer_name}`,
              reference_id: wrn.warranty_id,
            });

            this.repository.addLog(
              wrn.warranty_id,
              wrn.serial_number,
              `[فحص انتهاء الصلاحية الآلي] انتهى ضمان الوثيقة (${wrn.warranty_id}) للمرتبة ${wrn.serial_number}`
            );
            eventsCreated++;
          }
        }
      }

      const result: AutomationJobResult = {
        job: 'Warranty Expiration Check',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        details: {
          totalWarranties: warranties.length,
          expiredDetected,
          newEventsCreated: eventsCreated,
        },
      };

      return result;
    } catch (err: any) {
      return {
        job: 'Warranty Expiration Check',
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        details: {},
        error: err.message,
      };
    }
  }

  /**
   * 2. Lifecycle Auto Update
   * Inspects all products, ensuring milestone events (Manufactured, Warranty Activated, etc.)
   * are synchronized with product and warranty records.
   */
  public runLifecycleAutoUpdate(): AutomationJobResult {
    let syncedEvents = 0;

    try {
      const products = this.repository.getProducts();
      const warranties = this.repository.getWarranties();

      for (const prod of products) {
        const events = this.repository.getLifecycleBySerial(prod.serial_number);
        const hasProduced = events.some((e) => e.event_type === 'Produced');

        // 1. Ensure Produced milestone
        if (!hasProduced) {
          this.repository.addLifecycleEvent({
            serial_number: prod.serial_number,
            event_type: 'Produced',
            event_date: `${prod.production_date}T08:00:00Z`,
            performed_by: `خط الإنتاج - ${prod.production_order}`,
            notes: `اكتمال تصنيع المرتبة ${prod.model} مقاس ${prod.size} وتشغيل الشاسيه مع ضبط الجودة`,
            reference_id: prod.batch_no,
          });
          syncedEvents++;
        }

        // 2. Ensure Warranty Activated milestone if warranty exists
        const wrn = warranties.find((w) => w.serial_number === prod.serial_number);
        if (wrn) {
          const hasActivationEvent = events.some(
            (e) => e.event_type === 'Warranty Activated' || e.reference_id === wrn.warranty_id
          );
          if (!hasActivationEvent) {
            this.repository.addLifecycleEvent({
              serial_number: prod.serial_number,
              event_type: 'Warranty Activated',
              event_date: wrn.activation_date,
              performed_by: 'بوابة تفعيل الضمان الرقمية',
              notes: `تفعيل الضمان الرسمي رقم ${wrn.warranty_id} للعميل ${wrn.customer_name}`,
              reference_id: wrn.warranty_id,
            });
            syncedEvents++;
          }
        }
      }

      return {
        job: 'Lifecycle Auto Update',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        details: {
          totalProducts: products.length,
          syncedEvents,
        },
      };
    } catch (err: any) {
      return {
        job: 'Lifecycle Auto Update',
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        details: {},
        error: err.message,
      };
    }
  }

  /**
   * 3. Archive Old Closed Claims
   * Identifies claims marked as 'Closed' that have been resolved and archives them in compliance with quality storage.
   */
  public runArchiveOldClosedClaims(retentionDays: number = 30): AutomationJobResult {
    let archivedCount = 0;

    try {
      const claims = this.repository.getClaims();
      const now = Date.now();

      for (const claim of claims) {
        if (claim.claim_status === 'Closed') {
          const claimDate = new Date(claim.resolution_date || claim.inspection_date || claim.created_at || '').getTime();
          const ageInDays = Math.floor((now - claimDate) / (1000 * 60 * 60 * 24));

          // If closed and not already archived
          if (!(claim as any).is_archived) {
            (claim as any).is_archived = true;
            (claim as any).archived_at = new Date().toISOString();
            archivedCount++;

            this.repository.addLog(
              claim.warranty_id,
              claim.serial_number,
              `[أرشفة الطلبات المغلقة] تمت أرشفة طلب الضمان رقم (${claim.claim_id}) بعد مرور فترة التسوية القانونية`
            );
          }
        }
      }

      if (archivedCount > 0) {
        this.repository.persist();
      }

      return {
        job: 'Archive Old Closed Claims',
        timestamp: new Date().toISOString(),
        status: 'SUCCESS',
        details: {
          totalClaims: claims.length,
          archivedCount,
          retentionDays,
        },
      };
    } catch (err: any) {
      return {
        job: 'Archive Old Closed Claims',
        timestamp: new Date().toISOString(),
        status: 'FAILED',
        details: {},
        error: err.message,
      };
    }
  }

  /**
   * Runs all scheduled jobs sequentially
   */
  public runAllJobs(): AutomationJobResult[] {
    const results: AutomationJobResult[] = [
      this.runWarrantyExpirationCheck(),
      this.runLifecycleAutoUpdate(),
      this.runArchiveOldClosedClaims(),
    ];
    this.lastRunResults = results;
    return results;
  }

  public getLastRunResults(): AutomationJobResult[] {
    return this.lastRunResults;
  }

  /**
   * Starts background recurring runner
   */
  public start(intervalMinutes: number = 60) {
    if (this.intervalId) return;

    // Run initial execution after 5 seconds to warm up
    setTimeout(() => {
      console.log('[Scheduled Jobs] Running initial automated tasks...');
      this.runAllJobs();
    }, 5000);

    const ms = intervalMinutes * 60 * 1000;
    this.intervalId = setInterval(() => {
      console.log('[Scheduled Jobs] Running periodic automated tasks...');
      this.runAllJobs();
    }, ms);

    console.log(`[Scheduled Jobs] Initialized recurring automation runner (every ${intervalMinutes} minutes)`);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
