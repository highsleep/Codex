import * as XLSX from 'xlsx';
import { RawProductionRecord } from './types.js';

export class ExcelProvider {
  /**
   * Parses Excel workbook buffer (supports .xlsx, .xls) and extracts raw production records.
   * Handles bilingual column headers (Arabic and English) commonly used in Sleepee factories.
   */
  public static parseBuffer(buffer: Buffer): { fileName: string; records: RawProductionRecord[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('الملف فارغ ولا يحتوي على أي أوراق عمل (Sheets)');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    const jsonData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });

    const records: RawProductionRecord[] = jsonData.map((row) => {
      // Find case-insensitive & bilingual keys
      const getVal = (candidates: string[]): string => {
        for (const c of candidates) {
          for (const key of Object.keys(row)) {
            if (key.trim().toLowerCase() === c.toLowerCase()) {
              return String(row[key]).trim();
            }
          }
        }
        return '';
      };

      const serial = getVal(['serial_number', 'serial', 'الرقم التسلسلي', 'السيريال', 'كود المرتبة', 'باركود']);
      const model = getVal(['model', 'model_name', 'الموديل', 'اسم الموديل', 'نوع المرتبة', 'المنتج']);
      const size = getVal(['size', 'dimensions', 'المقاس', 'الأبعاد', 'مقاس المرتبة']);
      const warrantyYears = getVal(['warranty_years', 'warranty', 'سنوات الضمان', 'الضمان', 'مدة الضمان']);
      const prodDate = getVal(['production_date', 'date', 'تاريخ الإنتاج', 'تاريخ التصنيع', 'تاريخ التشغيل']);
      const prodOrder = getVal(['production_order', 'order_no', 'أمر الشغل', 'أمر الإنتاج', 'رقم أمر الشغل', 'PO']);
      const batchNo = getVal(['batch_no', 'batch', 'رقم التشغيلة', 'رقم الباتش', 'الباتش', 'تشغيلة']);
      const line = getVal(['production_line', 'line', 'خط الإنتاج', 'الخط']);
      const shift = getVal(['shift', 'الوردية']);
      const operator = getVal(['operator', 'مشغل الخط', 'الفني']);
      const remarks = getVal(['remarks', 'notes', 'ملاحظات', 'حالة']);
      const status = getVal(['production_status', 'status', 'حالة الإنتاج']);
      const planType = getVal(['plan_type', 'type', 'نوع السجل', 'خطة']);

      return {
        serial_number: serial,
        model,
        size,
        warranty_years: warrantyYears ? Number(warrantyYears) : undefined,
        production_date: prodDate,
        production_order: prodOrder,
        batch_no: batchNo,
        production_line: line,
        shift,
        operator,
        remarks,
        production_status: status,
        plan_type: planType,
      };
    });

    return { fileName: 'Production_Master.xlsx', records };
  }

  public static parseBase64(base64: string): { fileName: string; records: RawProductionRecord[] } {
    const cleanBase64 = base64.replace(/^data:.*?;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');
    return this.parseBuffer(buffer);
  }
}
