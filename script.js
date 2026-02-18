// --- Configuration ---
const CONFIG_KEY = 'plurall_config';
const DB_KEY = 'plurall_students_db';

const DEFAULT_CONFIG = {
    rodrigo: '5566992331535',
    socorro: '5566996622907'
};

const CLASS_ORDER = [
    '3º Ano A', '3º Ano B',
    '4º Ano', '5º Ano',
    '6º Ano A', '6º Ano B',
    '7º Ano', '8º Ano', '9º Ano',
    '1ª Série', '2ª Série', '3ª Série'
];

let appData = {
    students: [],
    config: { ...DEFAULT_CONFIG },
    currentStudent: null
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadDatabase();
    setupEventListeners();
});

// --- Data Loading ---

function loadConfig() {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
        appData.config = JSON.parse(saved);
    }
}

function loadDatabase() {
    // Try LocalStorage first
    const savedDB = localStorage.getItem(DB_KEY);

    if (savedDB) {
        appData.students = JSON.parse(savedDB);
        initApp();
    } else {
        // Fetch CSV
        Papa.parse('Dados%20de%20acesso.csv', {
            download: true,
            header: false,
            complete: function (results) {
                // Parse CSV: col 0=Class, 1=Name, 2=Login, 3=Pass
                appData.students = results.data
                    .filter(row => row.length >= 4 && row[0]) // Filter empty lines
                    .map(row => ({
                        turma: row[0].trim(),
                        nome: row[1].trim(),
                        login: row[2].trim(),
                        senha: row[3].trim()
                    }));

                // Save to local storage for future edits
                localStorage.setItem(DB_KEY, JSON.stringify(appData.students));
                initApp();
            },
            error: function (err) {
                console.error("Error loading CSV:", err);
                alert("Erro ao carregar banco de dados. Verifique o arquivo CSV.");
            }
        });
    }
}

function initApp() {
    populateClassDropdowns();
    console.log("App Initialized with", appData.students.length, "students.");
}

// --- UI Population ---

function populateClassDropdowns() {
    const selects = [
        document.getElementById('turma-select'),
        document.getElementById('nr-turma-select'),
        document.getElementById('conf-add-turma'),
        document.getElementById('conf-remove-turma')
    ];

    selects.forEach(select => {
        if (!select) return;
        // Keep first option (placeholder)
        const placeholder = select.firstElementChild;
        select.innerHTML = '';
        select.appendChild(placeholder);

        CLASS_ORDER.forEach(cls => {
            const opt = document.createElement('option');
            opt.value = cls;
            opt.textContent = cls;
            select.appendChild(opt);
        });
    });
}

function populateRemoveStudentDropdown(className) {
    const select = document.getElementById('conf-remove-student');
    select.innerHTML = '<option value="">Selecione Aluno</option>';

    if (!className) {
        select.disabled = true;
        return;
    }

    const students = appData.students.filter(s => s.turma === className);
    students.sort((a, b) => a.nome.localeCompare(b.nome));

    students.forEach((student, index) => {
        // We use a unique combination as value since there are no IDs. 
        // Using "index" is risky if array shifts, but filtering makes index different.
        // Let's use JSON string of the object to identify it easily for removal.
        const opt = document.createElement('option');
        opt.value = JSON.stringify(student);
        opt.textContent = student.nome;
        select.appendChild(opt);
    });

    select.disabled = false;
}

// ... (renderStudentList etc remain same)

function renderStudentList(className) {
    const container = document.getElementById('student-list');
    container.innerHTML = '';

    const students = appData.students.filter(s => s.turma === className);

    // Sort alphabetically
    students.sort((a, b) => a.nome.localeCompare(b.nome));

    if (students.length === 0) {
        container.innerHTML = '<div style="padding:15px; color:#666;">Nenhum aluno encontrado nesta turma.</div>';
        return;
    }

    students.forEach(student => {
        const div = document.createElement('div');
        div.className = 'student-item';
        div.textContent = student.nome;
        div.onclick = () => selectStudent(student, div);
        container.appendChild(div);
    });
}

