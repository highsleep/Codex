export interface ZebraLabelParams {
  serialNumber: string;
  model: string;
  size: string;
  warrantyYears: number;
  productionDate: string;
  productionOrder: string;
  batchNo: string;
  category?: string;
  brand?: string;
  manufacturingSystem?: string;
  internalProductCode?: string;
  hotline?: string;
  verificationUrl?: string;
}

export class ZebraZPLGenerator {
  /**
   * Generates standard ZPL II code for Zebra ZD220 (203 DPI / 8 dots per mm).
   * Formatted for standard mattress tag (e.g. 4x6 inch or 4x3 inch thermal label).
   * Pulls directly from Product Master:
   * - Category
   * - Brand
   * - Model
   * - Manufacturing System
   * - Production Date
   * - Serial
   * - QR Code
   * - Barcode Code 128
   * - Official Support Hotline: 19707
   */
  public static generateZPL(params: ZebraLabelParams): string {
    const cleanSerial = params.serialNumber.trim().toUpperCase();
    const cleanModel = params.model.replace(/[\r\n"]/g, '');
    const cleanSize = params.size.replace(/[\r\n"]/g, '');
    const cleanBrand = (params.brand || 'Sleepee').replace(/[\r\n"]/g, '');
    const cleanCategory = (params.category || 'مرتبة').replace(/[\r\n"]/g, '');
    const cleanSystem = (params.manufacturingSystem || 'ألماني').replace(/[\r\n"]/g, '');
    const cleanCode = (params.internalProductCode || '').replace(/[\r\n"]/g, '');
    const hotline = params.hotline || '19707';
    const verifyUrl = params.verificationUrl || `https://ais-dev-oivpum3czxe4y4prejmcv3-633317479505.europe-west2.run.app/?verify=${cleanSerial}`;

    // ZPL II Script
    const zpl = [
      '^XA',
      // Set label width (812 dots = ~4 inches at 203 dpi), length (609 dots = ~3 inches)
      '^PW812',
      '^LL609',
      '^LH0,0',
      '^CI28', // UTF-8 Encoding support
      
      // Outer border box
      '^FO20,20^GB772,569,4^FS',
      
      // Header banner box (Inverted black bar)
      '^FO20,20^GB772,80,80^FS',
      '^FO40,40^FR^A0N,38,38^FD' + cleanBrand.toUpperCase() + ' - FACTORY CERTIFIED (' + cleanCategory + ')^FS',
      '^FO580,42^FR^A0N,28,28^FDHOTLINE: ' + hotline + '^FS',

      // Model Name, System and Size
      '^FO40,115^A0N,30,30^FDMODEL: ' + cleanModel.slice(0, 42) + '^FS',
      '^FO40,152^A0N,24,24^FDSYSTEM: ' + cleanSystem + '  |  DIMENSIONS: ' + cleanSize + '^FS',
      cleanCode ? '^FO40,182^A0N,20,20^FDPRODUCT MASTER CODE: ' + cleanCode + '^FS' : '^FO40,182^A0N,20,20^FDTRACEABILITY MASTER VERIFIED^FS',

      // Divider Line
      '^FO40,205^GB732,2,2^FS',

      // QR Code on the Left
      // ^BQN,2,6 = QR Code, standard model 2, magnification 6
      '^FO50,225^BQN,2,6^FDQA,' + verifyUrl + '^FS',
      '^FO45,395^A0N,20,20^FDDIGITAL WARRANTY QR^FS',
      '^FO45,420^A0N,18,18^FDSCAN TO ACTIVATE^FS',

      // Barcode Code 128 on the Right
      // ^BCN,90,Y,N,N = Code 128, height 90 dots, print interpretation line
      '^FO260,230^BCN,90,Y,N,N^FD' + cleanSerial + '^FS',

      // Technical & Production Data Box
      '^FO260,370^A0N,22,22^FDPROD DATE : ' + params.productionDate + '^FS',
      '^FO260,405^A0N,22,22^FDBATCH NO  : ' + params.batchNo + '  | ORDER: ' + params.productionOrder + '^FS',
      '^FO260,440^A0N,24,24^FDWARRANTY  : ' + params.warrantyYears + ' YEARS OFFICIAL COVERAGE^FS',

      // Bottom Safety & Anti-counterfeiting Note
      '^FO40,490^GB732,2,2^FS',
      '^FO40,510^A0N,20,20^FDGUARANTEED BY ' + cleanBrand.toUpperCase() + ' - DO NOT REMOVE THIS CERTIFIED SERIAL TAG^FS',
      '^FO40,538^A0N,18,18^FDSUPPORT: support@sleepee.com | TEL: ' + hotline + ' | ISO 9001 QUALITY ASSURED^FS',
      
      '^XZ'
    ].join('\n');

    return zpl;
  }
}
