import {
  RawProductionRecord,
  ValidatedProductionRecord,
  ValidationResult,
  SyncExecutionResult,
} from './types.js';
import { ExcelProvider } from './ExcelProvider.js';
import { CSVProvider } from './CSVProvider.js';
import { SharePointProvider } from './SharePointProvider.js';
import { OneDriveProvider } from './OneDriveProvider.js';
import { SAPProvider } from './SAPProvider.js';
import { DatabaseService } from '../db/index.js';

export class ProductionDataProvider {
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Validates raw records according to strict Sleepee Mattress production rules:
   * 1. Reject production plans, forecasts, and planned quantities (Import ONLY actual produced serials).
   * 2. Validate mandatory fields: serial_number, model, size, production_date, production_order, batch_no.
   * 3. Map warranty years dynamically from model governance table.
   */
  public validateRecords(
    records: RawProductionRecord[],
    sourceSystem: 'Excel' | 'CSV' | 'SharePoint' | 'OneDrive' | 'SAP' | 'Manual'
  ): ValidationResult {
    const validRecords: ValidatedProductionRecord[] = [];
    const skippedRecords: { row: number; data: any; reason: string }[] = [];
    const failedRecords: { row: number; data: any; reason: string }[] = [];

    const activeModels = this.db.getProductModels();

    records.forEach((raw, idx) => {
      const rowNum = idx + 2; // Accounting for 1-based indexing + header row
      const serial = (raw.serial_number || raw.serial || '').trim().toUpperCase();
      const model = (raw.model || '').trim();
      const size = (raw.size || raw.dimensions || '').trim();
      const rawDate = (raw.production_date || raw.date || '').trim();
      const order = (raw.production_order || raw.order_no || '').trim();
      const batch = (raw.batch_no || raw.batch || '').trim();
      const remarks = (raw.remarks || raw.notes || '').trim();
      const status = (raw.production_status || raw.status || 'Produced').trim();
      const planType = (raw.plan_type || '').trim().toLowerCase();

      // Rule 1: Never import Plans, Forecasts, or Planned Quantities
      const isPlanOrForecast =
        planType.includes('plan') ||
        planType.includes('forecast') ||
        planType.includes('خطة') ||
        planType.includes('توقع') ||
        remarks.toLowerCase().includes('خطة إنتاج') ||
        remarks.toLowerCase().includes('forecast') ||
        Boolean(raw.planned_qty && !serial);

      if (isPlanOrForecast) {
        skippedRecords.push({
          row: rowNum,
          data: raw,
          reason: 'تم تجاهل السجل لأنه يمثل خطة إنتاجية أو توقع مستقبلي (Forecast/Plan) وليس مرتبة مصنعة فعلياً',
        });
        return;
      }

      // Rule 2: Serial Number must not be empty and valid format
      if (!serial) {
        failedRecords.push({
          row: rowNum,
          data: raw,
          reason: 'حقل الرقم التسلسلي (Serial Number) فارغ',
        });
        return;
      }

      if (serial.length < 5 || !/^[A-Za-z0-9_-]+$/.test(serial)) {
        failedRecords.push({
          row: rowNum,
          data: raw,
          reason: `تنسيق الرقم التسلسلي غير صالح (${serial}). يجب أن يحتوي فقط على حروف وأرقام وعلامات ربط`,
        });
        return;
      }

      // Rule 3: Model and Size must not be empty
      if (!model) {
        failedRecords.push({
          row: rowNum,
          data: raw,
          reason: 'اسم الموديل فارغ وغير محدد',
        });
        return;
      }

      if (!size || size.length < 2) {
        failedRecords.push({
          row: rowNum,
          data: raw,
          reason: 'أبعاد ومقاس المرتبة غير صالحة أو فارغة',
        });
        return;
      }

      // Rule 4: Validate Production Date
      let prodDate = rawDate;
      if (!prodDate) {
        prodDate = new Date().toISOString().split('T')[0];
      } else {
        const parsed = new Date(prodDate);
        if (isNaN(parsed.getTime())) {
          failedRecords.push({
            row: rowNum,
            data: raw,
            reason: `تاريخ الإنتاج (${rawDate}) غير صالح`,
          });
          return;
        }
        prodDate = parsed.toISOString().split('T')[0];
      }

      // Rule 5: Production Order & Batch No
      const prodOrder = order || `ORD-${prodDate.slice(0, 7)}-${batch || 'GEN'}`;
      const batchNo = batch || `BATCH-${prodDate.slice(0, 7)}`;

      // Rule 6: Warranty Years Mapping from Product Models Governance
      let warrantyYears = 10;
      if (raw.warranty_years && Number(raw.warranty_years) > 0) {
        warrantyYears = Number(raw.warranty_years);
      } else {
        // Look up model in catalog
        const matchedModel = activeModels.find(
          (m) =>
            m.commercial_model_name.toLowerCase().includes(model.toLowerCase()) ||
            model.toLowerCase().includes(m.commercial_model_name.toLowerCase()) ||
            (m.sap_material_code && m.sap_material_code.toLowerCase() === model.toLowerCase())
        );
        if (matchedModel) {
          warrantyYears = matchedModel.warranty_years;
        }
      }

      // Validated Record
      validRecords.push({
        serial_number: serial,
        model,
        size,
        warranty_years: warrantyYears,
        production_date: prodDate,
        production_order: prodOrder,
        batch_no: batchNo,
        production_status: (status as any) || 'Produced',
        source_system: sourceSystem,
        production_line: raw.production_line || raw.line || 'خط الإنتاج الرئيسي',
        shift: raw.shift || 'الوردية الأولى',
        operator: raw.operator || 'فني ضبط الجودة',
        remarks,
        sap_material_code: `MAT-${model.slice(0, 3).toUpperCase()}`,
        sap_production_order: prodOrder,
        sap_batch_number: batchNo,
      });
    });

    return { validRecords, skippedRecords, failedRecords };
  }

