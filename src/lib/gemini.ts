import { GoogleGenAI, Type, type FunctionDeclaration } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not defined. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: apiKey || '' });

export interface AgentContext {
  protocol?: {
    name: string;
    personality: string;
    instructions: string;
    dbSource: string;
    welcomeMessage: string;
    tools: string[];
  };
  // Legacy fields for backward compatibility or simple agents
  role?: 'recruiter' | 'follow-up' | 'customer-service' | 'hr' | 'collections';
  knowledgeBase?: string;
  contactName: string;
  agentName?: string;
  tone?: string;
  templates?: { title: string; content: string }[];
}

const ROLES_PROMPTS = {
  'recruiter': "Eres un experto reclutador de talento. Tu objetivo es identificar habilidades, evaluar candidatos y agendar entrevistas. Sé profesional, alentador y claro. Puedes crear prospectos en el CRM y agendar citas en el calendario.",
  'follow-up': "Eres un especialista en seguimiento de clientes. Tu objetivo es asegurar la satisfacción del cliente después de una compra o servicio. Sé amable, servicial y proactivo. Puedes actualizar estados en el CRM y notificar al equipo por Slack.",
  'customer-service': "Eres un agente de soporte técnico y servicio al cliente. Resuelve problemas con paciencia y claridad. Usa la base de conocimientos proporcionada para dar respuestas exactas. Puedes escalar problemas a Slack.",
  'hr': "Eres un socio de negocios de Recursos Humanos. Maneja consultas sobre políticas de la empresa, beneficios y relaciones laborales con extremo profesionalismo y confidencialidad. Puedes agendar reuniones de seguimiento.",
  'collections': "Eres un gestor de cobranza. Tu objetivo es negociar planes de pago y recordar a los clientes saldos pendientes con firmeza pero respeto. Enfatiza las soluciones. Tienes acceso a la lista de morosos y puedes generar links de pago si Stripe está activo."
};

const createCRMClientTool: FunctionDeclaration = {
  name: "createCRMClient",
  description: "Crea un nuevo cliente o lead en el sistema CRM local.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Nombre completo del cliente" },
      email: { type: Type.STRING, description: "Correo electrónico" },
      phone: { type: Type.STRING, description: "Número de teléfono" },
      status: { type: Type.STRING, enum: ["lead", "active", "delinquent"], description: "Estado inicial del cliente" },
      notes: { type: Type.STRING, description: "Notas adicionales o contexto de la conversación" }
    },
    required: ["name", "status"]
  }
};

const updateCRMClientTool: FunctionDeclaration = {
  name: "updateCRMClient",
  description: "Actualiza la información de un cliente existente en el CRM.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "ID del cliente a actualizar" },
      status: { type: Type.STRING, enum: ["lead", "active", "delinquent", "closed"], description: "Nuevo estado del cliente" },
      notes: { type: Type.STRING, description: "Notas actualizadas o información recabada" },
      syncedWithCentral: { type: Type.BOOLEAN, description: "Si la información debe marcarse para sincronización inmediata" }
    },
    required: ["id"]
  }
};

const listCRMTool: FunctionDeclaration = {
  name: "listCRM",
  description: "Obtiene la lista de expedientes o clientes de la base de datos permitida por el protocolo.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      limit: { type: Type.NUMBER, description: "Cantidad máxima de registros a recuperar" }
    }
  }
};

const createWorkflowTool: FunctionDeclaration = {
  name: "createWorkflow",
  description: "Crea un nuevo flujo de trabajo (secuencia de pasos) para procesar con la central.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Nombre del flujo" },
      description: { type: Type.STRING, description: "Breve descripción" },
      steps: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Lista de pasos secuenciales"
      }
    },
    required: ["name", "steps"]
  }
};

const sendToCentralTool: FunctionDeclaration = {
  name: "sendToCentral",
  description: "Envía un registro o flujo de trabajo a la aplicación central para su procesamiento global.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      dataType: { type: Type.STRING, enum: ["client", "workflow"], description: "Tipo de dato a enviar" },
      id: { type: Type.STRING, description: "ID del recurso a sincronizar" }
    },
    required: ["dataType", "id"]
  }
};

const deleteCRMClientTool: FunctionDeclaration = {
  name: "deleteCRMClient",
  description: "Elimina un cliente del CRM si el usuario lo solicita.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "ID del cliente a eliminar" }
    },
    required: ["id"]
  }
};