function selectStudent(student, element) {
    // Highlight
    document.querySelectorAll('.student-item').forEach(el => el.classList.remove('selected'));
    element.classList.add('selected');

    appData.currentStudent = student;

    // Render Message
    const msgArea = document.getElementById('message-area');
    const msgText = generateStudentMessage(student);

    msgArea.innerHTML = formatMessageForDisplay(msgText);
    msgArea.classList.remove('hidden');
    msgArea.classList.add('visible');

    // Show Action Buttons
    document.getElementById('action-buttons-area').classList.remove('hidden');
}

// --- Message Generation ---

function generateStudentMessage(student) {
    return `*Acesso ao Portal Plurall*

Olá *${student.nome}*! :)

Segue informação do seu acesso:

*Usuário:* ${student.login}
*Senha:* ${student.senha}

*É importante acessar o aplicativo e completar o cadastro, preenchendo corretamente o número de telefone e o e-mail para garantir o pleno funcionamento da plataforma.*

Bons estudos!
http://login.plurall.net`;
}

function formatMessageForDisplay(text) {
    // Convert newlines to <br> and bold to <strong> for display
    return text
        .replace(/\n/g, '<br>')
        .replace(/\*(.*?)\*/g, '<strong>$1</strong>');
}

// --- User Actions ---

