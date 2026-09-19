import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBqR8bkOF0a7RaL_Rkaz7MIg56wcWfoZek",
    authDomain: "database-1c626.firebaseapp.com",
    projectId: "database-1c626",
    storageBucket: "database-1c626.firebasestorage.app",
    messagingSenderId: "815988357212",
    appId: "1:815988357212:web:e25569a811990059c34e99",
    measurementId: "G-8FHGC1J0EG"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// グラフインスタンス保持用
window.diaryChartInstance = null;
window.moneyChartInstance = null;

/* 共通・ユーティリティ関数 */
function calculateAge(birthDateString) {
    if (!birthDateString) return "-";
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
}
function toHiragana(str) {
    if (!str) return "";
    return str.replace(/[ァ-ン]/g, s => String.fromCharCode(s.charCodeAt(0) - 0x60));
}
function parseWiki(text) {
    if (!text) return "";
    let html = String(text).replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html.replace(/== (.*?) ==/g, "<h3>$1</h3>");
    html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\[\[(.*?)\]\]/g, "<a onclick=\"searchFromLink('$1')\">$1</a>");
    html = html.replace(/\n/g, "<br>");
    return html;
}

window.currentMode = 'person'; 
window.changeMode = function(mode) {
    window.currentMode = mode;
    document.body.className = `mode-${mode}`;
    // フォームクリア類
    if(mode === 'person' || mode === 'other') clearSearch();
    if(mode === 'book') clearSearchBook();
}
window.showScreen = function(screenId) {
    document.querySelectorAll('.screen').forEach(el => el.style.display = 'none');
    document.getElementById(screenId).style.display = 'block';
    
    // 登録画面を開いたときIDが空ならフォームクリア
    if (screenId === 'register-screen' && !document.getElementById('edit-doc-id').value) clearForm();
    if (screenId === 'register-book-screen' && !document.getElementById('edit-book-id').value) clearBookForm();
    if (screenId === 'register-diary-screen' && !document.getElementById('edit-diary-id').value) clearDiaryForm();
    if (screenId === 'register-money-screen' && !document.getElementById('edit-money-id').value) clearMoneyForm();

    // お金・日記の表示画面を開いたときは自動でデータ読み込み
    if (screenId === 'view-diary-screen') searchDiary();
    if (screenId === 'view-money-screen') searchMoney();
}
window.insertText = function(targetId, prefix, suffix) {
    const textarea = document.getElementById(targetId);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    textarea.value = text.substring(0, start) + prefix + text.substring(start, end) + suffix + text.substring(end);
    textarea.focus();
    textarea.selectionEnd = start + prefix.length;
}

/* =========================================================================
   人物・人以外 システム 
========================================================================= */
function clearForm() {
    document.getElementById("edit-doc-id").value = "";
    document.querySelectorAll('#register-screen input[type="text"], #register-screen input[type="date"], #register-screen textarea').forEach(el => el.value = "");
    document.querySelectorAll('#register-screen select').forEach(el => el.selectedIndex = 0);
    document.getElementById("family-list").innerHTML = "";
    const saveBtn = document.querySelector("#register-screen .save-btn");
    if (saveBtn) saveBtn.innerText = "保存する";
}
window.clearSearch = function() {
    document.querySelectorAll('#search-screen input').forEach(el => el.value = "");
    document.querySelectorAll('#search-screen select').forEach(el => el.selectedIndex = 0);
    document.getElementById("result-body").innerHTML = "";
}

window.toggleCustomRelation = function(selectElem) {
    const row = selectElem.closest('.family-row');
    const customRel = row.querySelector('.family-custom-relation');
    const personSpan = row.querySelector('.family-name-person');
    const otherSpan = row.querySelector('.family-name-other');
    const val = selectElem.value;
    customRel.style.display = (val === 'その他' || val === '人以外') ? 'inline-block' : 'none';
    personSpan.style.display = (val === '人以外') ? 'none' : 'inline-block';
    otherSpan.style.display = (val === '人以外') ? 'inline-block' : 'none';
}
window.moveUp = function(btn) {
    const row = btn.closest('div');
    const prev = row.previousElementSibling;
    if (prev) row.parentNode.insertBefore(row, prev);
}
window.moveDown = function(btn) {
    const row = btn.closest('div');
    const next = row.nextElementSibling;
    if (next) row.parentNode.insertBefore(next, row);
}

