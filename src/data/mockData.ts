export const MOCK_JOBS = [
  { id: '1', title: 'Senior Frontend Node + React', department: 'Engineering', location: 'Remote', status: 'Active', applicants: 45, platforms: ['LinkedIn', 'Indeed'], timeToHire: 18 },
  { id: '2', title: 'Product Manager', department: 'Product', location: 'Madrid, Spain', status: 'Active', applicants: 12, platforms: ['LinkedIn'], timeToHire: null },
  { id: '3', title: 'UX/UI Designer', department: 'Design', location: 'Remote', status: 'Closed', applicants: 89, platforms: ['Dribbble', 'LinkedIn'], timeToHire: 21 },
  { id: '4', title: 'DevOps Engineer', department: 'Engineering', location: 'Barcelona, Spain', status: 'Draft', applicants: 0, platforms: [], timeToHire: null }
];

export const CRM_STAGES = [
  "Nuevo",
  "Contactado",
  "Espera de respuesta",
  "Cita agendada",
  "Confirmó asistencia",
  "Entrevista realizada",
  "No asistió",
  "Reagendar",
  "DDO y bienvenida",
  "En capacitación",
  "Contratado",
  "Rechazado"
];

export const MOCK_CANDIDATES = [
  { 
    id: '1', name: 'Laura Gómez', age: 28, email: 'laura@example.com', phone: '+34 600 123 456', whatsapp: true, facebook: 'fb.com/laurag', 
    experienceTime: '5 años', lastJob: 'Frontend en TechCorp', role: 'Senior Frontend Node + React', job_id: '1',
    location: 'CDMX, Zona Centro', source: 'Facebook Ads', stage: 'Entrevista realizada', registrationDate: '2026-05-01',
    linkedin: 'linkedin.com/in/lauragomez', github: 'github.com/laurag', portfolio: 'lauragomez.dev', cvUrl: '#', rating: 4,
    appointment: { date: '2026-05-10', time: '10:00 AM', type: 'Técnica', modality: 'Virtual', link: 'meet.google.com/abc-defg', status: 'Realizada' },
    responsibles: { scheduledBy: 'Andrea López', interviewedBy: 'Carlos Méndez', recruiter: 'Luis Pérez', supervisor: 'Diana R.' },
    customAnswers: [
      { question: '¿Por qué te interesa esta posición?', answer: 'Me encanta la stack tecnológica y el producto.' }
    ],
    sourceIcon: 'Facebook'
  },
  { 
    id: '2', name: 'Carlos Ruiz', age: 34, email: 'carlos@example.com', phone: '+34 600 456 789', whatsapp: true, facebook: '',
    experienceTime: '8 años', lastJob: 'PM en StartUpX', role: 'Product Manager', job_id: '2',
    location: 'Barcelona, Spain', source: 'LinkedIn', stage: 'Contactado', registrationDate: '2026-05-04',
    linkedin: 'linkedin.com/in/carlosruiz', portfolio: '', cvUrl: '#', rating: 3,
    appointment: null,
    responsibles: { scheduledBy: '', interviewedBy: '', recruiter: 'Luis Pérez', supervisor: 'Diana R.' },
    customAnswers: [],
    sourceIcon: 'Linkedin'
  },
  { 
    id: '3', name: 'Ana Martínez', age: 26, email: 'ana.m@example.com', phone: '+34 600 000 111', whatsapp: true, facebook: 'fb.com/anam',
    experienceTime: '3 años', lastJob: 'Freelance UI', role: 'UX Designer', job_id: '3',
    location: 'Remote', source: 'Instagram', stage: 'Contratado', registrationDate: '2026-04-15',
    linkedin: 'linkedin.com/in/anamartinez', portfolio: 'behance.net/anam', cvUrl: '#', rating: 5,
    appointment: { date: '2026-04-28', time: '12:00 PM', type: 'Final', modality: 'Virtual', link: 'zoom.us/j/123', status: 'Realizada' },
    responsibles: { scheduledBy: 'María Gómez', interviewedBy: 'Diana R.', recruiter: 'María Gómez', supervisor: 'Diana R.' },
    customAnswers: [],
    sourceIcon: 'Image'
  },
  { 
    id: '4', name: 'David Smith', age: 22, email: 'david@example.com', phone: '+34 600 222 333', whatsapp: true, facebook: '',
    experienceTime: '1 año', lastJob: 'Trainee IT', role: 'DevOps Engineer', job_id: '4',
    location: 'Madrid, Spain', source: 'WhatsApp', stage: 'Nuevo', registrationDate: '2026-05-06',
    linkedin: 'linkedin.com/in/davidsmith', portfolio: '', cvUrl: '#', rating: 0,
    appointment: null,
    responsibles: { scheduledBy: '', interviewedBy: '', recruiter: 'Andrea López', supervisor: 'Diana R.' },
    customAnswers: [],
    sourceIcon: 'MessageCircle'
  },
  { 
    id: '5', name: 'Elena Rojas', age: 30, email: 'elena@example.com', phone: '+34 600 444 555', whatsapp: false, facebook: 'fb.com/erojas',
    experienceTime: '6 años', lastJob: 'DevOps Sr', role: 'Senior Frontend', job_id: '1',
    location: 'Valencia, Spain', source: 'Referido', stage: 'Cita agendada', registrationDate: '2026-05-05',
    linkedin: 'linkedin.com/in/elenarojas', github: 'github.com/erojas', portfolio: '', cvUrl: '#', rating: 4,
    appointment: { date: '2026-05-08', time: '4:00 PM', type: 'Cultural Fit', modality: 'Presencial', link: 'Oficina Central, Piso 4', status: 'Pendiente' },
    responsibles: { scheduledBy: 'Luis Pérez', interviewedBy: '', recruiter: 'Luis Pérez', supervisor: 'Diana R.' },
    customAnswers: [],
    sourceIcon: 'User'
  },
  { 
    id: '6', name: 'Javier Pons', age: 29, email: 'javi@example.com', phone: '+34 600 666 777', whatsapp: true, facebook: '',
    experienceTime: '4 años', lastJob: 'PO Analytics', role: 'Product Manager', job_id: '2',
    location: 'Madrid, Spain', source: 'Job Board', stage: 'En capacitación', registrationDate: '2026-04-20',
    linkedin: 'linkedin.com/in/javierpons', portfolio: '', cvUrl: '#', rating: 5,
    appointment: { date: '2026-04-25', time: '9:00 AM', type: 'Final', modality: 'Virtual', link: 'meet.google.com/xyz', status: 'Realizada' },
    responsibles: { scheduledBy: 'Andrea López', interviewedBy: 'Carlos Méndez', recruiter: 'Andrea López', supervisor: 'Diana R.' },
    customAnswers: [],
    sourceIcon: 'Globe'
  },
];