const updateWorkflowStatusTool: FunctionDeclaration = {
  name: "updateWorkflowStatus",
  description: "Actualiza el estado de un flujo de trabajo.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "ID del flujo de trabajo" },
      status: { type: Type.STRING, enum: ["draft", "active", "archived"], description: "Nuevo estado" }
    },
    required: ["id", "status"]
  }
};

const scheduleMeetingTool: FunctionDeclaration = {
  name: "scheduleMeeting",
  description: "Agenda una reunión o cita en el calendario vinculado.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Título de la reunión" },
      startTime: { type: Type.STRING, description: "Fecha y hora de inicio (formato ISO)" },
      durationMinutes: { type: Type.NUMBER, description: "Duración en minutos" },
      attendeeEmail: { type: Type.STRING, description: "Email del asistente" }
    },
    required: ["title", "startTime"]
  }
};

const getAdsPerformanceTool: FunctionDeclaration = {
  name: "getAdsPerformance",
  description: "Obtiene un reporte rápido del rendimiento de las campañas de Meta Ads.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      period: { type: Type.STRING, enum: ["today", "last_7_days", "this_month"], description: "Periodo del reporte" }
    },
    required: ["period"]
  }
};

const sendSlackNotificationTool: FunctionDeclaration = {
  name: "sendSlackNotification",
  description: "Envía una notificación al workspace de Slack vinculado.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      channel: { type: Type.STRING, description: "Canal de Slack" },
      message: { type: Type.STRING, description: "Contenido del mensaje" }
    },
    required: ["message"]
  }
};

export async function getAgentResponse(message: string, context: AgentContext, history: { role: 'user' | 'assistant', text: string }[]) {
  if (!apiKey) return { text: "Los servicios de IA no están disponibles (falta la clave API)." };

  let systemInstruction = "";

  if (context.protocol) {
    systemInstruction = `
      PROTOCOLO ACTIVO: ${context.protocol.name}
      
      PERSONALIDAD Y COMPORTAMIENTO:
      ${context.protocol.personality}
      
      INSTRUCCIONES ESPECÍFICAS:
      ${context.protocol.instructions}
      
      ACCESO A DATOS CENTRALES:
      Este agente tiene acceso a la base de datos de: ${context.protocol.dbSource}.
      Cualquier información recabada debe ser usada para actualizar el expediente del cliente si corresponde.
      
      MENSAJE DE BIENVENIDA (para referencia):
      ${context.protocol.welcomeMessage}
    `;
  } else {
    // Fallback to legacy structure
    const role = context.role || 'customer-service';
    const templatesStr = context.templates?.map(t => `- ${t.title}: ${t.content}`).join('\n') || 'No hay plantillas definidas.';
    systemInstruction = `
      ${ROLES_PROMPTS[role]}
      
      IDENTIDAD:
      Tu nombre es ${context.agentName || 'el asistente'}. 
      Estilo de comunicación: ${context.tone || 'profesional'}.
      
      BASE DE CONOCIMIENTO / CONTEXTO:
      ${context.knowledgeBase}
      
      PLANTILLAS DE REFERENCIA:
      ${templatesStr}
    `;
  }

  systemInstruction += `
    
    Estás chateando con: ${context.contactName}
    
    REGLAS ESTRICTAS:
    1. Responde SIEMPRE en español.
    2. Mantén las respuestas concisas y aptas para WhatsApp (párrafos cortos, usa emojis cuando sea apropiado).
    3. Si el usuario te pide registrar algo en el sistema o crear un proceso, usa las herramientas disponibles.
    4. Siempre prioriza la continuidad del trabajo basándote en la memoria de la conversación proporcionada.
  `;

  // Filter tools based on protocol
  const allTools = [
    createCRMClientTool, 
    updateCRMClientTool,
    listCRMTool,
    createWorkflowTool, 
    sendToCentralTool, 
    deleteCRMClientTool, 
    updateWorkflowStatusTool,
    scheduleMeetingTool,
    getAdsPerformanceTool,
    sendSlackNotificationTool
  ];

  const enabledTools = context.protocol 
    ? allTools.filter(t => context.protocol!.tools.includes(t.name))
    : allTools;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        ...history.map(h => ({ role: h.role === 'assistant' ? 'model' : 'user', parts: [{ text: h.text }] })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: enabledTools.length > 0 ? [{ functionDeclarations: enabledTools }] : undefined
      },
    });

    return {
      text: response.text || "Procesando solicitud...",
      toolCalls: response.functionCalls
    };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "El agente neural está experimentando interferencias. Por favor, reintente." };
  }
}