window.addFamilyRow = function(relation = "", customRelation = "", lastname = "", firstname = "", otherName = "") {
    const container = document.getElementById("family-list");
    const div = document.createElement("div");
    div.className = "family-row";
    div.innerHTML = `
        <select class="classic-select family-relation" onchange="toggleCustomRelation(this)">
            <option value="" disabled hidden ${!relation ? 'selected' : ''}>続柄・関係</option>
            <option value="父" ${relation==='父'?'selected':''}>父</option><option value="母" ${relation==='母'?'selected':''}>母</option>
            <option value="兄" ${relation==='兄'?'selected':''}>兄</option><option value="弟" ${relation==='弟'?'selected':''}>弟</option>
            <option value="姉" ${relation==='姉'?'selected':''}>姉</option><option value="妹" ${relation==='妹'?'selected':''}>妹</option>
            <option value="配偶者" ${relation==='配偶者'?'selected':''}>配偶者</option><option value="子" ${relation==='子'?'selected':''}>子</option>
            <option value="友達" ${relation==='友達'?'selected':''}>友達</option>
            <option value="その他" ${relation==='その他'?'selected':''}>その他</option><option value="人以外" ${relation==='人以外'?'selected':''}>人以外</option>
        </select>
        <input type="text" class="family-custom-relation" placeholder="関係(会社等)" value="${customRelation}" style="width: 90px; display: ${relation === 'その他' || relation === '人以外' ? 'inline-block' : 'none'};">
        <span class="family-name-person" style="display: ${relation === '人以外' ? 'none' : 'inline-block'};">
            <input type="text" class="family-lastname" placeholder="苗字" value="${lastname}" style="width: 85px;">
            <input type="text" class="family-firstname" placeholder="名前" value="${firstname}" style="width: 85px;">
        </span>
        <span class="family-name-other" style="display: ${relation === '人以外' ? 'inline-block' : 'none'};">
            <input type="text" class="family-othername" placeholder="名称" value="${otherName}" style="width: 175px;">
        </span>
        <button type="button" onclick="moveUp(this)" style="padding:2px 8px;">↑</button>
        <button type="button" onclick="moveDown(this)" style="padding:2px 8px;">↓</button>
        <button type="button" onclick="this.parentElement.remove()" style="padding:2px 8px;">削除</button>
    `;
    container.appendChild(div);
}

window.saveData = async function() {
    const docId = document.getElementById("edit-doc-id").value;
    const familyData = [];
    document.querySelectorAll(".family-row").forEach(row => {
        const relation = row.querySelector(".family-relation").value;
        const customRelation = row.querySelector(".family-custom-relation").value;
        const lastname = row.querySelector(".family-lastname").value;
        const firstname = row.querySelector(".family-firstname").value;
        const otherName = row.querySelector(".family-othername").value;
        if(relation || lastname || firstname || otherName) familyData.push({ relation, customRelation, lastname, firstname, otherName });
    });

    const data = {
        type: window.currentMode, 
        studentId: document.getElementById("reg-id").value,
        phone: document.getElementById("reg-phone").value,
        address: document.getElementById("reg-address").value,
        driveLink: document.getElementById("reg-drive").value,
        family: familyData,
        details: document.getElementById("reg-details").value,
        notes: document.getElementById("reg-notes").value,
        updatedAt: new Date()
    };

    if (window.currentMode === 'person') {
        data.lastname = document.getElementById("reg-lastname").value;
        data.lastnameKana = document.getElementById("reg-lastname-kana").value;
        data.firstname = document.getElementById("reg-firstname").value;
        data.firstnameKana = document.getElementById("reg-firstname-kana").value;
        data.gender = document.getElementById("reg-gender").value;
        data.blood = document.getElementById("reg-blood").value;
        data.birth = document.getElementById("reg-birth").value;
        data.photoUrl = document.getElementById("reg-photo-url").value;
    } else {
        data.otherName = document.getElementById("reg-other-name").value;
        data.otherNameKana = document.getElementById("reg-other-name-kana").value;
    }

    try {
        if (docId) await updateDoc(doc(db, "persons", docId), data);
        else { data.createdAt = new Date(); await addDoc(collection(db, "persons"), data); }
        alert("保存しました！");
        clearForm();
        showScreen('search-screen');
        searchData();
    } catch (e) { alert("保存失敗"); console.error(e); }
}

