const initialPlayers = Array.from({ length: 25 }, (_, i) => {
    if (i === 0) {
        return { id: 0, name: "Yoon-seo", img: "https://i.pravatar.cc/150?u=yoonseo", votes: 0, alive: true, role: null };
    }
    const sampleNames = ["Lee Su-ho", "Park Min-jun", "Choi Yu-jin", "Kim Do-yun", "Han Ji-woo"];
    const pName = i <= sampleNames.length ? sampleNames[i - 1] : `Player ${i + 1}`;

    return { id: i, name: pName, img: `https://i.pravatar.cc/150?u=p${i + 1}`, votes: 0, alive: true, role: null };
});

let assignedFlag = false;
let isNight = false;
let timerInterval = null;
let timeLeft = 60;
let hasVoted = false;
let myRole = null;
let isLastWordsPhase = false;

// TUNGI TANLOVLARNI SAQLASH
let mafiaTargetId = null;
let doctorTargetId = null;

// DIKTOR BOT
function speakBot(phraseKey, voter = "", target = "") {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const cleanVoter = voter.replace("Yoon-seo", "Юн Со").replace("Player", "Игрок");
    const cleanTarget = target.replace("Yoon-seo", "Юн Со").replace("Player", "Игрок");

    const speechPhrases = {
        start: "Роли успешно распределены. Обсуждение началось!",
        vote: `${cleanVoter} отдал голос против ${cleanTarget}.`,
        night: "Наступает ночь. Все жители закрывают глаза.",
        lastWords: `Игрок ${cleanTarget} набрал наибольшее количество голосов. Вам предоставляется последнее слово.`,
        eliminated: `Игрок ${cleanTarget} покидает игру.`,
        saved: "Врач спас игрока, на которого было совершено нападение!",
        day: "Наступает утро. Все открывают глаза и начинают обсуждение."
    };

    const textToSpeak = speechPhrases[phraseKey] || cleanTarget;
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = 'ru-RU';

    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(v => v.lang.includes('ru') && (
        v.name.includes('Google') ||
        v.name.includes('Natural') ||
        v.name.includes('Microsoft') ||
        v.name.includes('Irina')
    ));

    if (naturalVoice) utterance.voice = naturalVoice;

    utterance.pitch = 1.0;
    utterance.rate = 0.95;

    window.speechSynthesis.speak(utterance);
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
}

function renderPlayers() {
    const listContainer = document.getElementById("players-list");
    listContainer.innerHTML = "";

    const myPlayer = initialPlayers[0];

    initialPlayers.forEach(player => {
        const card = document.createElement("div");
        card.classList.add("card");
        if (player.id === 0) card.classList.add("my-card");
        if (!player.alive) card.classList.add("eliminated");

        const voteBadgeHTML = player.votes > 0 ? `<div class="vote-badge">${player.votes}</div>` : '';

        let roleText = player.alive ? "Tirik" : "O'yindan chiqqan";
        if (player.id === 0 && player.role) {
            roleText = player.role;
            if (player.role === "Mafia") card.classList.add("mafia");
            else if (player.role === "Shifokor") card.classList.add("doctor");
            else if (player.role === "Politsiya") card.classList.add("police");
            else card.classList.add("citizen");
        }

        let actionBtnHTML = '';

        if (assignedFlag && myPlayer.alive && player.alive && player.id !== 0 && !isLastWordsPhase) {
            if (!isNight) {
                if (!hasVoted) {
                    actionBtnHTML = `<button class="vote-btn-card" onclick="votePlayer(${player.id})">Ovoz berish</button>`;
                }
            } else {
                if (myRole === "Mafia") {
                    actionBtnHTML = `<button class="vote-btn-card" style="background:#e63946; color:#fff;" onclick="nightAction(${player.id}, 'mafia')">O'ldirish</button>`;
                } else if (myRole === "Shifokor") {
                    actionBtnHTML = `<button class="vote-btn-card" style="background:#2a9d8f; color:#fff;" onclick="nightAction(${player.id}, 'doctor')">Qutqarish</button>`;
                } else if (myRole === "Politsiya") {
                    actionBtnHTML = `<button class="vote-btn-card" style="background:#457b9d; color:#fff;" onclick="nightAction(${player.id}, 'police')">Tekshirish</button>`;
                }
            }
        }

        card.innerHTML = `
            ${voteBadgeHTML}
            <img src="${player.img}" alt="${player.name}" class="avatar-img">
            <h3>${player.name}</h3>
            <div class="role-box">${roleText}</div>
            ${actionBtnHTML}
        `;

        listContainer.appendChild(card);
    });
}

