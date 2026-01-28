
import React, { useState, useRef } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  AlertCircle, 
  ShieldCheck,
  CalendarDays,
  UserCircle,
  Clock,
  LayoutDashboard,
  Zap,
  UploadCloud,
  FileJson,
  X,
  FileCheck,
  Info,
  ChevronRight
} from 'lucide-react';
import { validateAndParseJSON } from './services/geminiService';
import { generateXLSX } from './services/excelService';
import { ProcessingResult, GroupedSession } from './types';

const JSON_TEMPLATE = {
  "studentName": "NOM PRENOM DU STAGIAIRE",
  "sessions": [
    {
      "date": "JJ/MM/AAAA",
      "startTime": "09:00",
      "endTime": "12:30",
      "module": "NOM DU MODULE DE FORMATION",
      "trainer": "NOM DU FORMATEUR",
      "hours": 3.5
    }
  ]
};

const App: React.FC = () => {
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    if (file.type !== "application/json" && !file.name.endsWith('.json')) {
      setError("Le fichier doit être au format .json uniquement.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = validateAndParseJSON(content);
        setResult(data);
        setFileName(file.name);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        setResult(null);
        setFileName(null);
      }
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(JSON_TEMPLATE, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "modele_planning.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const reset = () => {
    setResult(null);
    setFileName(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadXLSX = () => {
    if (result) {
      generateXLSX(result);
    }
  };

  const totalHours = result?.sessions.reduce((acc, s) => acc + s.hours, 0) || 0;
  
  const getGroupedSessions = (): GroupedSession[] => {
    if (!result) return [];
    const groups: Record<string, GroupedSession> = {};
    
    result.sessions.forEach(session => {
      const key = `${session.date}_${session.module}_${session.trainer}`;
      const timeStr = `${session.startTime}-${session.endTime}`;
      if (groups[key]) {
        groups[key].horaires += ` | ${timeStr}`;
        groups[key].heures += session.hours;
      } else {
        groups[key] = {
          date: session.date,
          horaires: timeStr,
          module: session.module,
          intervenant: session.trainer,
          heures: session.hours
        };
      }
    });
    return Object.values(groups);
  };

  const groupedData = getGroupedSessions();

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      <header className="bg-indigo-900 text-white shadow-lg sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2.5 rounded-xl backdrop-blur-sm border border-white/20">
              <LayoutDashboard size={28} className="text-indigo-200" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight leading-none uppercase">Hub Planning</h1>
              <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-[0.2em] mt-1">Générateur XLSX Haute Fidélité</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-800/50 rounded-lg border border-indigo-700/50">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span className="text-xs font-semibold text-indigo-100 uppercase">Traitement 100% Local</span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-6 md:p-10 space-y-10">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight italic">Planning Prévisionnel</h2>
            <p className="text-slate-500 mt-1 font-medium">Glissez votre fichier de données pour générer le document.</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={downloadTemplate}
              className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-indigo-600 font-bold text-xs hover:shadow-sm transition-all flex items-center gap-2"
            >
              <FileJson size={14} /> Télécharger le modèle
            </button>
            {result && (
              <button
                onClick={reset}
                className="px-6 py-3 rounded-2xl bg-white border border-slate-200 text-slate-600 font-bold text-sm hover:shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <X size={16} /> Changer de fichier
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Zone d'Upload */}
          <div className="lg:col-span-5 space-y-6">
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative bg-white rounded-[2.5rem] border-4 border-dashed p-10 
                flex flex-col items-center justify-center text-center cursor-pointer 
                transition-all duration-300 min-h-[350px] shadow-xl
                ${isDragging ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50/50'}
                ${fileName ? 'border-emerald-200 bg-emerald-50/20' : ''}
              `}
            >
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
              />
              
              {!fileName ? (
                <>
                  <div className="w-20 h-20 bg-indigo-50 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner transition-transform group-hover:scale-110">
                    <UploadCloud size={40} className="text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-black text-slate-800 mb-2">Déposer le JSON</h3>
                  <p className="text-slate-400 font-medium text-xs max-w-[200px] leading-relaxed">
                    Glissez-déposez ou cliquez pour parcourir vos fichiers
                  </p>
                </>
              ) : (
                <>
                  <div className="w-20 h-20 bg-emerald-100 rounded-[1.5rem] flex items-center justify-center mb-6 shadow-inner animate-in zoom-in">
                    <FileCheck size={40} className="text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-black text-emerald-900 mb-1">Fichier prêt</h3>
                  <p className="text-emerald-700/60 font-mono text-[10px] break-all px-6">{fileName}</p>
                </>
              )}
            </div>

            {/* Aide au format */}
            <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3 mb-6 text-indigo-600">
                <Info size={20} />
                <h4 className="font-black text-xs uppercase tracking-widest">Structure Requise</h4>
              </div>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="mt-1"><ChevronRight size={14} className="text-indigo-300" /></div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-700">studentName</span> : Texte (ex: "JEAN DUPONT")
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="mt-1"><ChevronRight size={14} className="text-indigo-300" /></div>
                  <div className="text-xs">
                    <span className="font-bold text-slate-700">sessions</span> : Tableau d'objets [ ]
                  </div>
                </li>
                <li className="bg-slate-50 p-4 rounded-xl border border-slate-100 font-mono text-[10px] text-slate-500 leading-relaxed">
                  "date": "12/05/2024",<br/>
                  "startTime": "08:30",<br/>
                  "endTime": "12:30",<br/>
                  "module": "Agilité...",<br/>
                  "trainer": "MARC...",<br/>
                  "hours": 4
                </li>
              </ul>
            </div>
          </div>

          {/* Rendu Preview */}
          <div className="lg:col-span-7">
            {error && (
              <div className="bg-red-50 border-2 border-red-100 rounded-[2rem] p-10 text-center animate-in zoom-in duration-300 shadow-lg">
                <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle size={32} className="text-red-600" />
                </div>
                <h3 className="text-red-900 font-black text-xl mb-2">Structure Invalide</h3>
                <p className="text-red-700 font-medium mb-6 leading-relaxed">{error}</p>
                <button 
                  onClick={downloadTemplate}
                  className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-all"
                >
                  Télécharger le modèle correct
                </button>
              </div>
            )}

            {!result && !error && (
              <div className="bg-white/40 border-2 border-dashed border-slate-200 rounded-[3rem] p-20 flex flex-col items-center justify-center text-center">
                <div className="w-24 h-24 bg-white rounded-3xl shadow-lg shadow-slate-100 flex items-center justify-center mb-8 rotate-3">
                  <FileJson size={44} className="text-indigo-100" />
                </div>
                <h3 className="text-slate-800 font-black text-2xl mb-2">Aperçu indisponible</h3>
                <p className="text-slate-400 max-w-xs font-medium">Votre fichier doit respecter strictement le format JSON pour être traité par le moteur d'ingénierie.</p>
              </div>
            )}

            {result && (
              <div className="space-y-6 animate-in slide-in-from-right duration-500">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="flex items-center gap-3 mb-2 text-slate-400">
                      <UserCircle size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Stagiaire</span>
                    </div>
                    <p className="text-2xl font-black text-slate-800 truncate">{result.studentName}</p>
                    <div className="absolute -bottom-2 -right-2 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                      <UserCircle size={100} />
                    </div>
                  </div>
                  <div className="bg-indigo-600 p-8 rounded-[2rem] shadow-xl shadow-indigo-100 text-white relative overflow-hidden group">
                    <div className="flex items-center gap-3 mb-2 text-indigo-200">
                      <Clock size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Charge Horaire</span>
                    </div>
                    <p className="text-3xl font-black">{totalHours} <span className="text-lg opacity-70">H</span></p>
                    <div className="absolute top-4 right-4 opacity-20">
                       <Zap size={40} className="animate-pulse" />
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
                  <div className="px-8 py-7 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                        <CalendarDays size={20} className="text-indigo-400" />
                      </div>
                      <div>
                        <h4 className="font-black text-slate-800">Aperçu du Planning</h4>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{groupedData.length} modules agrégés</p>
                      </div>
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[400px]">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/50 text-slate-400 uppercase text-[10px] font-black border-b border-slate-100 sticky top-0 bg-white z-10">
                        <tr>
                          <th className="px-8 py-4 text-left">Date & Horaires</th>
                          <th className="px-8 py-4 text-left">Détail du Module</th>
                          <th className="px-8 py-4 text-right">Durée</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {groupedData.map((row, i) => (
                          <tr key={i} className="hover:bg-indigo-50/20 transition-colors">
                            <td className="px-8 py-5">
                              <div className="font-bold text-slate-800">{row.date}</div>
                              <div className="text-[10px] font-medium text-slate-400">{row.horaires}</div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="font-semibold text-slate-700 leading-snug mb-1">{row.module}</div>
                              <div className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Intervenant : {row.intervenant}</div>
                            </td>
                            <td className="px-8 py-5 text-right font-black text-indigo-600">
                              {row.heures}h
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-8 bg-white border-t border-slate-50">
                    <button
                      onClick={handleDownloadXLSX}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-6 rounded-2xl shadow-xl shadow-emerald-100 flex items-center justify-center gap-4 transition-all hover:scale-[1.01] active:scale-95 uppercase tracking-[0.2em] text-sm"
                    >
                      <Download size={24} />
                      Exporter Planning Premium (.xlsx)
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-slate-200 py-12">
        <div className="max-w-7xl mx-auto px-10 flex flex-col md:flex-row items-center justify-between gap-8 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
          <div className="flex items-center gap-4">
             <div className="p-2 bg-emerald-50 rounded-lg">
                <FileCheck size={18} className="text-emerald-500" />
             </div>
             <span>Données chiffrées localement</span>
          </div>
          <div className="flex gap-10">
            <span className="text-indigo-400">Hub Planning v4.1</span>
            <span>Standards Qualiopi / OPCO</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