window.searchResults = [];
window.isSearching = false;
window.searchData = async function() {
    if (window.isSearching) return;
    window.isSearching = true;
    const tbody = document.getElementById("result-body");
    tbody.innerHTML = "<tr><td colspan='5'>検索中...</td></tr>";

    try {
        const q = query(collection(db, "persons"));
        const querySnapshot = await getDocs(q);
        tbody.innerHTML = ""; 
        const thead = document.querySelector("#result-table thead");
        if (window.currentMode === 'person') thead.innerHTML = "<tr><th>ID</th><th>氏名</th><th>性別</th><th>年齢</th><th>操作</th></tr>";
        else thead.innerHTML = "<tr><th>ID</th><th>名称</th><th>-</th><th>-</th><th>操作</th></tr>";

        const sId = document.getElementById("search-id").value;
        const sLast = document.getElementById("search-lastname").value;
        const sFirst = document.getElementById("search-firstname").value;
        const sOther = document.getElementById("search-other-name").value;
        const sGender = document.getElementById("search-gender").value;
        const sBlood = document.getElementById("search-blood").value;
        const sBirth = document.getElementById("search-birth").value;
        const sAddr = document.getElementById("search-address").value;
        const sKey = document.getElementById("search-keyword").value.toLowerCase();

        let results = [];
        querySnapshot.forEach((doc) => {
            const d = doc.data();
            if ((d.type || 'person') !== window.currentMode) return;
            
            let match = true;
            if (sId && !(d.studentId||"").includes(sId)) match = false;
            
            if (window.currentMode === 'person') {
                if (sLast && !((d.lastname||"").includes(sLast) || (d.lastnameKana||"").includes(toHiragana(sLast)))) match = false;
                if (sFirst && !((d.firstname||"").includes(sFirst) || (d.firstnameKana||"").includes(toHiragana(sFirst)))) match = false;
                if (sGender && d.gender !== sGender) match = false;
                if (sBlood && d.blood !== sBlood) match = false;
                if (sBirth && d.birth !== sBirth) match = false;
            } else {
                if (sOther && !((d.otherName||"").includes(sOther) || (d.otherNameKana||"").includes(toHiragana(sOther)))) match = false;
            }
            if (sAddr && !((d.address||"").includes(sAddr) || (d.phone||"").includes(sAddr))) match = false;
            if (sKey && !((d.details||"").toLowerCase().includes(sKey) || (d.notes||"").toLowerCase().includes(sKey) || (d.driveLink||"").toLowerCase().includes(sKey))) match = false;
            
            if(match) results.push({ docId: doc.id, ...d });
        });
        
        // ID順に確実な並び替えを実施 (数値化して比較)
        results.sort((a, b) => {
            const idA = String(a.studentId || "").trim();
            const idB = String(b.studentId || "").trim();

            if (idA === "" && idB !== "") return 1;
            if (idB === "" && idA !== "") return -1;
            if (idA === "" && idB === "") return 0;

            const numA = Number(idA);
            const numB = Number(idB);

            if (!isNaN(numA) && !isNaN(numB)) {
                return numA - numB;
            }

            return idA.localeCompare(idB, 'ja', { numeric: true });
        });

        window.searchResults = results;
        results.forEach((d, index) => {
            const tr = document.createElement("tr");
            if (window.currentMode === 'person') {
                tr.innerHTML = `<td>${d.studentId||'-'}</td><td>${d.lastname||''} ${d.firstname||''}</td><td>${d.gender||'-'}</td><td>${calculateAge(d.birth)}</td><td><button onclick="viewDetail(${index}, 'person')">表示</button></td>`;
            } else {
                tr.innerHTML = `<td>${d.studentId||'-'}</td><td>${d.otherName||''}</td><td>-</td><td>-</td><td><button onclick="viewDetail(${index}, 'person')">表示</button></td>`;
            }
            tbody.appendChild(tr);
        });
    } catch (e) { tbody.innerHTML = "<tr><td colspan='5'>エラー発生</td></tr>"; }
    finally { window.isSearching = false; }
}


/* =========================================================================
   詳細表示 (人・人以外・本 共通利用)
========================================================================= */
window.goBackFromDetail = function() {
    const d = window.currentViewingData;
    if (d.modeType === 'book') showScreen('search-book-screen');
    else showScreen('search-screen');
}

window.viewDetail = function(index, modeType) {
    let data;
    if (modeType === 'book') data = window.bookResults[index];
    else data = window.searchResults[index];
    
    if (!data) return;
    window.currentViewingData = data;
    data.modeType = modeType; // 保存用
    
    // UI初期化
    document.getElementById("view-photo-container").style.display = "none";
    document.getElementById("view-person-table").style.display = "none";
    document.getElementById("view-book-table").style.display = "none";
    
    const driveStr = data.driveLink ? `<a href="${data.driveLink}" target="_blank">リンク</a>` : '-';
    
    if (modeType === 'person') {
        const type = data.type || 'person';
        document.getElementById("view-id-rank").innerText = `ID: ${data.studentId || '-'}`;
        if (type === 'person') {
            document.getElementById("view-photo-container").style.display = "flex";
            document.getElementById("view-photo").src = data.photoUrl || "";
            document.getElementById("view-kana").innerText = `${data.lastnameKana||''} ${data.firstnameKana||''}`;
            document.getElementById("view-name").innerText = `${data.lastname||''} ${data.firstname||''}`;
            document.getElementById("view-gender").innerText = data.gender || '-';
            document.getElementById("view-blood").innerText = data.blood || '-';
            document.getElementById("view-birth").innerText = data.birth || '-';
            document.getElementById("view-age").innerText = calculateAge(data.birth);
        } else {
            document.getElementById("view-kana").innerText = data.otherNameKana || '';
            document.getElementById("view-name").innerText = data.otherName || '';
        }
        document.getElementById("view-phone").innerText = data.phone || '-';
        document.getElementById("view-drive").innerHTML = driveStr;
        document.getElementById("view-address").innerText = data.address || '-';
        document.getElementById("view-person-table").style.display = "table";
        
        // 関連リスト
        document.getElementById("view-family-title").innerText = "関連";
        renderFamilyList(data.family, "view-family-list", "view-family-container");
        
    } else if (modeType === 'book') {
        document.getElementById("view-id-rank").innerText = `本`;
        document.getElementById("view-photo-container").style.display = "flex";
        document.getElementById("view-photo").src = data.bookCoverUrl || "";
        document.getElementById("view-kana").innerText = data.bookTitleKana || '';
        document.getElementById("view-name").innerText = data.bookTitle || '';
        
        document.getElementById("view-book-genre").innerText = data.genres || '-';
        document.getElementById("view-book-year").innerText = data.publishYear || '-';
        document.getElementById("view-book-acq-type").innerText = data.acquisitionType || '-';
        document.getElementById("view-book-acq-place").innerText = data.acquisitionPlace || '-';
        document.getElementById("view-book-acq-date").innerText = data.acquisitionDate || '-';
        document.getElementById("view-book-start").innerText = data.startDate || '-';
        document.getElementById("view-book-end").innerText = data.endDate || '-';
        
        // 日数計算
        let readDays = "-";
        if (data.startDate && data.endDate) {
            const diff = Math.floor((new Date(data.endDate) - new Date(data.startDate)) / (1000*60*60*24));
            readDays = diff >= 0 ? `${diff} 日間` : "-";
        }
        if (data.acquisitionDate && data.startDate) {
            const delay = Math.floor((new Date(data.startDate) - new Date(data.acquisitionDate)) / (1000*60*60*24));
            readDays += ` (着手まで ${delay}日)`;
        }
        document.getElementById("view-book-read-days").innerText = readDays;
        document.getElementById("view-book-table").style.display = "table";
        
        // クレジット（役職）リスト
        document.getElementById("view-family-title").innerText = "役職・クレジット";
        const cList = document.getElementById("view-family-list");
        cList.innerHTML = "";
        if (data.credits && data.credits.length > 0) {
            document.getElementById("view-family-container").style.display = "block";
            data.credits.forEach(c => {
                const li = document.createElement("li");
                li.innerText = `【${c.role}】 ${c.name}`;
                cList.appendChild(li);
            });
        } else { document.getElementById("view-family-container").style.display = "none"; }
    }

    // 詳細・備考
    const detContainer = document.getElementById("view-details-container");
    if (data.details) {
        document.getElementById("view-details").innerHTML = parseWiki(data.details);
        detContainer.style.display = "block";
    } else detContainer.style.display = "none";

    const noteContainer = document.getElementById("view-notes-container");
    const notesText = modeType === 'book' ? data.review : data.notes;
    if (notesText) {
        document.getElementById("view-notes").innerHTML = parseWiki(notesText);
        noteContainer.style.display = "block";
    } else noteContainer.style.display = "none";

    showScreen('detail-screen');
}

