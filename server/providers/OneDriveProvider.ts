import crypto from 'crypto';
import { RawProductionRecord } from './types.js';

export class OneDriveProvider {
  public static readonly SYNC_FILE_NAME = 'Production_Master.xlsx';

  /**
   * Generates or fetches cumulative records from OneDrive Business Folder
   */
  public static fetchOneDriveMasterData(mockCounter: number = 1): {
    fileHash: string;
    records: RawProductionRecord[];
  } {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = Date.now().toString().slice(-4);

    const records: RawProductionRecord[] = [
      {
        serial_number: `SLP-OD-${timestamp}-01`,
        model: 'سليبي سوبر ميموري فوم (Super Memory Foam)',
        size: '160 × 200 سم',
        warranty_years: 10,
        production_date: today,
        production_order: `ORD-OD-${timestamp}`,
        batch_no: `BATCH-OD-02`,
        production_line: 'خط صب الفوم والقص الهيدروليكي',
        shift: 'وردية بعد الظهر',
        operator: 'حسام حسن',
        production_status: 'Produced',
        remarks: 'فحص كثافة الفوم (30 كجم/م3) معتمد',
      },
      {
        serial_number: `SLP-OD-${timestamp}-02`,
        model: 'سليبي أورثوبيديك الطبية (Orthopedic Comfort)',
        size: '120 × 200 سم',
        warranty_years: 5,
        production_date: today,
        production_order: `ORD-OD-${timestamp}`,
        batch_no: `BATCH-OD-02`,
        production_line: 'خط التجميع الطبي',
        shift: 'وردية بعد الظهر',
        operator: 'إبراهيم علي',
        production_status: 'Produced',
        remarks: 'دعامات جانبية صلبة وشاسيه طبي مكفول 5 سنوات',
      },
    ];

    const contentStr = JSON.stringify(records) + mockCounter;
    const fileHash = crypto.createHash('sha256').update(contentStr).digest('hex');

    return { fileHash, records };
  }
}
