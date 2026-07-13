/* EstudioPro · Prototipo — Colores de materia + banco de preguntas de ejemplo (temario real). */

window.SUBJECT_COLORS = {
  "Legislación Militar": "#2F73CE",
  "Operaciones Militares": "#2A8A5E",
  "Normatividad Gubernamental": "#A0742A",
  "Aspecto Administrativo": "#7A57C2",
  "Adiestramiento y Mando Militar": "#C2410C",
  "Aspecto Técnico": "#0E7490",
};
// El color de materia sale del store editable si existe; si no, del valor por defecto.
window.subjColor = (s) => {
  try {
    const st = window.EPStore && window.EPStore.get && window.EPStore.get();
    if (st && st.subjects) { const m = st.subjects.find((x) => x.name === s); if (m && m.color) return m.color; }
  } catch (e) { /* store aún no listo */ }
  return window.SUBJECT_COLORS[s] || "#2F73CE";
};

/* Variantes oscurecidas de los colores de materia para cuando se usan como TEXTO pequeño
   (pasan WCAG AA 4.5:1 sobre blanco y tintes claros). Los puntos, barras y rellenos siguen
   usando subjColor() con el color brillante de identidad. En tema oscuro no se aplican:
   el color brillante ya contrasta sobre la superficie oscura. */
window.SUBJECT_TEXT_COLORS = {
  "Legislación Militar": "#2964B3",
  "Operaciones Militares": "#23734E",
  "Normatividad Gubernamental": "#815E22",
  "Aspecto Administrativo": "#734EBF",
  "Adiestramiento y Mando Militar": "#B53C0B",
  "Aspecto Técnico": "#0D6E89",
};
window.subjTextColor = (s) => {
  if (typeof document !== "undefined" && document.querySelector(".theme-dark")) return window.subjColor(s);
  return window.SUBJECT_TEXT_COLORS[s] || window.subjColor(s);
};

/* Etiqueta corta de materia para chips estrechos. La primera palabra sola es ambigua
   entre "Aspecto Administrativo" y "Aspecto Técnico", así que ahí se usa la segunda. */
window.subjShort = (s) => {
  const words = (s || "").split(" ");
  if (words[0] === "Aspecto" && words[1]) return words[1];
  return words[0] || s;
};

/* Banco de preguntas de ejemplo. type: OM (opción múltiple), VF (verdadero/falso), AB (abierta).
   status: ok=dominada, fall=fallada, nuevo=sin estudiar, imp=importante. */