export const FUNNEL_DATA = [
  { stage: 'Aplicaron', count: 146, conversion: 100 },
  { stage: 'Screening', count: 45, conversion: 30.8 },
  { stage: 'Entrevistas', count: 18, conversion: 40.0 },
  { stage: 'Prueba Técnica', count: 8, conversion: 44.4 },
  { stage: 'Ofertas', count: 3, conversion: 37.5 },
  { stage: 'Contratados', count: 2, conversion: 66.6 },
];

export const PERFORMANCE_DATA = [
  { name: 'Ene', hires: 4, timeToHire: 35 },
  { name: 'Feb', hires: 3, timeToHire: 32 },
  { name: 'Mar', hires: 5, timeToHire: 28 },
  { name: 'Abr', hires: 2, timeToHire: 38 },
  { name: 'May', hires: 6, timeToHire: 25 },
  { name: 'Jun', hires: 4, timeToHire: 27 },
];

export const CANDIDATES_PER_JOB_DATA = [
  { name: 'Frontend', count: 45 },
  { name: 'Product Manager', count: 12 },
  { name: 'UX Designer', count: 89 },
];

export const MOCK_AGENTS = [
  {
    id: 'ag-1',
    name: 'Sourcing Bot Alfa',
    role: 'Sourcing & Outreach',
    status: 'Active',
    description: 'Busca candidatos pasivos en LinkedIn y envía el primer mensaje de contacto.',
    channels: ['LinkedIn', 'Email'],
    memory: '1.2 GB',
    conversations: 154,
    successRate: '28%',
    avatarColor: 'bg-blue-500'
  },
  {
    id: 'ag-2',
    name: 'Eva - Resume Screener',
    role: 'Screening',
    status: 'Active',
    description: 'Analiza CVs entrantes y los clasifica según el JD de la oferta.',
    channels: ['Plataforma ATS', 'Indeed', 'Email'],
    memory: '4.8 GB',
    conversations: 830,
    successRate: '95%',
    avatarColor: 'bg-purple-500'
  },
  {
    id: 'ag-3',
    name: 'Agendador Automático',
    role: 'Scheduling',
    status: 'Draft',
    description: 'Se encarga de cuadrar horarios entre reclutadores y candidatos por WhatsApp.',
    channels: ['WhatsApp', 'Google Calendar'],
    memory: '0 GB',
    conversations: 0,
    successRate: '-',
    avatarColor: 'bg-amber-500'
  }
];

export const MOCK_PREBUILT_TEMPLATES = [
  {
    id: 'tpl-1',
    name: 'Reclutador Tech Sr',
    description: 'Especializado en perfiles de desarrollo (React, Node, DevOps). Evalúa prueba técnica inicial.',
    icon: 'Code'
  },
  {
    id: 'tpl-2',
    name: 'Cazatalentos Ejecutivos',
    description: 'Tono formal y persuasivo. Busca perfiles C-level y VP en la industria.',
    icon: 'Briefcase'
  },
  {
    id: 'tpl-3',
    name: 'Asistente de Inclusión',
    description: 'Revisa descripciones de trabajo y CVs para asegurar sesgo cero y promover diversidad.',
    icon: 'Users'
  }
];

export const AGENT_LOGS = [
  { date: '2026-05-06', time: '10:45 AM', agent: 'Sourcing Bot Alfa', action: 'Envió InMail a 15 candidatos para Frontend React.', type: 'outreach' },
  { date: '2026-05-06', time: '10:30 AM', agent: 'Eva - Resume Screener', action: 'Descartó 4 CVs para Product Manager (No cumplen 5 años de exp).', type: 'screening' },
  { date: '2026-05-05', time: '09:12 AM', agent: 'Eva - Resume Screener', action: 'Clasificó a Ana Martínez como Top 10% en fit cultural.', type: 'match' },
  { date: '2026-05-04', time: '08:00 AM', agent: 'Sourcing Bot Alfa', action: 'Aprendió un nuevo formato de búsqueda booleana (Memoria actualizada).', type: 'learning' },
];