function renderFamilyList(familyArr, ulId, containerId) {
    const list = document.getElementById(ulId);
    list.innerHTML = "";
    if (familyArr && familyArr.length > 0) {
        document.getElementById(containerId).style.display = "block";
        familyArr.forEach(f => {
            let relText = "";
            if (f.relation === '人以外') relText = f.customRelation ? `【${f.customRelation}】 ` : "";
            else if (f.relation === 'その他') relText = `【${f.customRelation || f.relation}】 `;
            else relText = `【${f.relation || '関連'}】 `;
            const li = document.createElement("li");
            if (f.relation === '人以外') li.innerHTML = `${relText}${f.otherName||""}`;
            else li.innerHTML = `${relText}${f.lastname||''} ${f.firstname||''}`;
            list.appendChild(li);
        });
    } else { document.getElementById(containerId).style.display = "none"; }
}

window.editCurrentData = function() {
    const d = window.currentViewingData;
    if(!d) return;
    if (d.modeType === 'book') {
        changeMode('book');
        document.getElementById("edit-book-id").value = d.docId;
        document.getElementById("reg-book-title").value = d.bookTitle||"";
        document.getElementById("reg-book-kana").value = d.bookTitleKana||"";
        document.getElementById("reg-book-cover").value = d.bookCoverUrl||"";
        document.getElementById("reg-book-genre").value = d.genres||"";
        document.getElementById("reg-book-year").value = d.publishYear||"";
        document.getElementById("reg-book-acq-type").value = d.acquisitionType||"買った";
        document.getElementById("reg-book-acq-place").value = d.acquisitionPlace||"";
        document.getElementById("reg-book-acq-date").value = d.acquisitionDate||"";
        document.getElementById("reg-book-start").value = d.startDate||"";
        document.getElementById("reg-book-end").value = d.endDate||"";
        document.getElementById("reg-book-review").value = d.review||"";
        document.getElementById("credit-list").innerHTML = "";
        if(d.credits) d.credits.forEach(c => addCreditRow(c.role, c.name));
        showScreen('register-book-screen');
    } else {
        changeMode(d.type || 'person');
        document.getElementById("edit-doc-id").value = d.docId;
        document.getElementById("reg-id").value = d.studentId||"";
        document.getElementById("reg-phone").value = d.phone||"";
        document.getElementById("reg-address").value = d.address||"";
        document.getElementById("reg-drive").value = d.driveLink||"";
        document.getElementById("reg-details").value = d.details||"";
        document.getElementById("reg-notes").value = d.notes||"";
        if (window.currentMode === 'person') {
            document.getElementById("reg-lastname").value = d.lastname||"";
            document.getElementById("reg-lastname-kana").value = d.lastnameKana||"";
            document.getElementById("reg-firstname").value = d.firstname||"";
            document.getElementById("reg-firstname-kana").value = d.firstnameKana||"";
            document.getElementById("reg-gender").value = d.gender||"不明";
            document.getElementById("reg-blood").value = d.blood||"不明";
            document.getElementById("reg-birth").value = d.birth||"";
            document.getElementById("reg-photo-url").value = d.photoUrl||"";
        } else {
            document.getElementById("reg-other-name").value = d.otherName||"";
            document.getElementById("reg-other-name-kana").value = d.otherNameKana||"";
        }
        document.getElementById("family-list").innerHTML = "";
        if(d.family) d.family.forEach(f => addFamilyRow(f.relation, f.customRelation, f.lastname, f.firstname, f.otherName));
        showScreen('register-screen');
    }
}

