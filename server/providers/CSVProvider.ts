import { RawProductionRecord } from './types.js';

export class CSVProvider {
  /**
   * Parses CSV string or buffer, handles UTF-8 BOM, comma/semicolon/tab separators,
   * and quotes. Extracts normalized RawProductionRecord array.
   */
  public static parse(content: string | Buffer): RawProductionRecord[] {
    let text = typeof content === 'string' ? content : content.toString('utf-8');
    // Strip UTF-8 BOM if present
    if (text.charCodeAt(0) === 0xfeff) {
      text = text.slice(1);
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) {
      return [];
    }

    // Determine delimiter (comma, semicolon, or tab)
    const firstLine = lines[0];
    let delimiter = ',';
    if (firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length) {
      delimiter = ';';
    } else if (firstLine.includes('\t') && firstLine.split('\t').length > firstLine.split(',').length) {
      delimiter = '\t';
    }

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === delimiter && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase().replace(/[\r\n"]/g, ''));
    const records: RawProductionRecord[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length === 0 || values.every((v) => v === '')) continue;

      const rowMap: Record<string, string> = {};
      headers.forEach((h, idx) => {
        rowMap[h] = values[idx] || '';
      });

      const getVal = (candidates: string[]): string => {
        for (const c of candidates) {
          for (const key of Object.keys(rowMap)) {
            if (key.includes(c.toLowerCase()) || c.toLowerCase().includes(key)) {
              return rowMap[key].trim();
            }
          }
        }
        return '';
      };

      records.push({
        serial_number: getVal(['serial_number', 'serial', 'الرقم التسلسلي', 'السيريال']),
        model: getVal(['model', 'الموديل', 'اسم الموديل', 'النوع']),
        size: getVal(['size', 'المقاس', 'الأبعاد']),
        warranty_years: getVal(['warranty_years', 'warranty', 'سنوات الضمان', 'الضمان']),
        production_date: getVal(['production_date', 'date', 'تاريخ الإنتاج', 'تاريخ التصنيع']),
        production_order: getVal(['production_order', 'order_no', 'أمر الشغل', 'أمر الإنتاج']),
        batch_no: getVal(['batch_no', 'batch', 'رقم التشغيلة', 'الباتش']),
        production_line: getVal(['production_line', 'line', 'خط الإنتاج']),
        shift: getVal(['shift', 'الوردية']),
        operator: getVal(['operator', 'مشغل الخط']),
        remarks: getVal(['remarks', 'notes', 'ملاحظات']),
        production_status: getVal(['status', 'production_status', 'حالة']),
        plan_type: getVal(['type', 'خطة']),
      });
    }

    return records;
  }
}
