/**
 * CodeFun Quiz - Aplicación de Quiz de Programación para Jóvenes
 * 
 * Sistema completo de quiz multinivel con gestión de tiempo, retroalimentación
 * configurable, historial de resultados y modo oscuro.
 * 
 * @version 1.0.0
 */

/* ============================================================================
   REFERENCIAS DOM - Elementos de la Interfaz de Usuario
   ============================================================================ */

// Contenedores principales de pantallas
const levelContainer = document.getElementById('level-container');
const levelError = document.getElementById('level-error');
const welcomeScreen = document.getElementById('welcome-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

// Modales de Bootstrap
const configModal = new bootstrap.Modal(document.getElementById('configModal'));
const historyModal = new bootstrap.Modal(document.getElementById('history-modal'));

// Controles de UI
const darkToggle = document.getElementById('dark-toggle');

// Elementos de la pantalla de quiz
const levelLabel = document.getElementById('level-label');
const qProgress = document.getElementById('q-progress');
const timerEl = document.getElementById('timer');
const scoreEl = document.getElementById('score');
const questionText = document.getElementById('question-text');
const optionsEl = document.getElementById('options');
const nextBtn = document.getElementById('next-btn');
const quitBtn = document.getElementById('quit-btn');
const progressBar = document.getElementById('progress-bar');

// Elementos de la pantalla de resultados
const resultTitle = document.getElementById('result-title');
const resultSummary = document.getElementById('result-summary');
const resultPercent = document.getElementById('result-percent');
const resultBest = document.getElementById('result-best');

/* ============================================================================
   ESTADO DE LA APLICACIÓN - Variables Globales
   ============================================================================ */

/**
 * Objeto que contiene todas las preguntas organizadas por nivel
 * Estructura: { "nivel": [array de preguntas] }
 */
let allQuestions = {};

/**
 * Nivel actualmente seleccionado por el usuario
 * @type {string|null}
 */
let currentLevel = null;

/**
 * Array de preguntas para el quiz actual (subconjunto aleatorio)
 * @type {Array}
 */
let questions = [];

/**
 * Índice de la pregunta actual en el array questions
 * @type {number}
 */
let currentIndex = 0;

/**
 * Puntaje acumulado del usuario en el quiz actual
 * @type {number}
 */
let score = 0;

/**
 * Cantidad de preguntas configuradas para el quiz
 * @type {number}
 */
let qCount = 10;

/**
 * Modo de temporización seleccionado
 * @type {'none'|'per'|'total'}
 * - 'none': Sin temporizador
 * - 'per': Tiempo por pregunta individual
 * - 'total': Tiempo total para todo el quiz
 */
let timerMode = 'total';

/**
 * Valor base del tiempo (en segundos)
 * Se multiplica por número de preguntas en modo 'total'
 * @type {number}
 */
let timeValue = 20;

/**
 * Modo de retroalimentación de respuestas
 * @type {'instant'|'final'}
 * - 'instant': Muestra si la respuesta es correcta inmediatamente
 * - 'final': Muestra resultados solo al finalizar el quiz
 */
let feedbackMode = 'instant';

/* ============================================================================
   TEMPORIZADORES - Control de Tiempo
   ============================================================================ */

/**
 * ID del intervalo del temporizador por pregunta
 * @type {number|null}
 */
let perTimerId = null;

/**
 * ID del intervalo del temporizador total
 * @type {number|null}
 */
let totalTimerId = null;

/**
 * Tiempo restante para la pregunta actual (segundos)
 * @type {number}
 */
let remainingPer = 0;

/**
 * Tiempo restante total del quiz (segundos)
 * @type {number}
 */
let remainingTotal = 0;

/* ============================================================================
   CONFIGURACIÓN - Constantes y LocalStorage
   ============================================================================ */

/**
 * Claves para almacenamiento en LocalStorage
 */
const KEY_HISTORY = 'cf_history_v1';
const KEY_BEST = 'cf_best_v1';

/**
 * Objeto que almacena los mejores puntajes por nivel
 * Se carga desde LocalStorage al iniciar
 * @type {Object<string, number>}
 */
const bestScores = JSON.parse(localStorage.getItem(KEY_BEST) || '{}');

/**
 * Configuración de tiempos fijos por nivel de dificultad
 * Cada nivel tiene un tiempo predeterminado por pregunta
 * 
 * @constant
 * @type {Object<string, {mode: string, value: number}>}
 */
const FIXED_TIMES = {
    '7-11': { mode: 'per', value: 20 },   // Nivel fácil: 20 segundos por pregunta
    '12-15': { mode: 'per', value: 15 },  // Nivel medio: 15 segundos por pregunta
    '16-18': { mode: 'per', value: 10 }   // Nivel avanzado: 10 segundos por pregunta
};

/* ============================================================================
   INICIALIZACIÓN - Carga de Datos
   ============================================================================ */

/**
 * Carga el archivo JSON con las preguntas y renderiza los niveles disponibles
 * Maneja errores de carga y los muestra en la interfaz
 */
fetch('questions.json')
    .then(res => {
        if (!res.ok) throw new Error('No se pudo cargar questions.json');
        return res.json();
    })
    .then(data => {
        allQuestions = data;
        renderLevels();
    })
    .catch(err => {
        console.error(err);
        levelError.className = 'alert alert-danger';
        levelError.textContent = 'Error cargando preguntas (ver consola).';
    });

/* ============================================================================
   RENDERIZADO DE INTERFAZ - Pantalla de Bienvenida
   ============================================================================ */

/**
 * Renderiza las tarjetas de nivel en la pantalla de bienvenida
 * Crea dinámicamente una tarjeta por cada nivel disponible en allQuestions
 * 
 * Cada tarjeta muestra:
 * - Nombre del nivel (ej: "7-11", "12-15")
 * - Cantidad de preguntas disponibles
 * - Ícono de reproducción
 * 
 * Al hacer clic en una tarjeta, se selecciona el nivel y abre el modal de configuración
 */
function renderLevels() {
    levelContainer.innerHTML = '';
    const keys = Object.keys(allQuestions);
    
    keys.forEach(key => {
        // Crear contenedor de columna para el grid de Bootstrap
        const col = document.createElement('div');
        col.className = 'col';
        
        // Crear tarjeta de nivel
        const card = document.createElement('div');
        card.className = 'card text-center p-3 h-100 level-card';
        card.dataset.level = key;
        card.innerHTML = `
            <h5 class="mb-1">${key}</h5>
            <p class="text-muted mb-2">${(allQuestions[key] || []).length} preguntas</p>
            <div class="fs-3 text-primary"><i class="bi bi-play-circle"></i></div>
        `;
        
        // Event listener: seleccionar nivel y abrir modal de configuración
        card.addEventListener('click', () => {
            // Remover selección previa
            document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
            // Marcar tarjeta actual como seleccionada
            card.classList.add('selected');
            currentLevel = key;
            configModal.show();
        });
        
        col.appendChild(card);
        levelContainer.appendChild(col);
    });
}

/* ============================================================================
   CONFIGURACIÓN DEL QUIZ - Modal de Opciones
   ============================================================================ */

/**
 * Event listener: Detecta cambios en el modo de retroalimentación
 * Actualiza la variable global feedbackMode según el radio button seleccionado
 */
document.querySelectorAll('input[name="feedback-mode"]').forEach(r => {
    r.addEventListener('change', () => {
        feedbackMode = document.querySelector('input[name="feedback-mode"]:checked').value;
    });
});

/**
 * Event listener: Detecta cambios en la cantidad de preguntas
 * Actualiza la variable global qCount cuando el usuario cambia el select
 */
document.getElementById('q-count').addEventListener('change', e => {
    qCount = Number(e.target.value);
});

/**
 * Event listener: Botón "Iniciar Quiz" en el modal de configuración
 * 
 * Proceso:
 * 1. Valida que se haya seleccionado un nivel
 * 2. Obtiene configuración de tiempo fijo según el nivel
 * 3. Lee configuraciones del usuario (cantidad de preguntas, modo de retroalimentación)
 * 4. Prepara pool aleatorio de preguntas
 * 5. Configura temporizadores según el modo seleccionado
 * 6. Inicia el quiz
 */
document.getElementById('start-quiz-btn').addEventListener('click', () => {
    // Validación: verificar que se haya seleccionado un nivel
    if (!currentLevel) {
        alert('Selecciona una tarjeta de nivel antes de iniciar.');
        return;
    }

    // Obtener configuración de tiempo predefinida para el nivel
    const fixedTimeConfig = FIXED_TIMES[currentLevel] || { mode: 'none', value: 0 };
    timerMode = document.querySelector('input[name="timer-mode"]:checked').value;
    let perQuestionTime = fixedTimeConfig.value;

    // Leer configuraciones del usuario desde el formulario
    qCount = Number(document.getElementById('q-count').value) || 10;
    feedbackMode = document.querySelector('input[name="feedback-mode"]:checked').value;

    // Preparar pool aleatorio de preguntas
    const pool = (allQuestions[currentLevel] || []).slice();
    shuffle(pool);
    questions = pool.slice(0, Math.min(qCount, pool.length));
    
    // Reiniciar estado del quiz
    currentIndex = 0;
    score = 0;
    userSelected = null;

    // Configurar temporizadores según el modo seleccionado
    if (timerMode === 'total') {
        // Modo total: multiplicar tiempo por pregunta × número de preguntas
        timeValue = perQuestionTime * questions.length;
        remainingTotal = timeValue;
    } else if (timerMode === 'per') {
        // Modo por pregunta: usar tiempo base
        timeValue = perQuestionTime;
        remainingPer = timeValue;
    } else {
        // Sin temporizador
        timeValue = 0;
    }

    // Cerrar modal de configuración
    configModal.hide();

    // Validación: verificar que haya preguntas disponibles
    if (!questions.length) {
        alert('No hay preguntas disponibles para este nivel.');
        resetToWelcome();
        return;
    }

    startQuiz();
});

/* ============================================================================
   FLUJO PRINCIPAL DEL QUIZ
   ============================================================================ */

/**
 * Inicia el quiz y prepara la interfaz
 * 
 * Responsabilidades:
 * - Cambiar visibilidad de pantallas (ocultar bienvenida, mostrar quiz)
 * - Reiniciar puntaje y actualizar UI
 * - Validar estructura de datos de preguntas
 * - Renderizar primera pregunta
 * - Iniciar temporizador total si corresponde
 */
function startQuiz() {
    // Cambiar visibilidad de pantallas
    welcomeScreen.classList.add('d-none');
    quizScreen.classList.remove('d-none');
    resultScreen.classList.add('d-none');
    
    // Actualizar etiqueta de nivel
    levelLabel.textContent = `Nivel ${currentLevel}`;

    // Reiniciar puntaje
    score = 0;
    updateScoreUI();

    // Validación: verificar que haya preguntas disponibles
    if (!questions.length) {
        alert('No hay preguntas disponibles para este nivel.');
        resetToWelcome();
        return;
    }
    
    // Validación: verificar estructura correcta de la primera pregunta
    if (!questions[0].question || !Array.isArray(questions[0].options)) {
        alert('Las preguntas no tienen la estructura esperada.');
        resetToWelcome();
        return;
    }
    
    // Iniciar flujo del quiz
    renderQuestion();
    startTotalIfNeeded();
}

/**
 * Renderiza la pregunta actual en la interfaz
 * 
 * Proceso:
 * 1. Detiene temporizador por pregunta si estaba activo
 * 2. Verifica si hay más preguntas (si no, muestra resultados)
 * 3. Actualiza texto de pregunta
 * 4. Crea botones de opciones dinámicamente
 * 5. Actualiza UI (progreso, temporizador, barra de progreso)
 * 6. Inicia temporizador por pregunta si corresponde
 */
function renderQuestion() {
    stopPerTimer();
    
    const q = questions[currentIndex];
    
    // Si no hay más preguntas, mostrar pantalla de resultados
    if (!q) {
        showResult();
        return;
    }
    
    // Actualizar texto de pregunta
    questionText.textContent = q.question;
    optionsEl.innerHTML = '';
    userSelected = null;

    // Control de visibilidad del puntaje según modo de retroalimentación
    if (feedbackMode === 'final') {
        scoreEl.style.display = 'none';  // Ocultar en modo final
    } else {
        scoreEl.style.display = '';      // Mostrar en modo instantáneo
    }

    // Crear botones de opciones dinámicamente
    q.options.forEach((opt, idx) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'option-btn';
        btn.setAttribute('aria-checked', 'false');
        btn.textContent = opt;
        btn.addEventListener('click', () => selectOption(idx, btn));
        optionsEl.appendChild(btn);
    });

    // Actualizar elementos de UI
    qProgress.textContent = `Pregunta ${currentIndex + 1} / ${questions.length}`;
    updateProgressBar();
    updateTimerUI();

    // Iniciar temporizador por pregunta si corresponde
    if (timerMode === 'per') {
        startPerTimer(timeValue);
    }
}