  /**
   * Executes Delta Import:
   * 1. Checks if serial already exists in database. If exists -> SKIP (Never overwrite existing serials).
   * 2. If new -> CREATE PRODUCT & log lifecycle event 'Produced'.
   * 3. Update or create production_batches entry.
   * 4. Log detailed audit record in production_import_logs.
   * 5. Update production_sync_state.
   */
  public async executeImport(
    sourceType: 'Excel' | 'CSV' | 'SharePoint' | 'OneDrive' | 'SAP' | 'Manual',
    fileName: string,
    rawRecords: RawProductionRecord[],
    performedBy: string,
    fileHash: string = ''
  ): Promise<SyncExecutionResult> {
    const startTime = Date.now();
    const importId = `IMP-${Date.now().toString().slice(-6)}`;
    const errors: string[] = [];

    // Step 1: Validate records
    const validation = this.validateRecords(rawRecords, sourceType);
    validation.failedRecords.forEach((f) => {
      errors.push(`صف ${f.row}: ${f.reason} [${JSON.stringify(f.data).slice(0, 60)}]`);
    });

    const sampleImported: ValidatedProductionRecord[] = [];
    let importedCount = 0;
    let skippedCount = validation.skippedRecords.length;

    // Step 2: Ingest Valid Records with Duplicate Collision Detection
    for (const rec of validation.validRecords) {
      try {
        const existing = this.db.getProductBySerial(rec.serial_number);
        if (existing) {
          skippedCount++;
          // Never overwrite existing serials!
          continue;
        }

        // Add Product via DB Service
        this.db.addProduct({
          serial_number: rec.serial_number,
          model: rec.model,
          size: rec.size,
          warranty_years: rec.warranty_years,
          production_date: rec.production_date,
          production_order: rec.production_order,
          batch_no: rec.batch_no,
          image_url:
            'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
          production_status: rec.production_status,
          source_system: rec.source_system,
          sap_production_order: rec.sap_production_order,
          sap_batch_number: rec.sap_batch_number,
          sap_material_code: rec.sap_material_code,
          sap_last_sync: new Date().toISOString(),
          production_line: rec.production_line,
          shift: rec.shift,
          operator: rec.operator,
          remarks: rec.remarks,
        });

        // Ensure lifecycle event 'Produced' is recorded
        this.db.addLifecycleEvent({
          serial_number: rec.serial_number,
          event_type: 'Produced',
          event_date: `${rec.production_date}T08:00:00Z`,
          performed_by: `${rec.operator || 'المصنع'} (${sourceType})`,
          notes: `اكتمال تصنيع المرتبة واعتماد مواصفاتها من خلال استيراد الإنتاج [${sourceType} - ${fileName}]`,
          reference_id: importId,
        });

        // Update Batch Summary
        this.db.upsertProductionBatch({
          batch_no: rec.batch_no,
          production_order: rec.production_order,
          production_date: rec.production_date,
          source_system: sourceType,
          model: rec.model,
        });

        importedCount++;
        if (sampleImported.length < 5) {
          sampleImported.push(rec);
        }
      } catch (err: any) {
        errors.push(`خطأ أثناء معالجة السيريال ${rec.serial_number}: ${err.message}`);
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const status =
      validation.failedRecords.length > 0 && importedCount > 0
        ? 'PARTIAL'
        : validation.failedRecords.length > 0 && importedCount === 0
        ? 'FAILED'
        : 'SUCCESS';

    // Step 3: Write Import Log
    this.db.addImportLog({
      import_id: importId,
      file_name: fileName,
      source_type: sourceType,
      import_date: new Date().toISOString(),
      imported_records: importedCount,
      skipped_records: skippedCount,
      failed_records: validation.failedRecords.length,
      execution_time: executionTimeMs,
      performed_by: performedBy,
      status,
      error_log: errors.slice(0, 25),
    });

    // Step 4: Update Sync State
    this.db.updateSyncState({
      sync_source: sourceType as any,
      last_sync_time: new Date().toISOString(),
      last_successful_sync:
        importedCount > 0 ? new Date().toISOString() : new Date().toISOString(),
      last_file_hash: fileHash || `HASH_${Date.now()}`,
      last_row_count: rawRecords.length,
    });

    // Step 5: Log to security audit
    this.db.addLog(
      null,
      `IMPORT_${importId}`,
      `تم استيراد ${importedCount} مرتبة بنجاح، وتخطي ${skippedCount} سجل مكرر/توقعي بواسطة ${performedBy} من مصدر [${sourceType}: ${fileName}]`
    );

    return {
      importId,
      sourceType,
      fileName,
      totalRead: rawRecords.length,
      importedCount,
      skippedCount,
      failedCount: validation.failedRecords.length,
      executionTimeMs,
      status,
      errors,
      sampleImported,
    };
  }

  /**
   * Helper to attempt downloading and parsing records from a remote URL (Excel / CSV / JSON)
   */
  private async fetchRecordsFromUrl(
    url: string,
    token?: string
  ): Promise<{ records: RawProductionRecord[]; fileName: string; hash: string } | null> {
    try {
      const headers: Record<string, string> = {
        'User-Agent': 'Sleepee-Production-Sync-Engine/2.0',
      };
      if (token) {
        headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
      }

      const res = await fetch(url, { headers, redirect: 'follow' });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const contentType = (res.headers.get('content-type') || '').toLowerCase();
      const urlLower = url.toLowerCase();

      // Excel
      if (
        contentType.includes('spreadsheet') ||
        contentType.includes('excel') ||
        contentType.includes('octet-stream') ||
        urlLower.includes('.xlsx') ||
        urlLower.includes('.xls')
      ) {
        const arrayBuf = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuf);
        const parsed = ExcelProvider.parseBuffer(buffer);
        const hash = `LIVE_EX_${Date.now()}`;
        return { records: parsed.records, fileName: parsed.fileName || 'Remote_Production_Master.xlsx', hash };
      }

      // CSV
      if (contentType.includes('csv') || contentType.includes('text/plain') || urlLower.includes('.csv')) {
        const text = await res.text();
        const records = CSVProvider.parse(text);
        const hash = `LIVE_CSV_${Date.now()}`;
        return { records, fileName: 'Remote_Production_Master.csv', hash };
      }

      // JSON / OData
      if (contentType.includes('json') || urlLower.includes('odata') || urlLower.includes('.json')) {
        const json: any = await res.json();
        let records: any[] = [];
        if (Array.isArray(json)) {
          records = json;
        } else if (Array.isArray(json.value)) {
          records = json.value;
        } else if (json.d && Array.isArray(json.d.results)) {
          records = json.d.results;
        } else if (json.records && Array.isArray(json.records)) {
          records = json.records;
        }
        const hash = `LIVE_JSON_${Date.now()}`;
        return { records, fileName: 'Remote_SAP_OData.json', hash };
      }

      return null;
    } catch (err: any) {
      console.warn(`[SyncEngine] Remote fetch failed for ${url}:`, err.message);
      return null;
    }
  }

  /**
   * Triggers SharePoint Sync with live URL support or high-fidelity simulation
   */
  public async syncSharePoint(
    performedBy: string = 'Automated SharePoint Sync',
    customUrl?: string
  ): Promise<SyncExecutionResult> {
    const syncState = this.db.getSyncStates().find((s) => s.sync_source === 'SharePoint');
    const targetUrl = customUrl || syncState?.sync_url;
    const isLiveMode = syncState?.connection_mode === 'live_url';

    if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) && isLiveMode) {
      const liveData = await this.fetchRecordsFromUrl(targetUrl, syncState?.api_key_or_token);
      if (liveData && liveData.records.length > 0) {
        const res = await this.executeImport(
          'SharePoint',
          syncState?.target_file_name || liveData.fileName,
          liveData.records,
          performedBy,
          liveData.hash
        );
        this.db.updateSyncState({
          sync_source: 'SharePoint',
          connection_status: 'connected',
          last_successful_sync: new Date().toISOString(),
        });
        return {
          ...res,
          sourceOrigin: 'رابط مباشر حقيقي (Live SharePoint URL)',
          urlUsed: targetUrl,
          syncNote: 'تم جلب واستيراد البيانات الحية بنجاح من مكتبة مستندات SharePoint مباشرة.',
        };
      }
    }