function assignRoles() {
    if (assignedFlag) return;

    let roles = [
        "Mafia", "Mafia", "Mafia", "Mafia", "Mafia", "Mafia",
        "Politsiya", "Politsiya", "Shifokor", "Shifokor",
        "Fuqaro", "Fuqaro", "Fuqaro", "Fuqaro", "Fuqaro",
        "Fuqaro", "Fuqaro", "Fuqaro", "Fuqaro", "Fuqaro",
        "Fuqaro", "Fuqaro", "Fuqaro", "Fuqaro", "Fuqaro"
    ];

    for (let i = roles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    initialPlayers.forEach((player, index) => {
        player.role = roles[index];
    });

    myRole = initialPlayers[0].role;
    assignedFlag = true;
    document.getElementById("start-btn").disabled = true;

    const nextBtn = document.getElementById("next-btn");
    nextBtn.className = "next-btn-style";
    nextBtn.disabled = false;

    addSystemMessage("Rollar barchaga maxfiy taqsimlandi. Muhokama boshlandi!");
    speakBot('start');

    renderPlayers();
    startTimer(60);
}

function votePlayer(targetId) {
    if (isNight || hasVoted || !initialPlayers[0].alive || isLastWordsPhase) return;

    initialPlayers[targetId].votes += 1;
    hasVoted = true;

    const voterName = initialPlayers[0].name;
    const targetName = initialPlayers[targetId].name;

    addSystemMessage(`[OVOZ] ${voterName} ➔ ${targetName} ga ovoz berdi!`);
    speakBot('vote', voterName, targetName);

    renderPlayers();
}

function nightAction(targetId, roleType) {
    if (!isNight || !initialPlayers[0].alive || isLastWordsPhase) return;

    const target = initialPlayers[targetId];

    if (roleType === 'mafia') {
        mafiaTargetId = targetId;
        addSystemMessage(`[TUNGI AMAL] Siz ${target.name} ni nishonga oldingiz.`);
    } else if (roleType === 'doctor') {
        doctorTargetId = targetId;
        addSystemMessage(`[TUNGI AMAL] Siz ${target.name} ni himoya ostiga oldingiz.`);
    } else if (roleType === 'police') {
        const isMafia = target.role === "Mafia" ? "MAFIA!" : "Mafia emas.";
        addSystemMessage(`[POLITSIYA SURISHTIRUVI] ${target.name}ning roli: ${isMafia}`);
    }
}

function togglePhase() {
    if (isLastWordsPhase) return;

    isNight = !isNight;
    hasVoted = false;
    const body = document.body;
    const phaseText = document.getElementById("phase-text");
    const nextBtn = document.getElementById("next-btn");

    if (isNight) {
        body.className = "night-mode";
        phaseText.innerText = "TUN: MAFIA VA MAXSUS ROLLAR YURISHI";
        phaseText.style.color = "#e63946";
        nextBtn.innerText = "Kunga O'tish";

        mafiaTargetId = null;
        doctorTargetId = null;

        addSystemMessage("[TUN] Tun kirmoqda. Barcha o'yinchilar ko'zlarini yumishsin.");
        speakBot('night');
        startTimer(30);
    } else {
        body.className = "day-mode";
        phaseText.innerText = "KUNDUZ: MUHOKAMA VA OVOZ BERISH";
        phaseText.style.color = "#457b9d";
        nextBtn.innerText = "Tunga O'tish";

        processNightResults();
    }

    renderPlayers();
}

function processNightResults() {
    if (mafiaTargetId === null) {
        const alivePlayers = initialPlayers.filter(p => p.alive && p.role !== "Mafia");
        if (alivePlayers.length > 0) {
            mafiaTargetId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
        }
    }
    if (doctorTargetId === null) {
        const alivePlayers = initialPlayers.filter(p => p.alive);
        if (alivePlayers.length > 0) {
            doctorTargetId = alivePlayers[Math.floor(Math.random() * alivePlayers.length)].id;
        }
    }

    if (mafiaTargetId !== null && mafiaTargetId === doctorTargetId) {
        addSystemMessage("[TUNGI NATIJA] Shifokor tomonidan hujumga uchragan o'yinchi qutqarib qolindi!");
        speakBot('saved');
    } else if (mafiaTargetId !== null) {
        const killedPlayer = initialPlayers[mafiaTargetId];
        killedPlayer.alive = false;
        addSystemMessage(`[TUNGI NATIJA] Mafiya tunda ${killedPlayer.name} ni o'ldirdi!`);
        speakBot('eliminated', "", killedPlayer.name);
    }

    // O'YIN TUGAGANINI TEKSHIRISH
    if (checkGameOver()) return;

    processVotesAndLastWords();
}

function processVotesAndLastWords() {
    let maxVotes = 0;
    let mostVotedPlayer = null;

    initialPlayers.forEach(p => {
        if (p.votes > maxVotes) {
            maxVotes = p.votes;
            mostVotedPlayer = p;
        }
    });

    initialPlayers.forEach(p => p.votes = 0);

    if (mostVotedPlayer && maxVotes > 0) {
        isLastWordsPhase = true;
        mostVotedPlayer.alive = false;

        addSystemMessage(`[NATIJA] ${mostVotedPlayer.name} eng ko'p ovoz yig'di. Unga so'nggi so'z uchun 15 soniya berildi.`);
        speakBot('lastWords', "", mostVotedPlayer.name);

        document.getElementById("phase-text").innerText = `SO'NGGI SO'Z: ${mostVotedPlayer.name.toUpperCase()}`;
        document.getElementById("phase-text").style.color = "#ffb703";

        startTimer(15, () => {
            isLastWordsPhase = false;
            addSystemMessage(`[TIZIM] ${mostVotedPlayer.name} o'yindan to'liq chiqdi va kuzatuvchi rejimiga o'tdi.`);
            speakBot('eliminated', "", mostVotedPlayer.name);

            // O'YIN TUGAGANINI TEKSHIRISH
            if (checkGameOver()) return;

            document.getElementById("phase-text").innerText = "KUNDUZ: MUHOKAMA VA OVOZ BERISH";
            document.getElementById("phase-text").style.color = "#457b9d";

            startTimer(60);
            renderPlayers();
        });
    } else {
        startTimer(60);
    }
}

// O'YIN TUGASHINI TEKSHIRISH FUNKSIYASI
function checkGameOver() {
    if (!assignedFlag) return false;

    const alivePlayers = initialPlayers.filter(p => p.alive);
    const aliveMafia = alivePlayers.filter(p => p.role === "Mafia");
    const aliveCitizens = alivePlayers.filter(p => p.role !== "Mafia");

    if (aliveMafia.length === 0) {
        endGame("TINCH AHOLI G'ALABA QOZONDI!", "Barcha mafiyalar yo'q qilindi.");
        return true;
    }

    if (aliveMafia.length >= aliveCitizens.length) {
        endGame("MAFIYA G'ALABA QOZONDI!", "Mafiya shaharni to'liq o'z nazoratiga oldi.");
        return true;
    }

    return false;
}

function endGame(title, message) {
    clearInterval(timerInterval);

    document.getElementById("phase-text").innerText = title;
    document.getElementById("phase-text").style.color = "#2a9d8f";
    document.getElementById("next-btn").disabled = true;

    addSystemMessage(`[O'YIN TUGADI] ${title} - ${message}`);

    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(`${title}. ${message}`);
        utterance.lang = 'ru-RU';
        window.speechSynthesis.speak(utterance);
    }

    alert(`${title}\n${message}`);
}