/**
 * Maneja la selección de una opción por parte del usuario
 * 
 * @param {number} idx - Índice de la opción seleccionada
 * @param {HTMLElement} btn - Elemento del botón clickeado
 * 
 * Proceso según modo de retroalimentación:
 * 
 * MODO INSTANTÁNEO:
 * 1. Marca la opción seleccionada
 * 2. Verifica si es correcta
 * 3. Incrementa puntaje si es correcta
 * 4. Muestra respuesta correcta con colores
 * 5. Avanza automáticamente después de 700ms
 * 
 * MODO FINAL:
 * 1. Marca la opción seleccionada
 * 2. Guarda la respuesta para evaluación posterior
 * 3. No muestra si es correcta o incorrecta
 * 4. Avanza a siguiente pregunta
 */
function selectOption(idx, btn) {
    // Prevenir múltiples selecciones
    if (userSelected !== null) return;

    // Marcar opción seleccionada visualmente (ARIA)
    [...optionsEl.children].forEach((c, i) => {
        c.setAttribute('aria-checked', i === idx ? 'true' : 'false');
    });
    
    userSelected = idx;
    const q = questions[currentIndex];
    const isCorrect = userSelected === q.answerIndex;

    // MODO FINAL: Guardar respuesta para evaluación posterior
    if (feedbackMode === 'final') {
        if (!q.hasOwnProperty('userSelected')) q.userSelected = null;
        q.userSelected = idx;
    }

    // MODO INSTANTÁNEO: Evaluar inmediatamente
    if (feedbackMode === 'instant' && isCorrect) score++;
    if (feedbackMode === 'instant') updateScoreUI();

    // Deshabilitar todos los botones para prevenir múltiples clics
    [...optionsEl.children].forEach(c => c.disabled = true);

    if (feedbackMode === 'instant') {
        // MODO INSTANTÁNEO: Revelar respuesta y avanzar automáticamente
        revealAnswerUI();
        setTimeout(() => {
            currentIndex++;
            if (currentIndex >= questions.length) showResult();
            else renderQuestion();
        }, 700);
    } else {
        // MODO FINAL: Solo marcar selección y avanzar
        [...optionsEl.children].forEach((b, i) => {
            b.classList.remove('correct', 'wrong');
            if (i === idx) b.classList.add('selected');
        });
        setTimeout(() => {
            currentIndex++;
            if (currentIndex >= questions.length) showResult();
            else renderQuestion();
        }, 700);
    }
}