function sendTo(number, text) {
    if (!number) {
        alert("Número de telefone não configurado!");
        return;
    }
    // Clean number
    let cleanNum = number.replace(/\D/g, '');

    // Automatically add 55 if the number seems to be just DDD + Phone (10 or 11 digits)
    // 10 digits: DDD + Landline (e.g., 66 3333 3333)
    // 11 digits: DDD + Mobile (e.g., 66 99999 9999)
    if (cleanNum.length === 10 || cleanNum.length === 11) {
        cleanNum = '55' + cleanNum;
    }

    const url = `https://wa.me/${cleanNum}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function setupEventListeners() {
    // Main Flow
    document.getElementById('turma-select').addEventListener('change', (e) => {
        document.getElementById('student-container').classList.remove('hidden');
        renderStudentList(e.target.value);
        // Hide previous selections
        document.getElementById('message-area').classList.add('hidden');
        document.getElementById('action-buttons-area').classList.add('hidden');
    });

    // Action Buttons
    document.getElementById('btn-msg-rodrigo').addEventListener('click', () => {
        if (!appData.currentStudent) return;
        sendTo(appData.config.rodrigo, generateStudentMessage(appData.currentStudent));
    });

    document.getElementById('btn-msg-socorro').addEventListener('click', () => {
        if (!appData.currentStudent) return;
        sendTo(appData.config.socorro, generateStudentMessage(appData.currentStudent));
    });

    // Send to Student Modal
    const studentModal = document.getElementById('modal-student-number');

    document.getElementById('btn-msg-aluno').addEventListener('click', () => {
        studentModal.classList.add('active');
    });

    document.getElementById('modal-confirm-send').addEventListener('click', () => {
        const phone = document.getElementById('modal-input-phone').value;
        const cleanPhone = phone.replace(/\D/g, '');
        // Validate at least DDD+Number (10 digits)
        if (cleanPhone.length < 10) {
            alert('Por favor, insira um número válido (com DDD).');
            return;
        }
        sendTo(cleanPhone, generateStudentMessage(appData.currentStudent));
        studentModal.classList.remove('active');
    });

    // Close Modals
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById(btn.dataset.target).classList.remove('active');
        });
    });

    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.classList.remove('active');
            }
        });
    });

    // --- Not Registered Flow ---
    const nrCheckStudent = document.getElementById('nr-check-student');
    const nrPhoneGroup = document.getElementById('nr-student-phone-group');

    document.getElementById('btn-not-registered-toggle').addEventListener('click', () => {
        const flow = document.getElementById('not-registered-flow');
        flow.classList.toggle('hidden');
    });

    nrCheckStudent.addEventListener('change', (e) => {
        if (e.target.checked) {
            nrPhoneGroup.classList.remove('hidden');
        } else {
            nrPhoneGroup.classList.add('hidden');
        }
    });

    document.getElementById('btn-request-inclusion').addEventListener('click', () => {
        const turma = document.getElementById('nr-turma-select').value;
        const nome = document.getElementById('nr-student-name').value;
        const sendToMe = document.getElementById('nr-check-me').checked; // Implicitly always sent to Rodrigo
        const sendToStudent = document.getElementById('nr-check-student').checked;
        const studentPhone = document.getElementById('nr-student-phone').value;

        if (!turma || !nome) {
            alert('Por favor, preencha Turma e Nome.');
            return;
        }

        let msg = `O aluno *${nome}* não está cadastrado na turma *${turma}*.\n\n`;

        if (sendToStudent) {
            if (!studentPhone) {
                alert('Por favor, digite o número do aluno para envio.');
                return;
            }
            msg += `⚠ Peço, por gentileza, que realize a inclusão do aluno e envie o login e a senha para o aluno neste número: *${studentPhone}* e me avise assim que for concluído.`;
        } else {
            msg += `⚠ Peço, por gentileza, que realize a inclusão do aluno na turma e me avise assim que for concluído.`;
        }

        // Send to Rodrigo
        sendTo(appData.config.rodrigo, msg);
    });

    // --- Configuration Flow ---
    const configLoginModal = document.getElementById('modal-config-login');
    const configDashModal = document.getElementById('modal-config-dashboard');

    document.getElementById('open-config').addEventListener('click', () => {
        configLoginModal.classList.add('active');
    });

    document.getElementById('btn-config-login').addEventListener('click', () => {
        const pass = document.getElementById('config-password-input').value;
        if (pass === 'plurall') {
            configLoginModal.classList.remove('active');
            configDashModal.classList.add('active');
            document.getElementById('config-password-input').value = ''; // clear

            // update dash inputs
            document.getElementById('conf-rodrigo').value = appData.config.rodrigo;
            document.getElementById('conf-socorro').value = appData.config.socorro;
        } else {
            alert('Senha incorreta!');
        }
    });

    // --- Force Update Flow ---

    document.getElementById('btn-force-update').addEventListener('click', () => {
        const btn = document.getElementById('btn-force-update');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Atualizando...';
        btn.disabled = true;

        // Force fetch with timestamp to bypass cache
        const timestamp = new Date().getTime();
        Papa.parse(`Dados%20de%20acesso.csv?v=${timestamp}`, {
            download: true,
            header: false,
            complete: function (results) {
                // Parse CSV
                const newStudents = results.data
                    .filter(row => row.length >= 4 && row[0])
                    .map(row => ({
                        turma: row[0].trim(),
                        nome: row[1].trim(),
                        login: row[2].trim(),
                        senha: row[3].trim()
                    }));

                if (newStudents.length > 0) {
                    appData.students = newStudents;
                    localStorage.setItem(DB_KEY, JSON.stringify(appData.students));

                    // Reset UI
                    renderStudentList(document.getElementById('turma-select').value);
                    initApp(); // re-populate dropdowns if classes changed

                    alert(`Sucesso! Banco de dados atualizado com ${newStudents.length} alunos.`);
                } else {
                    alert("O arquivo CSV parece estar vazio ou inválido.");
                }

                btn.innerHTML = originalText;
                btn.disabled = false;
            },
            error: function (err) {
                console.error("Error updating CSV:", err);
                alert("Erro ao baixar o arquivo CSV. Verifique sua conexão.");
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });
    });

    // Save Configs on blur (Auto-save)
    ['conf-rodrigo', 'conf-socorro'].forEach(id => {
        document.getElementById(id).addEventListener('blur', (e) => {
            const val = e.target.value;
            if (id === 'conf-rodrigo') appData.config.rodrigo = val;
            if (id === 'conf-socorro') appData.config.socorro = val;
            localStorage.setItem(CONFIG_KEY, JSON.stringify(appData.config));
        });
    });
}