window.QUESTION_BANK = [
  { id: "LM-001", subject: "Legislación Militar", ord: "Código de Justicia Militar", loc: "Libro Primero · Cap. I",
    type: "OM", dif: "medio", status: "ok", tags: ["delitos", "clasificación"],
    q: "Según el Código de Justicia Militar, ¿cómo se clasifican los delitos en razón de la voluntad del agente?",
    options: ["Intencionales y no intencionales (imprudenciales)", "Graves y no graves", "Comunes y federales", "Dolosos y de querella"],
    answer: 0,
    explain: "El CJM distingue los delitos en intencionales y no intencionales o de imprudencia, atendiendo a la voluntad del agente.",
    ref: "CJM, Libro Primero, Cap. I" },

  { id: "LM-002", subject: "Legislación Militar", ord: "Código de Justicia Militar", loc: "Título Octavo · Cap. I",
    type: "OM", dif: "difícil", status: "fall", tags: ["insubordinación"],
    q: "La insubordinación, conforme al CJM, se comete contra:",
    options: ["Un superior, en actos del servicio o con motivo de él", "Cualquier compañero de armas", "Una autoridad civil", "El personal de tropa subordinado"],
    answer: 0,
    explain: "La insubordinación se configura cuando se falta al respeto, amenaza o agrede a un superior en actos del servicio o con motivo de él.",
    ref: "CJM, Título Octavo, Cap. I" },

  { id: "LM-003", subject: "Legislación Militar", ord: "Ley de Disciplina del Ejto., F.A. y G.N.", loc: "Cap. III",
    type: "VF", dif: "fácil", status: "ok", tags: ["correctivos"],
    q: "El arresto es un correctivo disciplinario previsto en la Ley de Disciplina.",
    options: ["Verdadero", "Falso"], answer: 0,
    explain: "El arresto es uno de los correctivos disciplinarios contemplados para sancionar faltas a la disciplina militar.",
    ref: "Ley de Disciplina, Cap. III" },

  { id: "LM-004", subject: "Legislación Militar", ord: "Reglamento General de Deberes Militares", loc: "Título II · Cap. III",
    type: "AB", dif: "difícil", status: "nuevo", tags: ["deberes", "jefes"],
    q: "Explica el deber fundamental de un jefe respecto a la instrucción y disciplina de sus subordinados.",
    answer: "Velar por la instrucción, disciplina, moral y bienestar de sus subordinados, dando ejemplo y exigiendo el cumplimiento del deber.",
    explain: "El RGDM establece que el jefe debe procurar la instrucción y disciplina de su personal, siendo ejemplo permanente.",
    ref: "RGDM, Título II, Cap. III" },

  { id: "OP-001", subject: "Operaciones Militares", ord: "Manual de Operaciones Militares", loc: "Primera Parte · Cap. IV",
    type: "OM", dif: "medio", status: "imp", tags: ["niveles", "conducción"],
    q: "¿Cuáles son los niveles de conducción de las operaciones militares?",
    options: ["Estratégico, operacional y táctico", "Nacional, regional y local", "Alto, medio y bajo", "Ofensivo, defensivo y de seguridad"],
    answer: 0,
    explain: "El arte militar reconoce tres niveles de conducción: estratégico, operacional y táctico.",
    ref: "Manual de Operaciones Militares, 1a Parte, Cap. IV" },

  { id: "OP-002", subject: "Operaciones Militares", ord: "Manual de Logística Militar", loc: "Primera Parte · Cap. III",
    type: "OM", dif: "fácil", status: "nuevo", tags: ["logística", "principios"],
    q: "¿Cuál de los siguientes es un principio de la logística militar?",
    options: ["Oportunidad", "Sorpresa", "Masa", "Ofensiva"],
    answer: 0,
    explain: "La oportunidad es un principio logístico: el apoyo debe llegar en el momento y lugar requeridos. Sorpresa, masa y ofensiva son principios de la guerra.",
    ref: "Manual de Logística Militar, 1a Parte, Cap. III" },

  { id: "OP-003", subject: "Operaciones Militares", ord: "Manual de Operaciones Conjuntas", loc: "Cap. IV",
    type: "VF", dif: "medio", status: "fall", tags: ["conjuntas"],
    q: "Una operación conjunta implica la participación de dos o más Fuerzas Armadas bajo un mando único.",
    options: ["Verdadero", "Falso"], answer: 0,
    explain: "Las operaciones conjuntas integran a dos o más componentes (Ejército, Fuerza Aérea, Armada) bajo un mando conjunto único.",
    ref: "Manual de Operaciones Conjuntas, Cap. IV" },

  { id: "NG-001", subject: "Normatividad Gubernamental", ord: "Ley Nacional Sobre el Uso de la Fuerza", loc: "Disposiciones generales",
    type: "OM", dif: "medio", status: "ok", tags: ["uso-de-la-fuerza", "principios"],
    q: "¿Cuál es uno de los principios que rigen el uso de la fuerza conforme a la ley nacional?",
    options: ["Proporcionalidad", "Anticipación", "Sorpresa", "Economía de fuerzas"],
    answer: 0,
    explain: "La Ley Nacional Sobre el Uso de la Fuerza establece principios como legalidad, necesidad, proporcionalidad, racionalidad y oportunidad.",
    ref: "LNSUF, Disposiciones generales" },

  { id: "NG-002", subject: "Normatividad Gubernamental", ord: "Manual de Derechos Humanos para el Ejto. y F.A.M.", loc: "Cap. III",
    type: "OM", dif: "difícil", status: "nuevo", tags: ["ddhh", "obligaciones"],
    q: "Conforme al Art. 1° constitucional, ¿cuáles son las obligaciones del Estado en materia de derechos humanos?",
    options: ["Promover, respetar, proteger y garantizar", "Legislar, juzgar y ejecutar", "Vigilar y sancionar", "Difundir y capacitar"],
    answer: 0,
    explain: "El Art. 1° constitucional impone al Estado las obligaciones de promover, respetar, proteger y garantizar los derechos humanos.",
    ref: "Manual de DD.HH., Cap. III · CPEUM Art. 1°" },

  { id: "NG-003", subject: "Normatividad Gubernamental", ord: "Ley Gral. de Responsabilidades Administrativas", loc: "Libro Primero · Título III",
    type: "VF", dif: "medio", status: "imp", tags: ["faltas", "responsabilidades"],
    q: "El cohecho es considerado una falta administrativa grave de los servidores públicos.",
    options: ["Verdadero", "Falso"], answer: 0,
    explain: "La LGRA clasifica el cohecho entre las faltas administrativas graves de los servidores públicos.",
    ref: "LGRA, Libro Primero, Título III" },

  { id: "AA-001", subject: "Aspecto Administrativo", ord: "Guía del PMBOK (7a Ed.)", loc: "El Estándar · Principios",
    type: "OM", dif: "medio", status: "nuevo", tags: ["pmbok", "principios"],
    q: "¿Cuántos principios de la dirección de proyectos establece el Estándar del PMBOK 7a Edición?",
    options: ["12", "8", "5", "10"],
    answer: 0,
    explain: "El Estándar para la Dirección de Proyectos (PMBOK 7) define 12 principios; los dominios de desempeño son 8.",
    ref: "PMBOK 7a Ed., El Estándar" },

  { id: "AA-002", subject: "Aspecto Administrativo", ord: "Ley de Adquisiciones, Arrendamientos y Servicios", loc: "Título Segundo",
    type: "OM", dif: "difícil", status: "fall", tags: ["adquisiciones", "contratación"],
    q: "¿Cuál es la regla general de contratación en la Ley de Adquisiciones del Sector Público?",
    options: ["Licitación pública", "Adjudicación directa", "Invitación a tres", "Subasta inversa"],
    answer: 0,
    explain: "La regla general es la licitación pública; la invitación a cuando menos tres y la adjudicación directa son excepciones.",
    ref: "LAASSP, Título Segundo" },

  { id: "AMM-001", subject: "Adiestramiento y Mando Militar", ord: "Manual de Mando y Liderazgo Militar", loc: "Cap. IX",
    type: "OM", dif: "medio", status: "ok", tags: ["liderazgo", "principios"],
    q: "¿Cuál de los siguientes es un principio del mando y liderazgo militar?",
    options: ["Conócete a ti mismo y busca tu superación", "Centraliza toda decisión", "Evita delegar", "Prioriza la sanción sobre el estímulo"],
    answer: 0,
    explain: "Entre los principios del liderazgo militar está conocerse a sí mismo y buscar la superación personal constante.",
    ref: "Manual de Mando y Liderazgo, Cap. IX" },

  { id: "AT-001", subject: "Aspecto Técnico", ord: "Manual de Ciberseguridad y Ciberdefensa", loc: "Cap. II · Ciberespacio",
    type: "OM", dif: "medio", status: "imp", tags: ["ciberespacio", "capas"],
    q: "¿Cuáles son las capas que estructuran el ciberespacio?",
    options: ["Física, lógica y social", "Interna, externa y perimetral", "Hardware, software y red", "Local, nacional y global"],
    answer: 0,
    explain: "El ciberespacio se estructura en tres capas: física, lógica (sintáctica) y social (cibernético-persona).",
    ref: "Manual de Ciberseguridad y Ciberdefensa, Cap. II" },

  { id: "AT-002", subject: "Aspecto Técnico", ord: "Manual de Ciberseguridad y Ciberdefensa", loc: "Cap. III · Ciberseguridad",
    type: "VF", dif: "fácil", status: "nuevo", tags: ["ciberseguridad", "cia"],
    q: "La confidencialidad, integridad y disponibilidad son pilares de la seguridad de la información.",
    options: ["Verdadero", "Falso"], answer: 0,
    explain: "La tríada CIA (confidencialidad, integridad y disponibilidad) es la base de la seguridad de la información.",
    ref: "Manual de Ciberseguridad y Ciberdefensa, Cap. III" },
];