/**
 * Revela la respuesta correcta en la interfaz con código de colores
 * 
 * Aplica clases CSS:
 * - 'correct' (verde): a la opción correcta
 * - 'wrong' (rojo): a la opción incorrecta seleccionada por el usuario
 * 
 * NOTA: Solo se aplica en modo de retroalimentación instantánea
 */
function revealAnswerUI() {
    const q = questions[currentIndex];
    
    [...optionsEl.children].forEach((b, idx) => {
        b.disabled = true;
        
        if (feedbackMode === 'final') {
            // Modo final: no mostrar código de colores
            b.classList.remove('correct', 'wrong');
        } else {
            // Modo instantáneo: aplicar código de colores
            if (idx === q.answerIndex) {
                b.classList.add('correct');  // Respuesta correcta en verde
            } else if (idx === userSelected && idx !== q.answerIndex) {
                b.classList.add('wrong');    // Respuesta incorrecta en rojo
            }
        }
    });
}

/* ============================================================================
   SISTEMA DE TEMPORIZADORES
   ============================================================================ */

/**
 * Inicia el temporizador por pregunta individual
 * 
 * @param {number} seconds - Segundos disponibles para responder
 * 
 * Comportamiento al agotar tiempo:
 * - Se detiene el temporizador
 * - Se trata como respuesta incorrecta
 * - Se muestra la respuesta correcta
 * - Avanza automáticamente a la siguiente pregunta después de 700ms
 */
