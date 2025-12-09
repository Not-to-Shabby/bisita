import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import { 
  QrCode, 
  Download, 
  Copy, 
  Loader2, 
  MapPin, 
  Building2, 
  Calendar,
  Check
} from 'lucide-react';
import QRCode from "react-qr-code";
import { attractionsApi, businessesApi, eventsApi, Attraction, Business, Event } from '../../services/api';

type ItemType = 'attraction' | 'business' | 'event';

interface Item {
  id: string;
  name: string;
  type: ItemType;
}

const AdminQRGenerator: React.FC = () => {
  const navigate = useNavigate();
  const [activeType, setActiveType] = useState<ItemType>('attraction');
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [customPayload, setCustomPayload] = useState('');

  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchItems = async () => {
      setIsLoading(true);
      setItems([]);
      setSelectedItem(null);
      
      try {
        let data: Item[] = [];
        
        if (activeType === 'attraction') {
          const res = await attractionsApi.getAll();
          if (res.data?.attractions) {
            data = res.data.attractions.map((a: Attraction) => ({
              id: a._id,
              name: a.name,
              type: 'attraction'
            }));
          }
        } else if (activeType === 'business') {
          const res = await businessesApi.getAll({ limit: 100 });
          if (res.data?.businesses) {
            data = res.data.businesses.map((b: Business) => ({
              id: b._id,
              name: b.name,
              type: 'business'
            }));
          }
        } else if (activeType === 'event') {
          const res = await eventsApi.getAll();
          if (res.data?.events) {
            data = res.data.events.map((e: Event) => ({
              id: e._id,
              name: e.title,
              type: 'event'
            }));
          }
        }
        
        setItems(data.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (error) {
        console.error('Failed to fetch items', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchItems();
  }, [activeType]);

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getQRValue = () => {
    if (!selectedItem) return '';
    const defaultPayload = `${selectedItem.type.toUpperCase()}:${selectedItem.id}`;
    if (customPayload.trim()) return customPayload.trim();
    return defaultPayload;
  };

  const handleSelectItem = (item: Item) => {
    setSelectedItem(item);
    setCustomPayload('');
  };

  const handleCopyString = () => {
    const val = getQRValue();
    if (val) {
      navigator.clipboard.writeText(val);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadQR = () => {
    const svg = document.getElementById("qr-code-svg");
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx?.drawImage(img, 0, 0);
        const pngFile = canvas.toDataURL("image/png");
        const downloadLink = document.createElement("a");
        downloadLink.download = `QR-${selectedItem?.name.replace(/\s+/g, '-')}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      };
      img.src = "data:image/svg+xml;base64," + btoa(svgData);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Header showBack title="QR Code Generator" />

      <div className="max-w-4xl mx-auto p-6 pt-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Left Column: Controls */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h2 className="font-bold text-lg mb-4">1. Select Type</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveType('attraction')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-2 transition-all ${
                    activeType === 'attraction' 
                      ? 'bg-sky-500 text-white shadow-md' 
                      : 'bg-gray-50 text-slate-600 hover:bg-gray-100'
                  }`}
                >
                  <MapPin size={20} />
                  Attraction
                </button>
                <button
                  onClick={() => setActiveType('business')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-2 transition-all ${
                    activeType === 'business' 
                      ? 'bg-green-500 text-white shadow-md' 
                      : 'bg-gray-50 text-slate-600 hover:bg-gray-100'
                  }`}
                >
                  <Building2 size={20} />
                  Business
                </button>
                <button
                  onClick={() => setActiveType('event')}
                  className={`flex-1 py-3 rounded-xl font-medium text-sm flex flex-col items-center gap-2 transition-all ${
                    activeType === 'event' 
                      ? 'bg-orange-500 text-white shadow-md' 
                      : 'bg-gray-50 text-slate-600 hover:bg-gray-100'
                  }`}
                >
                  <Calendar size={20} />
                  Event
                </button>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-[400px] flex flex-col">
              <h2 className="font-bold text-lg mb-4">2. Select Item</h2>
              
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 mb-4 outline-none focus:ring-2 focus:ring-sky-500"
              />

              {isLoading ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${
                          selectedItem?.id === item.id
                            ? 'bg-slate-900 text-white shadow-md'
                            : 'hover:bg-gray-50 text-slate-700'
                        }`}
                      >
                        <span className="font-medium truncate">{item.name}</span>
                        {selectedItem?.id === item.id && <Check size={16} />}
                      </button>
                    ))
                  ) : (
                    <div className="text-center text-slate-400 py-8">
                      No items found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Preview */}
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-sky-500 via-purple-500 to-orange-500"></div>
              
              {selectedItem ? (
                <>
                  <div className="bg-white p-4 rounded-2xl shadow-inner border border-gray-100 mb-6">
                    <QRCode
                      id="qr-code-svg"
                      value={getQRValue()}
                      size={200}
                      level="H"
                      fgColor="#0f172a"
                    />
                  </div>

                  <div className="w-full bg-gray-50 p-3 rounded-xl border border-gray-200 mb-4 space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Custom QR payload</label>
                    <input
                      type="text"
                      value={customPayload}
                      onChange={(e) => setCustomPayload(e.target.value)}
                      placeholder="Leave blank to use default TYPE:ID"
                      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Use the exact quest task code here (e.g., <span className="font-mono">BisitaIligan</span>) so the scanner matches backend <span className="font-mono">qrCodeData</span>.
                    </p>
                  </div>
                  
                  <h3 className="text-xl font-bold text-slate-900 text-center mb-1">
                    {selectedItem.name}
                  </h3>
                  <p className="text-slate-500 text-sm uppercase tracking-wider font-bold mb-6">
                    {selectedItem.type}
                  </p>

                  <div className="w-full bg-gray-50 p-3 rounded-xl flex items-center justify-between border border-gray-200 mb-4">
                    <code className="text-xs text-slate-600 font-mono truncate flex-1 mr-2">
                      {getQRValue()}
                    </code>
                    <button 
                      onClick={handleCopyString}
                      className="p-2 hover:bg-white rounded-lg transition-colors text-slate-500 hover:text-sky-600"
                      title="Copy String"
                    >
                      {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                    </button>
                  </div>

                  <button
                    onClick={downloadQR} // Note: SVG to PNG download is tricky in pure JS without canvas, simplified here
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors"
                  >
                    <Download size={20} />
                    Download PNG
                  </button>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    Right-click QR code to save as SVG
                  </p>
                </>
              ) : (
                <div className="text-center text-slate-400">
                  <QrCode size={64} className="mx-auto mb-4 opacity-20" />
                  <p>Select an item to generate QR code</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-sm text-blue-800">
              <p className="font-bold mb-1 flex items-center gap-2">
                <Check size={16} />
                How to use
              </p>
              <p className="opacity-80">
                1. Generate and print this QR code.<br/>
                2. Place it at the physical location.<br/>
                3. In the Quest Editor, create a task that requires scanning this code.<br/>
                4. Paste the code string (e.g., <code>ATTRACTION:123...</code>) into the task definition.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminQRGenerator;
