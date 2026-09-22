import React from 'react';
import { FolderOpen } from 'lucide-react';
import { AttachmentsCenter } from '../AttachmentsCenter';
import { CustomerService360 } from '../../types';

interface AttachmentsPhotosTabProps {
  data: CustomerService360;
  onRefresh: () => void;
}

export const AttachmentsPhotosTab: React.FC<AttachmentsPhotosTabProps> = ({
  data,
  onRefresh,
}) => {
  return (
    <div className="space-y-6 text-right font-sans">
      <div className="bg-white rounded-3xl p-6 border border-[#E5E7EB] shadow-xs">
        <div className="flex items-center gap-3 pb-5 border-b border-[#E5E7EB]">
          <div className="w-12 h-12 rounded-2xl bg-[#D62828]/10 text-[#D62828] flex items-center justify-center">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#111111] font-['Cairo']">
              المرفقات والصور والمستندات الفنية
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              مستودع الوثائق، صور الفحص بالمسطرة، فواتير الشراء، وأذونات الاستبدال الموثقة
            </p>
          </div>
        </div>

        <div className="pt-6">
          <AttachmentsCenter
            serialNumber={data.product.serial_number}
            attachments={data.attachments || []}
            onRefresh={onRefresh}
          />
        </div>
      </div>
    </div>
  );
};
