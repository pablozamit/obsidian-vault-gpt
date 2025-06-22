import React, { useState } from 'react';
import { Bot, Copy, ExternalLink, Code, Settings, Zap, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const CustomGPTDocs: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const apiEndpoint = `${window.location.origin}/api/knowledge-search`;
  
  const systemPrompt = `Eres un asistente de IA especializado que tiene acceso a la base de conocimiento personal del usuario a través de su vault de Obsidian. 

INSTRUCCIONES IMPORTANTES:
1. Siempre busca información relevante en la base de conocimiento antes de responder
2. Cita las fuentes específicas cuando uses información de las notas
3. Si no encuentras información relevante, indícalo claramente
4. Combina la información de múltiples notas cuando sea apropiado
5. Mantén un tono conversacional pero informativo

CAPACIDADES:
- Búsqueda semántica en cientos de notas de Obsidian
- Análisis de contenido markdown con tags y enlaces
- Síntesis de información de múltiples fuentes
- Respuestas contextualizadas basadas en el conocimiento personal

Para cada consulta, usa la función de búsqueda para encontrar notas relevantes y basa tu respuesta en esa información.`;

  const actionSchema = `{
  "openapi": "3.1.0",
  "info": {
    "title": "Obsidian Knowledge Base API",
    "description": "API para buscar y acceder a la base de conocimiento de Obsidian del usuario",
    "version": "v1.0.0"
  },
  "servers": [
    {
      "url": "${window.location.origin}"
    }
  ],
  "paths": {
    "/api/knowledge-search": {
      "post": {
        "description": "Busca información relevante en la base de conocimiento de Obsidian",
        "operationId": "searchKnowledge",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "query": {
                    "type": "string",
                    "description": "Consulta de búsqueda para encontrar notas relevantes"
                  },
                  "limit": {
                    "type": "integer",
                    "description": "Número máximo de resultados a devolver (default: 5)",
                    "default": 5
                  }
                },
                "required": ["query"]
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Resultados de búsqueda exitosos",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "results": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "title": {
                            "type": "string",
                            "description": "Título de la nota"
                          },
                          "content": {
                            "type": "string",
                            "description": "Contenido relevante de la nota"
                          },
                          "tags": {
                            "type": "array",
                            "items": {
                              "type": "string"
                            },
                            "description": "Tags asociados con la nota"
                          },
                          "relevance": {
                            "type": "number",
                            "description": "Puntuación de relevancia (0-1)"
                          },
                          "path": {
                            "type": "string",
                            "description": "Ruta del archivo en el vault"
                          }
                        }
                      }
                    },
                    "total": {
                      "type": "integer",
                      "description": "Total de resultados encontrados"
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`;

  const steps = [
    {
      title: "1. Crear Custom GPT",
      description: "Ve a ChatGPT y crea un nuevo Custom GPT",
      action: "Ir a ChatGPT",
      link: "https://chat.openai.com/gpts/editor"
    },
    {
      title: "2. Configurar Información Básica",
      description: "Configura el nombre, descripción y avatar de tu GPT",
      details: [
        "Nombre: 'Mi Asistente de Conocimiento Obsidian'",
        "Descripción: 'Asistente especializado en mi base de conocimiento personal'",
        "Sube un avatar relacionado con conocimiento o Obsidian"
      ]
    },
    {
      title: "3. Configurar Instructions (System Prompt)",
      description: "Copia y pega las instrucciones del sistema",
      copyable: true,
      content: systemPrompt
    },
    {
      title: "4. Configurar Actions",
      description: "Añade la acción para conectar con tu base de conocimiento",
      copyable: true,
      content: actionSchema
    },
    {
      title: "5. Configurar Endpoint",
      description: "Asegúrate de que tu aplicación esté desplegada y accesible",
      details: [
        `URL del endpoint: ${apiEndpoint}`,
        "La aplicación debe estar ejecutándose y accesible públicamente",
        "Considera usar ngrok para desarrollo local"
      ]
    },
    {
      title: "6. Probar y Publicar",
      description: "Prueba tu Custom GPT y publícalo",
      details: [
        "Haz preguntas de prueba sobre tu conocimiento",
        "Verifica que las respuestas incluyan información de tus notas",
        "Publica como 'Solo yo' o 'Cualquiera con el enlace'"
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Bot className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Integración Custom GPT</h2>
              <p className="text-gray-600">Conecta tu base de conocimiento con ChatGPT</p>
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8">
          <div className="flex items-start space-x-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Zap className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Qué es un Custom GPT?</h3>
              <p className="text-gray-700 mb-4">
                Un Custom GPT te permite crear una versión personalizada de ChatGPT que puede acceder 
                a tu base de conocimiento de Obsidian. Esto significa que podrás hacer preguntas complejas 
                como "dame un plan completo de dieta, ejercicio y suplementación para maximizar mi testosterona" 
                y el GPT responderá basándose específicamente en tus notas personales.
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-medium">
                  Búsqueda Inteligente
                </span>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  Respuestas Contextualizadas
                </span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  Citas de Fuentes
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-xl border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                    <p className="text-gray-600">{step.description}</p>
                  </div>
                </div>
                
                {step.link && (
                  <a
                    href={step.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>{step.action}</span>
                  </a>
                )}
              </div>

              {step.details && (
                <div className="ml-11 space-y-2">
                  {step.details.map((detail, detailIndex) => (
                    <div key={detailIndex} className="flex items-center space-x-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{detail}</span>
                    </div>
                  ))}
                </div>
              )}

              {step.copyable && step.content && (
                <div className="ml-11 mt-4">
                  <div className="relative">
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm overflow-x-auto max-h-64">
                      <code>{step.content}</code>
                    </pre>
                    <button
                      onClick={() => copyToClipboard(step.content!, `step-${index}`)}
                      className="absolute top-2 right-2 p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {copiedSection === `step-${index}` ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* API Implementation Note */}
        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <Code className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="text-lg font-semibold text-amber-900 mb-2">Implementación del API</h4>
              <p className="text-amber-800 mb-4">
                Para que el Custom GPT funcione, necesitas implementar el endpoint `/api/knowledge-search` 
                en tu aplicación. Este endpoint debe:
              </p>
              <ul className="space-y-2 text-amber-800">
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-amber-600" />
                  <span>Recibir consultas de búsqueda del GPT</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-amber-600" />
                  <span>Buscar en tu base de conocimiento sincronizada</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-amber-600" />
                  <span>Devolver resultados relevantes con metadatos</span>
                </li>
                <li className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-amber-600" />
                  <span>Manejar autenticación y rate limiting</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Testing Section */}
        <div className="mt-8 bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <Settings className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="text-lg font-semibold text-green-900 mb-2">Ejemplos de Consultas</h4>
              <p className="text-green-800 mb-4">
                Una vez configurado, podrás hacer preguntas como:
              </p>
              <div className="space-y-2">
                <div className="bg-white border border-green-200 rounded-lg p-3">
                  <p className="text-gray-800 italic">
                    "Dame un plan completo de dieta, ejercicio y suplementación para maximizar mi testosterona"
                  </p>
                </div>
                <div className="bg-white border border-green-200 rounded-lg p-3">
                  <p className="text-gray-800 italic">
                    "¿Cuáles son las mejores estrategias de productividad según mis notas?"
                  </p>
                </div>
                <div className="bg-white border border-green-200 rounded-lg p-3">
                  <p className="text-gray-800 italic">
                    "Resumir los conceptos clave sobre inversiones que he documentado"
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CustomGPTDocs;