function startPerTimer(seconds) {
    stopPerTimer();
    remainingPer = seconds;
    updateTimerUI();
    
    perTimerId = setInterval(() => {
        remainingPer--;
        updateTimerUI();
        
        // Verificar si se agotó el tiempo
        if (remainingPer <= 0) {
            stopPerTimer();
            // Tratar como respuesta no contestada (incorrecta)
            userSelected = null;
            revealAnswerUI();
            
            // Avanzar a siguiente pregunta automáticamente
            setTimeout(() => {
                currentIndex++;
                if (currentIndex >= questions.length) showResult();
                else renderQuestion();
            }, 700);
        }
    }, 1000);
}

/**
 * Detiene el temporizador por pregunta
 * Limpia el intervalo y resetea el ID
 */
function stopPerTimer() {
    if (perTimerId) {
        clearInterval(perTimerId);
        perTimerId = null;
    }
}

/**
 * Inicia el temporizador total si el modo 'total' está activo
 * 
 * Comportamiento:
 * - Solo se ejecuta si timerMode === 'total'
 * - Cuenta regresiva desde el tiempo total configurado
 * - Al agotar el tiempo, llama a handleTotalTimeUp()
 */
function startTotalIfNeeded() {
    stopTotalTimer();
    
    if (timerMode === 'total') {
        remainingTotal = timeValue;
        updateTimerUI();
        
        totalTimerId = setInterval(() => {
            remainingTotal--;
            updateTimerUI();
            
            // Verificar si se agotó el tiempo total
            if (remainingTotal <= 0) {
                stopTotalTimer();
                handleTotalTimeUp();
            }
        }, 1000);
    } else {
        // Ocultar elemento de temporizador si no está en modo total
        timerEl.classList.add('d-none');
    }
}