window.TYPE_LABEL = { OM: "Opción múltiple", VF: "Verdadero / Falso", AB: "Abierta", REL: "Relacionar", COMP: "Completar" };
window.STATUS_LABEL = { ok: "Dominada", fall: "Fallada", nuevo: "Sin estudiar", imp: "Importante" };

/* Banco de tarjetas (flashcards) de ejemplo por materia. [frente, reverso, [tags], nivel] */
window.CARD_BANK = {
  "Legislación Militar": [
    ["¿Cómo se clasifican los delitos según la voluntad del agente en el CJM?", "En intencionales y no intencionales (de imprudencia o imprudenciales).", ["cjm", "delitos"], "medio"],
    ["¿Qué es la insubordinación conforme al CJM?", "Faltar al respeto, amenazar o agredir a un superior en actos del servicio o con motivo de él.", ["cjm", "insubordinación"], "difícil"],
    ["¿Cuáles son los correctivos disciplinarios?", "Amonestación, arresto y, en su caso, cambio de cuerpo o dependencia (Ley de Disciplina).", ["disciplina", "correctivos"], "fácil"],
    ["¿Cuál es el deber esencial de un jefe según el RGDM?", "Velar por la instrucción, disciplina, moral y bienestar de sus subordinados, dando ejemplo.", ["rgdm", "deberes"], "medio"],
    ["¿Qué órgano es el Consejo de Honor y para qué sirve?", "Órgano disciplinario de la unidad que conoce de faltas graves y asuntos de honor del personal.", ["disciplina", "consejo-de-honor"], "medio"],
    ["¿Qué regula la Ley del ISSFAM?", "Las prestaciones y la seguridad social de los militares y sus derechohabientes (retiro, seguros, servicio médico).", ["issfam", "prestaciones"], "fácil"],
  ],
  "Operaciones Militares": [
    ["¿Cuáles son los niveles de conducción de las operaciones?", "Estratégico, operacional y táctico.", ["niveles", "conducción"], "medio"],
    ["Menciona un principio de la logística militar.", "Oportunidad (el apoyo debe llegar en el momento y lugar requeridos).", ["logística", "principios"], "fácil"],
    ["¿Qué es una operación conjunta?", "La que integra a dos o más componentes (Ejto., F.A., Armada) bajo un mando conjunto único.", ["conjuntas"], "medio"],
    ["¿Qué es el arte operacional?", "La aplicación del juicio creativo del comandante para diseñar y conducir campañas y operaciones mayores.", ["planeamiento", "arte-operacional"], "difícil"],
  ],
  "Normatividad Gubernamental": [
    ["Menciona un principio del uso de la fuerza.", "Proporcionalidad (también: legalidad, necesidad, racionalidad y oportunidad).", ["uso-de-la-fuerza", "principios"], "medio"],
    ["¿Cuáles son las obligaciones del Estado en DD.HH. (Art. 1° CPEUM)?", "Promover, respetar, proteger y garantizar los derechos humanos.", ["ddhh", "obligaciones"], "difícil"],
    ["¿Qué es una falta administrativa grave?", "Conducta del servidor público sancionada por la LGRA (p. ej. cohecho, peculado, desvío de recursos).", ["lgra", "faltas"], "medio"],
    ["¿Qué garantiza la Ley de Transparencia?", "El acceso a la información pública y la protección de la información clasificada (reservada y confidencial).", ["transparencia"], "fácil"],
  ],
  "Aspecto Administrativo": [
    ["¿Cuántos principios define el Estándar del PMBOK 7?", "12 principios de la dirección de proyectos (los dominios de desempeño son 8).", ["pmbok", "principios"], "medio"],
    ["¿Cuál es la regla general de contratación pública?", "La licitación pública; la invitación a tres y la adjudicación directa son excepciones.", ["adquisiciones", "contratación"], "difícil"],
    ["¿Qué son los dominios de desempeño del PMBOK 7?", "Ocho grupos de actividades críticas para entregar resultados del proyecto (interesados, equipo, ciclo de vida, etc.).", ["pmbok", "dominios"], "medio"],
  ],
  "Adiestramiento y Mando Militar": [
    ["Menciona un principio del liderazgo militar.", "Conócete a ti mismo y busca tu superación constante.", ["liderazgo", "principios"], "medio"],
    ["¿Qué es la disciplina militar en el ejercicio del mando?", "La norma de conducta que obliga a la obediencia y exactitud en el cumplimiento del deber.", ["disciplina", "mando"], "fácil"],
    ["¿Qué fases tiene el proceso de adiestramiento?", "Planeación, ejecución, supervisión y evaluación del adiestramiento.", ["adiestramiento", "proceso"], "medio"],
  ],
  "Aspecto Técnico": [
    ["¿Cuáles son las capas del ciberespacio?", "Física, lógica (sintáctica) y social (cibernético-persona).", ["ciberespacio", "capas"], "medio"],
    ["¿Qué es la tríada CIA en seguridad de la información?", "Confidencialidad, Integridad y Disponibilidad.", ["ciberseguridad", "cia"], "fácil"],
    ["¿Qué diferencia hay entre ciberseguridad y ciberdefensa?", "La ciberseguridad protege activos/información; la ciberdefensa son las acciones militares para defender el ciberespacio.", ["ciberdefensa"], "difícil"],
  ],
};

