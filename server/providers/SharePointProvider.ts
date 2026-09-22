import crypto from 'crypto';
import { RawProductionRecord } from './types.js';

export class SharePointProvider {
  public static readonly SYNC_FILE_NAME = 'Production_Master.xlsx';

  /**
   * Generates or fetches cumulative records from SharePoint Document Library
   * (e.g. Sleepee Factory Operations site / Production Master Drive)
   */
  public static fetchSharePointMasterData(mockCounter: number = 1): {
    fileHash: string;
    records: RawProductionRecord[];
  } {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = Date.now().toString().slice(-4);

    const records: RawProductionRecord[] = [
      {
        serial_number: `SLP-SP-${timestamp}-01`,
        model: 'سليبي رويال بوكيت سبرينج (Royal Pocket)',
        size: '180 × 200 سم',
        warranty_years: 10,
        production_date: today,
        production_order: `ORD-SP-${timestamp}`,
        batch_no: `BATCH-SP-01`,
        production_line: 'خط الشاسيهات 1',
        shift: 'الوردية الأولى',
        operator: 'أحمد محمود',
        production_status: 'Produced',
        remarks: 'تم التحقق من ضبط الجودة واختبار ارتداد السوست',
      },
      {
        serial_number: `SLP-SP-${timestamp}-02`,
        model: 'سليبي كلاود بيلو توب الفاخرة (Cloud Pillow Top)',
        size: '200 × 200 سم',
        warranty_years: 10,
        production_date: today,
        production_order: `ORD-SP-${timestamp}`,
        batch_no: `BATCH-SP-01`,
        production_line: 'خط التقفيل والتبطين',
        shift: 'الوردية الأولى',
        operator: 'مصطفى كمال',
        production_status: 'Produced',
        remarks: 'تغليف ثلاثي الطبقات جاهز للنقل',
      },
    ];

    const contentStr = JSON.stringify(records) + mockCounter;
    const fileHash = crypto.createHash('sha256').update(contentStr).digest('hex');

    return { fileHash, records };
  }
}