window.deleteCurrentData = async function() {
    const d = window.currentViewingData;
    if(!d) return;
    const colName = d.modeType === 'book' ? "books" : "persons";
    if(confirm(`本当に削除しますか？`)) {
        try {
            await deleteDoc(doc(db, colName, d.docId));
            alert("削除しました。");
            goBackFromDetail();
            if (d.modeType === 'book') searchBooks(); else searchData();
        } catch(e) { alert("削除失敗"); }
    }
}


/* =========================================================================
   本 システム
========================================================================= */
function clearBookForm() {
    document.getElementById("edit-book-id").value = "";
    document.querySelectorAll('#register-book-screen input, #register-book-screen textarea').forEach(el => el.value = "");
    document.getElementById("credit-list").innerHTML = "";
}
window.clearSearchBook = function() {
    document.querySelectorAll('#search-book-screen input').forEach(el => el.value = "");
    document.getElementById("result-book-body").innerHTML = "";
}

window.addCreditRow = function(role="", name="") {
    const container = document.getElementById("credit-list");
    const div = document.createElement("div");
    div.className = "study-row"; // 流用
    div.innerHTML = `
        <input type="text" class="credit-role" placeholder="役職(作者など)" value="${role}" style="width: 100px;">
        <input type="text" class="credit-name" placeholder="名前" value="${name}" style="width: 200px;">
        <button type="button" onclick="this.parentElement.remove()">削除</button>
    `;
    container.appendChild(div);
}

window.saveBook = async function() {
    const docId = document.getElementById("edit-book-id").value;
    const credits = [];
    document.querySelectorAll(".credit-role").forEach((rInput, i) => {
        const nInput = document.querySelectorAll(".credit-name")[i];
        if (rInput.value || nInput.value) credits.push({ role: rInput.value, name: nInput.value });
    });
    
    const data = {
        bookTitle: document.getElementById("reg-book-title").value,
        bookTitleKana: document.getElementById("reg-book-kana").value,
        bookCoverUrl: document.getElementById("reg-book-cover").value,
        genres: document.getElementById("reg-book-genre").value,
        publishYear: document.getElementById("reg-book-year").value,
        acquisitionType: document.getElementById("reg-book-acq-type").value,
        acquisitionPlace: document.getElementById("reg-book-acq-place").value,
        acquisitionDate: document.getElementById("reg-book-acq-date").value,
        startDate: document.getElementById("reg-book-start").value,
        endDate: document.getElementById("reg-book-end").value,
        credits: credits,
        review: document.getElementById("reg-book-review").value,
        updatedAt: new Date()
    };
    try {
        if (docId) await updateDoc(doc(db, "books", docId), data);
        else { data.createdAt = new Date(); await addDoc(collection(db, "books"), data); }
        alert("保存しました！");
        clearBookForm();
        showScreen('search-book-screen');
        searchBooks();
    } catch(e) { alert("保存失敗"); console.error(e); }
}

window.bookResults = [];
window.searchBooks = async function() {
    const tbody = document.getElementById("result-book-body");
    tbody.innerHTML = "<tr><td colspan='4'>検索中...</td></tr>";
    try {
        const q = query(collection(db, "books"));
        const snap = await getDocs(q);
        tbody.innerHTML = "";
        
        const sTitle = document.getElementById("search-book-title").value;
        const sYear = document.getElementById("search-book-year").value;
        const sGenre = document.getElementById("search-book-genre").value;
        const sKey = document.getElementById("search-book-keyword").value.toLowerCase();
        
        let results = [];
        snap.forEach(doc => {
            const d = doc.data();
            let match = true;
            if (sTitle && !((d.bookTitle||"").includes(sTitle) || (d.bookTitleKana||"").includes(toHiragana(sTitle)))) match = false;
            if (sYear && d.publishYear !== sYear) match = false;
            if (sGenre && !(d.genres||"").includes(sGenre)) match = false;
            if (sKey) {
                let creditStr = (d.credits||[]).map(c=>c.role+c.name).join("");
                if (!((d.review||"").toLowerCase().includes(sKey) || creditStr.includes(sKey))) match = false;
            }
            if(match) results.push({ docId: doc.id, ...d });
        });
        window.bookResults = results;
        results.forEach((d, i) => {
            const status = d.endDate ? "読了" : (d.startDate ? "読書中" : "未読");
            const tr = document.createElement("tr");
            tr.innerHTML = `<td>${d.bookTitle||'無題'}</td><td>${d.genres||'-'}</td><td>${status}</td><td><button onclick="viewDetail(${i}, 'book')">表示</button></td>`;
            tbody.appendChild(tr);
        });
    } catch(e) { tbody.innerHTML="<tr><td colspan='4'>エラー</td></tr>"; }
}

/* =========================================================================
   日記 システム (時間計算・グラフ化・削除機能追加)
========================================================================= */
const subjectsList = ["論国","古典","数学","数１","数２","数３","数Ａ","数Ｂ","数Ｃ","生物","物理","化学","地学","地理","歴史","公共","倫理","英コ","論表","保健","家庭","その他"];