/**
 * Detiene el temporizador total
 * Limpia el intervalo y resetea el ID
 */
function stopTotalTimer() {
    if (totalTimerId) {
        clearInterval(totalTimerId);
        totalTimerId = null;
    }
}

/**
 * Actualiza la visualización del temporizador en formato MM:SS
 * 
 * Comportamiento:
 * - Se oculta si el modo es 'none'
 * - Muestra remainingPer en modo 'per'
 * - Muestra remainingTotal en modo 'total'
 * - Formato: MM:SS con ceros a la izquierda
 */
function updateTimerUI() {
    // Ocultar temporizador si el modo es 'none'
    if (timerMode === 'none') {
        timerEl.classList.add('d-none');
        return;
    }
    
    timerEl.classList.remove('d-none');
    
    // Seleccionar el tiempo apropiado según el modo
    const s = timerMode === 'per' ? remainingPer : remainingTotal;
    
    // Calcular minutos y segundos
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    
    // Actualizar texto del temporizador
    timerEl.textContent = `${mm}:${ss}`;
}

/**
 * Maneja el evento de tiempo total agotado
 * Muestra la pantalla de resultados con mensaje especial de "tiempo agotado"
 */
function handleTotalTimeUp() {
    showResult(true);
}

/* ============================================================================
   PANTALLA DE RESULTADOS
   ============================================================================ */

/**
 * Muestra la pantalla de resultados del quiz
 * 
 * @param {boolean} timeUp - Indica si se llegó por tiempo agotado
 * 
 * Proceso:
 * 1. Detiene todos los temporizadores
 * 2. Cambia visibilidad de pantallas
 * 3. Calcula puntaje final (en modo final)
 * 4. Actualiza estadísticas (porcentaje, mejor puntaje)
 * 5. Guarda entrada en historial
 * 6. Actualiza mejor puntaje del nivel si corresponde
 */
function showResult(timeUp = false) {
    // Detener todos los temporizadores activos
    stopPerTimer();
    stopTotalTimer();
    
    // Cambiar visibilidad de pantallas
    quizScreen.classList.add('d-none');
    resultScreen.classList.remove('d-none');

    // MODO FINAL: Calcular puntaje evaluando todas las respuestas guardadas
    if (feedbackMode === 'final') {
        score = 0;
        questions.forEach(q => {
            if (typeof q.userSelected === 'number' && q.userSelected === q.answerIndex) {
                score++;
            }
        });
        updateScoreUI();
    }

    // Actualizar título según contexto (tiempo agotado o finalización normal)
    resultTitle.textContent = timeUp ? 'Se acabó el tiempo' : '¡Resultado!';
    
    // Mostrar resumen de resultados
    resultSummary.textContent = `Has obtenido ${score} de ${questions.length} preguntas.`;
    
    // Calcular y mostrar porcentaje
    const percent = Math.round((score / Math.max(1, questions.length)) * 100);
    resultPercent.textContent = `${percent}%`;

    // Guardar entrada en historial
    const history = JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]');
    const entry = {
        date: new Date().toLocaleString(),
        level: currentLevel,
        score,
        total: questions.length,
        percent
    };
    history.unshift(entry);  // Agregar al inicio del array
    localStorage.setItem(KEY_HISTORY, JSON.stringify(history));

    // Actualizar mejor puntaje del nivel si el actual es superior
    if (!bestScores[currentLevel] || score > bestScores[currentLevel]) {
        bestScores[currentLevel] = score;
        localStorage.setItem(KEY_BEST, JSON.stringify(bestScores));
    }
    
    // Mostrar mejor puntaje del nivel
    resultBest.textContent = `Mejor puntaje (nivel ${currentLevel}): ${bestScores[currentLevel] || 0}`;
}

