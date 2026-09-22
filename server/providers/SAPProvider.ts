import { RawProductionRecord } from './types.js';

export interface SAPMaterialDefinition {
  material_code: string;
  material_description: string;
  product_family: string;
  default_warranty_years: number;
}

export class SAPProvider {
  /**
   * Mock / Standard SAP Material Master catalog for Sleepee mattress lines
   */
  public static readonly MATERIAL_CATALOG: SAPMaterialDefinition[] = [
    {
      material_code: 'MAT-SLP-RP-01',
      material_description: 'Sleepee Royal Pocket Spring Luxury 180x200',
      product_family: 'Pocket Spring Luxury',
      default_warranty_years: 10,
    },
    {
      material_code: 'MAT-SLP-SMF-02',
      material_description: 'Sleepee Super Memory Foam 160x200',
      product_family: 'Memory Foam',
      default_warranty_years: 10,
    },
    {
      material_code: 'MAT-SLP-ORT-03',
      material_description: 'Sleepee Orthopedic Comfort Medical 120x200',
      product_family: 'Medical Orthopedic',
      default_warranty_years: 5,
    },
    {
      material_code: 'MAT-SLP-CPT-04',
      material_description: 'Sleepee Cloud Pillow Top High-End 200x200',
      product_family: 'Pillow Top Luxury',
      default_warranty_years: 10,
    },
    {
      material_code: 'MAT-SLP-HLX-05',
      material_description: 'Sleepee Hybrid Latex Organic 160x200',
      product_family: 'Eco Latex Hybrid',
      default_warranty_years: 10,
    },
  ];

  /**
   * Generates simulated or live SAP S/4HANA OData / CDS View production order records
   */
  public static fetchProductionOrders(orderId?: string): RawProductionRecord[] {
    const today = new Date().toISOString().split('T')[0];
    const timestamp = Date.now().toString().slice(-4);

    return [
      {
        serial_number: `SLP-SAP-${timestamp}-01`,
        model: 'سليبي رويال بوكيت سبرينج (Royal Pocket)',
        size: '180 × 200 سم',
        warranty_years: 10,
        production_date: today,
        production_order: orderId || `ORD-SAP-${timestamp}`,
        batch_no: `BATCH-SAP-${timestamp.slice(0, 2)}`,
        production_line: 'SAP Line 1 - Tenth of Ramadan',
        shift: 'Morning Shift',
        operator: 'SAP Operator Auto',
        production_status: 'Produced',
        remarks: 'Confirmed via SAP S/4HANA OData ProductionOrder API',
      },
      {
        serial_number: `SLP-SAP-${timestamp}-02`,
        model: 'سليبي سوبر ميموري فوم (Super Memory Foam)',
        size: '160 × 200 سم',
        warranty_years: 10,
        production_date: today,
        production_order: orderId || `ORD-SAP-${timestamp}`,
        batch_no: `BATCH-SAP-${timestamp.slice(0, 2)}`,
        production_line: 'SAP Line 2 - Foam Unit',
        shift: 'Morning Shift',
        operator: 'SAP Operator Auto',
        production_status: 'Produced',
        remarks: 'Confirmed via SAP S/4HANA OData ProductionOrder API',
      },
    ];
  }

  /**
   * Exports products in standard SAP-compatible CSV / IDoc format
   */
  public static exportToSAPFormat(products: any[]): string {
    const headers = [
      'MANDT',
      'MATNR',
      'SERNR',
      'AUFNR',
      'CHARG',
      'ERDAT',
      'WARRANTY_YEARS',
      'STATUS',
    ];
    const rows = products.map((p) => [
      '100', // SAP Client ID
      p.sap_material_code || 'MAT-SLP-GENERIC',
      p.serial_number,
      p.sap_production_order || p.production_order,
      p.sap_batch_number || p.batch_no,
      p.production_date.replace(/-/g, ''),
      p.warranty_years,
      p.production_status || 'PRODUCED',
    ]);

    return [headers.join('\t'), ...rows.map((r) => r.join('\t'))].join('\n');
  }
}