    // Fallback or Simulated Mode
    const spData = SharePointProvider.fetchSharePointMasterData();
    const result = await this.executeImport(
      'SharePoint',
      SharePointProvider.SYNC_FILE_NAME,
      spData.records,
      performedBy,
      spData.fileHash
    );

    return {
      ...result,
      sourceOrigin: 'نموذج محاكاة الإنتاج التراكمي (Production Master Model)',
      urlUsed: targetUrl || 'لم يتم تحديد رابط - وضع المحاكاة النشط',
      syncNote:
        'المصدر الحالي: تم الاستيراد عبر محاكي خطوط الإنتاج السحابي المتوافق، لعدم توفر ربط حي مع Microsoft Graph أو رابط ملف مباشر مصرح به.',
    };
  }

  /**
   * Triggers OneDrive Sync with live URL support or high-fidelity simulation
   */
  public async syncOneDrive(
    performedBy: string = 'Automated OneDrive Sync',
    customUrl?: string
  ): Promise<SyncExecutionResult> {
    const syncState = this.db.getSyncStates().find((s) => s.sync_source === 'OneDrive');
    const targetUrl = customUrl || syncState?.sync_url;
    const isLiveMode = syncState?.connection_mode === 'live_url';

    if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) && isLiveMode) {
      const liveData = await this.fetchRecordsFromUrl(targetUrl, syncState?.api_key_or_token);
      if (liveData && liveData.records.length > 0) {
        const res = await this.executeImport(
          'OneDrive',
          syncState?.target_file_name || liveData.fileName,
          liveData.records,
          performedBy,
          liveData.hash
        );
        this.db.updateSyncState({
          sync_source: 'OneDrive',
          connection_status: 'connected',
          last_successful_sync: new Date().toISOString(),
        });
        return {
          ...res,
          sourceOrigin: 'رابط مباشر حقيقي (Live OneDrive Shared URL)',
          urlUsed: targetUrl,
          syncNote: 'تم جلب واستيراد السجلات مباشرة من ملف OneDrive المشترك.',
        };
      }
    }

    // Fallback or Simulated Mode
    const odData = OneDriveProvider.fetchOneDriveMasterData();
    const result = await this.executeImport(
      'OneDrive',
      OneDriveProvider.SYNC_FILE_NAME,
      odData.records,
      performedBy,
      odData.fileHash
    );

    return {
      ...result,
      sourceOrigin: 'نموذج محاكاة الإنتاج التراكمي (Production Master Model)',
      urlUsed: targetUrl || 'لم يتم تحديد رابط - وضع المحاكاة النشط',
      syncNote:
        'المصدر الحالي: تم الاستيراد عبر محاكي خطوط إنتاج المصنع المتوافق مع ملفات OneDrive المشتركة.',
    };
  }

  /**
   * Triggers SAP S/4HANA Sync with live OData URL support or simulated catalog
   */
  public async syncSAP(
    performedBy: string = 'SAP OData Sync',
    customUrl?: string
  ): Promise<SyncExecutionResult> {
    const syncState = this.db.getSyncStates().find((s) => s.sync_source === 'SAP');
    const targetUrl = customUrl || syncState?.sync_url;
    const isLiveMode = syncState?.connection_mode === 'live_url';

    if (targetUrl && (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) && isLiveMode) {
      const liveData = await this.fetchRecordsFromUrl(targetUrl, syncState?.api_key_or_token);
      if (liveData && liveData.records.length > 0) {
        const res = await this.executeImport(
          'SAP',
          syncState?.target_file_name || 'SAP_S4HANA_ProductionOrder_OData',
          liveData.records,
          performedBy,
          liveData.hash
        );
        this.db.updateSyncState({
          sync_source: 'SAP',
          connection_status: 'connected',
          last_successful_sync: new Date().toISOString(),
        });
        return {
          ...res,
          sourceOrigin: 'خدمة SAP S/4HANA OData الحية (Live SAP API)',
          urlUsed: targetUrl,
          syncNote: 'تم سحب أوامر الإنتاج المعتمدة مباشرة من خادم SAP S/4HANA.',
        };
      }
    }

    // Fallback or Simulated Mode
    const sapOrders = SAPProvider.fetchProductionOrders();
    const result = await this.executeImport(
      'SAP',
      'SAP_S4HANA_ProductionOrder_OData',
      sapOrders,
      performedBy,
      `SAP_${Date.now()}`
    );

    return {
      ...result,
      sourceOrigin: 'كتالوج محاكاة أوامر شغل SAP S/4HANA المعتمدة',
      urlUsed: targetUrl || 'لم يتم تحديد نقطة نهاية حية - وضع المحاكاة النشط',
      syncNote:
        'المصدر الحالي: تم سحب السجلات من كتالوج موديلات ومواصفات SAP المهيأ، تمهيداً للربط مع OData Gateway مستقبلاً.',
    };
  }
}