/* ============================================================================
   NAVEGACIÓN Y RESET
   ============================================================================ */

/**
 * Resetea la aplicación al estado inicial (pantalla de bienvenida)
 * 
 * Limpia:
 * - Todos los temporizadores activos
 * - Selección visual de tarjetas de nivel
 * - Estado del nivel actual
 * 
 * Restaura visibilidad de pantallas al estado inicial
 */
function resetToWelcome() {
    // Detener todos los temporizadores
    stopPerTimer();
    stopTotalTimer();
    
    // Cambiar visibilidad de pantallas
    quizScreen.classList.add('d-none');
    resultScreen.classList.add('d-none');
    welcomeScreen.classList.remove('d-none');
    
    // Limpiar selección visual de tarjetas
    document.querySelectorAll('.level-card').forEach(c => c.classList.remove('selected'));
    
    // Resetear nivel actual
    currentLevel = null;
}

/* ============================================================================
   HISTORIAL DE RESULTADOS
   ============================================================================ */

/**
 * Event listener: Abre el modal de historial
 * Renderiza el historial actualizado antes de mostrar el modal
 */
document.getElementById('open-history').addEventListener('click', () => {
    renderHistory();

    // Obtener o crear instancia del modal de Bootstrap
    const modalEl = document.getElementById('history-modal');
    if (modalEl) {
        let historyModal = bootstrap.Modal.getInstance(modalEl);
        if (!historyModal) {
            historyModal = new bootstrap.Modal(modalEl);
        }
        historyModal.show();
    }
});

/**
 * Renderiza la lista de historial desde LocalStorage
 * 
 * Muestra:
 * - Nivel del quiz
 * - Fecha y hora de realización
 * - Puntaje obtenido (X/Y)
 * - Porcentaje
 * 
 * Si no hay historial, muestra mensaje informativo
 */
function renderHistory() {
    const history = JSON.parse(localStorage.getItem(KEY_HISTORY) || '[]');
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    // Verificar si hay registros en el historial
    if (!history.length) {
        list.innerHTML = '<div class="alert alert-info">Aún no hay historial.</div>';
        return;
    }
    
    // Renderizar cada entrada del historial
    history.forEach(h => {
        const row = document.createElement('div');
        row.className = 'd-flex justify-content-between align-items-center border-bottom py-2';
        row.innerHTML = `
            <div>
                <strong>Nivel ${h.level}</strong>
                <div class="text-muted small">${h.date}</div>
            </div>
            <div>${h.score}/${h.total} (${h.percent}%)</div>
        `;
        list.appendChild(row);
    });
}

/**
 * Event listener: Borra todo el historial de LocalStorage
 * Actualiza la vista del historial inmediatamente
 */
document.getElementById('clear-history').addEventListener('click', () => {
    localStorage.removeItem(KEY_HISTORY);
    renderHistory();  // Actualizar vista para mostrar mensaje "sin historial"
});

/* ============================================================================
   FUNCIONES UTILITARIAS
   ============================================================================ */

/**
 * Mezcla aleatoriamente los elementos de un array (algoritmo Fisher-Yates)
 * 
 * @param {Array} a - Array a mezclar (se modifica in-place)
 * @returns {Array} - El mismo array mezclado
 */
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

/**
 * Actualiza el texto del elemento de puntaje en la UI
 */
function updateScoreUI() {
    scoreEl.textContent = `Puntaje: ${score}`;
}

/**
 * Actualiza la barra de progreso visual del quiz
 * Calcula el porcentaje de preguntas completadas
 */