function clearDiaryForm() {
    document.getElementById("edit-diary-id").value = "";
    document.querySelectorAll('#register-diary-screen input, #register-diary-screen textarea').forEach(el => el.value = "");
    document.getElementById("study-list").innerHTML = "";
}

window.addStudyRow = function(start="", end="", sub="", otherSub="") {
    const container = document.getElementById("study-list");
    const div = document.createElement("div");
    div.className = "study-row";
    
    let opts = subjectsList.map(s => `<option value="${s}" ${s===sub?'selected':''}>${s}</option>`).join("");
    
    div.innerHTML = `
        <input type="time" class="study-start" value="${start}"> 〜 <input type="time" class="study-end" value="${end}">
        <select class="classic-select study-subject" onchange="this.nextElementSibling.style.display=(this.value==='その他'?'inline-block':'none')">
            <option value="">教科選択</option>${opts}
        </select>
        <input type="text" class="study-other" placeholder="入力" value="${otherSub}" style="width:100px; display:${sub==='その他'?'inline-block':'none'};">
        <button type="button" onclick="this.parentElement.remove()">削除</button>
    `;
    container.appendChild(div);
}

// 時刻文字列 HH:mm から分を計算（日またぎ考慮）
function calcMinutes(startStr, endStr) {
    if(!startStr || !endStr) return 0;
    let [sh, sm] = startStr.split(':').map(Number);
    let [eh, em] = endStr.split(':').map(Number);
    let startM = sh * 60 + sm;
    let endM = eh * 60 + em;
    if (endM < startM) endM += 24 * 60;
    return endM - startM;
}

