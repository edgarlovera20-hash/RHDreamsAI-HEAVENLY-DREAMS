import React, { useState, useEffect } from 'react';
import { 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  X,
  Lock,
  Wifi,
  ShieldCheck,
  Cpu,
  Zap,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { Button, Card, CyberIcon } from './UI';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface WhatsAppConnectorProps {
  userId: string;
  onClose: () => void;
  onConnected: () => void;
}

export const WhatsAppConnector: React.FC<WhatsAppConnectorProps> = ({ userId, onClose, onConnected }) => {
  const [step, setStep] = useState<'intro' | 'qr' | 'pairing' | 'success'>('intro');
  const [qrValue, setQrValue] = useState('');
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (step === 'qr') {
      // Generate a mock secure session token
      setQrValue(`wa_session_${Math.random().toString(36).substring(2)}_${Date.now()}`);
      
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setQrValue(`wa_session_${Math.random().toString(36).substring(2)}_${Date.now()}`);
            return 60;
          }
          return prev - 1;
        });
      }, 1000);

      // Simulate auto-scan after 8 seconds
      const scanTimeout = setTimeout(() => {
        setStep('pairing');
      }, 8000);

      return () => {
        clearInterval(interval);
        clearTimeout(scanTimeout);
      };
    }

    if (step === 'pairing') {
      const connectTimeout = setTimeout(async () => {
        try {
          const docId = `whatsapp_${Date.now()}_${Math.random().toString(36).substring(7)}`; // Generate unique ID
          await setDoc(doc(db, 'users', userId, 'integrations', docId), {
            service: 'whatsapp',
            status: 'connected',
            config: {
              deviceName: 'Terminal Neural WA-' + Math.floor(Math.random() * 1000),
              phoneNumber: '+52 ••• ••• ••' + Math.floor(Math.random() * 90 + 10),
              sessionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            },
            updatedAt: serverTimestamp()
          });
          setStep('success');
          setTimeout(() => {
            onConnected();
          }, 2000);
        } catch (err) {
          console.error(err);
          setStep('intro');
        }
      }, 3000);

      return () => clearTimeout(connectTimeout);
    }
  }, [step, userId, onConnected]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-tema-negro/95 backdrop-blur-3xl z-[200] flex items-center justify-center p-8 overflow-hidden"
    >
      {/* Background Effects */}
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-tema-neon/5 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-4xl w-full relative">
        <button 
          onClick={onClose}
          className="absolute -top-16 right-0 p-3 text-tema-texto/20 hover:text-tema-neon transition-all hover:scale-110 active:scale-95"
        >
          <X size={32} />
        </button>

        <div className="panel-de-vidrio overflow-hidden shadow-[0_0_100px_rgba(3,154,220,0.2)] relative group">
          <div className="grid grid-cols-1 md:grid-cols-2">
            
            {/* Left Side: Instructions */}
            <div className="p-12 bg-tema-negro/40 border-r border-tema-electrico/10 relative">
              <div className="flex items-center gap-6 mb-12">
                <CyberIcon color="#10b981" size="lg">
                  <Smartphone size={28} />
                </CyberIcon>
                <div>
                  <h3 className="text-2xl font-bold text-tema-texto uppercase tracking-tighter leading-none">VÍNCULO WHATSAPP</h3>
                  <p className="text-[10px] text-tema-matriz font-bold tracking-widest uppercase mt-2">Protocolo de Enlace Seguro</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-6">
                  {[
                    "Abre WhatsApp en tu dispositivo móvil",
                    "Accede al menú de Configuración / Dispositivos",
                    "Selecciona 'Vincular un dispositivo' en tu terminal",
                    "Sincroniza la cámara con el código neural QR"
                  ].map((text, i) => (
                    <div key={i} className="flex gap-6 items-start group/step">
                      <span className="w-8 h-8 rounded-xl bg-tema-neon/10 border border-tema-neon/20 text-xs font-bold text-tema-neon flex items-center justify-center shrink-0 mt-0.5 group-hover/step:bg-tema-neon group-hover/step:text-tema-negro transition-all">
                        {i + 1}
                      </span>
                      <p className="text-sm text-tema-texto/60 font-medium leading-relaxed group-hover/step:text-tema-texto transition-colors">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="pt-10 border-t border-tema-electrico/10 space-y-6">
                  <div className="flex items-center gap-3 text-xs text-tema-matriz font-bold uppercase tracking-wider bg-tema-matriz/5 p-3 rounded-xl border border-tema-matriz/10 w-fit">
                    <ShieldCheck size={16} /> ENCRIPTACIÓN PUNTO A PUNTO (E2EE)
                  </div>
                  <p className="text-xs text-tema-texto/30 font-medium italic leading-relaxed">
                    Toda comunicación está protegida por protocolos militares. El sistema solo accede a los metadatos necesarios para la automatización neural de su flujo de trabajo.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Side: QR Area */}
            <div className="p-12 flex flex-col items-center justify-center bg-tema-negro/60 relative overflow-hidden">
              <div className="absolute inset-0 grid-bg opacity-5" />
              
              <AnimatePresence mode="wait">
                {step === 'intro' && (
                  <motion.div 
                    key="intro"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.1, y: -20 }}
                    className="text-center relative z-10"
                  >
                    <div className="w-24 h-24 bg-tema-neon/5 rounded-3xl flex items-center justify-center mx-auto mb-10 text-tema-neon border border-tema-neon/20 shadow-[0_0_40px_rgba(3,154,220,0.1)] group/qr">
                       <QrCode size={48} className="animate-pulse group-hover:scale-110 transition-transform" />
                    </div>
                    <h4 className="text-2xl font-bold text-tema-texto mb-3 uppercase tracking-tighter">TERMINAL LISTA</h4>
                    <p className="text-xs text-tema-texto/40 mb-12 max-w-[240px] mx-auto font-medium leading-relaxed">Inicie la generación del token dinámico QR para establecer la sincronización.</p>
                    <Button onClick={() => setStep('qr')} className="w-full py-5 text-xs font-bold uppercase tracking-widest shadow-[0_0_30px_rgba(3,154,220,0.2)]">GENERAR TOKEN QR</Button>
                  </motion.div>
                )}

                {step === 'qr' && (
                  <motion.div 
                    key="qr"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center relative z-10"
                  >
                    <div className="p-6 bg-white rounded-3xl relative mb-10 shadow-[0_0_50px_rgba(255,255,255,0.1)] group/canvas">
                      <QRCodeSVG value={qrValue} size={240} level="H" includeMargin={false} />
                      {/* Scanning Animation */}
                      <div className="absolute inset-0 border-tema-neon/40 overflow-hidden pointer-events-none rounded-3xl">
                         <div className="h-0.5 w-full bg-tema-neon shadow-[0_0_20px_rgba(3,154,220,0.8)] absolute top-0 animate-scanner-cyber" />
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center gap-4">
                      <div className="flex items-center gap-3 text-xs font-bold text-tema-neon uppercase tracking-widest">
                        <Activity size={16} className="animate-pulse" />
                        <span>Sincronizando...</span>
                      </div>
                      <div className="w-full h-1 bg-tema-electrico/10 rounded-full overflow-hidden">
                         <motion.div 
                            initial={{ width: "100%" }}
                            animate={{ width: "0%" }}
                            transition={{ duration: 60, ease: "linear" }}
                            className="h-full bg-tema-neon shadow-[0_0_10px_rgba(3,154,220,0.5)]" 
                         />
                      </div>
                      <span className="text-[10px] font-mono text-tema-texto/40 font-bold">RESET: {timer}s</span>
                    </div>
                  </motion.div>
                )}

                {step === 'pairing' && (
                  <motion.div 
                    key="pairing"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center relative z-10"
                  >
                    <div className="mb-10 relative">
                       <Cpu size={64} className="text-tema-neon animate-pulse mx-auto" />
                       <Zap size={24} className="text-tema-neon absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-ping" />
                    </div>
                    <h4 className="text-2xl font-bold text-tema-texto mb-3 uppercase tracking-tighter">VERIFICANDO HANDSHAKE</h4>
                    <p className="text-xs text-tema-texto/40 max-w-[240px] mx-auto font-medium leading-relaxed">Estableciendo túnel cuántico encriptado con WhatsApp Business Central API...</p>
                  </motion.div>
                )}

                {step === 'success' && (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center relative z-10"
                  >
                    <div className="w-24 h-24 bg-tema-matriz/10 rounded-full flex items-center justify-center mx-auto mb-10 text-tema-matriz border border-tema-matriz/20 shadow-[0_0_40px_rgba(34,197,94,0.1)]">
                       <CheckCircle2 size={48} />
                    </div>
                    <h4 className="text-2xl font-bold text-tema-texto mb-3 uppercase tracking-tighter">CONEXIÓN ESTABLECIDA</h4>
                    <p className="text-xs text-tema-texto/40 font-medium tracking-wide">Redirigiendo a su consola de mando neural...</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Security Badge */}
              <div className="absolute bottom-8 flex items-center gap-3 px-6 py-2 bg-tema-negro/40 rounded-full border border-tema-electrico/10 backdrop-blur-md">
                <Lock size={12} className="text-tema-texto/20" />
                <span className="text-[9px] font-bold text-tema-texto/30 uppercase tracking-widest">SECURE_TUNNEL_v4.4_ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