function updateProgressBar() {
    const pct = Math.round((currentIndex / Math.max(1, questions.length)) * 100);
    progressBar.style.width = `${pct}%`;
}

/* ============================================================================
   MODO OSCURO - Persistencia de Tema
   ============================================================================ */

/**
 * Event listener: Toggle de modo oscuro
 * Guarda la preferencia en LocalStorage para persistencia
 */
darkToggle.addEventListener('change', (e) => {
    document.body.classList.toggle('dark', e.target.checked);
    localStorage.setItem('cf_theme', e.target.checked ? 'dark' : 'light');
});

/**
 * IIFE: Carga el tema guardado al iniciar la aplicación
 * Lee la preferencia de LocalStorage y aplica el tema correspondiente
 * Por defecto usa tema 'light' si no hay preferencia guardada
 */
(function loadTheme() {
    const t = localStorage.getItem('cf_theme') || 'light';
    if (t === 'dark') {
        darkToggle.checked = true;
        document.body.classList.add('dark');
    } else {
        darkToggle.checked = false;
        document.body.classList.remove('dark');
    }
})();

/* ============================================================================
   INICIALIZACIÓN DE PANTALLAS
   ============================================================================ */

/**
 * IIFE: Asegura el estado inicial correcto de las pantallas
 * Garantiza que solo la pantalla de bienvenida sea visible al cargar
 * 
 * Previene el bug donde otras pantallas puedan mostrarse al inicio
 */
(function initScreens() {
    resultScreen.classList.add('d-none');
    quizScreen.classList.add('d-none');
    welcomeScreen.classList.remove('d-none');
})();

/* ============================================================================
   ACCESIBILIDAD - Interacciones de Teclado
   ============================================================================ */

/**
 * Event listener: Permite seleccionar opciones con la tecla Enter
 * Mejora la accesibilidad para usuarios que navegan con teclado
 * 
 * Cuando el foco está en un botón de opción y se presiona Enter,
 * simula un clic en ese botón
 */
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && 
        document.activeElement && 
        document.activeElement.classList.contains('option-btn')) {
        document.activeElement.click();
    }
});

/* ============================================================================
   NAVEGACIÓN - Botones de Control
   ============================================================================ */

/**
 * Event listener: Botón "Salir" en la pantalla de quiz
 * Permite al usuario abandonar el quiz actual y volver al inicio
 */
quitBtn.addEventListener('click', () => {
    resetToWelcome();
});

/**
 * Event listener: Botón "Inicio" en la pantalla de resultados
 * Regresa al usuario a la pantalla de bienvenida para seleccionar otro nivel
 */
document.getElementById('home-btn').addEventListener('click', () => {
    resetToWelcome();
});

/**
 * Event listener: Botón "Reintentar" en la pantalla de resultados
 * Permite al usuario repetir el mismo quiz con las mismas configuraciones
 * 
 * Proceso:
 * 1. Detiene todos los temporizadores activos
 * 2. Reinicia todas las variables de estado (índice, puntaje, selección)
 * 3. Limpia respuestas guardadas de preguntas anteriores
 * 4. Recalcula tiempos según el modo de temporización
 * 5. Muestra la pantalla de quiz y renderiza la primera pregunta
 * 6. Reinicia el temporizador total si corresponde
 */
document.getElementById('retry-btn').addEventListener('click', () => {
    // Detener todos los temporizadores activos
    stopPerTimer();
    stopTotalTimer();

    // Reiniciar variables de estado del quiz
    currentIndex = 0;
    score = 0;
    userSelected = null;
    updateScoreUI();

    // Limpiar respuestas guardadas en las preguntas (modo final)
    questions.forEach(q => { q.userSelected = null; });

    // Recalcular tiempos según el modo y configuración del nivel
    let perQuestionTime = FIXED_TIMES[currentLevel]?.value || 0;
    
    if (timerMode === 'total') {
        // Modo total: tiempo por pregunta × cantidad de preguntas
        timeValue = perQuestionTime * questions.length;
        remainingTotal = timeValue;
    } else if (timerMode === 'per') {
        // Modo por pregunta: tiempo base por cada pregunta
        timeValue = perQuestionTime;
        remainingPer = timeValue;
    }

    // Mostrar pantalla de quiz y reiniciar flujo
    resultScreen.classList.add('d-none');
    quizScreen.classList.remove('d-none');
    renderQuestion();
    startTotalIfNeeded();
});