// 平均時刻の計算（深夜0〜6時は+24hして平均化）
function calcAverageTimeStr(timesArray) {
    if(!timesArray || timesArray.length === 0) return "-";
    let total = 0, count = 0;
    timesArray.forEach(t => {
        if(!t) return;
        let [h, m] = t.split(':').map(Number);
        if(h >= 0 && h <= 6) h += 24; // 深夜は翌日扱い
        total += (h * 60 + m);
        count++;
    });
    if(count === 0) return "-";
    let avg = Math.round(total / count);
    if(avg >= 1440) avg -= 1440;
    let hh = Math.floor(avg / 60);
    let mm = avg % 60;
    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

window.saveDiary = async function() {
    const docId = document.getElementById("edit-diary-id").value;
    const studies = [];
    document.querySelectorAll(".study-row").forEach(row => {
        const start = row.querySelector(".study-start").value;
        const end = row.querySelector(".study-end").value;
        const sub = row.querySelector(".study-subject").value;
        const other = row.querySelector(".study-other").value;
        if(start || end || sub) studies.push({ start, end, sub, other });
    });
    const dateVal = document.getElementById("reg-diary-date").value;
    if(!dateVal) { alert("日付を入力してください"); return; }
    
    const data = {
        date: dateVal,
        sleepTime: document.getElementById("reg-diary-sleep").value, // 昨晩の就寝
        wakeTime: document.getElementById("reg-diary-wake").value,   // 今朝の起床
        schoolIn: document.getElementById("reg-diary-school-in").value,
        schoolOut: document.getElementById("reg-diary-school-out").value,
        cramIn: document.getElementById("reg-diary-cram-in").value,
        cramOut: document.getElementById("reg-diary-cram-out").value,
        studies: studies,
        diaryText: document.getElementById("reg-diary-text").value,
        updatedAt: new Date()
    };
    
    try {
        if(docId) await updateDoc(doc(db, "diaries", docId), data);
        else await addDoc(collection(db, "diaries"), data);
        alert("保存しました");
        clearDiaryForm();
        showScreen('view-diary-screen');
    } catch(e) { alert("保存失敗"); console.error(e); }
}

window.diaryDataCache = [];
window.searchDiary = async function() {
    const startD = document.getElementById("diary-start-date").value;
    const endD = document.getElementById("diary-end-date").value;
    
    const tbody = document.getElementById("result-diary-body");
    try {
        const q = query(collection(db, "diaries"));
        const snap = await getDocs(q);
        let results = [];
        snap.forEach(doc => {
            const d = doc.data();
            if(startD && d.date < startD) return;
            if(endD && d.date > endD) return;
            results.push({docId: doc.id, ...d});
        });
        results.sort((a,b) => a.date.localeCompare(b.date)); // 日付昇順
        window.diaryDataCache = results;
        
        tbody.innerHTML = "";
        let sleepArr=[], wakeArr=[], schInArr=[], schOutArr=[], cramInArr=[], cramOutArr=[];
        let totalSleepMin = 0, sleepCount = 0;
        let subjectMinutes = {}; // 教科別勉強時間
        
        results.forEach((d, i) => {
            // 時間集計
            if(d.sleepTime) sleepArr.push(d.sleepTime);
            if(d.wakeTime) wakeArr.push(d.wakeTime);
            if(d.schoolIn) schInArr.push(d.schoolIn);
            if(d.schoolOut) schOutArr.push(d.schoolOut);
            if(d.cramIn) cramInArr.push(d.cramIn);
            if(d.cramOut) cramOutArr.push(d.cramOut);
            
            // その日の睡眠時間
            let daySleep = "-";
            if(d.sleepTime && d.wakeTime) {
                let m = calcMinutes(d.sleepTime, d.wakeTime);
                totalSleepMin += m; sleepCount++;
                daySleep = `${Math.floor(m/60)}h${m%60}m`;
            }
            
            // 勉強時間集計
            let dayStudyMin = 0;
            (d.studies||[]).forEach(st => {
                let m = calcMinutes(st.start, st.end);
                dayStudyMin += m;
                let sName = st.sub === 'その他' ? (st.other||'その他') : st.sub;
                if(sName) {
                    if(!subjectMinutes[sName]) subjectMinutes[sName] = 0;
                    subjectMinutes[sName] += m;
                }
            });
            let dayStudyStr = dayStudyMin > 0 ? `${Math.floor(dayStudyMin/60)}h${dayStudyMin%60}m` : "-";
            let shortText = (d.diaryText||"").substring(0,15) + ((d.diaryText||"").length>15?"...":"");
            
            const tr = document.createElement("tr");
            // ★削除ボタンを追加
            tr.innerHTML = `
                <td>${d.date}</td>
                <td>${daySleep}</td>
                <td>${dayStudyStr}</td>
                <td>${shortText}</td>
                <td style="white-space: nowrap;">
                    <button onclick="editDiary(${i})">編集</button>
                    <button onclick="deleteDiary(${i})" style="color:red;">削除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        // 統計表示
        let avgSleep = sleepCount > 0 ? Math.round(totalSleepMin/sleepCount) : 0;
        document.getElementById("stat-sleep-time").innerText = avgSleep > 0 ? `${Math.floor(avgSleep/60)}時間${avgSleep%60}分` : "-";
        document.getElementById("stat-wake-sleep").innerText = `${calcAverageTimeStr(sleepArr)} / ${calcAverageTimeStr(wakeArr)}`;
        document.getElementById("stat-school").innerText = `${calcAverageTimeStr(schInArr)} / ${calcAverageTimeStr(schOutArr)}`;
        document.getElementById("stat-cram").innerText = `${calcAverageTimeStr(cramInArr)} / ${calcAverageTimeStr(cramOutArr)}`;

        drawDiaryChart(subjectMinutes);
        
    } catch(e) { console.error(e); }
}

window.editDiary = function(index) {
    const d = window.diaryDataCache[index];
    if(!d) return;
    document.getElementById("edit-diary-id").value = d.docId;
    document.getElementById("reg-diary-date").value = d.date||"";
    document.getElementById("reg-diary-sleep").value = d.sleepTime||"";
    document.getElementById("reg-diary-wake").value = d.wakeTime||"";
    document.getElementById("reg-diary-school-in").value = d.schoolIn||"";
    document.getElementById("reg-diary-school-out").value = d.schoolOut||"";
    document.getElementById("reg-diary-cram-in").value = d.cramIn||"";
    document.getElementById("reg-diary-cram-out").value = d.cramOut||"";
    document.getElementById("reg-diary-text").value = d.diaryText||"";
    document.getElementById("study-list").innerHTML = "";
    (d.studies||[]).forEach(st => addStudyRow(st.start, st.end, st.sub, st.other));
    showScreen('register-diary-screen');
}

// ★日記の削除処理を追加
window.deleteDiary = async function(index) {
    const d = window.diaryDataCache[index];
    if(!d) return;
    if(confirm(`本当に ${d.date} の日記を削除しますか？\nこの操作は取り消せません。`)) {
        try {
            await deleteDoc(doc(db, "diaries", d.docId));
            alert("削除しました。");
            searchDiary();
        } catch(e) {
            alert("削除に失敗しました。");
            console.error(e);
        }
    }
}

function drawDiaryChart(subjData) {
    const ctx = document.getElementById('diary-chart').getContext('2d');
    if(window.diaryChartInstance) window.diaryChartInstance.destroy();
    
    let labels = Object.keys(subjData);
    let data = labels.map(l => (subjData[l]/60).toFixed(1)); // 時間単位に変換
    
    if(labels.length===0) { labels=["データなし"]; data=[0]; }
    
    window.diaryChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '勉強時間 (時間)',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } }
        }
    });
}


/* =========================================================================
   お金 システム (残高・グラフ化・削除機能追加)
========================================================================= */
function clearMoneyForm() {
    document.getElementById("edit-money-id").value = "";
    document.getElementById("reg-money-date").value = "";
    document.getElementById("reg-money-amount").value = "";
    document.getElementById("reg-money-category").value = "";
    document.getElementById("reg-money-memo").value = "";
}

window.saveMoney = async function() {
    const docId = document.getElementById("edit-money-id").value;
    const dateVal = document.getElementById("reg-money-date").value;
    const amtVal = Number(document.getElementById("reg-money-amount").value);
    if(!dateVal || isNaN(amtVal)) { alert("日付と金額を正しく入力してください"); return; }
    
    const data = {
        date: dateVal,
        type: document.getElementById("reg-money-type").value,
        method: document.getElementById("reg-money-method").value,
        amount: amtVal,
        category: document.getElementById("reg-money-category").value,
        memo: document.getElementById("reg-money-memo").value,
        updatedAt: new Date()
    };
    try {
        if(docId) await updateDoc(doc(db, "transactions", docId), data);
        else await addDoc(collection(db, "transactions"), data);
        alert("保存しました");
        clearMoneyForm();
        showScreen('view-money-screen');
    } catch(e) { alert("保存失敗"); console.error(e); }
}

window.moneyDataCache = [];
window.searchMoney = async function() {
    const startD = document.getElementById("money-start-date").value;
    const endD = document.getElementById("money-end-date").value;
    
    try {
        const q = query(collection(db, "transactions"));
        const snap = await getDocs(q);
        
        let total = 0, cash = 0, paypay = 0, paypayPt = 0, rakuten = 0;
        let listForTable = [];
        let categoryExpenses = {};
        
        snap.forEach(doc => {
            const d = doc.data();
            const amt = d.type === 'income' ? d.amount : -d.amount;
            
            // 残高計算 (全期間)
            total += amt;
            if(d.method === 'cash') cash += amt;
            if(d.method === 'paypay') paypay += amt;
            if(d.method === 'paypay_point') paypayPt += amt;
            if(d.method === 'rakuten_pay') rakuten += amt;
            
            // 期間フィルタ
            let inRange = true;
            if(startD && d.date < startD) inRange = false;
            if(endD && d.date > endD) inRange = false;
            
            if(inRange) {
                listForTable.push({docId: doc.id, ...d});
                // 支出カテゴリ集計用 (グラフ)
                if(d.type === 'expense' && d.category) {
                    if(!categoryExpenses[d.category]) categoryExpenses[d.category] = 0;
                    categoryExpenses[d.category] += d.amount;
                }
            }
        });
        
        // バッジ更新
        document.getElementById("money-total").innerText = `¥${total.toLocaleString()}`;
        document.getElementById("money-cash").innerText = `¥${cash.toLocaleString()}`;
        document.getElementById("money-paypay").innerText = `¥${paypay.toLocaleString()}`;
        document.getElementById("money-paypay-pt").innerText = `¥${paypayPt.toLocaleString()}`;
        document.getElementById("money-rakuten").innerText = `¥${rakuten.toLocaleString()}`;
        
        // テーブル更新
        listForTable.sort((a,b) => b.date.localeCompare(a.date)); // 日付降順
        window.moneyDataCache = listForTable;
        const tbody = document.getElementById("result-money-body");
        tbody.innerHTML = "";
        
        const methodMap = { 'cash':'現金', 'paypay':'PayPay', 'paypay_point':'PayPay pt', 'rakuten_pay':'楽天ペイ' };
        
        listForTable.forEach((d, i) => {
            const isInc = d.type === 'income';
            const color = isInc ? 'blue' : 'red';
            const sign = isInc ? '+' : '-';
            const tr = document.createElement("tr");
            // ★削除ボタンを追加
            tr.innerHTML = `
                <td>${d.date}</td>
                <td style="color:${color}">${isInc?'収入':'支出'}</td>
                <td>${methodMap[d.method]}</td>
                <td style="color:${color}">${sign}¥${d.amount.toLocaleString()}</td>
                <td>${d.category||'-'}</td>
                <td style="white-space: nowrap;">
                    <button onclick="editMoney(${i})">編集</button>
                    <button onclick="deleteMoney(${i})" style="color:red;">削除</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        
        drawMoneyChart(categoryExpenses);
        
    } catch(e) { console.error(e); }
}

window.editMoney = function(index) {
    const d = window.moneyDataCache[index];
    if(!d) return;
    document.getElementById("edit-money-id").value = d.docId;
    document.getElementById("reg-money-date").value = d.date||"";
    document.getElementById("reg-money-type").value = d.type||"expense";
    document.getElementById("reg-money-amount").value = d.amount||"";
    document.getElementById("reg-money-method").value = d.method||"cash";
    document.getElementById("reg-money-category").value = d.category||"";
    document.getElementById("reg-money-memo").value = d.memo||"";
    showScreen('register-money-screen');
}

// ★お金の削除処理を追加
window.deleteMoney = async function(index) {
    const d = window.moneyDataCache[index];
    if(!d) return;
    const isInc = d.type === 'income';
    const sign = isInc ? '+' : '-';
    if(confirm(`本当に ${d.date} のデータ（${sign}¥${d.amount.toLocaleString()}）を削除しますか？\nこの操作は取り消せません。`)) {
        try {
            await deleteDoc(doc(db, "transactions", d.docId));
            alert("削除しました。");
            searchMoney();
        } catch(e) {
            alert("削除に失敗しました。");
            console.error(e);
        }
    }
}

function drawMoneyChart(catData) {
    const ctx = document.getElementById('money-chart').getContext('2d');
    if(window.moneyChartInstance) window.moneyChartInstance.destroy();
    
    let labels = Object.keys(catData);
    let data = Object.values(catData);
    if(labels.length===0) { labels=["データなし"]; data=[1]; }
    
    window.moneyChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: ['#ff6384', '#36a2eb', '#cc65fe', '#ffce56', '#4bc0c0', '#9966ff', '#ff9f40']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right', labels:{ boxWidth: 10, font:{size: 10} } } }
        }
    });
}