function startTimer(seconds, onComplete = null) {
    clearInterval(timerInterval);
    timeLeft = seconds;
    updateTimerDisplay();

    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if (onComplete) {
                onComplete();
            } else {
                addSystemMessage("[VAQT TUGADI] Avtomatik bosqich almashmoqda...");
                togglePhase();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    const timerDisplay = document.getElementById("timer-display");
    const sec = timeLeft < 10 ? `0${timeLeft}` : timeLeft;
    timerDisplay.innerText = `00:${sec}`;
}

function sendMessage() {
    const isMeAlive = initialPlayers[0].alive;

    if (assignedFlag && !isMeAlive && !isLastWordsPhase) {
        addSystemMessage("[TIZIM] Siz kuzatuvchisiz. Chatda yozish imkoniyati cheklangan.");
        return;
    }

    const input = document.getElementById("chat-input");
    const text = input.value.trim();
    if (text === "") return;

    const chatBox = document.getElementById("chat-box");
    const msgPara = document.createElement("p");
    msgPara.classList.add("player-msg");
    msgPara.innerHTML = `<span class="sender">Siz:</span> <span class="msg-text">${text}</span>`;

    chatBox.appendChild(msgPara);
    input.value = "";
    chatBox.scrollTop = chatBox.scrollHeight;
}

function addSystemMessage(text) {
    const chatBox = document.getElementById("chat-box");
    const msgPara = document.createElement("p");
    msgPara.classList.add("system-msg");
    msgPara.innerText = text;
    chatBox.appendChild(msgPara);
    chatBox.scrollTop = chatBox.scrollHeight;
}

document.getElementById("mic-toggle").addEventListener("click", function () {
    const isMeAlive = initialPlayers[0].alive;
    if (assignedFlag && !isMeAlive && !isLastWordsPhase) return;

    this.classList.toggle("mic-active");
    const statusSpan = document.getElementById("voice-status");
    if (this.classList.contains("mic-active")) {
        statusSpan.innerText = "Yoniq";
        addSystemMessage("Mikrofoningiz yoqildi.");
    } else {
        statusSpan.innerText = "O'ff";
        addSystemMessage("Mikrofoningiz o'chirildi.");
    }
});

document.getElementById("send-btn").addEventListener("click", sendMessage);
document.getElementById("chat-input").addEventListener("keypress", function (e) {
    if (e.key === "Enter") sendMessage();
});

renderPlayers();